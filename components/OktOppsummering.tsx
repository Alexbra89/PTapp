'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUp, ArrowDown, Minus, Share2, Trophy } from 'lucide-react'
import { TelleTall } from '@/components/atelier/TelleTall'
import { oppsummer, type OvelseResultat } from '@/lib/oppsummering'
import { lagDelebilde, delBilde } from '@/lib/delebilde'
import { fmtKg } from '@/lib/progresjon'

interface Props {
  tittel: string
  tidSek: number
  sett: number
  ovelser: OvelseResultat[]
  nyePR: Record<string, number>
  onFerdig: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

export default function OktOppsummering({ tittel, tidSek, sett, ovelser, nyePR, onFerdig }: Props) {
  const o = useMemo(() => oppsummer(ovelser), [ovelser])
  const [deler, setDeler] = useState(false)
  const [delStatus, setDelStatus] = useState('')
  const dato = new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
  const rekorder = Object.entries(nyePR).map(([n, kg]) => `${n} ${fmtKg(kg)} kg`)
  const minutter = Math.max(1, Math.round(tidSek / 60))

  const del = async () => {
    setDeler(true); setDelStatus('')
    try {
      const blob = await lagDelebilde({
        tittel, dato, endring: o.endring, rekorder,
        tall: [
          { verdi: String(minutter), etikett: 'Minutter' },
          { verdi: String(sett), etikett: 'Sett' },
          { verdi: o.volum >= 10000 ? `${fmtKg(Math.round(o.volum / 100) / 10)}t` : String(o.volum), etikett: o.volum >= 10000 ? 'Tonn løftet' : 'Kg løftet' },
        ],
      })
      const r = await delBilde(blob, `ab-pt-${new Date().toISOString().slice(0, 10)}.png`)
      if (r === 'lastet') setDelStatus('Bildet er lastet ned.')
    } catch {
      setDelStatus('Kunne ikke lage bildet.')
    }
    setDeler(false)
  }

  const tall = [
    { v: minutter, l: 'Minutter' },
    { v: sett, l: 'Sett' },
    { v: o.volum, l: 'Kg løftet' },
  ]

  return (
    <div className="opp-sum">
      <span className="eyebrow eyebrow-gold">{dato}</span>
      <h2 className="feiring-tittel">Fullført<em>.</em></h2>
      <p className="feiring-sub">{tittel}</p>

      {rekorder.length > 0 && (
        <p className="feiring-pr"><Trophy size={13} strokeWidth={1.6} /> {rekorder.length === 1 ? 'Ny rekord' : `${rekorder.length} nye rekorder`}: {rekorder.join(' · ')}</p>
      )}

      <div className="feiring-tall">
        {tall.map((t, i) => (
          <motion.div key={t.l} className="feiring-tall-kol" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.12, duration: 0.8, ease: EASE }}>
            <div className="num-monument"><TelleTall verdi={t.v} forsinkelse={0.8 + i * 0.12} /></div>
            <span className="eyebrow">{t.l}</span>
          </motion.div>
        ))}
      </div>

      {o.endring !== null && (
        <motion.p className={`opp-sum-endring${o.endring >= 0 ? ' opp' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          {o.endring >= 0 ? <ArrowUp size={13} strokeWidth={1.8} /> : <ArrowDown size={13} strokeWidth={1.8} />}
          {o.endring > 0 ? '+' : ''}{o.endring} % volum mot forrige gang
        </motion.p>
      )}

      <motion.ul className="opp-sum-liste" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8, ease: EASE }}>
        {o.perOvelse.map(p => (
          <li key={p.navn}>
            <span className="opp-sum-navn">{p.navn}</span>
            <span className="opp-sum-sett mono">{p.beste ? `${fmtKg(p.beste.kg)} kg × ${p.beste.reps}` : '–'}</span>
            <span className={`opp-sum-pil ${p.retning ?? ''}`} title={p.forrigeBeste ? `Sist: ${fmtKg(p.forrigeBeste.kg)} kg × ${p.forrigeBeste.reps}` : 'Første gang'}>
              {p.retning === 'opp' ? <ArrowUp size={12} strokeWidth={2} /> : p.retning === 'ned' ? <ArrowDown size={12} strokeWidth={2} /> : p.retning === 'lik' ? <Minus size={12} strokeWidth={2} /> : <span className="opp-sum-ny">Ny</span>}
            </span>
          </li>
        ))}
      </motion.ul>

      <div className="opp-sum-knapper">
        <button className="btn btn-ghost" onClick={del} disabled={deler}>
          <Share2 size={14} strokeWidth={1.6} /> {deler ? 'Lager bilde …' : 'Del økta'}
        </button>
        <button className="btn btn-primary hq-cta" onClick={onFerdig}>
          <span>Til kalenderen</span>
          <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
        </button>
      </div>
      {delStatus && <p className="opp-sum-status">{delStatus}</p>}
    </div>
  )
}
