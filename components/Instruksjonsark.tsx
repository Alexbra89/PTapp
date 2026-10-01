'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { finnOvelseNavn, muskler, utstyrType, MUSKELNAVN, UTSTYRNAVN } from '@/data/ovelsesbibliotek'
import { Muskelkart } from '@/components/atelier/Muskelkart'
import { UtstyrIkon } from '@/components/atelier/UtstyrIkon'

interface Props {
  navn: string
  beskrivelse?: string
  tips?: string
  onLukk: () => void
}

// Bruksanvisning midt i økta: steg for steg, teknikkpunkter og muskelkart,
// uten å forlate økta. Faller tilbake til øktas egen tekst for øvelser som ikke er i biblioteket.
export default function Instruksjonsark({ navn, beskrivelse, tips, onLukk }: Props) {
  const o = finnOvelseNavn(navn) ?? finnOvelseNavn(navn.replace(/\s*\(.*?\)\s*/g, ' '))
  const m = o ? muskler(o) : null
  const u = o ? utstyrType(o) : null
  const tipsListe = o?.tips.length ? o.tips : tips && tips !== '–' ? [tips] : []
  const besk = o?.beskrivelse || beskrivelse

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onLukk() }
    window.addEventListener('keydown', esc)
    const forrige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = forrige }
  }, [onLukk])

  return createPortal(
    <>
      <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onLukk} />
      <motion.div
        className="bib-ark"
        role="dialog" aria-modal="true" aria-label={`Slik gjør du ${navn}`}
        initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        <div className="sheet-grip" />
        <div className="bib-ark-hode">
          <div>
            <span className="eyebrow eyebrow-gold">Slik gjør du</span>
            <h2 className="bib-ark-navn">{navn}</h2>
          </div>
          <button className="kal-modal-x" onClick={onLukk} aria-label="Lukk"><X size={16} strokeWidth={1.5} /></button>
        </div>

        {m && (
          <div className="bib-ark-kart">
            <Muskelkart {...m} hoyde={220} />
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
        )}

        {besk && <p className="bib-besk">{besk}</p>}

        {o && u && (
          <div className="bib-utstyr-rad">
            <UtstyrIkon type={u} size={18} />
            <span>{o.utstyr}</span>
            <span className="eyebrow" style={{ marginLeft: 'auto' }}>{UTSTYRNAVN[u]} · {o.vanskelighet}</span>
          </div>
        )}

        {o && o.utforing.length > 0 && (
          <section className="ins-seksjon">
            <h3 className="hq-section-title">Steg for <em>steg</em></h3>
            <ol className="ovd-steg">
              {o.utforing.map((s, i) => (
                <li key={i}>
                  <span className="ovd-steg-nr">{String(i + 1).padStart(2, '0')}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tipsListe.length > 0 && (
          <section className="ins-seksjon">
            <h3 className="hq-section-title">Teknikk<em>punkter</em></h3>
            <ol className="bib-tips">
              {tipsListe.map((t, i) => (
                <li key={i}><span className="bib-tips-nr">{String(i + 1).padStart(2, '0')}</span>{t}</li>
              ))}
            </ol>
          </section>
        )}

        {!o && !besk && tipsListe.length === 0 && (
          <p className="bib-besk">Denne øvelsen har ingen beskrivelse ennå.</p>
        )}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={onLukk}>
          Tilbake til økta
        </button>
      </motion.div>
    </>,
    document.body,
  )
}
