'use client'

import { motion } from 'framer-motion'
import { Volume2, Vibrate, Timer } from 'lucide-react'
import { useInnstillinger, lagreInnstillinger, vibrer } from '@/lib/innstillinger'
import { lyd } from '@/lib/lyd'

const HVILEVALG: { v: 'ovelse' | number; l: string }[] = [
  { v: 'ovelse', l: 'Fra øvelsen' }, { v: 60, l: '60 s' }, { v: 90, l: '90 s' }, { v: 120, l: '2 min' }, { v: 180, l: '3 min' },
]

function Bryter({ paa, onBytt, etikett }: { paa: boolean; onBytt: () => void; etikett: string }) {
  return (
    <button role="switch" aria-checked={paa} aria-label={etikett} className={`del-bryter${paa ? ' on' : ''}`} onClick={onBytt}>
      <motion.span layout className="del-knott" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  )
}

export default function InnstillingerPanel() {
  const inn = useInnstillinger()
  return (
    <section className="pf-seksjon glass-card inn-panel">
      <span className="eyebrow">Innstillinger · denne enheten</span>
      <ul className="inn-liste">
        <li>
          <span className="inn-ikon"><Volume2 size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Lyd</strong><span>Signal når hvilen er over og i Tabata</span></div>
          <Bryter etikett="Lyd" paa={inn.lyd} onBytt={() => {
            lagreInnstillinger({ lyd: !inn.lyd })
            if (!inn.lyd) { lyd.klargjor(); lyd.arbeid() }
          }} />
        </li>
        <li>
          <span className="inn-ikon"><Vibrate size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Vibrasjon</strong><span>Kjennes selv med lyden av</span></div>
          <Bryter etikett="Vibrasjon" paa={inn.vibrasjon} onBytt={() => {
            lagreInnstillinger({ vibrasjon: !inn.vibrasjon })
            if (!inn.vibrasjon) vibrer(120)
          }} />
        </li>
        <li className="inn-hvile">
          <span className="inn-ikon"><Timer size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Hviletid mellom sett</strong><span>Starter automatisk når du huker av et sett</span></div>
          <div className="inn-valg" role="radiogroup" aria-label="Hviletid">
            {HVILEVALG.map(h => (
              <button key={String(h.v)} role="radio" aria-checked={inn.hvile === h.v}
                className={`inn-valg-knapp${inn.hvile === h.v ? ' on' : ''}`} onClick={() => lagreInnstillinger({ hvile: h.v })}>
                {h.l}
              </button>
            ))}
          </div>
        </li>
      </ul>
    </section>
  )
}
