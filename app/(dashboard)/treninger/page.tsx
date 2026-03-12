'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Sted   = 'hjemme' | 'gym'
type Gruppe = 'bryst'|'rygg'|'bein'|'skuldre'|'bicep'|'tricep'|'core'|'fullkropp'|'tabata'|'cardio'
type KlokkeMode = 'stopp'|'ned'

function spillAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const spill = (f: number, t: number, d: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(0.4, ctx.currentTime+t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+d)
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+d)
    }
    spill(880,0,0.15); spill(1100,0.18,0.15); spill(1320,0.36,0.3)
  } catch {}
}

const OPPVARMING = [
  { id:'boksesekk',    navn:'Boksesekk',       emoji:'🥊', varighet:'10 min', min:10, sted:['hjemme','gym'] as Sted[], beskrivelse:'3 runder à 3 min med 1 min pause. Jab, kryss, krokkslag.' },
  { id:'froskehopp',   navn:'Froskehopp',       emoji:'🐸', varighet:'8 min',  min:8,  sted:['hjemme','gym'] as Sted[], beskrivelse:'4×10 froskehopp. Squat ned og eksplodér fremover. Land mykt.' },
  { id:'fjellklatrer', navn:'Fjellklatrere',    emoji:'⛰️', varighet:'8 min',  min:8,  sted:['hjemme','gym'] as Sted[], beskrivelse:'4×30 sek fjellklatrere med 15 sek pause.' },
  { id:'strekk',       navn:'Dynamisk strekk',  emoji:'🧘', varighet:'10 min', min:10, sted:['hjemme','gym'] as Sted[], beskrivelse:'Arm-sirkler, benstrekk, hoftesirkler, torso-rotasjoner.' },
  { id:'hopping',      navn:'Hopping/tau',      emoji:'⬆️', varighet:'10 min', min:10, sted:['hjemme','gym'] as Sted[], beskrivelse:'5×1 min hopping med 30 sek pause.' },
  { id:'romaskin',     navn:'Romaskin',          emoji:'🚣', varighet:'12 min', min:12, sted:['gym']          as Sted[], beskrivelse:'3×4 min romaskin. Start lett, øk intensitet.' },
  { id:'sykkel',       navn:'Stasjonær sykkel', emoji:'🚴', varighet:'10 min', min:10, sted:['gym']          as Sted[], beskrivelse:'10 min lett sykling med gradvis økt motstand.' },
  { id:'elipsemaskin', navn:'Elipsemaskin',      emoji:'🏃', varighet:'10 min', min:10, sted:['gym']          as Sted[], beskrivelse:'10 min på elipsemaskin. Lav intensitet, full bevegelse.' },
  { id:'tredemill',    navn:'Tredemølle',        emoji:'👟', varighet:'10 min', min:10, sted:['gym']          as Sted[], beskrivelse:'5 min gange + 5 min rolig jogg.' },
]

const GRUPPER = [
  { key:'bryst'     as Gruppe, emoji:'💎', label:'Bryst'     },
  { key:'rygg'      as Gruppe, emoji:'🔙', label:'Rygg'      },
  { key:'bein'      as Gruppe, emoji:'🦵', label:'Bein'      },
  { key:'skuldre'   as Gruppe, emoji:'🔼', label:'Skuldre'   },
  { key:'bicep'     as Gruppe, emoji:'💪', label:'Bicep'     },
  { key:'tricep'    as Gruppe, emoji:'💀', label:'Tricep'    },
  { key:'core'      as Gruppe, emoji:'🎯', label:'Core'      },
  { key:'fullkropp' as Gruppe, emoji:'⚡', label:'Fullkropp' },
  { key:'tabata'    as Gruppe, emoji:'🔥', label:'Tabata'    },
  { key:'cardio'    as Gruppe, emoji:'🏃', label:'Cardio'    },
]

const UKEDAGER   = ['Man','Tir','Ons','Tor','Fre','Lør','Søn']
const NIVAER     = ['Nybegynner','Middels','Avansert'] as const
const INTENSITET = ['Lett','Moderat','Hard'] as const

const AUTOFYLL: Record<string, Record<string, Gruppe[]>> = {
  '3dager_push_pull':  { Man:['bryst','skuldre','tricep'], Ons:['rygg','bicep'], Fre:['bein','core'] },
  '4dager_upper_lower':{ Man:['bryst','rygg','skuldre'], Tir:['bein','core'], Tor:['bryst','bicep','tricep'], Fre:['bein','core'] },
  '5dager_split':      { Man:['bryst','tricep'], Tir:['rygg','bicep'], Ons:['bein'], Tor:['skuldre','core'], Fre:['fullkropp'] },
  '3dager_fullkropp':  { Man:['fullkropp'], Ons:['fullkropp'], Fre:['fullkropp'] },
}

// ── Øvelsesdatabase for autofyll ─────────────────────────────────────────────
const OV_DB: Record<string, { navn: string; sett: number; reps: string }[]> = {
  bryst:    [
    { navn:'Benkpress', sett:4, reps:'8-10' },
    { navn:'Skråbenkpress', sett:3, reps:'10-12' },
    { navn:'Kabel pec fly', sett:3, reps:'12-15' },
    { navn:'Dips', sett:3, reps:'10-12' },
    { navn:'Push-up', sett:4, reps:'12-15' },
    { navn:'Hantelflyes', sett:3, reps:'12' },
  ],
  rygg:     [
    { navn:'Pull-ups', sett:4, reps:'6-10' },
    { navn:'Lat pulldown', sett:3, reps:'10-12' },
    { navn:'Sittende kabelroing', sett:4, reps:'10-12' },
    { navn:'Markløft', sett:4, reps:'5-6' },
    { navn:'Hantelroing enarms', sett:4, reps:'10×2' },
    { navn:'Face pull', sett:3, reps:'15' },
  ],
  bein:     [
    { navn:'Knebøy', sett:4, reps:'8-10' },
    { navn:'Legpress', sett:4, reps:'10-12' },
    { navn:'Rumensk markløft', sett:3, reps:'10-12' },
    { navn:'Bulgarian split squat', sett:3, reps:'10×2' },
    { navn:'Leg curl', sett:3, reps:'12' },
    { navn:'Leg extension', sett:3, reps:'12-15' },
    { navn:'Stående tåhev', sett:4, reps:'15-20' },
  ],
  skuldre:  [
    { navn:'Military press', sett:4, reps:'8-10' },
    { navn:'Sidehev', sett:3, reps:'12-15' },
    { navn:'Hantelpress sittende', sett:3, reps:'10-12' },
    { navn:'Face pull', sett:3, reps:'15' },
    { navn:'Arnold press', sett:3, reps:'10' },
  ],
  bicep:    [
    { navn:'Biceps curl', sett:4, reps:'10-12' },
    { navn:'Hammer curl', sett:3, reps:'12' },
    { navn:'Preacher curl', sett:3, reps:'10' },
    { navn:'Kabel curl', sett:3, reps:'12-15' },
  ],
  tricep:   [
    { navn:'Triceps pushdown', sett:4, reps:'12-15' },
    { navn:'Skull crushers', sett:3, reps:'10' },
    { navn:'Overhead triceps ext.', sett:3, reps:'12' },
    { navn:'Dips (triceps)', sett:3, reps:'12' },
  ],
  core:     [
    { navn:'Planke', sett:3, reps:'60s' },
    { navn:'Crunches', sett:3, reps:'20' },
    { navn:'Russian twist', sett:3, reps:'20×2' },
    { navn:'Beinheving', sett:3, reps:'15' },
    { navn:'Ab wheel rollout', sett:3, reps:'10' },
  ],
  fullkropp:[
    { navn:'Knebøy', sett:4, reps:'8-10' },
    { navn:'Benkpress', sett:4, reps:'8-10' },
    { navn:'Pull-ups', sett:3, reps:'6-10' },
    { navn:'Military press', sett:3, reps:'8-10' },
    { navn:'Markløft', sett:3, reps:'5-6' },
    { navn:'Planke', sett:3, reps:'60s' },
  ],
  cardio:   [
    { navn:'Løping/tredemølle', sett:1, reps:'30 min' },
    { navn:'Sykkel intervaller', sett:5, reps:'3 min' },
    { navn:'Romaskin', sett:3, reps:'5 min' },
    { navn:'Burpees', sett:4, reps:'15' },
  ],
  tabata:   [
    { navn:'Burpees', sett:8, reps:'20s' },
    { navn:'Fjellklatrere', sett:8, reps:'20s' },
    { navn:'Jump squats', sett:8, reps:'20s' },
    { navn:'Push-up rask', sett:8, reps:'20s' },
  ],
}

// Generer deterministiske øvelser basert på muskelgrupper + dato
function genererOvelser(grupper: Gruppe[], datoStr: string) {
  const seed = datoStr.replace(/-/g,'').split('').reduce((a,c) => a + c.charCodeAt(0), 0)
  const res: { navn: string; sett: number; reps: string; kg: number }[] = []
  for (const gruppe of grupper) {
    const pool   = OV_DB[gruppe] ?? []
    if (!pool.length) continue
    const antall = grupper.length === 1 ? 4 : grupper.length === 2 ? 3 : 2
    const start  = seed % pool.length
    for (let i = 0; i < antall && i < pool.length; i++) {
      const o = pool[(start + i) % pool.length]
      if (!res.find(r => r.navn === o.navn))
        res.push({ navn: o.navn, sett: o.sett, reps: o.reps, kg: 0 })
    }
  }
  return res
}

function KonfigInner() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const oktId        = searchParams.get('okt')

  const [dag,       setDag]       = useState(0)
  const [sted,      setSted]      = useState<Sted>('gym')
  const [grupper,   setGrupper]   = useState<Gruppe[]>([])
  const [nivaa,     setNivaa]     = useState<typeof NIVAER[number]>('Middels')
  const [intensitet,setIntensitet]= useState<typeof INTENSITET[number]>('Moderat')
  const [oppvarming,setOppvarming]= useState<string[]>([])
  const [autofillPlan,setAutofillPlan] = useState('')
  const [visAutofill, setVisAutofill]  = useState(false)
  const [autofillMsg, setAutofillMsg]  = useState('')
  const [autofillLast,setAutofillLast] = useState(false)

  const [klokkeMode, setKlokkeMode] = useState<KlokkeMode>('stopp')
  const [sekunder,   setSekunder]   = useState(0)
  const [kjoerer,    setKjoerer]    = useState(false)
  const [fase,       setFase]       = useState<'oppvarming'|'trening'|null>(null)
  const [nedMal,     setNedMal]     = useState(3)
  const [alarm,      setAlarm]      = useState(false)
  const intervalRef  = useRef<NodeJS.Timeout|null>(null)

  useEffect(() => {
    if (kjoerer) {
      intervalRef.current = setInterval(() => {
        setSekunder(s => {
          if (klokkeMode === 'ned') {
            if (s <= 1) {
              setKjoerer(false); setAlarm(true); spillAlarm()
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⏱ Tid er ute!', { body: 'Intervallet er ferdig!' })
              }
              return 0
            }
            return s - 1
          }
          return s + 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [kjoerer, klokkeMode])

  const startKlokke = (f: 'oppvarming'|'trening') => {
    setAlarm(false); setFase(f)
    if (klokkeMode === 'ned') setSekunder(nedMal * 60)
    setKjoerer(true)
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }
  const stoppKlokke     = () => setKjoerer(false)
  const nullstillKlokke = () => { setKjoerer(false); setSekunder(0); setFase(null); setAlarm(false) }

  const formatTid = (s: number) =>
    `${String(Math.floor(Math.abs(s)/60)).padStart(2,'0')}:${String(Math.abs(s)%60).padStart(2,'0')}`

  const toggleGruppe = (g: Gruppe) =>
    setGrupper(p => p.includes(g) ? p.filter(x=>x!==g) : [...p, g])

  const startOkt = () => {
    if (grupper.length === 0) return
    const params = new URLSearchParams({
      grupper: grupper.join(','), sted, nivaa, intensitet,
      dag: String(dag), oppvarming: oppvarming.join(','),
    })
    router.push(`/treninger/okt?${params.toString()}`)
  }

  // ── AUTOFYLL FIKSET — lagrer øvelser til Supabase ────────────────────────
  const autofillKalender = async () => {
    if (!autofillPlan) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAutofillLast(true)
    const plan   = AUTOFYLL[autofillPlan]
    const today  = new Date()
    const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay()+6)%7)
    monday.setHours(0,0,0,0)
    for (const [dagNavn, grp] of Object.entries(plan)) {
      const idx  = UKEDAGER.indexOf(dagNavn)
      const dato = new Date(monday); dato.setDate(monday.getDate()+idx)
      const datoStr = dato.toISOString().split('T')[0]
      const ovelser = genererOvelser(grp, datoStr)   // ← genererer øvelser
      await supabase.from('okter').insert([{
        bruker_id:    user.id,
        dato:         datoStr,
        tittel:       grp.map(g=>g[0].toUpperCase()+g.slice(1)).join(' & '),
        type:         grp.includes('cardio')||grp.includes('tabata') ? 'cardio' : 'styrke',
        varighet_min: 60,
        notater:      `Auto-generert: ${autofillPlan}`,
        ovelser,                                       // ← lagres i Supabase
      }])
    }
    setAutofillLast(false)
    setAutofillMsg('Ukesplan lagt til i kalender! ✓')
    setTimeout(() => setAutofillMsg(''), 3000)
    setVisAutofill(false)
  }

  const tilgjOpp = OPPVARMING.filter(o => o.sted.includes(sted))

  useEffect(() => { if (oktId) router.push(`/treninger/okt?okt=${oktId}`) }, [oktId])

  return (
    <div className="tk-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Treningsgenerator</h1>
        <p className="page-subtitle">Sett opp din økt og trykk start</p>
      </div>

      {/* ── Stoppeklokke ── */}
      <div className={`tk-klokke glass-card${alarm ? ' tk-alarm' : ''}`}>
        <div className="tk-klokke-venstre">
          <div className="tk-tid" style={{
            color: alarm ? '#ff4444' : kjoerer ? 'var(--cyan)' : 'rgba(255,255,255,0.4)'
          }}>
            {formatTid(sekunder)}
          </div>
          <div className="tk-klokke-info">
            {alarm ? '⚠️ TID ER UTE!'
             : fase ? `${fase === 'oppvarming' ? '🔥 Oppvarming' : '💪 Trening'} pågår`
             : klokkeMode === 'ned' ? `Nedtelling: ${nedMal} min` : 'Stoppeklokke'}
          </div>
        </div>

        <div className="tk-klokke-midten">
          <div className="tk-modus-rad">
            <button className={`tk-modus${klokkeMode==='stopp'?' on':''}`}
              onClick={() => { setKlokkeMode('stopp'); nullstillKlokke() }}>
              ⏱ Stoppeklokke
            </button>
            <button className={`tk-modus${klokkeMode==='ned'?' on':''}`}
              onClick={() => { setKlokkeMode('ned'); nullstillKlokke() }}>
              ⏳ Nedtelling
            </button>
          </div>
          {klokkeMode === 'ned' && !kjoerer && (
            <div className="tk-ned-rad">
              <button className="tk-ned-btn" onClick={() => setNedMal(m=>Math.max(1,m-1))}>−</button>
              <span className="tk-ned-val">{nedMal}m</span>
              <button className="tk-ned-btn" onClick={() => setNedMal(m=>Math.min(120,m+1))}>+</button>
              <div className="tk-ned-hurtig">
                {[1,2,3,5,10,15,20,30].map(m => (
                  <button key={m} className={`tk-quick${nedMal===m?' on':''}`}
                    onClick={() => setNedMal(m)}>{m}m</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tk-klokke-hoeyre">
          {!kjoerer ? (
            <>
              <button className="btn btn-ghost tk-k-btn" onClick={() => startKlokke('oppvarming')}>🔥 Oppvarming</button>
              <button className="btn btn-primary tk-k-btn" onClick={() => startKlokke('trening')}>💪 Trening</button>
            </>
          ) : (
            <button className="btn btn-ghost tk-k-btn" onClick={stoppKlokke}>⏸ Pause</button>
          )}
          <button className="tk-reset" onClick={nullstillKlokke} title="Nullstill">↺</button>
        </div>
      </div>

      {/* ── Konfigurasjon ── */}
      <div className="tk-grid">

        {/* Dag */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl">📅 Dag</div>
          <div className="tk-pill-rad">
            {UKEDAGER.map((d,i) => (
              <button key={d} className={`tk-pill${dag===i?' on':''}`} onClick={() => setDag(i)}>{d}</button>
            ))}
          </div>
        </div>

        {/* Sted */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl">📍 Hvor trener du?</div>
          <div className="tk-sted-rad">
            {([['hjemme','🏠','Hjemme','Boksesekk, hantler, strikk, benk'],
               ['gym',   '🏋️','Gym',   'Fullt utstyr, alle maskiner']] as const).map(([k,e,l,s]) => (
              <button key={k} className={`tk-sted${sted===k?' on':''}`} onClick={() => setSted(k)}>
                <span style={{fontSize:'1.5rem'}}>{e}</span>
                <span className="tk-sted-l">{l}</span>
                <span className="tk-sted-s">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Muskelgruppe */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl">💪 Muskelgruppe <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>(velg én eller flere)</span></div>
          <div className="tk-gruppe-grid">
            {GRUPPER.map(g => (
              <button key={g.key} className={`tk-gruppe${grupper.includes(g.key)?' on':''}`}
                onClick={() => toggleGruppe(g.key)}>
                <span className="tk-gruppe-em">{g.emoji}</span>
                <span className="tk-gruppe-l">{g.label}</span>
              </button>
            ))}
          </div>
          {grupper.length > 0 && (
            <div className="tk-valgte">
              {grupper.map(g => (
                <span key={g} className="tk-badge">
                  {GRUPPER.find(x=>x.key===g)?.emoji} {GRUPPER.find(x=>x.key===g)?.label}
                  <button onClick={() => toggleGruppe(g)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nivå + Intensitet */}
        <div className="tk-seksjon glass-card tk-2kol">
          <div>
            <div className="tk-lbl">🎚 Nivå</div>
            <div className="tk-pill-rad">
              {NIVAER.map(n => <button key={n} className={`tk-pill${nivaa===n?' on':''}`} onClick={() => setNivaa(n)}>{n}</button>)}
            </div>
          </div>
          <div>
            <div className="tk-lbl">🔥 Intensitet</div>
            <div className="tk-pill-rad">
              {INTENSITET.map(it => <button key={it} className={`tk-pill${intensitet===it?' on':''}`} onClick={() => setIntensitet(it)}>{it}</button>)}
            </div>
          </div>
        </div>

        {/* Oppvarming */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl">🔥 Oppvarming <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400}}>(valgfritt)</span></div>
          <div className="tk-opp-grid">
            {tilgjOpp.map(o => (
              <button key={o.id} className={`tk-opp${oppvarming.includes(o.id)?' on':''}`}
                onClick={() => setOppvarming(p => p.includes(o.id) ? p.filter(x=>x!==o.id) : [...p, o.id])}>
                <span>{o.emoji}</span>
                <div>
                  <div className="tk-opp-navn">{o.navn}</div>
                  <div className="tk-opp-tid">{o.varighet}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Autofyll kalender */}
        <div className="tk-seksjon glass-card">
          <button className="tk-autofill-toggle" onClick={() => setVisAutofill(!visAutofill)}>
            📅 Autofyll ukesplan i kalender {visAutofill ? '▲' : '▼'}
          </button>
          {visAutofill && (
            <div className="tk-autofill-panel">
              <div className="tk-autofill-grid">
                {[
                  ['3dager_push_pull',   '3 dager', 'Push/Pull/Ben',  'Man·Ons·Fre'],
                  ['4dager_upper_lower', '4 dager', 'Upper/Lower',   'Man·Tir·Tor·Fre'],
                  ['5dager_split',       '5 dager', '5-dagers split', 'Man→Fre'],
                  ['3dager_fullkropp',   '3 dager', 'Fullkropp x3',  'Man·Ons·Fre'],
                ].map(([k,d,n,s]) => (
                  <button key={k} className={`tk-af-btn${autofillPlan===k?' on':''}`}
                    onClick={() => setAutofillPlan(k)}>
                    <span className="tk-af-d">{d}</span>
                    <span className="tk-af-n">{n}</span>
                    <span className="tk-af-s">{s}</span>
                  </button>
                ))}
              </div>
              {autofillMsg && <div className="tk-af-msg">{autofillMsg}</div>}
              <button className="btn btn-primary" style={{width:'100%'}}
                onClick={autofillKalender} disabled={!autofillPlan || autofillLast}>
                {autofillLast
                  ? <><span className="spinner" style={{width:14,height:14,display:'inline-block'}}/> Lagrer...</>
                  : '📅 Legg til i kalender (denne uken)'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Start-knapp ── */}
      <button
        className={`tk-start-btn${grupper.length===0?' tk-disabled':''}`}
        disabled={grupper.length === 0}
        onClick={startOkt}
      >
        ⚡ Generer og start treningsøkt
      </button>
      {grupper.length === 0 && (
        <p className="tk-hint">Velg minst én muskelgruppe for å starte</p>
      )}

      <style>{`
        .tk-page { max-width: 900px; width: 100%; }

        .tk-klokke {
          display: flex; align-items: center; gap: 1.25rem;
          padding: 1rem 1.25rem; margin-bottom: 1.5rem; flex-wrap: wrap;
          transition: border-color 0.3s;
        }
        .tk-alarm {
          border-color: rgba(255,68,68,0.5) !important;
          animation: alarmPulse 0.5s ease-in-out infinite alternate;
        }
        @keyframes alarmPulse {
          from { box-shadow: 0 0 0 rgba(255,68,68,0); }
          to   { box-shadow: 0 0 20px rgba(255,68,68,0.25); }
        }
        .tk-klokke-venstre { flex-shrink: 0; }
        .tk-tid {
          font-family: var(--font-display, monospace); font-size: 2.2rem; font-weight: 800;
          letter-spacing: 0.05em; font-variant-numeric: tabular-nums; line-height: 1;
        }
        .tk-klokke-info { font-size: 0.68rem; color: rgba(255,255,255,0.3); margin-top: 3px; }
        .tk-klokke-midten { flex: 1; min-width: 0; }
        .tk-modus-rad { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
        .tk-modus {
          padding: 4px 12px; border-radius: 999px; font-size: 0.72rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); cursor: pointer; font-family: var(--font-body, sans-serif);
          transition: all 0.15s;
        }
        .tk-modus.on { background: rgba(0,245,255,0.1); border-color: rgba(0,245,255,0.3); color: var(--cyan); }
        .tk-ned-rad { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tk-ned-btn {
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          color: #fff; cursor: pointer; font-size: 0.9rem; font-family: var(--font-body, sans-serif);
          display: flex; align-items: center; justify-content: center;
        }
        .tk-ned-val { font-family: var(--font-display, monospace); font-size: 1.1rem; font-weight: 700; color: var(--cyan); min-width: 32px; text-align: center; }
        .tk-ned-hurtig { display: flex; gap: 3px; flex-wrap: wrap; }
        .tk-quick {
          padding: 2px 7px; border-radius: 6px; font-size: 0.65rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.35); cursor: pointer; font-family: var(--font-body, sans-serif);
          transition: all 0.1s;
        }
        .tk-quick.on { background: rgba(0,245,255,0.1); border-color: rgba(0,245,255,0.25); color: var(--cyan); }
        .tk-klokke-hoeyre { display: flex; gap: 6px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }
        .tk-k-btn { font-size: 0.78rem !important; padding: 0.45rem 0.9rem !important; }
        .tk-reset {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); width: 30px; height: 30px; border-radius: 8px;
          cursor: pointer; font-size: 0.85rem; transition: all 0.15s; font-family: var(--font-body, sans-serif);
        }
        .tk-reset:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .tk-grid { display: flex; flex-direction: column; gap: 0.875rem; }
        .tk-seksjon { padding: 1.125rem 1.25rem; }
        .tk-lbl {
          font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.3); font-weight: 700; margin-bottom: 0.7rem;
        }
        .tk-pill-rad { display: flex; gap: 6px; flex-wrap: wrap; }
        .tk-pill {
          padding: 5px 12px; border-radius: 999px; font-size: 0.78rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.45); cursor: pointer; font-family: var(--font-body, sans-serif);
          transition: all 0.15s;
        }
        .tk-pill:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
        .tk-pill.on { background: rgba(0,245,255,0.13); border-color: rgba(0,245,255,0.38); color: var(--cyan); }
        .tk-sted-rad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tk-sted {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 12px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.15s;
          font-family: var(--font-body, sans-serif);
        }
        .tk-sted:hover { background: rgba(255,255,255,0.07); }
        .tk-sted.on { background: rgba(0,245,255,0.09); border-color: rgba(0,245,255,0.32); }
        .tk-sted-l { font-size: 0.85rem; font-weight: 700; color: #fff; }
        .tk-sted-s { font-size: 0.62rem; color: rgba(255,255,255,0.3); text-align: center; }
        .tk-gruppe-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 8px; }
        @media(max-width:600px) { .tk-gruppe-grid { grid-template-columns: repeat(4,1fr); } }
        .tk-gruppe {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 10px 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.15s;
          font-family: var(--font-body, sans-serif); min-height: 62px;
        }
        .tk-gruppe:hover { background: rgba(255,255,255,0.07); }
        .tk-gruppe.on { background: rgba(0,245,255,0.1); border-color: rgba(0,245,255,0.32); }
        .tk-gruppe-em { font-size: 1.15rem; line-height: 1; }
        .tk-gruppe-l { font-size: 0.62rem; color: rgba(255,255,255,0.5); text-align: center; }
        .tk-gruppe.on .tk-gruppe-l { color: var(--cyan); }
        .tk-valgte { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
        .tk-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 8px; border-radius: 999px; font-size: 0.7rem;
          background: rgba(0,245,255,0.1); border: 1px solid rgba(0,245,255,0.25); color: var(--cyan);
        }
        .tk-badge button { background: none; border: none; cursor: pointer; color: var(--cyan); font-size: 0.6rem; padding: 0; }
        .tk-2kol { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media(max-width:500px) { .tk-2kol { grid-template-columns: 1fr; } }
        .tk-opp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        @media(max-width:600px) { .tk-opp-grid { grid-template-columns: 1fr 1fr; } }
        .tk-opp {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.15s;
          font-family: var(--font-body, sans-serif); text-align: left;
        }
        .tk-opp:hover { background: rgba(255,255,255,0.07); }
        .tk-opp.on { background: rgba(255,140,0,0.1); border-color: rgba(255,140,0,0.3); }
        .tk-opp-navn { font-size: 0.75rem; color: rgba(255,255,255,0.7); font-weight: 500; }
        .tk-opp-tid  { font-size: 0.62rem; color: rgba(255,255,255,0.3); }
        .tk-autofill-toggle {
          background: none; border: 1px dashed rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.42); border-radius: 10px; padding: 7px 14px;
          font-size: 0.78rem; cursor: pointer; font-family: var(--font-body, sans-serif);
          width: 100%; text-align: left; transition: all 0.15s;
        }
        .tk-autofill-toggle:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }
        .tk-autofill-panel { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .tk-autofill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tk-af-btn {
          display: flex; flex-direction: column; gap: 2px; padding: 10px 12px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.15s;
          font-family: var(--font-body, sans-serif); text-align: left;
        }
        .tk-af-btn:hover { background: rgba(255,255,255,0.07); }
        .tk-af-btn.on { background: rgba(0,245,255,0.09); border-color: rgba(0,245,255,0.28); }
        .tk-af-d { font-size: 0.62rem; color: var(--cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .tk-af-n { font-size: 0.82rem; color: rgba(255,255,255,0.8); font-weight: 600; }
        .tk-af-s { font-size: 0.65rem; color: rgba(255,255,255,0.3); }
        .tk-af-msg { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); color: var(--green); border-radius: 8px; padding: 6px 10px; font-size: 0.8rem; }

        .tk-start-btn {
          width: 100%; margin-top: 1.5rem; padding: 1rem;
          border-radius: 14px; border: none; cursor: pointer;
          background: linear-gradient(135deg, rgba(0,245,255,0.2), rgba(180,78,255,0.2));
          border: 1px solid rgba(0,245,255,0.3);
          color: #fff; font-family: var(--font-display, sans-serif); font-size: 1rem; font-weight: 700;
          transition: all 0.2s; letter-spacing: 0.02em;
        }
        .tk-start-btn:hover:not(.tk-disabled) {
          background: linear-gradient(135deg, rgba(0,245,255,0.3), rgba(180,78,255,0.3));
          border-color: rgba(0,245,255,0.5);
          box-shadow: 0 0 30px rgba(0,245,255,0.15);
          transform: translateY(-1px);
        }
        .tk-disabled { opacity: 0.35; cursor: not-allowed; }
        .tk-hint { text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.3); margin-top: 0.5rem; }
      `}</style>
    </div>
  )
}

export default function TreningerPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner-lg"/></div>}>
      <KonfigInner />
    </Suspense>
  )
}
