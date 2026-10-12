'use client'

import { useMemo, useState } from 'react'
import Melding from './Melding'
import {
  NAVN, type Basis, type Matvare, type NaeringDelvis, type Naeringsstoff,
  gyldigGtin, lesTall, normaliserStrekkode, validerNaering,
} from '@/lib/kosthold/naering'
import type { Matvareutkast } from '@/lib/kosthold/openfoodfacts'
import { nyId } from '@/lib/kosthold/linje'
import { useLagreMatvare, feilTekst, StrekkodeFinnesFeil, type Matvaredata } from '@/hooks/useKosthold'

type Felt = Naeringsstoff | 'kj'
const FELTER: { k: Felt; navn: string; enhet: string }[] = [
  { k: 'kcal', navn: 'Energi', enhet: 'kcal' },
  { k: 'kj', navn: 'Energi', enhet: 'kJ' },
  { k: 'protein', navn: 'Protein', enhet: 'g' },
  { k: 'karbohydrater', navn: 'Karbohydrater', enhet: 'g' },
  { k: 'sukker', navn: 'hvorav sukkerarter', enhet: 'g' },
  { k: 'fett', navn: 'Fett', enhet: 'g' },
  { k: 'mettet_fett', navn: 'hvorav mettet', enhet: 'g' },
  { k: 'fiber', navn: 'Kostfiber', enhet: 'g' },
  { k: 'salt', navn: 'Salt', enhet: 'g' },
]

export type Utgangspunkt = Partial<Matvareutkast> & {
  /** Felt som er lest med usikkerhet (OCR), med grunnen */
  usikre?: Partial<Record<Felt, string>>
  /** Basis er ukjent – brukeren må velge */
  basisUkjent?: boolean
  /** Bare per porsjon er lest; verdiene i skjemaet gjelder én porsjon av ukjent størrelse */
  perPorsjonUkjentStorrelse?: boolean
}

interface Props {
  userId: string
  utgangspunkt?: Utgangspunkt
  eksisterende?: Matvare
  onLagret: (m: Matvare) => void
  onAvbryt: () => void
  lagreTekst?: string
}

const tilTekst = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n * 10 ** d) / 10 ** d).replace('.', ',')

/** Registrer eller rediger en matvare. Ingen felt fylles inn med gjetninger – tomt betyr ukjent. */
export default function MatvareSkjema({ userId, utgangspunkt: u = {}, eksisterende: e, onLagret, onAvbryt, lagreTekst }: Props) {
  const [id] = useState(() => e?.id ?? nyId())
  const [navn, setNavn] = useState(e?.navn ?? u.navn ?? '')
  const [merke, setMerke] = useState(e?.merke ?? u.merke ?? '')
  const [strekkode, setStrekkode] = useState(e?.strekkode ?? u.strekkode ?? '')
  const [basis, setBasis] = useState<Basis | null>(e?.basis ?? (u.basisUkjent ? null : (u.basis ?? '100g')))
  const [verdier, setVerdier] = useState<Record<Felt, string>>(() => {
    const kilde: Partial<Record<Felt, number | null>> = e ? { ...e } : { ...(u.naering ?? {}), kj: u.kj ?? null }
    return Object.fromEntries(FELTER.map(f => [f.k, tilTekst(kilde[f.k] ?? null, f.k === 'kcal' || f.k === 'kj' ? 1 : 2)])) as Record<Felt, string>
  })
  const [usikre, setUsikre] = useState<Partial<Record<Felt, string>>>(u.usikre ?? {})
  const [porsjonNavn, setPorsjonNavn] = useState(e?.porsjon_navn ?? u.porsjon_navn ?? '')
  const [porsjonMengde, setPorsjonMengde] = useState(tilTekst(e?.porsjon_mengde ?? u.porsjon_mengde))
  const [porsjonEnhet, setPorsjonEnhet] = useState<'g' | 'ml'>(e?.porsjon_enhet ?? u.porsjon_enhet ?? 'g')
  const [stkVekt, setStkVekt] = useState(tilTekst(e?.stk_vekt))
  const [tetthet, setTetthet] = useState(tilTekst(e?.tetthet, 3))
  const [perPorsjon, setPerPorsjon] = useState(!!u.perPorsjonUkjentStorrelse)
  const [kontrollert, setKontrollert] = useState(false)
  const [visFeil, setVisFeil] = useState(false)
  const lagre = useLagreMatvare()

  const kreverKontroll = (u.kilde === 'etikett' || Object.keys(u.usikre ?? {}).length > 0) && !e

  const tall = useMemo(() => Object.fromEntries(FELTER.map(f => [f.k, lesTall(verdier[f.k])])) as Record<Felt, number | null>, [verdier])
  const naering: NaeringDelvis = { kcal: tall.kcal, protein: tall.protein, karbohydrater: tall.karbohydrater, fett: tall.fett, sukker: tall.sukker, mettet_fett: tall.mettet_fett, fiber: tall.fiber, salt: tall.salt }

  const feil: string[] = []
  if (!navn.trim()) feil.push('Gi matvaren et navn.')
  if (!basis) feil.push('Velg om verdiene gjelder per 100 g eller per 100 ml.')
  if (perPorsjon) feil.push('Verdiene gjelder én porsjon. Oppgi porsjonsstørrelsen og trykk «Regn om».')
  const v = validerNaering({ ...naering, kj: tall.kj }, basis ?? '100g')
  feil.push(...v.feil)
  const kode = strekkode.trim() ? normaliserStrekkode(strekkode) : ''
  if (kode && !gyldigGtin(kode)) feil.push('Strekkoden er ikke gyldig (8, 12, 13 eller 14 siffer med riktig kontrollsiffer).')
  const pm = lesTall(porsjonMengde), sv = lesTall(stkVekt), tt = lesTall(tetthet)
  if (Number.isNaN(pm) || (pm !== null && (pm <= 0 || pm > 5000))) feil.push('Porsjonsstørrelsen må være mellom 0 og 5000.')
  if (Number.isNaN(sv) || (sv !== null && (sv <= 0 || sv > 5000))) feil.push('Vekt per stykk må være mellom 0 og 5000 g.')
  if (Number.isNaN(tt) || (tt !== null && (tt < 0.2 || tt > 3))) feil.push('Tetthet må være mellom 0,2 og 3 g per ml.')
  const antallUsikre = Object.keys(usikre).length
  if (kreverKontroll && !kontrollert) feil.push('Bekreft at du har kontrollert verdiene mot etiketten.')

  const settVerdi = (k: Felt, s: string) => {
    setVerdier(x => ({ ...x, [k]: s }))
    if (usikre[k]) setUsikre(x => { const y = { ...x }; delete y[k]; return y })
  }

  const regnOmFraPorsjon = () => {
    if (!pm || pm <= 0) return
    const f = 100 / pm
    setVerdier(x => Object.fromEntries(FELTER.map(fe => {
      const t = lesTall(x[fe.k])
      return [fe.k, t === null || Number.isNaN(t) ? x[fe.k] : tilTekst(t * f, fe.k === 'kcal' || fe.k === 'kj' ? 1 : 2)]
    })) as Record<Felt, string>)
    setBasis(porsjonEnhet === 'ml' ? '100ml' : '100g')
    setPerPorsjon(false)
  }

  const send = async () => {
    setVisFeil(true)
    if (feil.length) return
    const data: Matvaredata = {
      navn: navn.trim().slice(0, 200), merke: merke.trim() || null, strekkode: kode || null,
      kilde: e?.kilde ?? u.kilde ?? 'manuell', basis: basis!,
      kcal: tall.kcal!, kj: tall.kj, protein: tall.protein, karbohydrater: tall.karbohydrater, fett: tall.fett,
      sukker: tall.sukker, mettet_fett: tall.mettet_fett, fiber: tall.fiber, salt: tall.salt,
      porsjon_navn: pm ? (porsjonNavn.trim().slice(0, 60) || null) : null,
      porsjon_mengde: pm || null, porsjon_enhet: pm ? porsjonEnhet : null,
      stk_vekt: sv || null, tetthet: tt || null,
    }
    try {
      const m = await lagre.mutateAsync({ userId, id, data, ny: !e })
      onLagret(m)
    } catch { /* vises under */ }
  }

  return (
    <div className="ko-ark" style={{ gap: '1rem' }}>
      {u.merknader && u.merknader.length > 0 && (
        <Melding type="info"><ul style={{ margin: 0, paddingLeft: '1rem' }}>{u.merknader.map(m => <li key={m}>{m}</li>)}</ul></Melding>
      )}
      {antallUsikre > 0 && (
        <Melding type="advarsel"><strong>{antallUsikre} {antallUsikre === 1 ? 'verdi er' : 'verdier er'} usikre</strong> og markert i oransje. Sjekk dem mot etiketten.</Melding>
      )}

      <div className="ko-skjema">
        <label className={`ko-felt pf-full${visFeil && !navn.trim() ? ' usikker' : ''}`}>
          <span className="eyebrow">Navn</span>
          <input className="input" value={navn} onChange={x => setNavn(x.target.value)} placeholder="F.eks. Havregryn" maxLength={200} data-testid="matvare-navn" />
        </label>
        <label className="ko-felt">
          <span className="eyebrow">Produsent</span>
          <input className="input" value={merke} onChange={x => setMerke(x.target.value)} placeholder="Valgfritt" maxLength={200} />
        </label>
        <label className="ko-felt">
          <span className="eyebrow">Strekkode</span>
          <input className="input" value={strekkode} onChange={x => setStrekkode(x.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Valgfritt" maxLength={14} />
        </label>

        <div className="ko-gruppe-tittel">
          <span className="eyebrow eyebrow-gold">Næringsinnhold</span>
          <div className="ko-enheter" role="radiogroup" aria-label="Verdiene gjelder">
            {(['100g', '100ml'] as const).map(b => (
              <button key={b} type="button" role="radio" aria-checked={basis === b} className={`ko-enhet${basis === b ? ' on' : ''}`} onClick={() => { setBasis(b); setPerPorsjon(false) }}>
                per {b === '100g' ? '100 g' : '100 ml'}
              </button>
            ))}
          </div>
        </div>
        {!basis && !perPorsjon && <div className="pf-full"><Melding type="advarsel">Fant ikke om verdiene gjelder per 100 g eller per 100 ml. Velg selv ut fra etiketten.</Melding></div>}
        {perPorsjon && (
          <div className="pf-full">
            <Melding type="advarsel">
              Etiketten oppgir bare verdier per porsjon. Oppgi porsjonsstørrelsen under og trykk <strong>Regn om</strong>, så lagres verdiene per 100 g/ml.
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input className="input" style={{ maxWidth: 120 }} inputMode="decimal" value={porsjonMengde} onChange={x => setPorsjonMengde(x.target.value)} placeholder="Størrelse" aria-label="Porsjonsstørrelse" />
                <div className="ko-enheter">
                  {(['g', 'ml'] as const).map(en => <button key={en} type="button" className={`ko-enhet${porsjonEnhet === en ? ' on' : ''}`} onClick={() => setPorsjonEnhet(en)}>{en}</button>)}
                </div>
                <button type="button" className="btn btn-ghost" onClick={regnOmFraPorsjon} disabled={!pm || pm <= 0}>Regn om</button>
              </div>
            </Melding>
          </div>
        )}

        {FELTER.map(f => {
          const usikker = usikre[f.k]
          const tom = verdier[f.k].trim() === ''
          return (
            <label key={f.k} className={`ko-felt${usikker ? ' usikker' : ''}${tom && f.k !== 'kj' ? ' mangler' : ''}`}>
              <span className="eyebrow">{f.navn} ({f.enhet}){f.k === 'kcal' ? ' *' : ''}</span>
              <input
                className="input" inputMode="decimal" autoComplete="off" value={verdier[f.k]}
                onChange={x => settVerdi(f.k, x.target.value)} placeholder={f.k === 'kcal' ? 'Påkrevd' : 'Ukjent'}
                aria-invalid={!!usikker} aria-describedby={usikker ? `hint-${f.k}` : undefined} data-testid={`felt-${f.k}`}
              />
              {usikker && <span className="ko-felt-hint" id={`hint-${f.k}`}>{usikker}</span>}
            </label>
          )
        })}
        <p className="ko-felt-hint pf-full">Tomme felt lagres som ukjent – ikke som 0. * Energi i kcal må fylles inn.</p>

        <div className="ko-gruppe-tittel"><span className="eyebrow eyebrow-gold">Mengder (valgfritt)</span></div>
        {!perPorsjon && (
          <>
            <label className="ko-felt">
              <span className="eyebrow">Porsjon</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" inputMode="decimal" value={porsjonMengde} onChange={x => setPorsjonMengde(x.target.value)} placeholder="F.eks. 40" style={{ minWidth: 0 }} />
                <div className="ko-enheter">
                  {(['g', 'ml'] as const).map(en => <button key={en} type="button" className={`ko-enhet${porsjonEnhet === en ? ' on' : ''}`} onClick={() => setPorsjonEnhet(en)}>{en}</button>)}
                </div>
              </div>
            </label>
            <label className="ko-felt">
              <span className="eyebrow">Navn på porsjon</span>
              <input className="input" value={porsjonNavn} onChange={x => setPorsjonNavn(x.target.value)} placeholder="F.eks. 1 skive" maxLength={60} />
            </label>
          </>
        )}
        <label className="ko-felt">
          <span className="eyebrow">Vekt per stykk (g)</span>
          <input className="input" inputMode="decimal" value={stkVekt} onChange={x => setStkVekt(x.target.value)} placeholder="F.eks. 60 for ett egg" />
        </label>
        <label className="ko-felt">
          <span className="eyebrow">Tetthet (g per ml)</span>
          <input className="input" inputMode="decimal" value={tetthet} onChange={x => setTetthet(x.target.value)} placeholder="F.eks. 1,03 for melk" />
          <span className="ko-felt-hint">Trengs bare for å veie en drikke i gram, eller måle fast mat i ml.</span>
        </label>
      </div>

      {v.advarsler.length > 0 && <Melding type="advarsel"><ul style={{ margin: 0, paddingLeft: '1rem' }}>{v.advarsler.map(a => <li key={a}>{a}</li>)}</ul></Melding>}

      {kreverKontroll && (
        <label className="ko-melding info" style={{ cursor: 'pointer', alignItems: 'center' }}>
          <input type="checkbox" checked={kontrollert} onChange={x => setKontrollert(x.target.checked)} style={{ width: 20, height: 20, accentColor: '#C9A96E' }} data-testid="bekreft-kontroll" />
          <span>Jeg har kontrollert verdiene mot etiketten.</span>
        </label>
      )}

      {visFeil && feil.length > 0 && <Melding type="feil"><ul style={{ margin: 0, paddingLeft: '1rem' }}>{feil.map(f => <li key={f}>{f}</li>)}</ul></Melding>}
      {lagre.error instanceof StrekkodeFinnesFeil ? (
        <Melding type="advarsel">
          {lagre.error.message} Vil du bruke den lagrede varen, eller rette strekkoden over?
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary konto-knapp" onClick={() => onLagret((lagre.error as StrekkodeFinnesFeil).matvare)} data-testid="bruk-lagret">Bruk lagret vare</button>
          </div>
        </Melding>
      ) : lagre.isError && <Melding type="feil">{feilTekst(lagre.error)}</Melding>}

      <div className="ko-ark-knapper">
        <button type="button" className="btn btn-ghost" onClick={onAvbryt} disabled={lagre.isPending}>Avbryt</button>
        <button type="button" className="btn btn-primary" onClick={send} disabled={lagre.isPending} data-testid="lagre-matvare">
          {lagre.isPending ? <span className="spinner" /> : (lagreTekst ?? 'Lagre matvare')}
        </button>
      </div>
    </div>
  )
}

export const FELTNAVN = NAVN
