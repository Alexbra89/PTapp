'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser, useProfil, useStats, useAktivitet, useVektlogg, useLoggVekt } from '@/hooks/useSupabaseQuery'
import ProgresjonOvelse from './ProgresjonOvelse'

// ── Lazy-load Recharts — hver komponent lastes separat ───────────────────────
const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer),
  { ssr: false }
)
const BarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false }
)
const Bar = dynamic(
  () => import('recharts').then(mod => mod.Bar),
  { ssr: false }
)
const LineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { ssr: false }
)
const Line = dynamic(
  () => import('recharts').then(mod => mod.Line),
  { ssr: false }
)
const XAxis = dynamic(
  () => import('recharts').then(mod => mod.XAxis),
  { ssr: false }
)
const YAxis = dynamic(
  () => import('recharts').then(mod => mod.YAxis),
  { ssr: false }
)
const CartesianGrid = dynamic(
  () => import('recharts').then(mod => mod.CartesianGrid),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('recharts').then(mod => mod.Tooltip),
  { ssr: false }
)

// ── Utfordringer (klient-only, localStorage) ──────────────────────────────────
interface Utfordring {
  id: string; tittel: string; beskrivelse: string
  maal: number; enhet: string; emoji: string
  fullfort: boolean; fremgang: number
}

const UTFORDRINGER_POOL = [
  { tittel:'10.000 skritt',   beskrivelse:'Gå 10.000 skritt i dag',              maal:10000, enhet:'skritt',   emoji:'👣' },
  { tittel:'Drikk 2,5L vann', beskrivelse:'Drikk 2,5 liter vann i dag',          maal:2500,  enhet:'ml',       emoji:'💧' },
  { tittel:'3 treningsøkter', beskrivelse:'Fullfør 3 treningsøkter denne uken',  maal:3,     enhet:'økter',    emoji:'🏋️' },
  { tittel:'Sov 7+ timer',    beskrivelse:'Sov minst 7 timer 3 netter på rad',   maal:3,     enhet:'netter',   emoji:'😴' },
  { tittel:'Spis grønnsaker', beskrivelse:'Spis 3 grønnsaker per dag i 5 dager', maal:5,     enhet:'dager',    emoji:'🥦' },
  { tittel:'Ingen sukker',    beskrivelse:'Unngå sukker i 3 dager denne uken',   maal:3,     enhet:'dager',    emoji:'🚫' },
  { tittel:'Strekk 10 min',   beskrivelse:'Strekk deg i 10 min etter trening',   maal:10,    enhet:'min',      emoji:'🧘' },
  { tittel:'Ned 0,5 kg',      beskrivelse:'Gå ned 0,5 kg denne uken',            maal:1,     enhet:'kg',       emoji:'⚖️' },
  { tittel:'Planke 2 min',    beskrivelse:'Hold planke i 2 minutter totalt',      maal:120,   enhet:'sek',      emoji:'💪' },
  { tittel:'20 min gange',    beskrivelse:'Gå en tur på minst 20 minutter',       maal:20,    enhet:'min',      emoji:'🚶' },
  { tittel:'Push-up streak',  beskrivelse:'Gjør 100 push-ups fordelt på dagen',   maal:100,   enhet:'push-ups', emoji:'🤸' },
  { tittel:'Proteinrik dag',  beskrivelse:'Spis protein til hvert måltid i dag',  maal:3,     enhet:'måltider', emoji:'🥩' },
]

const supabase = createClient()

// ── PR øvelsesliste ────────────────────────────────────────────────────────────
const PR_OVELSER = [
  { id:'benkpress',     navn:'Benkpress',            emoji:'🏋️', kategori:'Bryst'    },
  { id:'skraabenkpress',navn:'Skråbenkpress',         emoji:'📐', kategori:'Bryst'    },
  { id:'markloeft',     navn:'Markløft',              emoji:'⚡', kategori:'Rygg'     },
  { id:'kneboey',       navn:'Knebøy',                emoji:'🦵', kategori:'Bein'     },
  { id:'pullups',       navn:'Pull-ups',              emoji:'🤸', kategori:'Rygg'     },
  { id:'militarypress', navn:'Military press',        emoji:'⬆️', kategori:'Skuldre'  },
  { id:'bicepscurl',    navn:'Biceps curl',           emoji:'💪', kategori:'Bicep'    },
  { id:'hammercurl',    navn:'Hammer curl',           emoji:'🔨', kategori:'Bicep'    },
  { id:'triceppushdown',navn:'Triceps pushdown',      emoji:'📉', kategori:'Tricep'   },
  { id:'sidehev',       navn:'Sidehev',               emoji:'🔼', kategori:'Skuldre'  },
  { id:'legpress',      navn:'Legpress',              emoji:'🔧', kategori:'Bein'     },
  { id:'romenmarkloeft',navn:'Rumensk markløft',      emoji:'🍑', kategori:'Bein'     },
  { id:'kabelsittroign',navn:'Sittende kabelroing',   emoji:'🚣', kategori:'Rygg'     },
  { id:'latpulldown',   navn:'Lat pulldown',          emoji:'⬇️', kategori:'Rygg'     },
]

interface PR { id?: string; ovelse_id: string; kg: number; reps: number; dato: string }

function PRTracker({ userId, supabase: sb }: { userId?: string; supabase: any }) {
  const [prs,        setPrs]        = useState<PR[]>([])
  const [laster,     setLaster]     = useState(true)
  const [valgtOv,    setValgtOv]    = useState<string | null>(null)
  const [nyKg,       setNyKg]       = useState<number|''>('')
  const [nyReps,     setNyReps]     = useState<number|''>('')
  const [lagrer,     setLagrer]     = useState(false)
  const [suksess,    setSuksess]    = useState<string|null>(null)
  const [visSkjema,  setVisSkjema]  = useState(false)
  const [kategori,   setKategori]   = useState<string>('Alle')

  useEffect(() => {
    if (!userId) return
    sb.from('pr_rekorder').select('*').eq('bruker_id', userId)
      .then(({ data }: any) => { setPrs(data ?? []); setLaster(false) })
  }, [userId])

  const lagrePR = async () => {
    if (!userId || !valgtOv || !nyKg || !nyReps) return
    setLagrer(true)
    const dato    = new Date().toISOString().split('T')[0]
    const eksist  = prs.find(p => p.ovelse_id === valgtOv)
    const erNyPR  = !eksist || Number(nyKg) > eksist.kg

    if (eksist?.id) {
      if (Number(nyKg) > eksist.kg) {
        await sb.from('pr_rekorder').update({ kg: Number(nyKg), reps: Number(nyReps), dato })
          .eq('id', eksist.id)
        setPrs(p => p.map(r => r.ovelse_id === valgtOv ? { ...r, kg: Number(nyKg), reps: Number(nyReps), dato } : r))
      }
    } else {
      const { data } = await sb.from('pr_rekorder')
        .insert([{ bruker_id: userId, ovelse_id: valgtOv, kg: Number(nyKg), reps: Number(nyReps), dato }])
        .select().single()
      if (data) setPrs(p => [...p, data])
    }

    if (erNyPR) setSuksess(valgtOv)
    setTimeout(() => setSuksess(null), 3000)
    setNyKg(''); setNyReps(''); setValgtOv(null); setVisSkjema(false)
    setLagrer(false)
  }

  const kategorier = ['Alle', ...Array.from(new Set(PR_OVELSER.map(o => o.kategori)))]
  const filtrert   = PR_OVELSER.filter(o => kategori === 'Alle' || o.kategori === kategori)
  const prMap      = Object.fromEntries(prs.map(p => [p.ovelse_id, p]))

  return (
    <div className="pr-page">
      {/* Header */}
      <div className="pr-header glass-card">
        <div>
          <div className="pr-header-t">🏆 Personlige rekorder</div>
          <div className="pr-header-s">Logg dine beste løft — appen markerer hver gang du slår rekorden</div>
        </div>
        <button className="btn btn-primary pr-ny-btn" onClick={() => setVisSkjema(true)}>
          ＋ Logg PR
        </button>
      </div>

      {/* NY-PR-animasjon */}
      {suksess && (() => {
        const ov = PR_OVELSER.find(o => o.id === suksess)
        return (
          <div className="pr-feiring glass-card">
            <span className="pr-feiring-em">🎉</span>
            <div>
              <div className="pr-feiring-t">Ny personlig rekord!</div>
              <div className="pr-feiring-s">{ov?.navn} — nytt toppløft registrert!</div>
            </div>
          </div>
        )
      })()}

      {/* Kategori-filter */}
      <div className="pr-kat-rad glass-card">
        {kategorier.map(k => (
          <button key={k} className={`pr-kat-btn${kategori===k?' on':''}`}
            onClick={() => setKategori(k)}>{k}</button>
        ))}
      </div>

      {/* PR-liste */}
      {laster ? (
        <div className="pr-laster glass-card"><span className="spinner-lg" /></div>
      ) : (
        <div className="pr-grid">
          {filtrert.map(ov => {
            const pr = prMap[ov.id]
            return (
              <div key={ov.id} className={`pr-kort glass-card${pr ? ' pr-kort-aktiv' : ''}`}
                onClick={() => { setValgtOv(ov.id); setVisSkjema(true) }}>
                <div className="pr-kort-topp">
                  <span className="pr-kort-em">{ov.emoji}</span>
                  <span className="pr-kort-kat">{ov.kategori}</span>
                </div>
                <div className="pr-kort-navn">{ov.navn}</div>
                {pr ? (
                  <>
                    <div className="pr-kort-kg">{pr.kg} <span className="pr-kort-kglbl">kg</span></div>
                    <div className="pr-kort-reps">{pr.reps} reps</div>
                    <div className="pr-kort-dato">📅 {pr.dato}</div>
                  </>
                ) : (
                  <div className="pr-kort-tom">Trykk for å logge</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — logg ny PR */}
      {visSkjema && (
        <div className="pr-modal-bg" onClick={() => { setVisSkjema(false); setValgtOv(null) }}>
          <div className="pr-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="pr-modal-header">
              <span className="pr-modal-tittel">🏋️ Logg ny PR</span>
              <button className="kal-modal-x" onClick={() => { setVisSkjema(false); setValgtOv(null) }}>✕</button>
            </div>
            <div className="pr-modal-body">
              <label className="kal-lbl">Øvelse</label>
              <div className="pr-ov-grid">
                {PR_OVELSER.map(o => (
                  <button key={o.id} className={`pr-ov-btn${valgtOv===o.id?' on':''}`}
                    onClick={() => setValgtOv(o.id)}>
                    {o.emoji} {o.navn}
                  </button>
                ))}
              </div>

              <div className="pr-tall-rad">
                <div>
                  <label className="kal-lbl">Vekt (kg)</label>
                  <input type="number" className="input" style={{ marginTop: '6px' }}
                    value={nyKg} onChange={e => setNyKg(e.target.value ? Number(e.target.value) : '')}
                    placeholder="100" min="0" max="999" step="0.5" />
                </div>
                <div>
                  <label className="kal-lbl">Reps</label>
                  <input type="number" className="input" style={{ marginTop: '6px' }}
                    value={nyReps} onChange={e => setNyReps(e.target.value ? Number(e.target.value) : '')}
                    placeholder="5" min="1" max="100" />
                </div>
              </div>

              {valgtOv && prMap[valgtOv] && (
                <div className="pr-nåvaerende">
                  <span>Nåværende PR:</span>
                  <strong>{prMap[valgtOv].kg} kg × {prMap[valgtOv].reps} reps</strong>
                  {nyKg && Number(nyKg) > prMap[valgtOv].kg && (
                    <span className="pr-ny-rekord-badge">🔥 Ny rekord!</span>
                  )}
                </div>
              )}
            </div>
            <div className="kal-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setVisSkjema(false); setValgtOv(null) }}>Avbryt</button>
              <button className="btn btn-primary" onClick={lagrePR}
                disabled={lagrer || !valgtOv || !nyKg || !nyReps}>
                {lagrer ? <span className="spinner" style={{ width:14, height:14 }} /> : '💾 Lagre PR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getUkensUtfordringer(ukeNr: number, mal: string) {
  const seed = ukeNr * 7 + (mal === 'ned_i_vekt' ? 1 : mal === 'bygge_muskler' ? 2 : 3)
  const pool = mal === 'ned_i_vekt'
    ? UTFORDRINGER_POOL.filter(u => ['💧','👣','⚖️','🚶','🚫'].includes(u.emoji))
    : mal === 'bygge_muskler'
    ? UTFORDRINGER_POOL.filter(u => ['🏋️','💪','🤸','🥩','🧘'].includes(u.emoji))
    : UTFORDRINGER_POOL
  return [...pool]
    .sort((a, b) => ((seed * a.tittel.length * 31) % pool.length) - ((seed * b.tittel.length * 17) % pool.length))
    .slice(0, 3)
}

const TRENINGS_TIPS: Record<string, string[]> = {
  ned_i_vekt: [
    '💧 Drikk 2,5–3 liter vann daglig — vann øker forbrenningen og reduserer sultfølelsen',
    '🥗 Kosthold er 80% av vektreduksjon — ingen mengde trening kompenserer for dårlig kosthold',
    '🔥 Cardio + styrke er den beste kombinasjonen — styrke øker hvileforbrenningen varig',
    '⏰ Spis mer protein (1,6–2g per kg kroppsvekt) for å bevare muskelmasse under vekttap',
    '😴 7–9 timer søvn er kritisk — søvnmangel øker sulthormonet ghrelin med opptil 30%',
    '📏 Mål deg med målebånd ukentlig — muskler veier mer enn fett',
  ],
  bygge_muskler: [
    '🥩 Spis 1,6–2,2g protein per kg kroppsvekt daglig — protein er byggesteinen for muskler',
    '💤 Muskler vokser UNDER søvn, ikke i treningssalen — prioriter 8 timer søvn',
    '📈 Progressive overload: øk vekt, reps eller sett hver 2.–3. uke for kontinuerlig vekst',
    '💧 Drikk 2–3 liter vann daglig — dehydrering reduserer styrken med opptil 20%',
    '🍌 Spis karbohydrater og protein innen 45 min etter trening for optimal restitusjon',
    '⚖️ Du MÅ spis i kalorioverskudd for å bygge muskler — ca 200–300 kcal over vedlikehold',
  ],
  vedlikehold: [
    '⚖️ Vedlikehold krever konsistens — 3–4 treningsøkter per uke er nok',
    '💧 Drikk 2 liter vann daglig for optimal ytelse og restitusjon',
    '🥗 Spis variert og unngå sterkt bearbeidet mat mesteparten av tiden',
    '😴 Søvn er undervurdert — 7–8 timer gir bedre restitusjon og humør',
    '🚶 Aktiv livsstil teller — gå 8000 skritt daglig i tillegg til trening',
  ],
  kondisjon: [
    '❤️ Tren i «sone 2» 80% av cardio-tiden for best kondisjon',
    '💧 Drikk 500ml vann 2 timer FØR kondisjonstrening',
    '🏃 HIIT gir mer kondisjonsfremgang enn jevnt tempo',
    '🥗 Karbohydrater er viktigste energikilde for kondisjonstrening',
    '😴 Kondisjon forbedres under hvile — ikke tren hard 2 dager på rad',
  ],
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(5,5,18,0.95)', border:'1px solid rgba(0,245,255,0.2)', borderRadius:10, padding:'8px 14px' }}>
      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.72rem', marginBottom:4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color:p.color, fontSize:'0.85rem', fontWeight:600 }}>
          {p.name}: {p.value}{p.unit ?? ''}
        </div>
      ))}
    </div>
  )
}

export default function StatistikkPage() {
  const [aktivFane,    setAktivFane]    = useState<'stats'|'pr'|'vekt'|'utfordringer'>('stats')
  const [utfordringer, setUtfordringer] = useState<Utfordring[]>([])
  const [nyVekt,       setNyVekt]       = useState<number|''>('')

  // ── React Query — caches automatisk, ingen re-fetch ved navigasjon ─────────
  const { data: user }            = useUser()
  const { data: profil }          = useProfil(user?.id)
  const { data: stats }           = useStats(user?.id)
  const { data: aktivitet = [] }  = useAktivitet(user?.id)
  const { data: vektLogger = [] } = useVektlogg(user?.id, profil?.vekt)
  const loggVektMut               = useLoggVekt()

  const brukerMal      = profil?.mal ?? 'bygge_muskler'
  const onsketVektMaal = profil?.onsket_vekt ?? 0
  const muskelfokus    = stats?.muskelfokus ?? []

  // Utfordringer fra localStorage — ingen Supabase-kall
  useEffect(() => {
    const ukeNr  = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    const valgte = getUkensUtfordringer(ukeNr, brukerMal)
    const lagret = JSON.parse(localStorage.getItem(`utfordringer_${ukeNr}`) ?? '{}')
    setUtfordringer(valgte.map((u, i) => ({
      ...u, id: `${ukeNr}_${i}`,
      fullfort: lagret[i]?.fullfort ?? false,
      fremgang: lagret[i]?.fremgang ?? 0,
    })))
  }, [brukerMal])

  const loggVekt = async () => {
    if (!nyVekt || !user) return
    await loggVektMut.mutateAsync({ userId: user.id, vekt: Number(nyVekt), vektLogger })
    setNyVekt('')
  }

  const toggleUtfordring = (idx: number, fremgang: number) => {
    const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    const oppdatert = utfordringer.map((u, i) => {
      if (i !== idx) return u
      const nyF = Math.min(fremgang, u.maal)
      return { ...u, fremgang: nyF, fullfort: nyF >= u.maal }
    })
    setUtfordringer(oppdatert)
    const lagret: any = {}
    oppdatert.forEach((u, i) => { lagret[i] = { fullfort: u.fullfort, fremgang: u.fremgang } })
    localStorage.setItem(`utfordringer_${ukeNr}`, JSON.stringify(lagret))
  }

  const alleFullfort = utfordringer.length > 0 && utfordringer.every(u => u.fullfort)
  const tipsListe    = TRENINGS_TIPS[brukerMal] ?? TRENINGS_TIPS.bygge_muskler
  const vektEndring  = vektLogger.length >= 2
    ? (vektLogger[vektLogger.length-1].vekt - vektLogger[0].vekt).toFixed(1) : null

  return (
    <div className="st-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Statistikk</h1>
        <p className="page-subtitle">Din treningsfremgang og ukentlige utfordringer</p>
      </div>

      {/* Faner */}
      <div className="st-faner glass-card">
        {([['stats','📊','Oversikt'],['pr','🏆','PR-rekorder'],['vekt','⚖️','Vektlogg'],['utfordringer','⚡','Utfordringer']] as const).map(([k,e,l]) => (
          <button key={k} className={`st-fane${aktivFane===k?' active':''}`} onClick={() => setAktivFane(k)}>
            {e} {l}
          </button>
        ))}
      </div>

      {/* ── OVERSIKT ── */}
      {aktivFane === 'stats' && (
        <>
          <div className="st-stats-grid">
            {[
              { label:'Treningsøkter', val: stats?.totalOkter ?? 0,                            color:'var(--cyan)',   emoji:'📅' },
              { label:'Kg løftet',     val:`${(stats?.totalKg ?? 0).toLocaleString('no')} kg`, color:'var(--green)',  emoji:'🏋️' },
              { label:'Dag-streak',    val: stats?.streak     ?? 0,                            color:'var(--orange)', emoji:'🔥' },
              { label:'Denne uken',    val: stats?.ukeMaal    ?? 0,                            color:'var(--purple)', emoji:'📆' },
            ].map(s => (
              <div key={s.label} className="st-stat glass-card">
                <div className="st-stat-em">{s.emoji}</div>
                <div className="st-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="st-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 🔥 NY: Progresjonsgraf for alle øvelser */}
          {user?.id && <ProgresjonOvelse userId={user.id} />}

          <div className="st-charts">
            <div className="glass-card st-chart-card">
              <div className="st-chart-title">📅 Ukentlig aktivitet</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={aktivitet} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="uke" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="okter" name="Økter" fill="var(--cyan)" radius={[4,4,0,0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {muskelfokus.length > 0 && (
              <div className="glass-card st-chart-card">
                <div className="st-chart-title">💪 Muskelfokus</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={muskelfokus} layout="vertical" margin={{ top:5, right:10, bottom:0, left:60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="gruppe" type="category" tick={{ fill:'rgba(255,255,255,0.5)', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="okter" name="Loggede" fill="var(--purple)" radius={[0,4,4,0]} fillOpacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-card st-tips-card">
            <div className="st-chart-title">💡 Treningstips for ditt mål
              <span className="st-mal-badge">
                {brukerMal === 'ned_i_vekt' ? '⬇️ Ned i vekt'
                : brukerMal === 'bygge_muskler' ? '💪 Bygge muskler'
                : brukerMal === 'kondisjon' ? '🏃 Kondisjon' : '⚖️ Vedlikehold'}
              </span>
            </div>
            <div className="st-tips-list">
              {tipsListe.map((t, i) => <div key={i} className="st-tip-row"><span>{t}</span></div>)}
            </div>
            <div className="st-vann-boks">
              <div className="st-vann-icon">💧</div>
              <div>
                <div className="st-vann-tittel">Vann & kosthold er avgjørende</div>
                <div className="st-vann-tekst">Trening er bare én del av ligningen. Uten tilstrekkelig vann (2–3 liter/dag) og et godt kosthold vil du ikke nå resultatene dine uansett hvor hardt du trener. Protein, søvn og hydrering er like viktig som selve treningsøktene.</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── PR-REKORDER ── */}
      {aktivFane === 'pr' && <PRTracker userId={user?.id} supabase={supabase} />}

      {/* ── VEKTLOGG ── */}
      {aktivFane === 'vekt' && (
        <div className="st-vekt-page">
          <div className="glass-card st-vekt-input-card">
            <div className="st-chart-title">⚖️ Logg dagens vekt</div>
            <div className="st-vekt-form">
              <input className="input st-vekt-input" type="number" min={30} max={300} step={0.1}
                placeholder="f.eks. 82.5" value={nyVekt}
                onChange={e => setNyVekt(e.target.value === '' ? '' : parseFloat(e.target.value))} />
              <span className="st-vekt-kg">kg</span>
              <button className="btn btn-primary" onClick={loggVekt} disabled={loggVektMut.isPending || !nyVekt}>
                {loggVektMut.isPending ? <span className="spinner" style={{ width:14, height:14 }} /> : '+ Logg'}
              </button>
            </div>
            {vektEndring !== null && (
              <div className="st-vekt-endring"
                style={{ color: parseFloat(vektEndring) < 0 ? 'var(--green)' : parseFloat(vektEndring) > 0 ? 'var(--orange)' : 'rgba(255,255,255,0.4)' }}>
                {parseFloat(vektEndring) < 0 ? '↓' : parseFloat(vektEndring) > 0 ? '↑' : '→'}
                &nbsp;{Math.abs(parseFloat(vektEndring))} kg totalt siden start
              </div>
            )}

            {/* Målvekt-fremgang */}
            {onsketVektMaal > 0 && vektLogger.length > 0 && (() => {
              const sistVekt     = vektLogger[vektLogger.length-1].vekt
              const foersteVekt  = vektLogger[0].vekt
              const diff         = sistVekt - onsketVektMaal
              const erNadd       = diff <= 0
              const nedGangSoFar = foersteVekt - sistVekt
              const totalMaal    = foersteVekt - onsketVektMaal
              const pct          = totalMaal > 0 ? Math.max(0, Math.min(100, Math.round((nedGangSoFar/totalMaal)*100))) : (erNadd ? 100 : 0)
              const farge        = erNadd ? 'var(--green)' : 'var(--cyan)'
              return (
                <div style={{ marginTop:'1rem', padding:'1rem', borderRadius:12, background:`${farge}08`, border:`1px solid ${farge}20` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:'0.8rem', fontWeight:700, color:farge }}>🎯 Mot målvekt {onsketVektMaal} kg</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:800, color:farge }}>{pct}%</span>
                  </div>
                  <div style={{ height:8, borderRadius:999, background:'rgba(255,255,255,0.07)', overflow:'hidden', marginBottom:6 }}>
                    <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:farge, transition:'width 0.8s ease' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'rgba(255,255,255,0.3)' }}>
                    <span>Start: {foersteVekt} kg</span>
                    <span style={{ color:farge }}>{erNadd ? '🎉 Mål nådd!' : `${Math.abs(diff).toFixed(1)} kg igjen`}</span>
                    <span>Mål: {onsketVektMaal} kg</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {vektLogger.length > 1 && (
            <div className="glass-card st-chart-card">
              <div className="st-chart-title">📈 Vektutvikling</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={vektLogger} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dato" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }}
                    axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
                  <YAxis domain={['auto','auto']} tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="vekt" name="Vekt" unit=" kg" stroke="var(--cyan)" strokeWidth={2.5}
                    dot={{ fill:'var(--cyan)', r:4 }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {vektLogger.length > 0 && (
            <div className="glass-card st-vekt-liste">
              <div className="st-chart-title">📋 Vekthistorikk</div>
              <div className="st-vekt-rows">
                {[...vektLogger].reverse().slice(0, 20).map((v, i) => {
                  const forrige = vektLogger[vektLogger.length - 2 - i]
                  const diff    = forrige ? v.vekt - forrige.vekt : null
                  return (
                    <div key={v.dato} className="st-vekt-row">
                      <span className="st-vekt-dato">{format(new Date(v.dato), 'd. MMM yyyy', { locale:nb })}</span>
                      <span className="st-vekt-tall">{v.vekt} kg</span>
                      {diff !== null && (
                        <span style={{ fontSize:'0.75rem', color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'rgba(255,255,255,0.3)', marginLeft:8 }}>
                          {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UTFORDRINGER ── */}
      {aktivFane === 'utfordringer' && (
        <div className="st-utf-page">
          <div className="st-utf-header glass-card">
            <div>
              <div className="st-utf-tittel">🏆 Ukens utfordringer</div>
              <div className="st-utf-sub">Uke {format(new Date(), 'w', { locale:nb })} · Nye utfordringer hver mandag</div>
            </div>
            <div className="st-utf-progress">{utfordringer.filter(u=>u.fullfort).length}/{utfordringer.length}</div>
          </div>

          {alleFullfort && (
            <div className="st-utf-feiring glass-card">
              <div className="st-utf-feiring-em">🎉</div>
              <div>
                <div className="st-utf-feiring-tittel">Imponerende! Du fullførte alle ukens utfordringer!</div>
                <div className="st-utf-feiring-sub">Du er en sann treningshelt. Nye utfordringer venter neste uke 💪</div>
              </div>
            </div>
          )}

          <div className="st-utf-liste">
            {utfordringer.map((u, i) => {
              const prosent = Math.min(100, Math.round((u.fremgang / u.maal) * 100))
              return (
                <div key={u.id} className={`st-utf-kort glass-card${u.fullfort?' st-utf-done':''}`}>
                  <div className="st-utf-top">
                    <div className="st-utf-em">{u.emoji}</div>
                    <div className="st-utf-info">
                      <div className="st-utf-navn">{u.tittel}</div>
                      <div className="st-utf-besk">{u.beskrivelse}</div>
                    </div>
                    {u.fullfort && <div className="st-utf-check">✓</div>}
                  </div>
                  <div className="st-utf-fremgang-bar">
                    <div className="st-utf-bar-bg">
                      <div className="st-utf-bar-fill" style={{ width:`${prosent}%` }} />
                    </div>
                    <span className="st-utf-prosent">{prosent}%</span>
                  </div>
                  <div className="st-utf-kontroll">
                    {u.maal > 1000 ? (
                      // Store tall (vann, skritt) - bruk slider
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span className="st-utf-tall">{u.fremgang} / {u.maal} {u.enhet}</span>
                          {!u.fullfort && (
                            <button className="btn btn-primary st-utf-done-btn" onClick={() => toggleUtfordring(i, u.maal)}>
                              Fullført! 🎉
                            </button>
                          )}
                        </div>
                        {!u.fullfort && (
                          <input
                            type="range"
                            min="0"
                            max={u.maal}
                            value={u.fremgang}
                            onChange={(e) => toggleUtfordring(i, parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              height: '6px',
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: '3px',
                              outline: 'none',
                              WebkitAppearance: 'none'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      // Små tall (økter, dager) - behold knapper
                      <>
                        <span className="st-utf-tall">{u.fremgang} / {u.maal} {u.enhet}</span>
                        {!u.fullfort && (
                          <div className="st-utf-btns">
                            <button className="st-utf-btn" onClick={() => toggleUtfordring(i, Math.max(0, u.fremgang-1))}>−</button>
                            <button className="st-utf-btn st-utf-btn-add" onClick={() => toggleUtfordring(i, u.fremgang+1)}>+</button>
                            <button className="btn btn-primary st-utf-done-btn" onClick={() => toggleUtfordring(i, u.maal)}>Fullført! 🎉</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        .st-page{max-width:1000px}
        .st-faner{display:flex;gap:4px;padding:6px;margin-bottom:1.25rem}
        .st-fane{flex:1;padding:.6rem;border-radius:10px;border:none;background:transparent;color:rgba(255,255,255,.4);font-size:.82rem;font-family:var(--font-body);cursor:pointer;transition:all .15s;font-weight:500}
        .st-fane:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.7)}
        .st-fane.active{background:rgba(0,245,255,.12);color:var(--cyan);border:1px solid rgba(0,245,255,.2)}
        .st-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.25rem}
        @media(max-width:700px){.st-stats-grid{grid-template-columns:repeat(2,1fr)}}
        .st-stat{padding:1.25rem;text-align:center}
        .st-stat-em{font-size:1.4rem;margin-bottom:.4rem}
        .st-stat-val{font-family:var(--font-display);font-size:1.15rem;font-weight:700;margin-bottom:3px}
        .st-stat-lbl{font-size:.68rem;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.08em}
        .st-charts{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
        @media(max-width:700px){.st-charts{grid-template-columns:1fr}}
        .st-chart-card{padding:1.25rem}
        .st-chart-title{font-family:var(--font-display);font-size:.9rem;font-weight:700;color:#fff;margin-bottom:1rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .st-mal-badge{font-size:.7rem;padding:2px 10px;border-radius:999px;background:rgba(0,245,255,.1);border:1px solid rgba(0,245,255,.2);color:var(--cyan);font-family:var(--font-body);font-weight:500}
        .st-tips-card{padding:1.25rem;margin-bottom:1rem}
        .st-tips-list{display:flex;flex-direction:column;gap:8px;margin-bottom:1.25rem}
        .st-tip-row{font-size:.85rem;color:rgba(255,255,255,.65);padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px;border-left:2px solid rgba(0,245,255,.2);line-height:1.5}
        .st-vann-boks{display:flex;gap:14px;align-items:flex-start;padding:14px;background:rgba(0,150,255,.06);border:1px solid rgba(0,150,255,.15);border-radius:12px;margin-top:.75rem}
        .st-vann-icon{font-size:1.8rem;flex-shrink:0}
        .st-vann-tittel{font-family:var(--font-display);font-size:.9rem;font-weight:700;color:#fff;margin-bottom:5px}
        .st-vann-tekst{font-size:.8rem;color:rgba(255,255,255,.5);line-height:1.6}
        .st-vekt-page{display:flex;flex-direction:column;gap:1rem}
        .st-vekt-input-card{padding:1.25rem}
        .st-vekt-form{display:flex;align-items:center;gap:10px;margin-bottom:.75rem}
        .st-vekt-input{max-width:150px}
        .st-vekt-kg{color:rgba(255,255,255,.4);font-size:.9rem}
        .st-vekt-endring{font-size:.88rem;font-weight:600}
        .st-vekt-liste{padding:1.25rem}
        .st-vekt-rows{display:flex;flex-direction:column;gap:6px}
        .st-vekt-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px}
        .st-vekt-dato{flex:1;font-size:.82rem;color:rgba(255,255,255,.5)}
        .st-vekt-tall{font-family:var(--font-display);font-size:.9rem;font-weight:700;color:#fff}
        .st-utf-page{display:flex;flex-direction:column;gap:1rem}
        .st-utf-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem}
        .st-utf-tittel{font-family:var(--font-display);font-size:1rem;font-weight:700;color:#fff}
        .st-utf-sub{font-size:.75rem;color:rgba(255,255,255,.35);margin-top:3px}
        .st-utf-progress{font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--cyan)}
        .st-utf-feiring{display:flex;align-items:center;gap:1.25rem;padding:1.25rem 1.5rem;border-color:rgba(0,255,136,.25)!important;background:rgba(0,255,136,.05)!important}
        .st-utf-feiring-em{font-size:2.5rem;flex-shrink:0}
        .st-utf-feiring-tittel{font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--green);margin-bottom:4px}
        .st-utf-feiring-sub{font-size:.82rem;color:rgba(255,255,255,.5)}
        .st-utf-liste{display:flex;flex-direction:column;gap:.75rem}
        .st-utf-kort{padding:1.25rem;transition:border-color .3s}
        .st-utf-done{border-color:rgba(0,255,136,.25)!important;background:rgba(0,255,136,.04)!important}
        .st-utf-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:.875rem}
        .st-utf-em{font-size:1.6rem;flex-shrink:0}
        .st-utf-info{flex:1}
        .st-utf-navn{font-family:var(--font-display);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:3px}
        .st-utf-besk{font-size:.78rem;color:rgba(255,255,255,.4)}
        .st-utf-check{width:28px;height:28px;border-radius:50%;background:var(--green);color:#000;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .st-utf-fremgang-bar{display:flex;align-items:center;gap:10px;margin-bottom:.75rem}
        .st-utf-bar-bg{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
        .st-utf-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cyan),var(--purple));transition:width .4s ease}
        .st-utf-prosent{font-size:.72rem;color:rgba(255,255,255,.35);width:36px;text-align:right}
        .st-utf-kontroll{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .st-utf-tall{font-size:.8rem;color:rgba(255,255,255,.4)}
        .st-utf-btns{display:flex;gap:6px;align-items:center}
        .st-utf-btn{width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:rgba(255,255,255,.6);cursor:pointer;font-size:.9rem;transition:all .15s;display:flex;align-items:center;justify-content:center;font-family:var(--font-body)}
        .st-utf-btn:hover{background:rgba(255,255,255,.1)}
        .st-utf-btn-add{border-color:rgba(0,245,255,.3);color:var(--cyan)}
        .st-utf-done-btn{font-size:.78rem!important;padding:.35rem .85rem!important}

        /* ── PR REKORDER ── */
        .pr-page{display:flex;flex-direction:column;gap:.75rem}
        .pr-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;gap:1rem;flex-wrap:wrap}
        .pr-header-t{font-family:var(--font-display);font-size:1rem;font-weight:700;color:#fff;margin-bottom:3px}
        .pr-header-s{font-size:.75rem;color:rgba(255,255,255,.3)}
        .pr-ny-btn{font-size:.82rem!important;padding:.5rem 1rem!important}
        .pr-feiring{display:flex;align-items:center;gap:14px;padding:1rem 1.5rem;border-color:rgba(255,165,0,.3)!important;background:rgba(255,165,0,.05)!important;animation:prFeirPop .4s cubic-bezier(.34,1.56,.64,1)}
        @keyframes prFeirPop{from{transform:scale(.97);opacity:0}to{transform:scale(1);opacity:1}}
        .pr-feiring-em{font-size:2rem;flex-shrink:0}
        .pr-feiring-t{font-family:var(--font-display);font-size:.95rem;font-weight:700;color:#ffa500;margin-bottom:3px}
        .pr-feiring-s{font-size:.78rem;color:rgba(255,255,255,.4)}
        .pr-kat-rad{display:flex;gap:6px;padding:.75rem 1rem;flex-wrap:wrap}
        .pr-kat-btn{padding:4px 12px;border-radius:8px;font-size:.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);cursor:pointer;transition:all .12s;font-family:var(--font-body)}
        .pr-kat-btn.on{background:rgba(180,78,255,.12);border-color:rgba(180,78,255,.35);color:var(--purple)}
        .pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem}
        @media(max-width:600px){.pr-grid{grid-template-columns:repeat(2,1fr)}}
        .pr-kort{padding:1rem;cursor:pointer;transition:all .15s;border:1px solid rgba(255,255,255,.07)!important}
        .pr-kort:hover{background:rgba(255,255,255,.04)!important;border-color:rgba(180,78,255,.25)!important;transform:translateY(-2px)}
        .pr-kort-aktiv{border-color:rgba(180,78,255,.2)!important;background:rgba(180,78,255,.04)!important}
        .pr-kort-topp{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
        .pr-kort-em{font-size:1.4rem}
        .pr-kort-kat{font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.25);font-weight:600}
        .pr-kort-navn{font-family:var(--font-display);font-size:.82rem;font-weight:700;color:#fff;margin-bottom:.5rem;line-height:1.3}
        .pr-kort-kg{font-family:var(--font-display);font-size:1.5rem;font-weight:800;color:var(--purple);line-height:1}
        .pr-kort-kglbl{font-size:.75rem;font-weight:400;opacity:.6}
        .pr-kort-reps{font-size:.72rem;color:rgba(255,255,255,.4);margin-top:3px}
        .pr-kort-dato{font-size:.62rem;color:rgba(255,255,255,.2);margin-top:6px}
        .pr-kort-tom{font-size:.72rem;color:rgba(255,255,255,.2);font-style:italic;margin-top:.5rem}
        .pr-laster{display:flex;align-items:center;justify-content:center;padding:3rem}
        .pr-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
        .pr-modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
        .pr-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,.07)}
        .pr-modal-tittel{font-family:var(--font-display);font-size:1rem;font-weight:700;color:#fff}
        .pr-modal-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem}
        .pr-ov-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;max-height:220px;overflow-y:auto;margin-top:6px}
        .pr-ov-btn{padding:6px 10px;border-radius:8px;font-size:.75rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);cursor:pointer;transition:all .12s;text-align:left;font-family:var(--font-body)}
        .pr-ov-btn:hover{background:rgba(255,255,255,.08);color:#fff}
        .pr-ov-btn.on{background:rgba(180,78,255,.12);border-color:rgba(180,78,255,.4);color:var(--purple);font-weight:600}
        .pr-tall-rad{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .pr-nåvaerende{display:flex;align-items:center;gap:8px;font-size:.78rem;color:rgba(255,255,255,.4);padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px;flex-wrap:wrap}
        .pr-nåvaerende strong{color:#fff}
        .pr-ny-rekord-badge{padding:2px 8px;border-radius:999px;background:rgba(255,100,0,.15);border:1px solid rgba(255,100,0,.3);color:#ff8c00;font-size:.65rem;font-weight:600}
        
        /* ─── NY CSS FOR SLIDER ─── */
        .st-utf-fremgang {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .st-utf-slider-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .st-utf-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          outline: none;
        }

        .st-utf-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--cyan);
          cursor: pointer;
          box-shadow: 0 0 10px var(--cyan);
          border: 2px solid white;
        }

        .st-utf-slider-verdi {
          min-width: 60px;
          font-size: 0.9rem;
          font-weight: 600;
          text-align: right;
        }
        /* ─── SLUTT NY CSS ─── */
      `}</style>
    </div>
  )
}