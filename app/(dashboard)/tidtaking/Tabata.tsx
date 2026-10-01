'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Minus, Plus } from 'lucide-react'
import { lyd } from '@/lib/lyd'
import { vibrer } from '@/lib/innstillinger'
import { useSkjermVaaken } from '@/hooks/useSkjermVaaken'

type Fase = 'klar' | 'arbeid' | 'hvile' | 'ferdig'

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Tidsstempelbasert: gjenværende tid regnes fra et sluttidspunkt, ikke ved å telle
// intervaller. Da driver ikke klokka når fanen er i bakgrunnen eller telefonen låses.
export default function Tabata() {
  const [arbeid, setArbeid] = useState(20)
  const [hvile, setHvile]   = useState(10)
  const [runder, setRunder] = useState(8)
  const [fase, setFase]     = useState<Fase>('klar')
  const [runde, setRunde]   = useState(1)
  const [aktiv, setAktiv]   = useState(false)
  const [igjen, setIgjen]   = useState(20_000)
  const [medLyd, setMedLyd] = useState(true)
  useSkjermVaaken(aktiv)
  const slutt = useRef(0)
  const sistTikk = useRef(-1)

  const fasensLengde = (f: Fase) => (f === 'hvile' ? hvile : arbeid) * 1000

  const nesteFase = useCallback((naa: number, fra: { fase: Fase; runde: number }) => {
    if (fra.fase === 'arbeid' && fra.runde >= runder) {
      setFase('ferdig'); setAktiv(false); setIgjen(0)
      if (medLyd) lyd.ferdig()
      return null
    }
    const ny = fra.fase === 'arbeid'
      ? { fase: 'hvile' as Fase, runde: fra.runde }
      : { fase: 'arbeid' as Fase, runde: fra.runde + 1 }
    setFase(ny.fase); setRunde(ny.runde)
    if (medLyd) (ny.fase === 'arbeid' ? lyd.arbeid : lyd.hvile)()
    vibrer(ny.fase === 'arbeid' ? [120, 60, 120] : 250)
    slutt.current = naa + fasensLengde(ny.fase)
    return ny
  }, [runder, medLyd, arbeid, hvile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aktiv) return
    let naaFase = { fase, runde }
    const id = setInterval(() => {
      const naa = Date.now()
      let rest = slutt.current - naa
      // Ta igjen faser som passerte mens fanen sov
      while (rest <= 0) {
        const ny = nesteFase(naa + rest, naaFase)
        if (!ny) return
        naaFase = ny
        rest = slutt.current - naa
      }
      const sek = Math.ceil(rest / 1000)
      if (medLyd && sek <= 3 && sek !== sistTikk.current) lyd.tikk()
      sistTikk.current = sek
      setIgjen(rest)
    }, 100)
    return () => clearInterval(id)
  }, [aktiv]) // eslint-disable-line react-hooks/exhaustive-deps

  const startPause = () => {
    lyd.klargjor()
    if (aktiv) { setAktiv(false); return }
    if (fase === 'ferdig') { nullstill(); return }
    if (fase === 'klar') { setFase('arbeid'); if (medLyd) lyd.arbeid() }
    slutt.current = Date.now() + (fase === 'klar' ? arbeid * 1000 : igjen)
    setAktiv(true)
  }

  const nullstill = () => { setAktiv(false); setFase('klar'); setRunde(1); setIgjen(arbeid * 1000) }

  const hopp = () => {
    if (fase === 'klar' || fase === 'ferdig') return
    const ny = nesteFase(Date.now(), { fase, runde })
    if (ny) setIgjen(fasensLengde(ny.fase))
  }

  const juster = (hva: 'arbeid' | 'hvile' | 'runder', d: number) => {
    if (hva === 'arbeid') { const v = Math.max(5, Math.min(300, arbeid + d)); setArbeid(v); if (fase === 'klar') setIgjen(v * 1000) }
    if (hva === 'hvile') setHvile(v => Math.max(5, Math.min(300, v + d)))
    if (hva === 'runder') setRunder(v => Math.max(1, Math.min(30, v + d)))
  }

  const lengde = fase === 'klar' ? arbeid * 1000 : fasensLengde(fase)
  const andel = fase === 'ferdig' ? 1 : 1 - igjen / lengde
  const R = 46, O = 2 * Math.PI * R
  const erHvile = fase === 'hvile'
  const fullforte = fase === 'ferdig' ? runder : runde - 1 + (erHvile ? 1 : 0)
  const total = (arbeid + hvile) * runder - hvile

  return (
    <div className="tid-kort glass-card">
      <div className="tid-hode">
        <span className="eyebrow eyebrow-gold">Tabata · {runder} runder</span>
        <button className="tid-ikonknapp" onClick={() => setMedLyd(v => !v)} aria-label={medLyd ? 'Slå av lyd' : 'Slå på lyd'}>
          {medLyd ? <Volume2 size={15} strokeWidth={1.5} /> : <VolumeX size={15} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="tid-urskive">
        <svg viewBox="0 0 100 100" className="tid-ring" aria-hidden>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2
            return <line key={i} x1={50 + Math.sin(a) * 49} y1={50 - Math.cos(a) * 49} x2={50 + Math.sin(a) * (i % 5 ? 47.6 : 46.6)} y2={50 - Math.cos(a) * (i % 5 ? 47.6 : 46.6)} stroke="rgba(242,236,225,0.18)" strokeWidth={0.4} />
          })}
          <circle cx="50" cy="50" r={R - 3} fill="none" stroke="rgba(242,236,225,0.06)" strokeWidth="1.2" />
          <circle
            cx="50" cy="50" r={R - 3} fill="none"
            stroke={erHvile ? '#B8BEC6' : '#C9A96E'} strokeWidth="1.2" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (R - 3)} strokeDashoffset={2 * Math.PI * (R - 3) * (1 - andel)}
            transform="rotate(-90 50 50)" style={{ transition: 'stroke 0.4s' }}
          />
        </svg>
        <div className="tid-senter">
          <AnimatePresence mode="wait">
            <motion.span key={fase} className={`tid-fase ${fase}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              {fase === 'klar' ? 'Klar' : fase === 'arbeid' ? 'Arbeid' : fase === 'hvile' ? 'Hvile' : 'Fullført'}
            </motion.span>
          </AnimatePresence>
          <span className="tid-tall">{fase === 'ferdig' ? fmt(total * 1000) : fmt(igjen)}</span>
          <span className="eyebrow">Runde {Math.min(runde, runder)} av {runder}</span>
        </div>
      </div>

      <div className="tid-runder" aria-label="Runder">
        {Array.from({ length: runder }).map((_, i) => (
          <span key={i} className={i < fullforte ? 'ferdig' : i === runde - 1 && fase !== 'klar' && fase !== 'ferdig' ? 'na' : ''} />
        ))}
      </div>

      <div className="tid-kontroller">
        <button className="tid-ikonknapp stor" onClick={nullstill} aria-label="Nullstill"><RotateCcw size={18} strokeWidth={1.5} /></button>
        <button className={`tid-spill${aktiv ? ' aktiv' : ''}`} onClick={startPause} aria-label={aktiv ? 'Pause' : 'Start'}>
          {aktiv ? <Pause size={26} strokeWidth={1.5} fill="currentColor" /> : <Play size={26} strokeWidth={1.5} fill="currentColor" />}
        </button>
        <button className="tid-ikonknapp stor" onClick={hopp} disabled={!aktiv} aria-label="Neste fase"><SkipForward size={18} strokeWidth={1.5} /></button>
      </div>

      <div className="tid-innstillinger">
        {([['arbeid', 'Arbeid', `${arbeid}s`, 5], ['hvile', 'Hvile', `${hvile}s`, 5], ['runder', 'Runder', `${runder}`, 1]] as const).map(([k, l, v, steg]) => (
          <div key={k}>
            <span className="eyebrow">{l}</span>
            <div className="velger-stepper tid-stepper">
              <button onClick={() => juster(k, -steg)} disabled={aktiv} aria-label={`Mindre ${l}`}><Minus size={12} /></button>
              <span className="mono">{v}</span>
              <button onClick={() => juster(k, steg)} disabled={aktiv} aria-label={`Mer ${l}`}><Plus size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <p className="tid-fot">Total tid {fmt(total * 1000)} · de tre siste sekundene i hver fase markeres med et tikk</p>
    </div>
  )
}
