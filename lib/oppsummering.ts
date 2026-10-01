// Tall til oppsummeringen etter økta – rene funksjoner, så de kan testes.

export interface SettLogg { reps: number; kg: number; fullfort?: boolean }
export interface OvelseResultat { navn: string; sett: SettLogg[]; forrige?: { reps: number; kg: number }[] }

export interface OvelseOppsummering {
  navn: string
  beste: { kg: number; reps: number } | null
  forrigeBeste: { kg: number; reps: number } | null
  retning: 'opp' | 'ned' | 'lik' | null
}

export interface Oppsummering {
  volum: number                 // kg × reps for fullførte sett
  endring: number | null        // prosent mot forrige gang, bare for øvelser med historikk
  perOvelse: OvelseOppsummering[]
}

const volumAv = (sett: { reps: number; kg: number }[]) => sett.reduce((s, x) => s + (x.kg || 0) * (x.reps || 0), 0)

// Tyngste sett; ved lik vekt teller flest reps
const besteSett = (sett: { reps: number; kg: number }[]) =>
  sett.filter(s => s.kg > 0).reduce<{ kg: number; reps: number } | null>(
    (b, s) => !b || s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps) ? { kg: s.kg, reps: s.reps } : b, null)

export function oppsummer(ovelser: OvelseResultat[]): Oppsummering {
  const fullforte = (o: OvelseResultat) => o.sett.filter(s => s.fullfort !== false)
  const volum = Math.round(ovelser.reduce((s, o) => s + volumAv(fullforte(o)), 0))

  const medHistorikk = ovelser.filter(o => o.forrige?.length && volumAv(o.forrige) > 0)
  const forrigeVolum = medHistorikk.reduce((s, o) => s + volumAv(o.forrige!), 0)
  const sammeVolum = medHistorikk.reduce((s, o) => s + volumAv(fullforte(o)), 0)
  const endring = forrigeVolum > 0 ? Math.round(((sammeVolum - forrigeVolum) / forrigeVolum) * 100) : null

  const perOvelse = ovelser.map(o => {
    const beste = besteSett(fullforte(o))
    const forrigeBeste = o.forrige ? besteSett(o.forrige) : null
    let retning: OvelseOppsummering['retning'] = null
    if (beste && forrigeBeste) {
      const a = beste.kg * (1 + beste.reps / 30), b = forrigeBeste.kg * (1 + forrigeBeste.reps / 30) // estimert 1RM
      retning = Math.abs(a - b) < 0.01 ? 'lik' : a > b ? 'opp' : 'ned'
    }
    return { navn: o.navn, beste, forrigeBeste, retning }
  })
  return { volum, endring, perOvelse }
}

// Stoppeklokka hvis den er brukt, ellers tiden siden økta startet (maks 4 timer)
export function varighetSek(stoppeklokke: number, startet: number, naa = Date.now()): number {
  if (stoppeklokke >= 60) return stoppeklokke
  return Math.max(0, Math.min(Math.round((naa - startet) / 1000), 4 * 3600))
}

export const fmtVarighet = (sek: number) => {
  const t = Math.floor(sek / 3600), m = Math.round((sek % 3600) / 60)
  return t ? `${t} t ${m} min` : `${m} min`
}
