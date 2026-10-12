'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Search, ScanBarcode, Camera, PenLine, Star, Plus, Globe, Repeat, ArrowLeft } from 'lucide-react'
import { useUser } from '@/hooks/useSupabaseQuery'
import { useMatvarer, useMaltidsmaler, useFavoritt, useLoggMat, useSlettLogg, feilTekst } from '@/hooks/useKosthold'
import {
  MALTIDER, erMaltid, gyldigDato, standardMaltid, basisTekst, visKcal, visGram, type Maltid, type Matvare, type Logglinje,
} from '@/lib/kosthold/naering'
import { lagLinje, linjerFraMal } from '@/lib/kosthold/linje'
import { sokMatvarer, type Filter } from '@/lib/kosthold/sok'
import type { Matvareutkast } from '@/lib/kosthold/openfoodfacts'
import type { Etikettresultat, Etikettfelt } from '@/lib/kosthold/etikett'
import { dagTekst, mengdeTekst } from '@/lib/kosthold/visning'
import { lokalDato } from '@/lib/dato'
import KostHode, { Datafeil } from '@/components/kosthold/KostHode'
import MengdeArk from '@/components/kosthold/MengdeArk'
import MatvareSkjema, { type Utgangspunkt } from '@/components/kosthold/MatvareSkjema'
import StrekkodeSkanner from '@/components/kosthold/StrekkodeSkanner'
import EtikettLeser from '@/components/kosthold/EtikettLeser'
import Ark from '@/components/kosthold/Ark'
import Melding from '@/components/kosthold/Melding'
import { useVarsel, Varsel, type VarselData } from '@/components/kosthold/Varsel'
import { useEttTrykk } from '@/hooks/useEttTrykk'
import { useErPaNett } from '@/hooks/useErPaNett'
import { hentMatApi } from '@/lib/kosthold/api'

const METODER = [
  { id: 'sok', navn: 'Søk', ikon: Search },
  { id: 'strekkode', navn: 'Strekkode', ikon: ScanBarcode },
  { id: 'etikett', navn: 'Etikett', ikon: Camera },
  { id: 'manuell', navn: 'Manuelt', ikon: PenLine },
] as const
type Metode = typeof METODER[number]['id']

type Oppslag =
  | { type: 'laster'; kode: string }
  | { type: 'ukjent'; kode: string }
  | { type: 'feil'; kode: string; tekst: string; utlogget?: boolean }

/** Etikettresultat → utgangspunkt for skjemaet. Usikre og utregnede verdier merkes. */
function fraEtikett(r: Etikettresultat, strekkode?: string): Utgangspunkt {
  const usikre: Utgangspunkt['usikre'] = {}
  for (const [k, f] of Object.entries(r.verdier) as [Etikettfelt, Etikettresultat['verdier'][Etikettfelt]][]) {
    if (f.verdi !== null && (f.usikker || f.beregnet)) usikre[k] = f.grunn ?? (f.beregnet ? 'Regnet ut' : 'Usikker')
  }
  const v = (k: Etikettfelt) => r.verdier[k].verdi
  return {
    kilde: 'etikett', strekkode: strekkode ?? null, basis: r.basis ?? '100g', basisUkjent: !r.basis && !r.trengerPorsjonsstorrelse,
    perPorsjonUkjentStorrelse: r.trengerPorsjonsstorrelse,
    naering: { kcal: v('kcal'), protein: v('protein'), karbohydrater: v('karbohydrater'), fett: v('fett'), sukker: v('sukker'), mettet_fett: v('mettet_fett'), fiber: v('fiber'), salt: v('salt') },
    kj: v('kj'),
    porsjon_mengde: r.porsjon?.mengde ?? null, porsjon_enhet: r.porsjon?.enhet ?? null,
    merknader: r.merknader, usikre,
  }
}

function LeggTil() {
  const router = useRouter()
  const sp = useSearchParams()
  const idag = lokalDato()
  const metode: Metode = (METODER.find(m => m.id === sp.get('metode'))?.id) ?? 'sok'
  const dato = gyldigDato(sp.get('dato')) && sp.get('dato')! <= idag ? sp.get('dato')! : idag
  const [maltid, setMaltid] = useState<Maltid>(erMaltid(sp.get('maltid')) ? sp.get('maltid') as Maltid : standardMaltid())
  const byttMetode = (m: Metode) => {
    const p = new URLSearchParams(sp.toString()); p.set('metode', m); p.set('maltid', maltid)
    router.replace(`/kosthold/legg-til?${p}`, { scroll: false })
  }

  const { data: user } = useUser()
  const uid = user?.id
  const matvarerQ = useMatvarer(uid)
  const matvarer = useMemo(() => matvarerQ.data ?? [], [matvarerQ.data])
  const { data: maler = [] } = useMaltidsmaler(uid)
  const favoritt = useFavoritt()
  const logg = useLoggMat()
  const slett = useSlettLogg()
  const { varsel, vis: visRaa, skjul } = useVarsel()
  const ettTrykk = useEttTrykk()
  const paNett = useErPaNett()
  const dagbokUrl = dato === idag ? '/kosthold' : `/kosthold?dato=${dato}`
  const vis = useCallback((v: VarselData) => visRaa(!v.feil && !v.handling ? { ...v, handling: { tekst: 'Se dagbok', gjor: () => router.push(dagbokUrl) } } : v), [visRaa, router, dagbokUrl])

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter | 'maler'>('alle')
  const [valgt, setValgt] = useState<Matvare | null>(null)
  const [skjema, setSkjema] = useState<{ tittel: string; utgangspunkt: Utgangspunkt; raatekst?: string } | null>(null)
  const [oppslag, setOppslag] = useState<Oppslag | null>(null)
  const [etikettKode, setEtikettKode] = useState<string | undefined>()
  const [manuellNr, setManuellNr] = useState(0)
  const [eksterne, setEksterne] = useState<{ q: string; laster: boolean; treff: Matvareutkast[]; feil?: string } | null>(null)

  const treff = useMemo(() => filter === 'maler' ? [] : sokMatvarer(matvarer, q, filter), [matvarer, q, filter])

  // Registrer med ett trykk med sist brukte mengde. useEttTrykk hindrer duplikater ved dobbelttrykk
  // og gjenbruker samme id-er hvis brukeren trykker igjen etter en feil (svaret kan ha gått tapt).
  const leggTilIgjen = (m: Matvare) => {
    if (!uid || !m.sist_mengde || !m.sist_enhet) return
    const forsok = lagLinje(m, m.sist_mengde, m.sist_enhet, { brukerId: uid, dato, maltid })
    if (!forsok.ok) { setValgt(m); return }
    const send = () => ettTrykk.registrer(`igjen:${m.id}:${dato}:${maltid}`, () => {
      const r = lagLinje(m, m.sist_mengde!, m.sist_enhet!, { brukerId: uid, dato, maltid })
      return r.ok ? [r.linje] : []
    }, { userId: uid })?.then(
      linjer => vis({ tekst: `${m.navn} (${mengdeTekst(m.sist_mengde!, m.sist_enhet!)}) lagt til`, handling: { tekst: 'Angre', gjor: () => linjer.forEach(linje => slett.mutate({ userId: uid, linje }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })) } }),
      e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }),
    )
    send()
  }

  const brukMal = (id: string) => {
    const m = maler.find(x => x.id === id)
    if (!uid || !m) return
    const sted = { brukerId: uid, dato, maltid: m.maltid ?? maltid }
    const r = linjerFraMal(m, matvarer, sted)
    if (r.feil) { vis({ tekst: r.feil, feil: true }); return }
    const send = () => ettTrykk.registrer(`mal:${m.id}:${dato}:${sted.maltid}`, () => linjerFraMal(m, matvarer, sted).linjer, { userId: uid, malId: m.id })?.then(
      linjer => vis({ tekst: `«${m.navn}» registrert`, handling: { tekst: 'Angre', gjor: () => linjer.forEach((l: Logglinje) => slett.mutate({ userId: uid, linje: l })) } }),
      e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }),
    )
    send()
  }

  const sokEksternt = async () => {
    const sporring = q.trim()
    if (sporring.length < 2) return
    setEksterne({ q: sporring, laster: true, treff: [] })
    const svar = await hentMatApi<{ treff: Matvareutkast[] }>(`/api/mat/sok?q=${encodeURIComponent(sporring)}`)
    setEksterne(svar.ok ? { q: sporring, laster: false, treff: svar.data.treff ?? [] } : { q: sporring, laster: false, treff: [], feil: svar.melding })
  }

  const slaOpp = useCallback(async (kode: string) => {
    // 1. Brukerens egne matvarer – ingen nettverk nødvendig
    const egen = matvarer.find(m => m.strekkode === kode)
    if (egen) { setOppslag(null); setValgt(egen); return }
    // 2. Open Food Facts via serveren
    setOppslag({ type: 'laster', kode })
    const svar = await hentMatApi<{ funnet: boolean; utkast?: Matvareutkast }>(`/api/mat/strekkode/${kode}`)
    if (!svar.ok) { setOppslag({ type: 'feil', kode, tekst: svar.melding, utlogget: svar.type === 'utlogget' }); return }
    if (!svar.data.funnet || !svar.data.utkast) { setOppslag({ type: 'ukjent', kode }); return }
    setOppslag(null)
    const u = svar.data.utkast
    setSkjema({ tittel: 'Kontroller varen', utgangspunkt: { ...u, merknader: [`Hentet fra Open Food Facts (åpen, dugnadsbasert database). Kontroller mot pakken.`, ...u.merknader] } })
  }, [matvarer])

  const rad = (m: Matvare) => (
    <div key={m.id} className="ko-rad" style={{ cursor: 'default' }} data-testid="matvare-rad">
      <button style={{ all: 'unset', cursor: 'pointer', minWidth: 0, display: 'block' }} onClick={() => setValgt(m)}>
        <div className="ko-rad-navn">{m.navn}{m.favoritt && <span className="ko-merke gull">Favoritt</span>}</div>
        <div className="ko-rad-meta">{m.merke ? `${m.merke} · ` : ''}{visKcal(m.kcal)} kcal {basisTekst(m.basis)} · P {visGram(m.protein)}</div>
      </button>
      <div className="ko-rad-hoyre">
        {m.sist_mengde && m.sist_enhet && (
          <button className="ko-igjen-knapp" onClick={() => leggTilIgjen(m)} disabled={ettTrykk.laast(`igjen:${m.id}:${dato}:${maltid}`)} aria-label={`Legg til ${m.navn}, ${mengdeTekst(m.sist_mengde, m.sist_enhet)}`} data-testid="legg-til-igjen">
            <Plus size={13} /> {mengdeTekst(m.sist_mengde, m.sist_enhet)}
          </button>
        )}
        <button className={`ko-ikonknapp${m.favoritt ? ' on' : ''}`} onClick={() => uid && favoritt.mutate({ userId: uid, id: m.id, favoritt: !m.favoritt }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })}
          aria-label={m.favoritt ? 'Fjern favoritt' : 'Merk som favoritt'} aria-pressed={m.favoritt}>
          <Star size={17} strokeWidth={1.4} fill={m.favoritt ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="ko-page">
      <KostHode tittel={<>Legg <em>til</em></>} undertittel={`${dagTekst(dato)} · ${MALTIDER.find(m => m.id === maltid)!.navn}`} />

      {!paNett && <Melding type="advarsel"><strong>Du er uten nett.</strong> Du kan søke i dine lagrede matvarer, men ingenting lagres før du er på nett igjen.</Melding>}

      <div className="ko-felt">
        <span className="eyebrow">Legges i</span>
        <div className="ko-maltidvalg" role="radiogroup" aria-label="Måltid">
          {MALTIDER.map(m => <button key={m.id} role="radio" aria-checked={maltid === m.id} className={`ko-chip${maltid === m.id ? ' on' : ''}`} onClick={() => setMaltid(m.id)}>{m.navn}</button>)}
        </div>
        {dato !== idag && <span className="ko-felt-hint">Registreres på {dagTekst(dato)}. <Link href={dagbokUrl} style={{ color: 'var(--gold-hi)' }}>Tilbake til dagboken</Link></span>}
      </div>

      <div className="ko-filter" role="tablist" aria-label="Metode">
        {METODER.map(m => (
          <button key={m.id} role="tab" aria-selected={metode === m.id} className={`ko-chip${metode === m.id ? ' on' : ''}`} onClick={() => byttMetode(m.id)} data-testid={`metode-${m.id}`}>
            <m.ikon size={15} strokeWidth={1.5} /> {m.navn}
          </button>
        ))}
      </div>

      {matvarerQ.isError && <Datafeil feil={matvarerQ.error} onPrøvIgjen={() => matvarerQ.refetch()} />}

      {metode === 'sok' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form className="ko-sok" role="search" onSubmit={e => { e.preventDefault(); if (treff.length === 0) sokEksternt() }}>
            <Search size={17} />
            <input className="input" type="search" value={q} onChange={e => { setQ(e.target.value); setEksterne(null) }} placeholder="Søk i dine matvarer …" aria-label="Søk etter matvare" autoComplete="off" enterKeyHint="search" data-testid="sok" />
          </form>
          <div className="ko-filter">
            {([['alle', 'Alle'], ['favoritter', 'Favoritter'], ['nylig', 'Nylig brukt'], ['maler', 'Faste måltider']] as const).map(([id, navn]) => (
              <button key={id} className={`ko-chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>{navn}</button>
            ))}
          </div>

          {filter === 'maler' ? (
            maler.length === 0
              ? <p className="pf-dempet">Ingen faste måltider ennå. Registrer et måltid i dagboken og trykk bokmerket for å lagre det – eller lag et under <Link href="/kosthold/matvarer?vis=maltider" style={{ color: 'var(--gold-hi)' }}>Matvarer</Link>.</p>
              : <div className="ko-liste">{maler.map(m => (
                <div key={m.id} className="ko-rad" style={{ cursor: 'default' }}>
                  <div style={{ minWidth: 0 }}><div className="ko-rad-navn">{m.navn}</div><div className="ko-rad-meta">{m.linjer.length} matvarer</div></div>
                  <button className="ko-igjen-knapp" onClick={() => brukMal(m.id)} disabled={ettTrykk.laast(`mal:${m.id}:${dato}:${m.maltid ?? maltid}`)}><Repeat size={13} /> Registrer</button>
                </div>))}</div>
          ) : (
            <>
              {matvarerQ.isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><span className="spinner-lg" /></div> : treff.length > 0 ? (
                <div className="ko-liste">{treff.map(rad)}</div>
              ) : (
                <p className="pf-dempet">
                  {matvarer.length === 0 ? 'Du har ingen lagrede matvarer ennå. Skann en strekkode, fotografer en etikett eller søk i Open Food Facts – alt du registrerer, blir lagret her.'
                    : filter === 'favoritter' ? 'Ingen favoritter. Trykk stjernen på en matvare for å gjøre den til favoritt.'
                    : filter === 'nylig' && !q ? 'Ingenting brukt ennå.' : `Ingen av dine matvarer passer «${q}».`}
                </p>
              )}

              {q.trim().length >= 2 && !eksterne && (
                <button className="btn btn-ghost" onClick={sokEksternt} data-testid="sok-off"><Globe size={15} strokeWidth={1.5} /> Søk i Open Food Facts etter «{q.trim()}»</button>
              )}
              {eksterne && (
                <section aria-live="polite">
                  <div className="ko-liste-tittel"><span className="eyebrow eyebrow-gold">Open Food Facts · «{eksterne.q}»</span>{eksterne.laster && <span className="spinner" style={{ borderColor: 'rgba(242,236,225,0.2)', borderTopColor: 'var(--gold)' }} />}</div>
                  {eksterne.feil && <Melding type="feil">{eksterne.feil}</Melding>}
                  {!eksterne.laster && !eksterne.feil && eksterne.treff.length === 0 && <p className="pf-dempet">Ingen treff med næringsinnhold. Prøv et annet ord, skann strekkoden eller registrer manuelt.</p>}
                  {eksterne.treff.length > 0 && (
                    <div className="ko-liste">
                      {eksterne.treff.map((u, i) => (
                        <button key={(u.strekkode ?? '') + i} className="ko-rad" onClick={() => {
                          const egen = u.strekkode ? matvarer.find(m => m.strekkode === u.strekkode) : undefined
                          if (egen) setValgt(egen)
                          else setSkjema({ tittel: 'Kontroller varen', utgangspunkt: { ...u, merknader: ['Hentet fra Open Food Facts. Kontroller mot pakken.', ...u.merknader] } })
                        }} data-testid="off-treff">
                          <div style={{ minWidth: 0 }}>
                            <div className="ko-rad-navn">{u.navn}</div>
                            <div className="ko-rad-meta">{u.merke ? `${u.merke} · ` : ''}{visKcal(u.naering.kcal)} kcal {basisTekst(u.basis)}</div>
                          </div>
                          <Plus size={17} strokeWidth={1.4} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="ko-kilde" style={{ marginTop: 8 }}>Data fra <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a> (ODbL). Dugnadsbasert – kontroller verdiene.</p>
                </section>
              )}
              <button className="btn btn-subtle" onClick={() => setSkjema({ tittel: 'Ny matvare', utgangspunkt: { kilde: 'manuell', navn: q.trim() } })}><PenLine size={15} /> Registrer ny matvare</button>
            </>
          )}
        </section>
      )}

      {metode === 'strekkode' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {oppslag?.type === 'laster' && <Melding type="info"><span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><span className="spinner" style={{ borderColor: 'rgba(242,236,225,0.2)', borderTopColor: 'var(--gold)' }} /> Slår opp {oppslag.kode} …</span></Melding>}
          {oppslag?.type === 'ukjent' && (
            <Melding type="advarsel">
              <strong>Fant ikke {oppslag.kode} i Open Food Facts.</strong> Fotografer næringsinnholdet eller fyll inn selv – strekkoden lagres, så neste skanning går rett til varen.
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary konto-knapp" onClick={() => { setEtikettKode(oppslag.kode); setOppslag(null); byttMetode('etikett') }}><Camera size={14} /> Fotografer etiketten</button>
                <button className="btn btn-ghost konto-knapp" onClick={() => { setSkjema({ tittel: 'Ny matvare', utgangspunkt: { kilde: 'manuell', strekkode: oppslag.kode } }); setOppslag(null) }} data-testid="fyll-inn-selv">Fyll inn selv</button>
              </div>
            </Melding>
          )}
          {oppslag?.type === 'feil' && (
            <Melding type="feil">
              {oppslag.tekst}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {oppslag.utlogget
                  ? <a className="btn btn-primary konto-knapp" href={`/login?from=${encodeURIComponent('/kosthold/legg-til')}`}>Logg inn</a>
                  : <button className="btn btn-ghost konto-knapp" onClick={() => slaOpp(oppslag.kode)}>Prøv igjen</button>}
                <button className="btn btn-ghost konto-knapp" onClick={() => { setSkjema({ tittel: 'Ny matvare', utgangspunkt: { kilde: 'manuell', strekkode: oppslag.kode } }); setOppslag(null) }}>Fyll inn selv</button>
              </div>
            </Melding>
          )}
          {/* Kameraet er bare på når skanneren faktisk vises – ikke bak kontroll- eller mengdearket */}
          {!oppslag && !skjema && !valgt && <StrekkodeSkanner onKode={slaOpp} />}
          {!oppslag && (skjema || valgt) && <div className="ko-kamera" data-tilstand="pause" aria-hidden />}
          {oppslag && oppslag.type !== 'laster' && <button className="btn btn-ghost" onClick={() => setOppslag(null)}><ScanBarcode size={15} /> Skann en annen vare</button>}
          <p className="ko-kilde">Varen slås først opp blant dine egne matvarer, deretter i <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>. Bare strekkoden sendes – ingen bilder.</p>
        </section>
      )}

      {metode === 'etikett' && (
        <section>
          {etikettKode && <p className="ko-felt-hint" style={{ marginBottom: 10 }}>Strekkode {etikettKode} lagres sammen med varen.</p>}
          <EtikettLeser
            onResultat={(r, tekst) => setSkjema({ tittel: 'Kontroller verdiene', utgangspunkt: fraEtikett(r, etikettKode), raatekst: tekst })}
            onManuell={() => setSkjema({ tittel: 'Ny matvare', utgangspunkt: { kilde: 'manuell', strekkode: etikettKode ?? null } })}
          />
        </section>
      )}

      {metode === 'manuell' && uid && (
        <section className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 className="hq-section-title" style={{ marginBottom: '1rem' }}>Ny <em>matvare</em></h2>
          {/* Ny key etter lagring: skjemaet tømmes og neste vare blir en ny vare, ikke en overskriving */}
          <MatvareSkjema key={`manuell-${manuellNr}`} userId={uid} utgangspunkt={{ kilde: 'manuell' }} lagreTekst="Lagre og velg mengde"
            onLagret={m => { setManuellNr(n => n + 1); setValgt(m) }} onAvbryt={() => router.push(dagbokUrl)} />
        </section>
      )}

      <Link href={dagbokUrl} className="dash-back-button" style={{ alignSelf: 'center', textDecoration: 'none' }}><ArrowLeft size={13} /> Til dagboken</Link>

      <AnimatePresence>
        {skjema && uid && (
          <Ark key="skjema" overtittel={skjema.utgangspunkt.kilde === 'openfoodfacts' ? 'Fra Open Food Facts' : skjema.utgangspunkt.kilde === 'etikett' ? 'Lest fra etiketten' : 'Ny matvare'} tittel={skjema.tittel} onLukk={() => setSkjema(null)}>
            <MatvareSkjema userId={uid} utgangspunkt={skjema.utgangspunkt} lagreTekst="Lagre og velg mengde"
              onLagret={m => { setSkjema(null); setEtikettKode(undefined); setValgt(m) }} onAvbryt={() => setSkjema(null)} />
            {skjema.raatekst && (
              <details className="ko-raatekst"><summary>Teksten som ble lest</summary><pre>{skjema.raatekst}</pre></details>
            )}
          </Ark>
        )}
        {valgt && uid && (
          <MengdeArk key={valgt.id} userId={uid} dato={dato} maltid={maltid} matvare={valgt} onLukk={() => setValgt(null)} vis={vis} />
        )}
      </AnimatePresence>
      <Varsel varsel={varsel} skjul={skjul} />
    </div>
  )
}

export default function LeggTilSide() {
  return <Suspense fallback={null}><LeggTil /></Suspense>
}
