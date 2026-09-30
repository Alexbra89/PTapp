'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { finnOvelse, muskler, utstyrType, MUSKELNAVN, UTSTYRNAVN } from '@/data/ovelsesbibliotek'
import { Muskelkart } from '@/components/atelier/Muskelkart'
import { UtstyrIkon } from '@/components/atelier/UtstyrIkon'

const stor = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const inn: Variants = {
  skjult: { opacity: 0, y: 18 },
  vis: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }),
}

export default function OvelseDetaljside({ params }: { params: { id: string } }) {
  const ov = finnOvelse(params.id)

  if (!ov) return (
    <div className="ovd-tom">
      <span className="eyebrow">Ukjent øvelse</span>
      <h1 className="page-title">Fant den ikke<em className="gold">.</em></h1>
      <p>Øvelsen finnes ikke i biblioteket, eller lenken er utdatert.</p>
      <Link href="/ovelser" className="btn btn-ghost"><ArrowLeft size={14} /> Til biblioteket</Link>
    </div>
  )

  const m = muskler(ov)
  const u = utstyrType(ov)

  return (
    <motion.article className="ovd" initial="skjult" animate="vis">
      <motion.div variants={inn} custom={0}>
        <Link href="/ovelser" className="hq-link"><ArrowLeft size={12} /> Biblioteket</Link>
      </motion.div>

      <motion.header variants={inn} custom={1} className="ovd-hode">
        <span className="eyebrow eyebrow-gold">{stor(ov.kategori)} · {ov.sted === 'begge' ? 'Gym og hjemme' : stor(ov.sted)}</span>
        <h1 className="ovd-navn">{ov.navn}</h1>
        <p className="ovd-ingress">{ov.beskrivelse}</p>
      </motion.header>

      <motion.section variants={inn} custom={2} className="ovd-hero glass-card crop">
        <div className="ovd-kart"><Muskelkart {...m} hoyde={320} /></div>
        <div className="ovd-fakta">
          <div className="ovd-muskler">
            <div>
              <span className="eyebrow"><i className="bib-prikk primaer" /> Primær</span>
              <p className="ovd-muskel-navn">{m.primaer.map(x => MUSKELNAVN[x]).join(', ')}</p>
            </div>
            {m.sekundaer.length > 0 && (
              <div>
                <span className="eyebrow"><i className="bib-prikk sekundaer" /> Støtte</span>
                <p className="ovd-muskel-navn dempet">{m.sekundaer.map(x => MUSKELNAVN[x]).join(', ')}</p>
              </div>
            )}
          </div>
          <div className="bib-tall ovd-tall">
            <div><span className="eyebrow">Sett</span><strong className="num-monument">{ov.sett}</strong></div>
            <div><span className="eyebrow">Reps</span><strong className="num-monument">{ov.reps}</strong></div>
            <div><span className="eyebrow">Hvile</span><strong className="num-monument">{ov.hvile}</strong></div>
          </div>
          <div className="bib-utstyr-rad">
            <UtstyrIkon type={u} size={18} />
            <span>{ov.utstyr}</span>
            <span className="eyebrow" style={{ marginLeft: 'auto' }}>{UTSTYRNAVN[u]} · {ov.vanskelighet}</span>
          </div>
        </div>
      </motion.section>

      {ov.utforing.length > 0 && (
        <motion.section variants={inn} custom={3} className="ovd-seksjon">
          <h2 className="hq-section-title">Steg for <em>steg</em></h2>
          <ol className="ovd-steg">
            {ov.utforing.map((s, i) => (
              <li key={i}>
                <span className="ovd-steg-nr">{String(i + 1).padStart(2, '0')}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      {ov.tips.length > 0 && (
        <motion.section variants={inn} custom={4} className="ovd-seksjon">
          <h2 className="hq-section-title">Teknikk<em>punkter</em></h2>
          <ol className="bib-tips">
            {ov.tips.map((t, i) => (
              <li key={i}><span className="bib-tips-nr">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ol>
        </motion.section>
      )}

      <motion.div variants={inn} custom={5}>
        <Link href="/treninger" className="btn btn-primary hq-cta">
          <span>Sett sammen en økt</span>
          <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
        </Link>
      </motion.div>
    </motion.article>
  )
}
