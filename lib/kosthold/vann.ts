// Vannteller: lagringskø for antall glass per dag.
//
// Problemet den løser: raske trykk gir flere lagringer etter hverandre, og nettverket kan prøve en
// gammel forespørsel igjen etter at en nyere er lagret. Uten ordning kunne «1 glass» da overskrive «2».
//
// • Én lagring om gangen per bruker og dato. Trykk underveis slås sammen: bare det nyeste antallet
//   sendes når den forrige lagringen er ferdig.
// • Hver lagring har en versjon som alltid er høyere enn alt køen har sett (også det som er lagret
//   fra en annen enhet). Databasen (vann_sett i docs/migrasjoner/vann.sql) lagrer bare en nyere versjon,
//   så et sent gammelt forsøk blir ignorert der også.
// • Ingen endring før dagens antall er lastet: uten et bekreftet utgangspunkt kunne et trykk på +
//   lagret «1» over et eksisterende antall.

export const VANN_MAL = 8
export const VANN_MAKS = 40

export interface Vannstatus { glass: number; versjon: number }
export type VannSender = (glass: number, versjon: number) => Promise<Vannstatus>

export interface Vanntilstand {
  /** Antallet som skal vises: det nyeste trykket, ellers det som er lagret. null = ikke lastet. */
  glass: number | null
  lagrer: boolean
  /** Siste lagring som feilet (antallet er da tilbake til det som er lagret) */
  feil: unknown
}

/** Feil som er verdt et nytt forsøk med samme versjon (brudd underveis) */
export const erNettbrudd = (e: unknown) => /failed to fetch|network|load failed|fetch/i.test((e as Error)?.message ?? '')

class Erstattet extends Error {}

export interface VannkoValg {
  klokke?: () => number
  /** Nye forsøk ved nettbrudd (i tillegg til det første) */
  forsok?: number
  vent?: (ms: number) => Promise<void>
}

export class Vannko {
  private bekreftet: Vannstatus | null = null
  private onsket: Vannstatus | null = null
  private sisteVersjon = 0
  private sender = false
  private feil: unknown = null
  private snapshot: Vanntilstand = { glass: null, lagrer: false, feil: null }
  private lyttere = new Set<() => void>()
  private klokke: () => number
  private forsok: number
  private vent: (ms: number) => Promise<void>

  constructor(private send: VannSender, valg: VannkoValg = {}) {
    this.klokke = valg.klokke ?? Date.now
    this.forsok = valg.forsok ?? 3
    this.vent = valg.vent ?? (ms => new Promise(r => setTimeout(r, ms)))
  }

  /** Lagret tilstand fra databasen (innlasting). Eldre enn det køen allerede kjenner ignoreres. */
  settLagret(s: Vannstatus) {
    if (this.bekreftet && s.versjon < this.bekreftet.versjon) return
    this.bekreftet = s
    this.sisteVersjon = Math.max(this.sisteVersjon, s.versjon)
    this.varsle()
  }

  erLastet() { return this.bekreftet !== null }

  /** Nytt antall fra et trykk. Returnerer false hvis dagens antall ikke er lastet ennå. */
  sett(glass: number): boolean {
    if (!this.bekreftet) return false
    const g = Math.max(0, Math.min(VANN_MAKS, Math.round(glass)))
    this.sisteVersjon = Math.max(this.klokke(), this.sisteVersjon + 1)
    this.onsket = { glass: g, versjon: this.sisteVersjon }
    this.feil = null
    this.varsle()
    void this.pump()
    return true
  }

  /** Endring relativt til det som vises nå (+1 / −1) */
  endre(delta: number): boolean {
    const n = this.tilstand().glass
    return n === null ? false : this.sett(n + delta)
  }

  tilstand(): Vanntilstand { return this.snapshot }

  abonner = (f: () => void) => { this.lyttere.add(f); return () => { this.lyttere.delete(f) } }

  private varsle() {
    this.snapshot = { glass: this.onsket?.glass ?? this.bekreftet?.glass ?? null, lagrer: this.sender || !!this.onsket, feil: this.feil }
    this.lyttere.forEach(f => f())
  }

  private async sendMedForsok(mal: Vannstatus): Promise<Vannstatus> {
    for (let n = 0; ; n++) {
      try {
        return await this.send(mal.glass, mal.versjon)
      } catch (e) {
        if (n >= this.forsok || !erNettbrudd(e)) throw e
        await this.vent(Math.min(8000, 1000 * 2 ** n))
        // Et nyere trykk har kommet: ikke send dette igjen, det nyeste tar over
        if (this.onsket !== mal) throw new Erstattet()
      }
    }
  }

  private async pump() {
    if (this.sender) return
    this.sender = true
    this.varsle()
    try {
      while (this.onsket) {
        const mal = this.onsket
        try {
          const svar = await this.sendMedForsok(mal)
          if (!this.bekreftet || svar.versjon >= this.bekreftet.versjon) this.bekreftet = svar
          this.sisteVersjon = Math.max(this.sisteVersjon, svar.versjon)
          if (this.onsket === mal) this.onsket = null
        } catch (e) {
          if (e instanceof Erstattet) continue
          // Lagringen feilet: vis det som er lagret igjen – med mindre et nyere trykk venter
          if (this.onsket === mal) { this.onsket = null; this.feil = e }
        }
        this.varsle()
      }
    } finally {
      this.sender = false
      this.varsle()
    }
  }
}

// Én kø per bruker og dato: dager blandes aldri, og en ny side for samme dag bruker samme kø.
const koer = new Map<string, Vannko>()

export function hentVannko(brukerId: string, dato: string, lagSender: () => VannSender): Vannko {
  const k = `${brukerId}:${dato}`
  let ko = koer.get(k)
  if (!ko) { ko = new Vannko(lagSender()); koer.set(k, ko) }
  return ko
}

/** Ved utlogging */
export function tomVannkoer() { koer.clear() }
