'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Check, X, HeartPulse, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { lokalDato } from '@/lib/dato'
import { lyd } from '@/lib/lyd'
import { OppvarmingIkon } from '@/components/atelier/Glyph'

type OppvarmingType = 'boksesekk' | 'romaskin' | 'elipsemaskin' | 'tredemølle' | 'dynamisk'

const TYPER: { type: OppvarmingType; ikonId: string; navn: string; beskrivelse: string; min: number; kalorier: string; intensitet: string }[] = [
  { type: 'boksesekk',    ikonId: 'boksesekk',    navn: 'Boksesekk',       beskrivelse: 'Overkropp og koordinasjon. Rolige kombinasjoner, økende tempo.', min: 5, kalorier: '30–40', intensitet: 'Moderat' },
  { type: 'romaskin',     ikonId: 'romaskin',     navn: 'Romaskin',        beskrivelse: 'Helkropp. Aktiverer rygg, bein og armer i ett drag.',            min: 5, kalorier: '35–45', intensitet: 'Moderat' },
  { type: 'elipsemaskin', ikonId: 'elipsemaskin', navn: 'Ellipsemaskin',   beskrivelse: 'Skånsom helkroppsoppvarming uten støt.',                         min: 5, kalorier: '30–40', intensitet: 'Lav' },
  { type: 'tredemølle',   ikonId: 'tredemill',    navn: 'Tredemølle',      beskrivelse: 'Gå eller jogg. Øk farten gradvis.',                              min: 5, kalorier: '35–50', intensitet: 'Lav til moderat' },
  { type: 'dynamisk',     ikonId: 'strekk',       navn: 'Dynamisk tøying', beskrivelse: 'Arm- og beinsving, utfall og knebøy uten vekt.',                 min: 3, kalorier: '15–20', intensitet: 'Lav' },
]

const TIPS = [
  'Start rolig og øk intensiteten gradvis.',
  'Du bør svette lett etter 5–10 minutter.',
  'Kombiner gjerne to ulike metoder.',
  'Avslutt med dynamisk tøying for musklene du skal trene.',
  'Drikk vann før hovedøkten.',
]

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface Aktiv { id: number; type: OppvarmingType; lengde: number; igjen: number; kjorer: boolean; ferdig: boolean }

export default function OppvarmingSide() {
  const supabase = createClient()
  const [aktive, setAktive] = useState<Aktiv[]>([])
  const [melding, setMelding] = useState('')
  const [pulsApen, setPulsApen] = useState(false)
  const [puls, setPuls] = useState('')
  const [pulsSvar, setPulsSvar] = useState<{ tekst: string; ok: boolean } | null>(null)
  const sluttider = useRef<Record<number, number>>({})

  // Ekte nedtelling (tidligere en fast stolpe med «1:30 igjen» som aldri endret seg)
  useEffect(() => {
    if (!aktive.some(a => a.kjorer)) return
    const id = setInterval(() => {
      const naa = Date.now()
      setAktive(liste => liste.map(a => {
        if (!a.kjorer) return a
        const igjen = (sluttider.current[a.id] ?? naa) - naa
        if (igjen <= 0) { lyd.ferdig(); return { ...a, igjen: 0, kjorer: false } }
        return { ...a, igjen }
      }))
    }, 250)
    return () => clearInterval(id)
  }, [aktive])

  const visMelding = (t: string) => { setMelding(t); setTimeout(() => setMelding(''), 2600) }

  const start = (type: OppvarmingType) => {
    lyd.klargjor()
    const t = TYPER.find(x => x.type === type)!
    const id = Date.now()
    sluttider.current[id] = id + t.min * 60_000
    setAktive(a => [{ id, type, lengde: t.min * 60_000, igjen: t.min * 60_000, kjorer: true, ferdig: false }, ...a])
  }

  const startPause = (a: Aktiv) => {
    lyd.klargjor()
    if (a.kjorer) setAktive(l => l.map(x => x.id === a.id ? { ...x, kjorer: false } : x))
    else {
      const igjen = a.igjen > 0 ? a.igjen : a.lengde
      sluttider.current[a.id] = Date.now() + igjen
      setAktive(l => l.map(x => x.id === a.id ? { ...x, igjen, kjorer: true } : x))
    }
  }

  const fjern = (id: number) => setAktive(l => l.filter(x => x.id !== id))

  const fullfor = async (a: Aktiv) => {
    setAktive(l => l.map(x => x.id === a.id ? { ...x, kjorer: false, ferdig: true } : x))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: eksisterende } = await supabase
      .from('treningslogger').select('id, oppvarming').eq('bruker_id', user.id).eq('dato', lokalDato()).limit(1)
    if (eksisterende?.length) {
      const { error } = await supabase.from('treningslogger')
        .update({ oppvarming: [...(eksisterende[0].oppvarming || []), a.type] }).eq('id', eksisterende[0].id)
      visMelding(error ? 'Kunne ikke lagre oppvarmingen.' : 'Oppvarmingen er lagt til dagens logg.')
    } else {
      visMelding('Oppvarming fullført.')
    }
  }

  const sjekkPuls = () => {
    const p = parseInt(puls)
    if (!p) return
    setPulsSvar(p > 140 ? { tekst: `${p} slag/min er høyt for oppvarming. Senk tempoet litt.`, ok: false }
      : p < 90 ? { tekst: `${p} slag/min. Du kan øke intensiteten litt.`, ok: false }
      : { tekst: `${p} slag/min. Akkurat passe – du er klar.`, ok: true })
  }

  const pagaende = aktive.filter(a => !a.ferdig)
  const ferdige = aktive.filter(a => a.ferdig)

  return (
    <div className="opp-page">
      <div className="page-header">
        <h1 className="page-title">Oppvarming<em className="gold">.</em></h1>
        <p className="page-subtitle">Fem til ti minutter som gjør resten av økten bedre</p>
      </div>

      <AnimatePresence>
        {melding && (
          <motion.div className="pf-melding" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: '1rem' }}>
            <Check size={14} strokeWidth={2} /> {melding}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {pagaende.map(a => {
          const t = TYPER.find(x => x.type === a.type)!
          const andel = 1 - a.igjen / a.lengde
          return (
            <motion.section key={a.id} layout className="opp-aktiv glass-card crop"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}>
              <div className="opp-aktiv-topp">
                <span className="opp-ikon on"><OppvarmingIkon id={t.ikonId} size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="eyebrow eyebrow-gold">{a.igjen === 0 ? 'Tiden er ute' : a.kjorer ? 'Pågår' : 'Pauset'}</span>
                  <h3 className="opp-navn">{t.navn}</h3>
                </div>
                <button className="tid-ikonknapp" onClick={() => fjern(a.id)} aria-label="Avbryt"><X size={14} /></button>
              </div>
              <div className="opp-tid mono">{fmt(a.igjen)}</div>
              <div className="tick-track"><div className="tick-fill" style={{ width: `${andel * 100}%` }} /></div>
              <div className="opp-knapper">
                <button className="tid-ikonknapp stor" onClick={() => startPause(a)} aria-label={a.kjorer ? 'Pause' : 'Fortsett'}>
                  {a.igjen === 0 ? <RotateCcw size={16} /> : a.kjorer ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button className="btn btn-primary" onClick={() => fullfor(a)}><Check size={14} strokeWidth={2} /> Fullført</button>
              </div>
            </motion.section>
          )
        })}
      </AnimatePresence>

      <div className="hq-section-head" style={{ marginTop: '1rem' }}>
        <h2 className="hq-section-title">Velg <em>metode</em></h2>
        {ferdige.length > 0 && <span className="eyebrow eyebrow-gold">{ferdige.length} fullført i dag</span>}
      </div>
      <div className="opp-grid">
        {TYPER.map(t => (
          <button key={t.type} className="opp-kort glass-card" onClick={() => start(t.type)}>
            <div className="opp-kort-topp">
              <span className="opp-ikon"><OppvarmingIkon id={t.ikonId} size={18} /></span>
              <span className="opp-min mono">{t.min}:00</span>
            </div>
            <h3 className="opp-navn">{t.navn}</h3>
            <p className="opp-besk">{t.beskrivelse}</p>
            <div className="opp-meta"><span>{t.kalorier} kcal</span><span>{t.intensitet}</span></div>
            <span className="opp-start"><Play size={12} fill="currentColor" /> Start</span>
          </button>
        ))}
      </div>

      <section className="opp-to">
        <div className="pf-seksjon glass-card">
          <span className="eyebrow"><HeartPulse size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />Pulssjekk</span>
          <h3 className="hq-section-title" style={{ margin: '0.6rem 0 0.4rem' }}>Er du <em>varm?</em></h3>
          <p className="pf-dempet">Tell pulsslagene i 15 sekunder og gang med 4. Sikt mot 50–70 % av makspuls (220 minus alder).</p>
          {!pulsApen ? (
            <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setPulsApen(true)}>Mål puls</button>
          ) : (
            <div className="opp-puls">
              <input className="input" type="number" inputMode="numeric" placeholder="Slag per minutt" value={puls}
                onChange={e => { setPuls(e.target.value); setPulsSvar(null) }} onKeyDown={e => e.key === 'Enter' && sjekkPuls()} />
              <button className="btn btn-primary" onClick={sjekkPuls} disabled={!puls}>Sjekk</button>
            </div>
          )}
          {pulsSvar && <p className={`opp-pulssvar${pulsSvar.ok ? ' ok' : ''}`}>{pulsSvar.tekst}</p>}
        </div>
        <div className="pf-seksjon glass-card">
          <span className="eyebrow">Gode vaner</span>
          <ol className="bib-tips" style={{ marginTop: '0.75rem' }}>
            {TIPS.map((t, i) => <li key={i}><span className="bib-tips-nr">{String(i + 1).padStart(2, '0')}</span>{t}</li>)}
          </ol>
        </div>
      </section>
    </div>
  )
}
