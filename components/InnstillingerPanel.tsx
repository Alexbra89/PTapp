'use client'

import { motion } from 'framer-motion'
import { Volume2, Vibrate, Timer, Gauge, MapPin } from 'lucide-react'
import { useInnstillinger, lagreInnstillinger, vibrer, type Innstillinger } from '@/lib/innstillinger'
import { lyd } from '@/lib/lyd'

const HVILEVALG: { v: 'ovelse' | number; l: string }[] = [
  { v: 'ovelse', l: 'Fra øvelsen' }, { v: 60, l: '60 s' }, { v: 90, l: '90 s' }, { v: 120, l: '2 min' }, { v: 180, l: '3 min' },
]

const NIVAVALG: { v: Innstillinger['niva']; l: string }[] = [
  { v: undefined, l: 'Alle' }, { v: 'Nybegynner', l: 'Nybegynner' }, { v: 'Middels', l: 'Middels' }, { v: 'Avansert', l: 'Erfaren' },
]
const STEDVALG: { v: NonNullable<Innstillinger['sted']>; l: string }[] = [{ v: 'gym', l: 'Gym' }, { v: 'hjemme', l: 'Hjemme' }]

function Valg<T>({ valg, verdi, onVelg, etikett }: { valg: { v: T; l: string }[]; verdi: T; onVelg: (v: T) => void; etikett: string }) {
  return (
    <div className="inn-valg" role="radiogroup" aria-label={etikett}>
      {valg.map(h => (
        <button key={h.l} role="radio" aria-checked={verdi === h.v}
          className={`inn-valg-knapp${verdi === h.v ? ' on' : ''}`} onClick={() => onVelg(h.v)}>{h.l}</button>
      ))}
    </div>
  )
}

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
          <Valg etikett="Hviletid" valg={HVILEVALG} verdi={inn.hvile} onVelg={v => lagreInnstillinger({ hvile: v })} />
        </li>
        <li className="inn-hvile">
          <span className="inn-ikon"><Gauge size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Nivå</strong><span>Foreslåtte øvelser holdes på ditt nivå</span></div>
          <Valg etikett="Nivå" valg={NIVAVALG} verdi={inn.niva} onVelg={v => lagreInnstillinger({ niva: v })} />
        </li>
        <li className="inn-hvile">
          <span className="inn-ikon"><MapPin size={16} strokeWidth={1.4} /></span>
          <div className="inn-tekst"><strong>Trener mest</strong><span>Valgt på forhånd når du setter sammen en økt</span></div>
          <Valg etikett="Trener mest" valg={STEDVALG} verdi={inn.sted ?? 'gym'} onVelg={v => lagreInnstillinger({ sted: v })} />
        </li>
      </ul>
    </section>
  )
}
