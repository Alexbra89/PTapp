'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from 'date-fns'
import { nb } from 'date-fns/locale'

// ── Ukentlige utfordringer ─────────────────────────────────────────────────────
interface Utfordring {
  id: string; tittel: string; beskrivelse: string
  maal: number; enhet: string; emoji: string
  fullfort: boolean; fremgang: number
}

const UTFORDRINGER_POOL = [
  { tittel:'10.000 skritt',     beskrivelse:'Gå 10.000 skritt i dag',           maal:10000, enhet:'skritt', emoji:'👣' },
  { tittel:'Drikk 2,5L vann',   beskrivelse:'Drikk 2,5 liter vann i dag',       maal:2500,  enhet:'ml',     emoji:'💧' },
  { tittel:'3 treningsøkter',   beskrivelse:'Fullfør 3 treningsøkter denne uken',maal:3,     enhet:'økter',  emoji:'🏋️' },
  { tittel:'Sov 7+ timer',      beskrivelse:'Sov minst 7 timer 3 netter på rad', maal:3,     enhet:'netter', emoji:'😴' },
  { tittel:'Spis 3 grønnsaker', beskrivelse:'Spis 3 grønnsaker per dag i 5 dager', maal:5,  enhet:'dager',  emoji:'🥦' },
  { tittel:'Ingen sukker',      beskrivelse:'Unngå sukker i 3 dager denne uken', maal:3,     enhet:'dager',  emoji:'🚫' },
  { tittel:'Strekk 10 min',     beskrivelse:'Strekk deg i 10 min etter trening', maal:10,    enhet:'min',    emoji:'🧘' },
  { tittel:'Ned 0,5 kg',        beskrivelse:'Gå ned 0,5 kg denne uken',          maal:1,     enhet:'kg',     emoji:'⚖️' },
  { tittel:'Planke 2 min',      beskrivelse:'Hold planke i 2 minutter totalt',   maal:120,   enhet:'sek',    emoji:'💪' },
  { tittel:'20 min gange',      beskrivelse:'Gå en tur på minst 20 minutter',    maal:20,    enhet:'min',    emoji:'🚶' },
  { tittel:'Push-up streak',    beskrivelse:'Gjør 100 push-ups fordelt på dagen', maal:100,  enhet:'push-ups',emoji:'🤸' },
  { tittel:'Proteinrik dag',    beskrivelse:'Spis protein til hvert måltid i dag', maal:3,   enhet:'måltider',emoji:'🥩' },
]

// Generer 3 utfordringer basert på uke-nummer
function getUkensUtfordringer(ukeNr: number, mal: string): typeof UTFORDRINGER_POOL {
  const seed = ukeNr * 7 + (mal === 'ned_i_vekt' ? 1 : mal === 'bygge_muskler' ? 2 : 3)
  const prioriterte = mal === 'ned_i_vekt'
    ? UTFORDRINGER_POOL.filter(u => ['💧','👣','⚖️','🚶','🚫'].includes(u.emoji))
    : mal === 'bygge_muskler'
    ? UTFORDRINGER_POOL.filter(u => ['🏋️','💪','🤸','🥩','🧘'].includes(u.emoji))
    : UTFORDRINGER_POOL

  const shuffled = [...prioriterte].sort((a, b) => {
    const h1 = (seed * a.tittel.length * 31) % prioriterte.length
    const h2 = (seed * b.tittel.length * 17) % prioriterte.length
    return h1 - h2
  })
  return shuffled.slice(0, 3)
}

// ── Tips basert på mål ─────────────────────────────────────────────────────────
const TRENINGS_TIPS: Record<string, string[]> = {
  ned_i_vekt: [
    '💧 Drikk 2,5–3 liter vann daglig — vann øker forbrenningen og reduserer sultfølelsen',
    '🥗 Kosthold er 80% av vektreduksjon — ingen mengde trening kompenserer for dårlig kosthold',
    '🔥 Cardio + styrke er den beste kombinasjonen — styrke øker hvileforbrenningen varig',
    '⏰ Spis mer protein (1,6–2g per kg kroppsvekt) for å bevare muskelmasse under vekttap',
    '😴 7–9 timer søvn er kritisk — søvnmangel øker sulthormonet ghrelin med opptil 30%',
    '📏 Mål deg med målebånd ukentlig, ikke bare vekten — muskler veier mer enn fett',
    '🍽️ Prøv å spise mesteparten av kaloriene før kl 18 for bedre fettforbrenning',
  ],
  bygge_muskler: [
    '🥩 Spis 1,6–2,2g protein per kg kroppsvekt daglig — protein er byggesteinen for muskler',
    '💤 Muskler vokser UNDER søvn, ikke i treningssalen — prioriter 8 timer søvn',
    '📈 Progressive overload: øk vekt, reps eller sett hver 2.–3. uke for kontinuerlig vekst',
    '💧 Drikk 2–3 liter vann daglig — dehydrering reduserer styrken med opptil 20%',
    '🍌 Spis karbohydrater og protein innen 45 min etter trening for optimal restitusjon',
    '⚖️ Du MÅ spise i kaloriöverskott for å bygge muskler — ca 200–300 kcal over vedlikehold',
    '🔄 Tren hver muskelgruppe 2x per uke for optimal muskelvekst',
  ],
  vedlikehold: [
    '⚖️ Vedlikehold krever konsistens — 3–4 treningsøkter per uke er nok',
    '💧 Drikk 2 liter vann daglig for optimal ytelse og restitusjon',
    '🥗 Spis variert og unngå sterkt bearbeidet mat mesteparten av tiden',
    '😴 Søvn er undervurdert — 7–8 timer gir bedre restitusjon og humør',
    '🚶 Aktiv livsstil teller — gå 8000 skritt daglig i tillegg til trening',
    '🧘 Inkluder mobilitet og fleksibilitet i treningen for langsiktig helse',
  ],
  kondisjon: [
    '❤️ Tren i «sone 2» (kan snakke men er anstrengt) 80% av cardio-tiden for best kondisjon',
    '💧 Drikk 500ml vann 2 timer FØR kondisjonstrening for optimal ytelse',
    '🏃 HIIT (høyintensitetsintervaller) gir mer kondisjonsfremgang enn jevnt tempo',
    '🥗 Karbohydrater er viktigste energikilde for kondisjonstrening — ikke kutt dem',
    '😴 Kondisjon forbedres under hvile — ikke tren hard 2 dager på rad',
    '📊 Mål hvilepulsen din om morgenen — lavere puls over tid = bedre kondisjon',
  ],
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(5,5,18,0.95)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 10, padding: '8px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 600 }}>
          {p.name}: {p.value} {p.unit ?? ''}
        </div>
      ))}
    </div>
  )
}

export default function StatistikkPage() {
  const supabase = createClient()
  const [laster, setLaster] = useState(true)
  const [brukerMal, setBrukerMal] = useState('bygge_muskler')
  const [stats, setStats] = useState({ totalOkter: 0, totalKg: 0, streak: 0, ukeMaal: 0 })
  const [aktivitetData, setAktivitetData] = useState<any[]>([])
  const [muskelfokus, setMuskelfokus] = useState<any[]>([])
  const [utfordringer, setUtfordringer] = useState<Utfordring[]>([])
  const [vektLogger, setVektLogger] = useState<{ dato: string; vekt: number }[]>([])
  const [nyVekt, setNyVekt] = useState<number | ''>('')
  const [lagrerVekt, setLagrerVekt] = useState(false)
  const [aktivFane, setAktivFane] = useState<'stats'|'vekt'|'utfordringer'>('stats')
  const [ukensUtf, setUkensUtf] = useState<typeof UTFORDRINGER_POOL>([])
  const [profilVekt, setProfilVekt] = useState<number>(0)
  const [onsketVektMaal, setOnsketVektMaal] = useState<number>(0)

  useEffect(() => { hentData() }, [])

  const hentData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaster(false); return }

    // Profil (treningsmål)
    const { data: profil } = await supabase
      .from('profiler')
      .select('mal, vekt, onsket_vekt')
      .eq('id', user.id)
      .single()
    const mal = profil?.mal ?? 'bygge_muskler'
    setBrukerMal(mal)
    if (profil?.vekt) setProfilVekt(profil.vekt)
    if (profil?.onsket_vekt) setOnsketVektMaal(profil.onsket_vekt)

    // Uke-nummer for utfordringer
    const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    const valgte = getUkensUtfordringer(ukeNr, mal)
    setUkensUtf(valgte)

    // Last lagrede utfordringer fra localStorage (klient-side)
    const lagret = JSON.parse(localStorage.getItem(`utfordringer_${ukeNr}`) ?? '{}')
    setUtfordringer(valgte.map((u, i) => ({
      ...u, id: `${ukeNr}_${i}`,
      fullfort: lagret[i]?.fullfort ?? false,
      fremgang: lagret[i]?.fremgang ?? 0,
    })))

    // Hent siste 7 uker aktivitet
    const datoer7u: any[] = []
    for (let i = 6; i >= 0; i--) {
      const fra = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const til = format(endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const { count } = await supabase.from('okter')
        .select('*', { count: 'exact', head: true })
        .eq('bruker_id', user.id).gte('dato', fra).lte('dato', til)
      datoer7u.push({ uke: `U${format(subWeeks(new Date(), i), 'w')}`, okter: count ?? 0 })
    }
    setAktivitetData(datoer7u)

    // Totals
    const { count: totalOkter } = await supabase.from('okter').select('*', { count: 'exact', head: true }).eq('bruker_id', user.id)
    const { data: logger } = await supabase.from('treningslogger').select('sett, muskelgruppe').eq('bruker_id', user.id)
    const totalKg = (logger ?? []).reduce((s: number, l: any) =>
      s + (l.sett ?? []).reduce((ss: number, set: any) => ss + (set.vekt ?? 0) * (set.reps ?? 0), 0), 0)

    // Streak
    const { data: dAll } = await supabase.from('okter').select('dato').eq('bruker_id', user.id).order('dato', { ascending: false }).limit(60)
    const dSet = new Set((dAll ?? []).map((d: any) => d.dato))
    let streak = 0; const today = new Date(); today.setHours(0,0,0,0)
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      if (dSet.has(d.toISOString().split('T')[0])) streak++
      else if (i > 0) break
    }

    // Ukemål
    const ukeStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const { count: ukeMaal } = await supabase.from('okter').select('*', { count: 'exact', head: true }).eq('bruker_id', user.id).gte('dato', ukeStart)

    // Muskelfokus
    const mMap: Record<string, number> = {}
    ;(logger ?? []).forEach((l: any) => {
      const g = l.muskelgruppe ?? 'annet'
      mMap[g] = (mMap[g] ?? 0) + 1
    })
    const mArr = Object.entries(mMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([g, n]) => ({ gruppe: g, okter: n }))
    setMuskelfokus(mArr)
    setStats({ totalOkter: totalOkter ?? 0, totalKg: Math.round(totalKg), streak, ukeMaal: ukeMaal ?? 0 })

    // Vektlogg — fra profiler-tabellen eller lokal lagring
    const vektLokal: { dato: string; vekt: number }[] = JSON.parse(localStorage.getItem(`vektlogg_${user.id}`) ?? '[]')
    // Legg til siste lagrede profilvekt som startpunkt hvis tomt
    if (vektLokal.length === 0 && profil?.vekt) {
      const start = [{ dato: format(new Date(), 'yyyy-MM-dd'), vekt: profil.vekt }]
      localStorage.setItem(`vektlogg_${user.id}`, JSON.stringify(start))
      setVektLogger(start)
    } else {
      setVektLogger(vektLokal)
    }

    setLaster(false)
  }

  const loggVekt = async () => {
    if (!nyVekt) return
    setLagrerVekt(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLagrerVekt(false); return }
    const ny = { dato: format(new Date(), 'yyyy-MM-dd'), vekt: Number(nyVekt) }
    const oppdatert = [...vektLogger.filter(v => v.dato !== ny.dato), ny].sort((a, b) => a.dato.localeCompare(b.dato))
    localStorage.setItem(`vektlogg_${user.id}`, JSON.stringify(oppdatert))
    // Oppdater også profil
    await supabase.from('profiler').update({ vekt: Number(nyVekt) }).eq('id', user.id)
    setVektLogger(oppdatert)
    setNyVekt('')
    setLagrerVekt(false)
  }

  const toggleUtfordring = (idx: number, fremgang: number) => {
    const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    const oppdatert = utfordringer.map((u, i) => {
      if (i !== idx) return u
      const nyFremgang = Math.min(fremgang, u.maal)
      return { ...u, fremgang: nyFremgang, fullfort: nyFremgang >= u.maal }
    })
    setUtfordringer(oppdatert)
    const lagret: any = {}
    oppdatert.forEach((u, i) => { lagret[i] = { fullfort: u.fullfort, fremgang: u.fremgang } })
    localStorage.setItem(`utfordringer_${ukeNr}`, JSON.stringify(lagret))
  }

  const alleFullfort = utfordringer.length > 0 && utfordringer.every(u => u.fullfort)
  const tipsListe = TRENINGS_TIPS[brukerMal] ?? TRENINGS_TIPS['bygge_muskler']

  const vektEndring = vektLogger.length >= 2
    ? (vektLogger[vektLogger.length-1].vekt - vektLogger[0].vekt).toFixed(1)
    : null

  if (laster) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner-lg" />
    </div>
  )

  return (
    <div className="st-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Statistikk</h1>
        <p className="page-subtitle">Din treningsfremgang og ukentlige utfordringer</p>
      </div>

      {/* Faner */}
      <div className="st-faner glass-card">
        {([['stats','📊','Oversikt'],['vekt','⚖️','Vektlogg'],['utfordringer','🏆','Utfordringer']] as const).map(([k,e,l]) => (
          <button key={k} className={`st-fane${aktivFane===k?' active':''}`} onClick={() => setAktivFane(k)}>
            {e} {l}
          </button>
        ))}
      </div>

      {/* ── STATS ── */}
      {aktivFane === 'stats' && (
        <>
          <div className="st-stats-grid">
            {[
              { label:'Treningsøkter', val:stats.totalOkter, color:'var(--cyan)',   emoji:'📅' },
              { label:'Kg løftet',     val:`${stats.totalKg.toLocaleString('no')} kg`, color:'var(--green)',  emoji:'🏋️' },
              { label:'Dag-streak',    val:stats.streak,     color:'var(--orange)', emoji:'🔥' },
              { label:'Denne uken',    val:stats.ukeMaal,    color:'var(--purple)', emoji:'📆' },
            ].map(s => (
              <div key={s.label} className="st-stat glass-card">
                <div className="st-stat-em">{s.emoji}</div>
                <div className="st-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="st-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="st-charts">
            <div className="glass-card st-chart-card">
              <div className="st-chart-title">📅 Ukentlig aktivitet</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={aktivitetData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
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
                  <BarChart data={muskelfokus} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 60 }}>
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

          {/* Treningstips */}
          <div className="glass-card st-tips-card">
            <div className="st-chart-title">💡 Treningstips for ditt mål
              <span className="st-mal-badge">
                {brukerMal === 'ned_i_vekt' ? '⬇️ Ned i vekt'
                : brukerMal === 'bygge_muskler' ? '💪 Bygge muskler'
                : brukerMal === 'kondisjon' ? '🏃 Kondisjon' : '⚖️ Vedlikehold'}
              </span>
            </div>
            <div className="st-tips-list">
              {tipsListe.map((t, i) => (
                <div key={i} className="st-tip-row">
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div className="st-vann-boks">
              <div className="st-vann-icon">💧</div>
              <div>
                <div className="st-vann-tittel">Vann & kosthold er avgjørende</div>
                <div className="st-vann-tekst">Trening er bare én del av ligningen. Uten tilstrekkelig vann (2–3 liter/dag) og et godt kosthold vil du ikke nå resultatene du ønsker uansett hvor hardt du trener. Protein, søvn og hydrering er like viktig som selve treningsøktene.</div>
              </div>
            </div>
          </div>
        </>
      )}

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
              <button className="btn btn-primary" onClick={loggVekt} disabled={lagrerVekt || !nyVekt}>
                {lagrerVekt ? <span className="spinner" style={{ width:14, height:14 }} /> : '+ Logg'}
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
              const sistVekt    = vektLogger[vektLogger.length - 1].vekt
              const foersteVekt = vektLogger[0].vekt
              const diff        = sistVekt - onsketVektMaal
              const erNadd      = diff <= 0
              const nedGangSoFar= foersteVekt - sistVekt
              const totalMaal   = foersteVekt - onsketVektMaal
              const pct         = totalMaal > 0 ? Math.max(0, Math.min(100, Math.round((nedGangSoFar / totalMaal) * 100))) : (erNadd ? 100 : 0)
              const farge       = erNadd ? 'var(--green)' : 'var(--cyan)'
              return (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 12, background: `${farge}08`, border: `1px solid ${farge}20` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: farge }}>
                      🎯 Mot målvekt {onsketVektMaal} kg
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: farge }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: farge, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                    <span>Start: {foersteVekt} kg</span>
                    <span style={{ color: farge }}>
                      {erNadd ? '🎉 Mål nådd!' : `${Math.abs(diff).toFixed(1)} kg igjen`}
                    </span>
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
                <LineChart data={vektLogger} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dato" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={d => d.slice(5)} />
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
                  const diff = forrige ? v.vekt - forrige.vekt : null
                  return (
                    <div key={v.dato} className="st-vekt-row">
                      <span className="st-vekt-dato">{format(new Date(v.dato), 'd. MMM yyyy', { locale: nb })}</span>
                      <span className="st-vekt-tall">{v.vekt} kg</span>
                      {diff !== null && (
                        <span style={{ fontSize:'0.75rem', color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
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
              <div className="st-utf-sub">Uke {format(new Date(), 'w', { locale: nb })} · Nye utfordringer hver mandag</div>
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
                    <span className="st-utf-tall">{u.fremgang} / {u.maal} {u.enhet}</span>
                    <div className="st-utf-btns">
                      {!u.fullfort && (
                        <>
                          <button className="st-utf-btn" onClick={() => toggleUtfordring(i, Math.max(0, u.fremgang - 1))}>−</button>
                          <button className="st-utf-btn st-utf-btn-add" onClick={() => toggleUtfordring(i, u.fremgang + 1)}>+</button>
                          <button className="btn btn-primary st-utf-done-btn" onClick={() => toggleUtfordring(i, u.maal)}>Fullført! 🎉</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        .st-page { max-width: 1000px; }

        .st-faner { display: flex; gap: 4px; padding: 6px; margin-bottom: 1.25rem; }
        .st-fane { flex: 1; padding: 0.6rem; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.4); font-size: 0.82rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; font-weight: 500; }
        .st-fane:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
        .st-fane.active { background: rgba(0,245,255,0.12); color: var(--cyan); border: 1px solid rgba(0,245,255,0.2); }

        .st-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-bottom: 1.25rem; }
        @media(max-width:700px) { .st-stats-grid { grid-template-columns: repeat(2,1fr); } }
        .st-stat { padding: 1.25rem; text-align: center; }
        .st-stat-em { font-size: 1.4rem; margin-bottom: 0.4rem; }
        .st-stat-val { font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 3px; }
        .st-stat-lbl { font-size: 0.68rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.08em; }

        .st-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        @media(max-width:700px) { .st-charts { grid-template-columns: 1fr; } }
        .st-chart-card { padding: 1.25rem; }
        .st-chart-title { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px; }
        .st-mal-badge { font-size: 0.7rem; padding: 2px 10px; border-radius: 999px; background: rgba(0,245,255,0.1); border: 1px solid rgba(0,245,255,0.2); color: var(--cyan); font-family: var(--font-body); font-weight: 500; }

        .st-tips-card { padding: 1.25rem; margin-bottom: 1rem; }
        .st-tips-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.25rem; }
        .st-tip-row { font-size: 0.85rem; color: rgba(255,255,255,0.65); padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 2px solid rgba(0,245,255,0.2); line-height: 1.5; }
        .st-vann-boks { display: flex; gap: 14px; align-items: flex-start; padding: 14px; background: rgba(0,150,255,0.06); border: 1px solid rgba(0,150,255,0.15); border-radius: 12px; margin-top: 0.75rem; }
        .st-vann-icon { font-size: 1.8rem; flex-shrink: 0; }
        .st-vann-tittel { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 5px; }
        .st-vann-tekst { font-size: 0.8rem; color: rgba(255,255,255,0.5); line-height: 1.6; }

        /* VEKTLOGG */
        .st-vekt-page { display: flex; flex-direction: column; gap: 1rem; }
        .st-vekt-input-card { padding: 1.25rem; }
        .st-vekt-form { display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem; }
        .st-vekt-input { max-width: 150px; }
        .st-vekt-kg { color: rgba(255,255,255,0.4); font-size: 0.9rem; }
        .st-vekt-endring { font-size: 0.88rem; font-weight: 600; }
        .st-vekt-liste { padding: 1.25rem; }
        .st-vekt-rows { display: flex; flex-direction: column; gap: 6px; }
        .st-vekt-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
        .st-vekt-dato { flex: 1; font-size: 0.82rem; color: rgba(255,255,255,0.5); }
        .st-vekt-tall { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: #fff; }

        /* UTFORDRINGER */
        .st-utf-page { display: flex; flex-direction: column; gap: 1rem; }
        .st-utf-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; }
        .st-utf-tittel { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: #fff; }
        .st-utf-sub { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 3px; }
        .st-utf-progress { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--cyan); }

        .st-utf-feiring { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.5rem; border-color: rgba(0,255,136,0.25) !important; background: rgba(0,255,136,0.05) !important; }
        .st-utf-feiring-em { font-size: 2.5rem; flex-shrink: 0; }
        .st-utf-feiring-tittel { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--green); margin-bottom: 4px; }
        .st-utf-feiring-sub { font-size: 0.82rem; color: rgba(255,255,255,0.5); }

        .st-utf-liste { display: flex; flex-direction: column; gap: 0.75rem; }
        .st-utf-kort { padding: 1.25rem; transition: border-color 0.3s; }
        .st-utf-done { border-color: rgba(0,255,136,0.25) !important; background: rgba(0,255,136,0.04) !important; }
        .st-utf-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 0.875rem; }
        .st-utf-em { font-size: 1.6rem; flex-shrink: 0; }
        .st-utf-info { flex: 1; }
        .st-utf-navn { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 3px; }
        .st-utf-besk { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
        .st-utf-check { width: 28px; height: 28px; border-radius: 50%; background: var(--green); color: #000; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .st-utf-fremgang-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem; }
        .st-utf-bar-bg { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
        .st-utf-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--cyan), var(--purple)); transition: width 0.4s ease; }
        .st-utf-prosent { font-size: 0.72rem; color: rgba(255,255,255,0.35); width: 36px; text-align: right; }

        .st-utf-kontroll { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .st-utf-tall { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
        .st-utf-btns { display: flex; gap: 6px; align-items: center; }
        .st-utf-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 0.9rem; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: var(--font-body); }
        .st-utf-btn:hover { background: rgba(255,255,255,0.1); }
        .st-utf-btn-add { border-color: rgba(0,245,255,0.3); color: var(--cyan); }
        .st-utf-done-btn { font-size: 0.78rem !important; padding: 0.35rem 0.85rem !important; }
      `}</style>
    </div>
  )
}
