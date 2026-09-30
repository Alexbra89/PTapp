'use client'

import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Check, X, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OVELSER, muskler, visesBakfra, utstyrType, MUSKELNAVN, type Ovelse } from '@/data/ovelsesbibliotek'
import { MuskelkartMini } from '@/components/atelier/Muskelkart'
import { UtstyrIkon } from '@/components/atelier/UtstyrIkon'

// Det som sendes videre til økten – bevisst lite, fordi det havner i URL-en.
// Økt-siden slår opp resten (beskrivelse, tips, hvile) i biblioteket.
export interface ValgtOvelse {
  id: string
  navn: string
  sett: number
  reps: string
}

interface Props {
  onSelect: (ovelser: ValgtOvelse[]) => void
  valgteOvelser?: ValgtOvelse[]
}

const stor = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function OvelsesVelger({ onSelect, valgteOvelser = [] }: Props) {
  const [sokRaw, setSok] = useState('')
  const sok = useDeferredValue(sokRaw)
  const [kategori, setKategori] = useState('alle')
  const [valgte, setValgte] = useState<ValgtOvelse[]>(valgteOvelser)
  const [visNy, setVisNy] = useState(false)
  const [egne, setEgne] = useState<Ovelse[]>([])
  const supabase = createClient()

  useEffect(() => {
    const hent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('bruker_ovelser').select('*').eq('bruker_id', user.id)
      setEgne((data ?? []).map((o: any) => ({
        id: o.id, navn: o.navn, kategori: o.kategori ?? 'egne', muskelgruppe: o.muskelgruppe ?? '',
        vanskelighet: o.vanskelighet ?? 'Middels', utstyr: o.utstyr ?? '–', sted: o.sted ?? 'begge',
        beskrivelse: o.beskrivelse ?? '', tips: o.tips ?? [], sett: o.sett ?? 3, reps: String(o.reps ?? '10'),
        hvile: o.hvile ?? '60s', utforing: o.utforing ?? [],
      })))
    }
    hent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Valget meldes fortløpende – tidligere måtte man trykke «Bruk disse øvelsene»,
  // ellers forble startknappen deaktivert uten forklaring.
  useEffect(() => { onSelect(valgte) }, [valgte]) // eslint-disable-line react-hooks/exhaustive-deps

  const alle = useMemo(() => [...egne, ...OVELSER], [egne])
  const kategorier = useMemo(() => ['alle', ...Array.from(new Set(alle.map(o => o.kategori)))], [alle])

  const filtrert = useMemo(() => {
    const q = sok.trim().toLowerCase()
    return alle.filter(o =>
      (kategori === 'alle' || o.kategori === kategori) &&
      (!q || o.navn.toLowerCase().includes(q) || o.muskelgruppe.toLowerCase().includes(q))
    )
  }, [alle, kategori, sok])

  const velg = (o: Ovelse) => setValgte(v =>
    v.some(x => x.id === o.id) ? v.filter(x => x.id !== o.id) : [...v, { id: o.id, navn: o.navn, sett: o.sett, reps: o.reps }]
  )
  const endre = (id: string, felt: Partial<ValgtOvelse>) => setValgte(v => v.map(x => x.id === id ? { ...x, ...felt } : x))

  return (
    <div className="velger">
      <div className="velger-bibliotek">
        <div className="velger-sokrad">
          <label className="bib-sok">
            <Search size={15} strokeWidth={1.4} />
            <input className="input" placeholder="Søk øvelse eller muskel" value={sokRaw} onChange={e => setSok(e.target.value)} />
          </label>
          <button className="btn btn-ghost velger-ny" onClick={() => setVisNy(true)}><Plus size={14} /> Egen</button>
        </div>
        <div className="bib-kategorier" style={{ marginBottom: '1rem' }}>
          {kategorier.map(k => (
            <button key={k} className={`bib-kat${kategori === k ? ' on' : ''}`} onClick={() => setKategori(k)}>{k === 'alle' ? 'Alle' : stor(k)}</button>
          ))}
        </div>
        <ul className="velger-liste">
          {filtrert.map(o => {
            const m = muskler(o)
            const valgt = valgte.some(x => x.id === o.id)
            return (
              <li key={o.id}>
                <button className={`velger-rad${valgt ? ' on' : ''}`} onClick={() => velg(o)} aria-pressed={valgt}>
                  <span className="velger-kart"><MuskelkartMini {...m} bakfra={visesBakfra(m.primaer)} hoyde={46} /></span>
                  <span className="velger-info">
                    <span className="velger-navn">{o.navn}</span>
                    <span className="velger-meta">
                      <UtstyrIkon type={utstyrType(o)} size={12} />
                      {m.primaer.slice(0, 2).map(x => MUSKELNAVN[x]).join(' · ')}
                    </span>
                  </span>
                  <span className="velger-knapp">{valgt ? <Check size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={1.6} />}</span>
                </button>
              </li>
            )
          })}
          {filtrert.length === 0 && <li className="velger-tom">Ingen treff.</li>}
        </ul>
      </div>

      <div className="velger-okt">
        <div className="velger-okt-hode">
          <h3 className="hq-section-title">Din <em>økt</em></h3>
          <span className="eyebrow">{valgte.length} øvelser</span>
        </div>
        {valgte.length === 0 ? (
          <p className="velger-tom">Trykk på øvelser til venstre for å bygge økten.</p>
        ) : (
          <ol className="velger-valgte">
            <AnimatePresence initial={false}>
              {valgte.map((o, i) => (
                <motion.li key={o.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <span className="velger-nr">{String(i + 1).padStart(2, '0')}</span>
                  <span className="velger-valgt-navn">{o.navn}</span>
                  <span className="velger-stepper" aria-label="Sett">
                    <button onClick={() => endre(o.id, { sett: Math.max(1, o.sett - 1) })} aria-label="Færre sett"><Minus size={11} /></button>
                    <span className="mono">{o.sett}×</span>
                    <button onClick={() => endre(o.id, { sett: Math.min(10, o.sett + 1) })} aria-label="Flere sett"><Plus size={11} /></button>
                  </span>
                  <input className="input velger-reps" value={o.reps} onChange={e => endre(o.id, { reps: e.target.value })} aria-label="Reps" />
                  <button className="velger-fjern" onClick={() => setValgte(v => v.filter(x => x.id !== o.id))} aria-label="Fjern"><X size={13} /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      {visNy && <NyOvelse onClose={() => setVisNy(false)} onSave={o => { setEgne(e => [o, ...e]); setVisNy(false); velg(o) }} />}
    </div>
  )
}

function NyOvelse({ onClose, onSave }: { onClose: () => void; onSave: (o: Ovelse) => void }) {
  const [navn, setNavn] = useState('')
  const [kategori, setKategori] = useState('')
  const [muskelgruppe, setMuskelgruppe] = useState('')
  const [utstyr, setUtstyr] = useState('')
  const [sett, setSett] = useState(3)
  const [reps, setReps] = useState('10')
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState('')
  const supabase = createClient()

  const lagre = async () => {
    if (!navn.trim() || !kategori.trim()) return
    setLagrer(true); setFeil('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLagrer(false); setFeil('Du må være logget inn.'); return }
    const ny: Ovelse = {
      id: `egen-${Date.now()}`, navn: navn.trim(), kategori: kategori.trim().toLowerCase(),
      muskelgruppe: muskelgruppe || kategori, vanskelighet: 'Middels', utstyr: utstyr || '–', sted: 'begge',
      beskrivelse: '', tips: [], sett, reps, hvile: '60s', utforing: [],
    }
    const { error } = await supabase.from('bruker_ovelser').insert({ bruker_id: user.id, ...ny })
    setLagrer(false)
    // Tidligere forsvant feil i stillhet og modalen ble stående
    if (error) { setFeil(`Kunne ikke lagre: ${error.message}`); return }
    onSave(ny)
  }

  return createPortal(
    <div className="pr-modal-bg" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="glass-card" style={{ maxWidth: 480, width: '100%', padding: '1.75rem', borderRadius: 28 }} onClick={e => e.stopPropagation()}>
        <span className="eyebrow eyebrow-gold">Egen øvelse</span>
        <h3 className="hq-section-title" style={{ margin: '0.6rem 0 1.5rem' }}>Legg til i <em>biblioteket</em></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="velger-felt"><span className="eyebrow">Navn</span><input className="input" value={navn} onChange={e => setNavn(e.target.value)} placeholder="Kabel face pull med rotasjon" /></label>
          <label className="velger-felt"><span className="eyebrow">Kategori</span><input className="input" value={kategori} onChange={e => setKategori(e.target.value)} placeholder="skuldre, rygg, bryst …" /></label>
          <label className="velger-felt"><span className="eyebrow">Muskler</span><input className="input" value={muskelgruppe} onChange={e => setMuskelgruppe(e.target.value)} placeholder="Bakre deltoid, rotator cuff" /></label>
          <label className="velger-felt"><span className="eyebrow">Utstyr</span><input className="input" value={utstyr} onChange={e => setUtstyr(e.target.value)} placeholder="Kabelmaskin" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="velger-felt"><span className="eyebrow">Sett</span><input className="input" type="number" min={1} value={sett} onChange={e => setSett(parseInt(e.target.value) || 1)} /></label>
            <label className="velger-felt"><span className="eyebrow">Reps</span><input className="input" value={reps} onChange={e => setReps(e.target.value)} /></label>
          </div>
        </div>
        {feil && <div className="login-error-box" style={{ marginTop: 16 }}><span className="login-error-text">{feil}</span></div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={lagrer}>Avbryt</button>
          <button className="btn btn-primary" onClick={lagre} disabled={lagrer || !navn.trim() || !kategori.trim()}>{lagrer ? 'Lagrer …' : 'Lagre øvelse'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
