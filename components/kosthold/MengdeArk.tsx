'use client'

import { useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import Ark from './Ark'
import Melding from './Melding'
import {
  MALTIDER, type Enhet, type Logglinje, type Maltid, type Matvare,
  basisTekst, beregnNaering, enhetNavn, lesTall, linjePer100, tilBasisMengde, tilgjengeligeEnheter, visGram, visKcal,
} from '@/lib/kosthold/naering'
import { endreMengde, lagLinje, nyId } from '@/lib/kosthold/linje'
import { useLoggMat, useEndreLogg, useSlettLogg, feilTekst } from '@/hooks/useKosthold'
import type { VarselData } from './Varsel'

type Props = {
  userId: string
  dato: string
  maltid: Maltid
  onLukk: () => void
  onLagret?: (l: Logglinje) => void
  vis: (v: VarselData) => void
} & ({ matvare: Matvare; linje?: undefined } | { linje: Logglinje; matvare?: Matvare | null })

const HURTIG: Record<Enhet, number[]> = { g: [50, 100, 150, 200, 250], ml: [100, 200, 250, 330, 500], porsjon: [0.5, 1, 1.5, 2], stk: [1, 2, 3, 4] }

function startverdi(m: Matvare | null | undefined, l?: Logglinje): { mengde: number; enhet: Enhet } {
  if (l) {
    // Matvaren er slettet: porsjon/stk kan ikke regnes om lenger – vis mengden i gram/ml
    if (!m && (l.enhet === 'porsjon' || l.enhet === 'stk')) return { mengde: Math.round(Number(l.basis_mengde) * 10) / 10, enhet: l.basis === '100ml' ? 'ml' : 'g' }
    return { mengde: Number(l.mengde), enhet: l.enhet }
  }
  if (!m) return { mengde: 100, enhet: 'g' }
  const enheter = tilgjengeligeEnheter(m)
  if (m.sist_mengde && m.sist_enhet && enheter.includes(m.sist_enhet)) return { mengde: Number(m.sist_mengde), enhet: m.sist_enhet }
  if (enheter.includes('porsjon')) return { mengde: 1, enhet: 'porsjon' }
  return { mengde: 100, enhet: m.basis === '100ml' ? 'ml' : 'g' }
}

const tallTekst = (n: number) => String(n).replace('.', ',')

/** Velg mengde for en matvare (ny registrering) eller endre/flytte/slette en registrering. */
export default function MengdeArk(p: Props) {
  const { userId, onLukk, vis } = p
  const endrer = !!p.linje
  const matvare = p.matvare ?? null
  const start = startverdi(matvare, p.linje)
  const [mengdeTekst, setMengdeTekst] = useState(tallTekst(start.mengde))
  const [enhet, setEnhet] = useState<Enhet>(start.enhet)
  const [maltid, setMaltid] = useState<Maltid>(p.linje?.maltid ?? p.maltid)
  const [dato, setDato] = useState(p.linje?.dato ?? p.dato)
  const [bekreftSlett, setBekreftSlett] = useState(false)
  // Én id per ark: dobbelttrykk eller nytt forsøk kan aldri gi to registreringer
  const [nyLinjeId] = useState(() => nyId())
  const sendt = useRef(false)

  const logg = useLoggMat()
  const endre = useEndreLogg()
  const slett = useSlettLogg()

  // Enheter: for en eksisterende linje uten matvare bare basisenheten
  const enheter: Enhet[] = useMemo(() => {
    if (matvare) return tilgjengeligeEnheter({ ...matvare, basis: p.linje?.basis ?? matvare.basis })
    return [p.linje!.basis === '100ml' ? 'ml' : 'g']
  }, [matvare, p.linje])

  const mengde = lesTall(mengdeTekst)
  const per100 = p.linje ? linjePer100(p.linje) : matvare!
  const basis = p.linje?.basis ?? matvare!.basis
  const mengdeData = matvare ? { ...matvare, basis } : { basis, porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: null }
  const r = mengde === null || Number.isNaN(mengde) ? { ok: false as const, feil: 'Skriv inn en mengde.' } : tilBasisMengde(mengde, enhet, mengdeData)
  const naering = r.ok ? beregnNaering(per100, r.basisMengde) : null
  const navn = p.linje?.navn ?? matvare!.navn
  const merke = p.linje?.merke ?? matvare?.merke

  const lagre = () => {
    if (!r.ok || mengde === null || sendt.current) return
    sendt.current = true
    if (!endrer) {
      const res = lagLinje(matvare!, mengde, enhet, { brukerId: userId, dato, maltid, id: nyLinjeId })
      if (!res.ok) { sendt.current = false; return }
      const send = () => logg.mutate({ userId, linjer: [res.linje] }, {
        onError: e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }),
      })
      send()
      p.onLagret?.(res.linje)
      vis({ tekst: `Lagt til i ${MALTIDER.find(m => m.id === maltid)!.navn.toLowerCase()}` })
      onLukk()
      return
    }
    const res = endreMengde(p.linje!, mengde, enhet, matvare)
    if (!res.ok) { sendt.current = false; return }
    const ny = { ...res.linje, maltid, dato }
    const send = () => endre.mutate({ userId, gammelDato: p.linje!.dato, ny }, {
      onError: e => vis({ tekst: feilTekst(e), feil: true, handling: { tekst: 'Prøv igjen', gjor: send } }),
    })
    send()
    vis({ tekst: dato !== p.linje!.dato ? 'Flyttet til en annen dag' : 'Endringen er lagret' })
    onLukk()
  }

  const slettLinje = () => {
    if (!bekreftSlett) { setBekreftSlett(true); return }
    if (sendt.current) return
    sendt.current = true
    const linje = p.linje!
    slett.mutate({ userId, linje }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) })
    vis({
      tekst: `${linje.navn} er slettet`,
      handling: { tekst: 'Angre', gjor: () => logg.mutate({ userId, linjer: [linje] }, { onError: e => vis({ tekst: feilTekst(e), feil: true }) }) },
    })
    onLukk()
  }

  return (
    <Ark tittel={navn} overtittel={endrer ? 'Endre registrering' : 'Hvor mye?'} onLukk={onLukk}>
      <p className="pf-dempet" style={{ marginTop: -6 }}>
        {merke ? `${merke} · ` : ''}{visKcal(per100.kcal)} kcal {basisTekst(basis)}
      </p>

      <div className="ko-mengde">
        <label className="ko-felt" style={{ minWidth: 0 }}>
          <span className="eyebrow">Mengde</span>
          <input
            className="input" inputMode="decimal" autoComplete="off" value={mengdeTekst}
            onChange={e => setMengdeTekst(e.target.value)} onFocus={e => e.target.select()}
            aria-invalid={!r.ok} data-testid="mengde"
          />
        </label>
        <div className="ko-felt">
          <span className="eyebrow">Enhet</span>
          <div className="ko-enheter" role="radiogroup" aria-label="Enhet">
            {enheter.map(e => (
              <button key={e} type="button" role="radio" aria-checked={enhet === e} className={`ko-enhet${enhet === e ? ' on' : ''}`}
                onClick={() => { setEnhet(e); if (e !== enhet) setMengdeTekst(tallTekst(e === 'porsjon' || e === 'stk' ? 1 : 100)) }}>
                {enhetNavn(e, 1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ko-hurtig">
        {HURTIG[enhet].map(h => (
          <button key={h} type="button" className={`ko-chip${mengde === h ? ' on' : ''}`} onClick={() => setMengdeTekst(tallTekst(h))}>
            {tallTekst(h)} {enhetNavn(enhet, h)}
          </button>
        ))}
      </div>
      {enhet === 'porsjon' && matvare?.porsjon_mengde && (
        <p className="ko-felt-hint">1 porsjon = {tallTekst(matvare.porsjon_mengde)} {matvare.porsjon_enhet}{matvare.porsjon_navn ? ` (${matvare.porsjon_navn})` : ''}</p>
      )}
      {enhet === 'stk' && matvare?.stk_vekt && <p className="ko-felt-hint">1 stk = {tallTekst(matvare.stk_vekt)} g</p>}

      {!r.ok && mengdeTekst.trim() !== '' && <Melding type="advarsel">{r.feil}</Melding>}

      <div className="ko-naering" aria-live="polite">
        <div><span className="num-monument">{naering ? visKcal(naering.kcal) : '–'}</span><small>kcal</small></div>
        <div><span className="num-monument">{naering ? visGram(naering.protein) : '–'}</span><small>Protein</small></div>
        <div><span className="num-monument">{naering ? visGram(naering.karbohydrater) : '–'}</span><small>Karbo</small></div>
        <div><span className="num-monument">{naering ? visGram(naering.fett) : '–'}</span><small>Fett</small></div>
      </div>

      <div className="ko-felt">
        <span className="eyebrow">Måltid</span>
        <div className="ko-maltidvalg" role="radiogroup" aria-label="Måltid">
          {MALTIDER.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={maltid === m.id} className={`ko-chip${maltid === m.id ? ' on' : ''}`} onClick={() => setMaltid(m.id)}>{m.navn}</button>
          ))}
        </div>
      </div>

      {endrer && (
        <label className="ko-felt">
          <span className="eyebrow">Dato</span>
          <input type="date" className="input" value={dato} onChange={e => e.target.value && setDato(e.target.value)} />
        </label>
      )}

      <div className="ko-ark-knapper">
        {endrer && (
          <button className={`btn btn-ghost${bekreftSlett ? ' konto-fare-knapp' : ''}`} onClick={slettLinje}>
            <Trash2 size={15} strokeWidth={1.5} /> {bekreftSlett ? 'Bekreft sletting' : 'Slett'}
          </button>
        )}
        <button className="btn btn-primary" onClick={lagre} disabled={!r.ok} data-testid="lagre-mengde">
          {endrer ? 'Lagre endring' : 'Legg til'}
        </button>
      </div>
    </Ark>
  )
}
