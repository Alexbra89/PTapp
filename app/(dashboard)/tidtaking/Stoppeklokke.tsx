'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Flag, Minus, Plus } from 'lucide-react'
import { lyd } from '@/lib/lyd'

type Modus = 'opp' | 'ned'

// mm:ss,hh – hundredeler gir stoppeklokka presisjon; nedtelling vises i hele sekunder
const fmtOpp = (ms: number) => {
  const t = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, s = Math.floor(ms / 1000) % 60, h = Math.floor(ms / 10) % 100
  return `${t ? `${t}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(h).padStart(2, '0')}`
}
const fmtNed = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Stoppeklokke({ synlig = true }: { synlig?: boolean }) {
  const [modus, setModus]   = useState<Modus>('opp')
  const [aktiv, setAktiv]   = useState(false)
  const [visning, setVisning] = useState(0)          // ms som vises
  const [runder, setRunder] = useState<number[]>([]) // rundetider (ms per runde)
  const [nedMin, setNedMin] = useState(3)
  const [alarm, setAlarm]   = useState(false)
  // Tidsstempler i stedet for teller: presis og uten drift i bakgrunnen
  const start = useRef(0)       // når klokka sist ble startet
  const lagret = useRef(0)      // akkumulert tid før siste start (opp) / gjenstående ved pause (ned)

  useEffect(() => {
    if (!aktiv) return
    const id = setInterval(() => {
      const gaatt = Date.now() - start.current
      if (modus === 'opp') { setVisning(lagret.current + gaatt); return }
      const rest = lagret.current - gaatt
      if (rest <= 0) { setVisning(0); setAktiv(false); setAlarm(true); lyd.ferdig(); return }
      setVisning(rest)
    }, modus === 'opp' ? 31 : 200)
    return () => clearInterval(id)
  }, [aktiv, modus])

  const startPause = useCallback(() => {
    lyd.klargjor()
    setAlarm(false)
    if (aktiv) {
      const gaatt = Date.now() - start.current
      lagret.current = modus === 'opp' ? lagret.current + gaatt : Math.max(0, lagret.current - gaatt)
      setAktiv(false)
      return
    }
    if (modus === 'ned' && lagret.current <= 0) lagret.current = nedMin * 60_000
    start.current = Date.now()
    setAktiv(true)
  }, [aktiv, modus, nedMin])

  const nullstill = useCallback(() => {
    setAktiv(false); setAlarm(false); setRunder([])
    lagret.current = modus === 'ned' ? nedMin * 60_000 : 0
    setVisning(lagret.current)
  }, [modus, nedMin])

  const runde = useCallback(() => {
    if (modus !== 'opp' || visning === 0) return
    const tidligere = runder.reduce((a, b) => a + b, 0)
    setRunder(r => [...r, visning - tidligere])
  }, [modus, visning, runder])

  const byttModus = (m: Modus) => {
    setModus(m); setAktiv(false); setAlarm(false); setRunder([])
    lagret.current = m === 'ned' ? nedMin * 60_000 : 0
    setVisning(lagret.current)
  }
  const settNed = (min: number) => {
    const v = Math.max(1, Math.min(120, min))
    setNedMin(v); setAktiv(false); setAlarm(false)
    lagret.current = v * 60_000; setVisning(lagret.current)
  }

  // Tastatur: mellomrom = start/pause, Enter = runde, R = nullstill (ikke mens man skriver i et felt)
  useEffect(() => {
    if (!synlig) return
    const tast = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.code === 'Space') { e.preventDefault(); startPause() }
      else if (e.code === 'Enter') runde()
      else if (e.code === 'KeyR') nullstill()
    }
    window.addEventListener('keydown', tast)
    return () => window.removeEventListener('keydown', tast)
  }, [startPause, runde, nullstill, synlig])

  const beste = runder.length > 1 ? Math.min(...runder) : -1
  const verste = runder.length > 1 ? Math.max(...runder) : -1
  const nedAndel = modus === 'ned' ? 1 - visning / (nedMin * 60_000) : 0

  return (
    <div className={`tid-kort glass-card${alarm ? ' tid-alarm' : ''}`}>
      <div className="tid-hode">
        <div className="tid-modus" role="tablist">
          {([['opp', 'Stoppeklokke'], ['ned', 'Nedtelling']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={modus === k} className={modus === k ? 'on' : ''} onClick={() => byttModus(k)}>
              {modus === k && <motion.span layoutId="tid-modus" className="tid-modus-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="tid-display">
        <span className="eyebrow">{alarm ? 'Tiden er ute' : aktiv ? (modus === 'opp' ? 'Løper' : 'Teller ned') : visning > 0 && visning !== nedMin * 60_000 ? 'Pauset' : 'Klar'}</span>
        <span className={`tid-tall stor${alarm ? ' alarm' : ''}`}>{modus === 'opp' ? fmtOpp(visning) : fmtNed(visning)}</span>
        {modus === 'ned' && (
          <div className="tick-track" style={{ marginTop: 18 }}><div className="tick-fill" style={{ width: `${Math.max(0, Math.min(1, nedAndel)) * 100}%` }} /></div>
        )}
      </div>

      {modus === 'ned' && !aktiv && (
        <div className="tid-hurtig">
          <div className="velger-stepper tid-stepper">
            <button onClick={() => settNed(nedMin - 1)} aria-label="Ett minutt mindre"><Minus size={12} /></button>
            <span className="mono">{nedMin} min</span>
            <button onClick={() => settNed(nedMin + 1)} aria-label="Ett minutt mer"><Plus size={12} /></button>
          </div>
          {[1, 2, 3, 5, 10].map(m => (
            <button key={m} className={`bib-kat${nedMin === m ? ' on' : ''}`} onClick={() => settNed(m)}>{m} min</button>
          ))}
        </div>
      )}

      <div className="tid-kontroller">
        <button className="tid-ikonknapp stor" onClick={nullstill} aria-label="Nullstill"><RotateCcw size={18} strokeWidth={1.5} /></button>
        <button className={`tid-spill${aktiv ? ' aktiv' : ''}`} onClick={startPause} aria-label={aktiv ? 'Pause' : 'Start'}>
          {aktiv ? <Pause size={26} strokeWidth={1.5} fill="currentColor" /> : <Play size={26} strokeWidth={1.5} fill="currentColor" />}
        </button>
        <button className="tid-ikonknapp stor" onClick={runde} disabled={modus !== 'opp' || visning === 0} aria-label="Ny runde"><Flag size={17} strokeWidth={1.5} /></button>
      </div>

      {modus === 'opp' && runder.length > 0 && (
        <ol className="tid-rundeliste">
          <AnimatePresence initial={false}>
            {runder.map((ms, i) => ({ ms, i })).reverse().map(({ ms, i }) => (
              <motion.li key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <span className="velger-nr">Runde {String(i + 1).padStart(2, '0')}</span>
                {ms === beste && <span className="tid-merke gull">Raskest</span>}
                {ms === verste && <span className="tid-merke">Tregest</span>}
                <span className="mono tid-rundetid">{fmtOpp(ms)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <p className="tid-fot">Mellomrom starter og pauser · Enter tar runde · R nullstiller</p>
    </div>
  )
}
