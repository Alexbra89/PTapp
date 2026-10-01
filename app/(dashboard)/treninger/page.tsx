'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { QK } from '@/hooks/useSupabaseQuery'
import OvelsesVelger from '@/components/OvelsesVelger'
import { motion } from 'framer-motion'
import { Home, Building2, Flame, Dumbbell, Pause, RotateCcw, X, ChevronDown, CalendarPlus, ArrowRight, Sparkles, ListChecks } from 'lucide-react'
import { MuskelGlyph, OppvarmingIkon } from '@/components/atelier/Glyph'
import { utvalg, froFraDato } from '@/data/ovelsesbibliotek'
import { lokalDato } from '@/lib/dato'
import { hentInnstillinger } from '@/lib/innstillinger'

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

// Generer deterministiske øvelser for autofyll fra det felles biblioteket (samme dato → samme utvalg)
function genererOvelser(grupper: Gruppe[], datoStr: string, sted: Sted) {
  const res: { navn: string; sett: number; reps: string; kg: number }[] = []
  const antall = grupper.length === 1 ? 4 : grupper.length === 2 ? 3 : 2
  grupper.forEach((gruppe, i) => {
    for (const o of utvalg(gruppe, sted, antall, froFraDato(datoStr) + i, hentInnstillinger().niva)) {
      if (!res.find(r => r.navn === o.navn)) res.push({ navn: o.navn, sett: o.sett, reps: o.reps, kg: 0 })
    }
  })
  return res
}

function KonfigInner() {
  const supabase     = createClient()
  const qc = useQueryClient()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const oktId        = searchParams.get('okt')

  const [dag,       setDag]       = useState(0)
  const [sted,      setSted]      = useState<Sted>(() => hentInnstillinger().sted ?? 'gym')
  const [grupper,   setGrupper]   = useState<Gruppe[]>([])
  const [nivaa,     setNivaa]     = useState<typeof NIVAER[number]>('Middels')
  const [intensitet,setIntensitet]= useState<typeof INTENSITET[number]>('Moderat')
  const [oppvarming,setOppvarming]= useState<string[]>([])
  const [autofillPlan,setAutofillPlan] = useState('')
  const [visAutofill, setVisAutofill]  = useState(false)
  const [autofillMsg, setAutofillMsg]  = useState('')
  const [autofillLast,setAutofillLast] = useState(false)

  // 🔥 NYE STATES FOR MODUS-VELGER
  const [modus, setModus] = useState<'auto' | 'custom'>('auto')
  const [valgteOvelser, setValgteOvelser] = useState<any[]>([])

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
    if (modus === 'auto' && grupper.length === 0) return
    if (modus === 'custom' && valgteOvelser.length === 0) return
    
    const params = new URLSearchParams()
    
    if (modus === 'auto') {
      params.set('grupper', grupper.join(','))
      params.set('sted', sted)
      params.set('nivaa', nivaa)
      params.set('intensitet', intensitet)
      params.set('dag', String(dag))
      params.set('oppvarming', oppvarming.join(','))
      params.set('modus', 'auto')
    } else {
      params.set('ovelser', JSON.stringify(valgteOvelser))
      params.set('modus', 'custom')
      params.set('sted', sted)
      params.set('oppvarming', oppvarming.join(','))
    }
    
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
    const monday = new Date(today)
    const dagOffset = (today.getDay() + 6) % 7  // 0=man, 6=søn
    // Hvis vi er forbi mandag (dagOffset > 0) → hopp til NESTE mandag
    monday.setDate(today.getDate() - dagOffset + (dagOffset > 0 ? 7 : 0))
    monday.setHours(0, 0, 0, 0)

    const maaneder: string[] = []
    let feil = 0

    for (const [dagNavn, grp] of Object.entries(plan)) {
      const idx     = UKEDAGER.indexOf(dagNavn)
      const dato    = new Date(monday)
      dato.setDate(monday.getDate() + idx)
      const datoStr = lokalDato(dato)
      const ovelser = genererOvelser(grp, datoStr, sted)
      if (!maaneder.includes(datoStr.slice(0, 7))) maaneder.push(datoStr.slice(0, 7))

      const { error } = await supabase.from('okter').insert([{
        bruker_id:    user.id,
        dato:         datoStr,
        tittel:       grp.map(g => g[0].toUpperCase() + g.slice(1)).join(' & '),
        type:         grp.includes('cardio') || grp.includes('tabata') ? 'cardio' : 'styrke',
        varighet_min: 60,
        notater:      `Auto-generert: ${autofillPlan}`,
        ovelser,
      }])
      if (error) feil++
    }

    // Ugyldiggjør cache for alle berørte måneder → kalender re-fetcher automatisk
    for (const maned of maaneder) {
      await qc.invalidateQueries({ queryKey: QK.okterManed(user.id, maned) })
    }

    setAutofillLast(false)
    setAutofillMsg(feil ? `${feil} av ${Object.keys(plan).length} økter kunne ikke lagres.` : 'Uken er lagt inn i kalenderen.')
    setTimeout(() => setAutofillMsg(''), 3000)
    setVisAutofill(false)
  }

  const tilgjOpp = OPPVARMING.filter(o => o.sted.includes(sted))

  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  useEffect(() => { if (oktId) router.push(`/treninger/okt?okt=${oktId}`) }, [oktId])

  return (
    <div className="tk-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Komponer <em className="gold">økten.</em></h1>
        <p className="page-subtitle">Seks valg · ett trykk · klar til å løfte</p>
      </div>

      {/* ── Stoppeklokke ── */}
      <div className={`tk-klokke glass-card${alarm ? ' tk-alarm' : ''}`}>
        <div className="tk-klokke-venstre">
          <div className="tk-tid" style={{
            color: alarm ? 'var(--danger)' : kjoerer ? 'var(--ink)' : 'var(--text-muted)'
          }}>
            {formatTid(sekunder)}
          </div>
          <div className="tk-klokke-info">
            {alarm ? 'Tiden er ute'
             : fase ? `${fase === 'oppvarming' ? 'Oppvarming' : 'Trening'} pågår`
             : klokkeMode === 'ned' ? `Nedtelling · ${nedMal} min` : 'Stoppeklokke'}
          </div>
        </div>

        <div className="tk-klokke-midten">
          <div className="tk-modus-rad">
            <button className={`tk-modus${klokkeMode==='stopp'?' on':''}`}
              onClick={() => { setKlokkeMode('stopp'); nullstillKlokke() }}>
              Stoppeklokke
            </button>
            <button className={`tk-modus${klokkeMode==='ned'?' on':''}`}
              onClick={() => { setKlokkeMode('ned'); nullstillKlokke() }}>
              Nedtelling
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
              <button className="btn btn-ghost tk-k-btn" onClick={() => startKlokke('oppvarming')}><Flame size={14} strokeWidth={1.5} /> Oppvarming</button>
              <button className="btn btn-primary tk-k-btn" onClick={() => startKlokke('trening')}><Dumbbell size={14} strokeWidth={1.5} /> Trening</button>
            </>
          ) : (
            <button className="btn btn-ghost tk-k-btn" onClick={stoppKlokke}><Pause size={14} strokeWidth={1.5} /> Pause</button>
          )}
          <button className="tk-reset" onClick={nullstillKlokke} title="Nullstill" aria-label="Nullstill"><RotateCcw size={14} strokeWidth={1.5} /></button>
        </div>
      </div>

      {/* ── Konfigurasjon ── */}
      <div className="tk-grid">

        {/* Dag */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl"><span className="tk-steg">01</span>Dag</div>
          <div className="tk-pill-rad">
            {UKEDAGER.map((d,i) => (
              <button key={d} className={`tk-pill${dag===i?' on':''}`} onClick={() => setDag(i)}>{d}</button>
            ))}
          </div>
        </div>

        {/* Sted */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl"><span className="tk-steg">02</span>Hvor trener du?</div>
          <div className="tk-sted-rad">
            {([['hjemme',Home,'Hjemme','Boksesekk, hantler, strikk, benk'],
               ['gym',   Building2,'Gym',   'Fullt utstyr, alle maskiner']] as const).map(([k,Ikon,l,s]) => (
              <button key={k} className={`tk-sted${sted===k?' on':''}`} onClick={() => setSted(k)}>
                <span className="tk-sted-ikon"><Ikon size={22} strokeWidth={1.2} /></span>
                <span className="tk-sted-l">{l}</span>
                <span className="tk-sted-s">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MODUS-FANER ── */}
        <div className="tk-modus-faner" role="tablist">
          {([['auto', Sparkles, 'Generer for meg'], ['custom', ListChecks, 'Velg øvelser selv']] as const).map(([k, Ikon, l]) => (
            <button key={k} role="tab" aria-selected={modus === k} className={`tk-modus-fane${modus === k ? ' on' : ''}`} onClick={() => setModus(k)}>
              {modus === k && <motion.span layoutId="tk-fane" className="tk-modus-fane-bg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <Ikon size={15} strokeWidth={1.5} /> {l}
            </button>
          ))}
        </div>

        {/* Muskelgruppe - vises KUN i auto-modus */}
        {modus === 'auto' && (
          <div className="tk-seksjon glass-card">
            <div className="tk-lbl"><span className="tk-steg">03</span>Fokus <span className="tk-lbl-hint">velg én eller flere</span></div>
            <div className="tk-gruppe-grid">
              {GRUPPER.map(g => (
                <button key={g.key} className={`tk-gruppe${grupper.includes(g.key)?' on':''}`}
                  onClick={() => toggleGruppe(g.key)}>
                  <span className="tk-gruppe-em"><MuskelGlyph gruppe={g.key} size={38} /></span>
                  <span className="tk-gruppe-l">{g.label}</span>
                </button>
              ))}
            </div>
            {grupper.length > 0 && (
              <div className="tk-valgte">
                {grupper.map(g => (
                  <span key={g} className="tk-badge">
                    {GRUPPER.find(x=>x.key===g)?.label}
                    <button onClick={() => toggleGruppe(g)} aria-label="Fjern"><X size={11} strokeWidth={1.8} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nivå + Intensitet - vises KUN i auto-modus */}
        {modus === 'auto' && (
          <div className="tk-seksjon glass-card tk-2kol">
            <div>
              <div className="tk-lbl"><span className="tk-steg">04</span>Nivå</div>
              <div className="tk-pill-rad">
                {NIVAER.map(n => <button key={n} className={`tk-pill${nivaa===n?' on':''}`} onClick={() => setNivaa(n)}>{n}</button>)}
              </div>
            </div>
            <div>
              <div className="tk-lbl"><span className="tk-steg">05</span>Intensitet</div>
              <div className="tk-pill-rad">
                {INTENSITET.map(it => <button key={it} className={`tk-pill${intensitet===it?' on':''}`} onClick={() => setIntensitet(it)}>{it}</button>)}
              </div>
            </div>
          </div>
        )}

        {/* Oppvarming - vises i begge moduser */}
        <div className="tk-seksjon glass-card">
          <div className="tk-lbl"><span className="tk-steg">{modus === 'auto' ? '06' : '03'}</span>Oppvarming <span className="tk-lbl-hint">valgfritt</span></div>
          <div className="tk-opp-grid">
            {tilgjOpp.map(o => (
              <button key={o.id} className={`tk-opp${oppvarming.includes(o.id)?' on':''}`}
                onClick={() => setOppvarming(p => p.includes(o.id) ? p.filter(x=>x!==o.id) : [...p, o.id])}>
                <span className="tk-opp-ikon"><OppvarmingIkon id={o.id} /></span>
                <div>
                  <div className="tk-opp-navn">{o.navn}</div>
                  <div className="tk-opp-tid">{o.varighet}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Øvelsesvelger - vises KUN i custom-modus */}
        {modus === 'custom' && (
          <div className="tk-seksjon glass-card" style={{ padding: 0 }}>
            <OvelsesVelger 
              onSelect={(ovelser) => {
                setValgteOvelser(ovelser)
                              }}
            />
          </div>
        )}

        {/* Autofyll kalender */}
        <div className="tk-seksjon glass-card">
          <button className="tk-autofill-toggle" onClick={() => setVisAutofill(!visAutofill)}>
            <CalendarPlus size={15} strokeWidth={1.4} /> <span style={{ flex: 1 }}>Fyll ut hele uken i kalenderen</span> <ChevronDown size={15} strokeWidth={1.4} style={{ transform: visAutofill ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
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
                  : 'Legg planen inn i denne uken'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Sammendrag ── */}
      <div className="tk-sammendrag">
        <span className="eyebrow">Din økt</span>
        <p className="tk-sammendrag-tekst">
          {['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'][dag]}
          <i> · </i>{sted === 'gym' ? 'Gym' : 'Hjemme'}
          <i> · </i>{modus === 'auto'
            ? (grupper.length ? grupper.map(g => GRUPPER.find(x => x.key === g)?.label).join(' & ') : <em>velg fokus</em>)
            : `${valgteOvelser.length} øvelser`}
          {modus === 'auto' && <><i> · </i>{intensitet}</>}
          {oppvarming.length > 0 && <><i> · </i>{oppvarming.length} oppvarming</>}
        </p>
      </div>

      {/* ── Start-knapp ── */}
      <button
        className={`tk-start-btn${
          (modus === 'auto' && grupper.length === 0) || 
          (modus === 'custom' && valgteOvelser.length === 0) ? ' tk-disabled' : ''
        }`}
        disabled={
          (modus === 'auto' && grupper.length === 0) || 
          (modus === 'custom' && valgteOvelser.length === 0)
        }
        onClick={startOkt}
      >
        <span>{modus === 'auto' ? 'Generer og start økten' : 'Start med valgte øvelser'}</span>
        <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
      </button>
      
      {modus === 'auto' && grupper.length === 0 && (
        <p className="tk-hint">Velg minst én muskelgruppe for å starte</p>
      )}
      {modus === 'custom' && valgteOvelser.length === 0 && (
        <p className="tk-hint">Velg minst én øvelse for å starte</p>
      )}

      <style>{`
        .tk-page { max-width: 900px; width: 100%; }
        .tk-page .page-title em { font-style: italic; }

        /* Klokke */
        .tk-klokke { display: flex; align-items: center; gap: 1.5rem; padding: 1.25rem 1.5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
        .tk-alarm { border-color: rgba(224,97,79,0.5) !important; animation: alarmPulse 0.8s ease-in-out infinite alternate; }
        @keyframes alarmPulse { from { box-shadow: 0 0 0 0 rgba(224,97,79,0); } to { box-shadow: 0 0 0 6px rgba(224,97,79,0.12); } }
        .tk-klokke-venstre { flex-shrink: 0; min-width: 150px; }
        .tk-tid { font-size: 2.6rem; line-height: 1; font-variant-numeric: tabular-nums; transition: color 0.3s; }
        .tk-klokke-info { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted); margin-top: 8px; }
        .tk-klokke-midten { flex: 1; min-width: 0; }
        .tk-modus-rad { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
        .tk-modus { padding: 6px 14px; border-radius: 999px; font-size: 0.74rem; border: 1px solid var(--line); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .tk-ned-rad { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tk-ned-btn { width: 28px; height: 28px; border-radius: 50%; background: transparent; border: 1px solid var(--line-strong); color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .tk-ned-val { font-size: 1rem; color: var(--gold); min-width: 36px; text-align: center; }
        .tk-ned-hurtig { display: flex; gap: 4px; flex-wrap: wrap; }
        .tk-quick { padding: 4px 9px; border-radius: 999px; font-family: var(--font-mono); font-size: 0.62rem; border: 1px solid var(--line); color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
        .tk-klokke-hoeyre { display: flex; gap: 8px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }
        .tk-k-btn { font-size: 0.8rem !important; padding: 0.55rem 1rem !important; gap: 7px !important; }
        .tk-reset { width: 38px; height: 38px; border-radius: 50%; background: transparent; border: 1px solid var(--line); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s; }
        .tk-reset:hover { color: var(--ink); border-color: var(--line-strong); transform: rotate(-60deg); }

        /* Steg */
        .tk-grid { display: flex; flex-direction: column; gap: 0.9rem; }
        .tk-seksjon { padding: 1.5rem; }
        @media (max-width: 520px) { .tk-seksjon { padding: 1.25rem 1.1rem; } }
        .tk-lbl { display: flex; align-items: baseline; gap: 12px; margin-bottom: 1.1rem !important; color: var(--text-secondary) !important; }
        .tk-steg { font-family: var(--font-serif); font-style: italic; font-size: 1.35rem; letter-spacing: 0; text-transform: none; color: var(--gold); line-height: 0.6; }
        .tk-lbl-hint { color: var(--text-muted); letter-spacing: 0.1em; margin-left: auto; font-size: 0.56rem; }
        .tk-pill-rad { display: flex; gap: 6px; flex-wrap: wrap; }
        .tk-pill { padding: 8px 16px; border-radius: 999px; font-size: 0.84rem; border: 1px solid var(--line); color: var(--text-secondary); cursor: pointer; transition: all 0.25s var(--ease-out); }
        .tk-pill:hover { color: var(--ink); border-color: var(--line-strong) !important; }

        .tk-sted-rad { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .tk-sted { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 1.25rem; border-radius: 18px; border: 1px solid var(--line); background: transparent; cursor: pointer; transition: all 0.3s var(--ease-out); text-align: left; }
        .tk-sted:hover { border-color: var(--line-strong); }
        .tk-sted-ikon { color: var(--text-muted); margin-bottom: 1.25rem; transition: color 0.3s; }
        .tk-sted.on .tk-sted-ikon { color: var(--gold); }
        .tk-sted-l { font-family: var(--font-serif); font-size: 1.7rem; line-height: 1; color: var(--ink); }
        .tk-sted-s { font-size: 0.76rem; color: var(--text-muted); }

        .tk-modus-faner { display: grid; grid-template-columns: 1fr 1fr; padding: 5px; margin: 0.9rem 0; border-radius: 999px; border: 1px solid var(--line); background: rgba(242,236,225,0.02); }
        .tk-modus-fane { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0.8rem 0.5rem; border: none; background: none; border-radius: 999px; color: var(--text-secondary); font-size: 0.88rem; cursor: pointer; transition: color 0.3s; }
        .tk-modus-fane.on { color: #0B0A09; font-weight: 500; }
        .tk-modus-fane-bg { position: absolute; inset: 0; z-index: -1; border-radius: 999px; background: var(--ink); }

        .tk-gruppe-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        @media (max-width: 600px) { .tk-gruppe-grid { grid-template-columns: repeat(3, 1fr); } }
        .tk-gruppe { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 1.1rem 0.4rem 0.9rem; border-radius: 16px; border: 1px solid var(--line); background: transparent; cursor: pointer; transition: all 0.3s var(--ease-out); }
        .tk-gruppe:hover { border-color: var(--line-strong); transform: translateY(-2px); }
        .tk-gruppe-em { display: flex; height: 38px; align-items: center; }
        .tk-gruppe-l { font-size: 0.78rem; color: var(--text-secondary); }
        .tk-gruppe.on .tk-gruppe-l { color: var(--gold-hi); }

        .tk-valgte { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 1rem; }
        .tk-badge { display: inline-flex; align-items: center; gap: 8px; padding: 5px 6px 5px 12px; border-radius: 999px; font-size: 0.76rem; border: 1px solid rgba(201,169,110,0.4); color: var(--gold-hi); }
        .tk-badge button { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(201,169,110,0.15); border: none; cursor: pointer; color: var(--gold-hi); }

        .tk-2kol { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 560px) { .tk-2kol { grid-template-columns: 1fr; } }

        .tk-opp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (max-width: 640px) { .tk-opp-grid { grid-template-columns: 1fr 1fr; } }
        .tk-opp { display: flex; align-items: center; gap: 12px; padding: 0.8rem 0.9rem; border-radius: 14px; border: 1px solid var(--line); background: transparent; cursor: pointer; transition: all 0.25s; text-align: left; }
        .tk-opp:hover { border-color: var(--line-strong); }
        .tk-opp.on { border-color: rgba(224,122,79,0.5); background: rgba(224,122,79,0.06); }
        .tk-opp-ikon { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0; transition: all 0.25s; }
        .tk-opp.on .tk-opp-ikon { color: var(--ember); border-color: rgba(224,122,79,0.5); }
        .tk-opp-navn { font-size: 0.84rem; color: var(--ink); }
        .tk-opp-tid { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.08em; color: var(--text-muted); margin-top: 2px; }

        .tk-autofill-toggle { display: flex; align-items: center; gap: 10px; background: none; border: none; color: var(--text-secondary); padding: 0; font-size: 0.9rem; cursor: pointer; width: 100%; text-align: left; transition: color 0.2s; }
        .tk-autofill-toggle:hover { color: var(--ink); }
        .tk-autofill-panel { display: flex; flex-direction: column; gap: 12px; margin-top: 1.25rem; }
        .tk-autofill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tk-af-btn { display: flex; flex-direction: column; gap: 4px; padding: 1rem; border-radius: 16px; border: 1px solid var(--line); background: transparent; cursor: pointer; transition: all 0.25s; text-align: left; }
        .tk-af-btn:hover { border-color: var(--line-strong); }
        .tk-af-d { font-family: var(--font-mono); font-size: 0.58rem; color: var(--gold); letter-spacing: 0.16em; text-transform: uppercase; }
        .tk-af-n { font-family: var(--font-serif); font-size: 1.35rem; line-height: 1.1; color: var(--ink); }
        .tk-af-s { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); }
        .tk-af-msg { border-left: 1px solid var(--gold); color: var(--gold-hi); padding: 4px 12px; font-size: 0.84rem; }

        /* Sammendrag + start */
        .tk-sammendrag { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
        .tk-sammendrag-tekst { font-family: var(--font-serif); font-size: clamp(1.6rem, 4.5vw, 2.3rem); line-height: 1.15; letter-spacing: -0.015em; color: var(--ink); margin-top: 0.6rem; text-wrap: balance; }
        .tk-sammendrag-tekst i { font-style: normal; color: var(--gold); }
        .tk-sammendrag-tekst em { color: var(--text-muted); }
        .tk-start-btn { display: flex !important; align-items: center; justify-content: space-between; width: 100%; margin-top: 1.5rem; padding: 1.1rem 0.6rem 1.1rem 1.6rem !important; font-size: 1rem !important; cursor: pointer; transition: all 0.3s var(--ease-out); }
        .tk-disabled { opacity: 0.35; cursor: not-allowed !important; }
        .tk-hint { text-align: center; font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); margin-top: 0.9rem; }
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