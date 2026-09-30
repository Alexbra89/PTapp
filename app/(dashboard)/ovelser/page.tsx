'use client'

import { useState, useMemo, useDeferredValue, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ArrowRight } from 'lucide-react'
import {
  OVELSER, muskler, visesBakfra, utstyrType, MUSKELNAVN, UTSTYRNAVN,
  type Ovelse, type Vanskelighetsgrad,
} from '@/data/ovelsesbibliotek'
import { Muskelkart, MuskelkartMini } from '@/components/atelier/Muskelkart'
import { UtstyrIkon } from '@/components/atelier/UtstyrIkon'

const KATEGORIER = ['alle', 'bryst', 'rygg', 'bein', 'skuldre', 'bicep', 'tricep', 'core', 'cardio', 'fullkropp', 'tabata', 'styrkeløft']
const STEDER = [['alle', 'Alle'], ['gym', 'Gym'], ['hjemme', 'Hjemme']] as const
const NIVA: Record<Vanskelighetsgrad, number> = { Nybegynner: 1, Middels: 2, Avansert: 3 }
const BATCH = 20

const stor = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const stedTekst = (s: Ovelse['sted']) => s === 'begge' ? 'Gym og hjemme' : s === 'gym' ? 'Gym' : 'Hjemme'

// Tre tikk for nivå – samme språk som fremdriftsstolpene
function Niva({ grad }: { grad: Vanskelighetsgrad }) {
  return (
    <span className="bib-niva" title={grad} aria-label={`Nivå: ${grad}`}>
      {[1, 2, 3].map(i => <i key={i} className={i <= NIVA[grad] ? 'on' : ''} />)}
    </span>
  )
}

function OvelseKort({ o, onVelg }: { o: Ovelse; onVelg: (o: Ovelse) => void }) {
  const m = muskler(o)
  const u = utstyrType(o)
  return (
    <button className="bib-kort glass-card" onClick={() => onVelg(o)}>
      <span className="bib-kort-kart">
        <MuskelkartMini {...m} bakfra={visesBakfra(m.primaer)} hoyde={96} />
      </span>
      <span className="bib-kort-info">
        <span className="bib-kort-muskel">{m.primaer.slice(0, 2).map(x => MUSKELNAVN[x]).join(' · ')}</span>
        <span className="bib-kort-navn">{o.navn}</span>
        <span className="bib-kort-meta">
          <span className="bib-utstyr"><UtstyrIkon type={u} size={14} /> {UTSTYRNAVN[u]}</span>
          <Niva grad={o.vanskelighet} />
        </span>
      </span>
    </button>
  )
}

function Gruppe({ kat, ovelser, onVelg }: { kat: string; ovelser: Ovelse[]; onVelg: (o: Ovelse) => void }) {
  const [antall, setAntall] = useState(BATCH)
  return (
    <section className="bib-gruppe">
      <header className="bib-gruppe-hode">
        <h2 className="bib-gruppe-tittel">{stor(kat)}</h2>
        <span className="eyebrow">{ovelser.length} øvelser</span>
      </header>
      <div className="bib-grid">
        {ovelser.slice(0, antall).map(o => <OvelseKort key={o.id} o={o} onVelg={onVelg} />)}
      </div>
      {antall < ovelser.length && (
        <button className="bib-mer" onClick={() => setAntall(a => a + BATCH)}>
          Vis {Math.min(BATCH, ovelser.length - antall)} til
        </button>
      )}
    </section>
  )
}

// Detaljark: glir opp fra bunnen på mobil, sentrert på desktop
function Detaljark({ o, onLukk }: { o: Ovelse; onLukk: () => void }) {
  const m = muskler(o)
  const u = utstyrType(o)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onLukk() }
    window.addEventListener('keydown', esc)
    const forrige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = forrige }
  }, [onLukk])

  // Portal til <body>: sidens inngangsanimasjon etterlater en transform, som ellers
  // gjør at position: fixed forankres til siden i stedet for skjermen.
  return createPortal(
    <>
      <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onLukk} />
      <motion.div
        className="bib-ark"
        role="dialog" aria-modal="true" aria-label={o.navn}
        initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="bib-ark-hode">
          <div>
            <span className="eyebrow eyebrow-gold">{stor(o.kategori)} · {stedTekst(o.sted)}</span>
            <h2 className="bib-ark-navn">{o.navn}</h2>
          </div>
          <button className="kal-modal-x" onClick={onLukk} aria-label="Lukk"><X size={16} strokeWidth={1.5} /></button>
        </div>

        <div className="bib-ark-kart">
          <Muskelkart {...m} hoyde={250} />
          <div className="bib-legende">
            <div>
              <span className="bib-prikk primaer" /> <span className="eyebrow">Primær</span>
              <p>{m.primaer.map(x => MUSKELNAVN[x]).join(', ')}</p>
            </div>
            {m.sekundaer.length > 0 && (
              <div>
                <span className="bib-prikk sekundaer" /> <span className="eyebrow">Støtte</span>
                <p>{m.sekundaer.map(x => MUSKELNAVN[x]).join(', ')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bib-tall">
          <div><span className="eyebrow">Sett</span><strong className="num-monument">{o.sett}</strong></div>
          <div><span className="eyebrow">Reps</span><strong className="num-monument">{o.reps}</strong></div>
          <div><span className="eyebrow">Hvile</span><strong className="num-monument">{o.hvile}</strong></div>
          <div><span className="eyebrow">Nivå</span><strong className="bib-tall-niva"><Niva grad={o.vanskelighet} /> {o.vanskelighet}</strong></div>
        </div>

        <p className="bib-besk">{o.beskrivelse}</p>

        <div className="bib-utstyr-rad">
          <UtstyrIkon type={u} size={18} />
          <span>{o.utstyr}</span>
        </div>

        {o.tips.length > 0 && (
          <ol className="bib-tips">
            {o.tips.map((t, i) => (
              <li key={i}><span className="bib-tips-nr">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ol>
        )}

        <Link href={`/ovelser/${encodeURIComponent(o.id)}`} className="btn btn-primary hq-cta" style={{ marginTop: '1.5rem' }}>
          <span>{o.utforing.length ? 'Steg for steg' : 'Åpne øvelsen'}</span>
          <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
        </Link>
      </motion.div>
    </>,
    document.body,
  )
}

export default function OvelsesPage() {
  const [kategori, setKategori] = useState('alle')
  const [sted, setSted]         = useState<'alle' | 'gym' | 'hjemme'>('alle')
  const [sokRaw, setSokRaw]     = useState('')
  const [valgt, setValgt]       = useState<Ovelse | null>(null)
  const sok = useDeferredValue(sokRaw)
  const lukk = useCallback(() => setValgt(null), [])

  const filtrert = useMemo(() => {
    let res = OVELSER
    if (kategori !== 'alle') res = res.filter(o => o.kategori === kategori)
    if (sted !== 'alle')     res = res.filter(o => o.sted === sted || o.sted === 'begge')
    const q = sok.trim().toLowerCase()
    if (q) {
      res = res.filter(o =>
        o.navn.toLowerCase().includes(q) ||
        o.muskelgruppe.toLowerCase().includes(q) ||
        o.utstyr.toLowerCase().includes(q) ||
        muskler(o).primaer.some(x => MUSKELNAVN[x].toLowerCase().includes(q))
      )
    }
    return res
  }, [kategori, sted, sok])

  const gruppert = useMemo(() => {
    const g: Record<string, Ovelse[]> = {}
    for (const o of filtrert) (g[o.kategori] ??= []).push(o)
    return g
  }, [filtrert])

  return (
    <div className="bib-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Biblioteket<em className="gold">.</em></h1>
        <p className="page-subtitle">{OVELSER.length} øvelser · muskelkart for hver av dem</p>
      </div>

      <div className="bib-verktoy">
        <label className="bib-sok">
          <Search size={16} strokeWidth={1.4} />
          <input
            className="input"
            placeholder="Søk etter øvelse, muskel eller utstyr"
            value={sokRaw}
            onChange={e => setSokRaw(e.target.value)}
            aria-label="Søk"
          />
          {sokRaw && <button onClick={() => setSokRaw('')} aria-label="Tøm søk"><X size={14} /></button>}
        </label>
        <div className="bib-sted" role="tablist">
          {STEDER.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={sted === k} className={sted === k ? 'on' : ''} onClick={() => setSted(k)}>
              {sted === k && <motion.span layoutId="bib-sted" className="bib-sted-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bib-kategorier">
        {KATEGORIER.map(k => (
          <button key={k} className={`bib-kat${kategori === k ? ' on' : ''}`} onClick={() => setKategori(k)}>
            {k === 'alle' ? 'Alle' : stor(k)}
          </button>
        ))}
      </div>

      {filtrert.length === 0 ? (
        <div className="bib-tom">
          <p className="serif">Ingen treff.</p>
          <span className="eyebrow">Prøv et annet søkeord eller fjern filtrene</span>
        </div>
      ) : (
        <div className="bib-grupper">
          {Object.entries(gruppert).map(([kat, ovs]) => (
            <Gruppe key={`${kat}-${kategori}-${sted}-${sok}`} kat={kat} ovelser={ovs} onVelg={setValgt} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {valgt && <Detaljark key={valgt.id} o={valgt} onLukk={lukk} />}
      </AnimatePresence>
    </div>
  )
}
