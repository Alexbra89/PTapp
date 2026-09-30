'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser, useProfil, useStats, useAktivitet, useVektlogg, useLoggVekt } from '@/hooks/useSupabaseQuery'
import ProgresjonOvelse from './ProgresjonOvelse'
import OneRMKalkulator from './OneRMKalkulator'
import Volumgraf from './Volumgraf'
import { BarChart3, Trophy, Scale, Plus, X, Download, Droplet, ArrowUpRight } from 'lucide-react'
import { MuskelGlyph } from '@/components/atelier/Glyph'
import { TelleTall } from '@/components/atelier/TelleTall'
import { PR_OVELSER } from '@/lib/prOvelser'
import { AtelierTooltip, TikkSoyle, TikkSoyleH, AKSE, RUTENETT, MARKOR, GULL } from '@/components/atelier/chart'
import { lokalDato } from '@/lib/dato'

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const BarChart  = dynamic(() => import('recharts').then(mod => mod.BarChart),  { ssr: false })
const Bar       = dynamic(() => import('recharts').then(mod => mod.Bar),       { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line      = dynamic(() => import('recharts').then(mod => mod.Line),      { ssr: false })
const XAxis     = dynamic(() => import('recharts').then(mod => mod.XAxis),     { ssr: false })
const YAxis     = dynamic(() => import('recharts').then(mod => mod.YAxis),     { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip   = dynamic(() => import('recharts').then(mod => mod.Tooltip),   { ssr: false })

const supabase = createClient()


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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  }, [userId])

  const lagrePR = async () => {
    if (!userId || !valgtOv || !nyKg || !nyReps) return
    setLagrer(true)
    const dato    = lokalDato()
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
      <div className="pr-header glass-card">
        <div>
          <div className="pr-header-t">Personlige <em>rekorder</em></div>
          <div className="pr-header-s">Logg dine beste løft. Appen sier fra hver gang du slår en rekord.</div>
        </div>
        <button className="btn btn-primary pr-ny-btn" onClick={() => setVisSkjema(true)}><Plus size={14} strokeWidth={1.6} /> Logg PR</button>
      </div>

      {suksess && (() => {
        const ov = PR_OVELSER.find(o => o.id === suksess)
        return (
          <div className="pr-feiring glass-card">
            <span className="pr-feiring-em"><Trophy size={22} strokeWidth={1.3} /></span>
            <div>
              <div className="pr-feiring-t">Ny personlig rekord!</div>
              <div className="pr-feiring-s">{ov?.navn}: nytt toppløft registrert.</div>
            </div>
          </div>
        )
      })()}

      <div className="pr-kat-rad glass-card">
        {kategorier.map(k => (
          <button key={k} className={`pr-kat-btn${kategori===k?' on':''}`}
            onClick={() => setKategori(k)}>{k}</button>
        ))}
      </div>

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
                  <span className="pr-kort-em"><MuskelGlyph gruppe={ov.kategori.toLowerCase()} size={30} /></span>
                  <span className="pr-kort-kat">{ov.kategori}</span>
                </div>
                <div className="pr-kort-navn">{ov.navn}</div>
                {pr ? (
                  <>
                    <div className="pr-kort-kg">{pr.kg} <span className="pr-kort-kglbl">kg</span></div>
                    <div className="pr-kort-reps">{pr.reps} reps</div>
                    <div className="pr-kort-dato">{pr.dato}</div>
                  </>
                ) : (
                  <div className="pr-kort-tom">Ingen rekord ennå <ArrowUpRight size={12} /></div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {visSkjema && (
        <div className="pr-modal-bg" onClick={() => { setVisSkjema(false); setValgtOv(null) }}>
          <div className="pr-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="pr-modal-header">
              <span className="pr-modal-tittel">Logg ny <em className="gold">rekord</em></span>
              <button className="kal-modal-x" onClick={() => { setVisSkjema(false); setValgtOv(null) }} aria-label="Lukk"><X size={16} strokeWidth={1.5} /></button>
            </div>
            <div className="pr-modal-body">
              <label className="kal-lbl">Øvelse</label>
              <div className="pr-ov-grid">
                {PR_OVELSER.map(o => (
                  <button key={o.id} className={`pr-ov-btn${valgtOv===o.id?' on':''}`}
                    onClick={() => setValgtOv(o.id)}>
                    {o.navn}
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
                    <span className="pr-ny-rekord-badge">Ny rekord</span>
                  )}
                </div>
              )}
            </div>
            <div className="kal-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setVisSkjema(false); setValgtOv(null) }}>Avbryt</button>
              <button className="btn btn-primary" onClick={lagrePR}
                disabled={lagrer || !valgtOv || !nyKg || !nyReps}>
                {lagrer ? <span className="spinner" style={{ width:14, height:14 }} /> : 'Lagre rekord'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
    '⚖️ Du MÅ spise i kalorioverskudd for å bygge muskler — ca 200–300 kcal over vedlikehold',
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

export default function StatistikkPage() {
  const [aktivFane, setAktivFane] = useState<'stats'|'pr'|'vekt'>('stats')
  const [nyVekt,    setNyVekt]    = useState<number|''>('')

  const { data: user }            = useUser()
  const { data: profil }          = useProfil(user?.id)
  const { data: stats }           = useStats(user?.id)
  const { data: aktivitet = [] }  = useAktivitet(user?.id)
  const { data: vektLogger = [] } = useVektlogg(user?.id, profil?.vekt)
  const loggVektMut               = useLoggVekt()

  const brukerMal      = profil?.mal ?? 'bygge_muskler'
  const onsketVektMaal = profil?.onsket_vekt ?? 0
  const muskelfokus    = stats?.muskelfokus ?? []

  const loggVekt = async () => {
    if (!nyVekt || !user) return
    await loggVektMut.mutateAsync({ userId: user.id, vekt: Number(nyVekt), vektLogger })
    setNyVekt('')
  }

  const tipsListe   = TRENINGS_TIPS[brukerMal] ?? TRENINGS_TIPS.bygge_muskler
  const vektEndring = vektLogger.length >= 2
    ? (vektLogger[vektLogger.length-1].vekt - vektLogger[0].vekt).toFixed(1) : null

  // ─── EKSPORT FUNKSJON ───────────────────────────────────────────────────────
  const eksporterTilCSV = async () => {
    if (!user?.id) return
    
    const { data: logger } = await supabase
      .from('treningslogger')
      .select('*')
      .eq('bruker_id', user.id)
      .order('dato', { ascending: false })
    
    if (!logger || logger.length === 0) {
      alert('Ingen treningsdata å eksportere')
      return
    }
    
    const headers = ['Dato', 'Øvelse', 'Muskelgruppe', 'Sett nr', 'Reps', 'Vekt (kg)', 'Fullført']
    const rows: string[][] = []
    
    for (const logg of logger) {
      if (logg.sett && Array.isArray(logg.sett)) {
        logg.sett.forEach((sett: any, idx: number) => {
          rows.push([
            logg.dato,
            logg.ovelse_navn,
            logg.muskelgruppe || '',
            (idx + 1).toString(),
            sett.reps?.toString() || '0',
            (sett.vekt || sett.kg || 0).toString(),
            sett.fullfort ? 'Ja' : 'Nei'
          ])
        })
      }
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `treningsdata_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    
  }

  return (
    <div className="st-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Fremgang<em className="gold">.</em></h1>
        <p className="page-subtitle">Tall som forteller hvor du er på vei</p>
      </div>

      <div className="st-faner">
        {([['stats',BarChart3,'Oversikt'],['pr',Trophy,'Rekorder'],['vekt',Scale,'Vekt']] as const).map(([k,Ikon,l]) => (
          <button key={k} className={`st-fane${aktivFane===k?' active':''}`} onClick={() => setAktivFane(k)}>
            <Ikon size={14} strokeWidth={1.5} /> {l}
          </button>
        ))}
      </div>

      {aktivFane === 'stats' && (
        <>
          <div className="hq-figures st-figurer">
            {[
              { label:'Økter',          val: stats?.totalOkter ?? 0, enhet: '',      sub: 'totalt logget' },
              { label:'Tonnasje',       val: stats?.totalKg ?? 0,    enhet: 'kg',    sub: 'løftet totalt' },
              { label:'Rekke',          val: stats?.streak ?? 0,     enhet: 'dager', sub: 'på rad' },
              { label:'Denne uken',     val: stats?.ukeKg ?? 0,      enhet: 'kg',    sub: 'løftet siden mandag' },
            ].map((f, i) => (
              <div key={f.label} className="hq-figure">
                <span className="eyebrow">{f.label}</span>
                <div className="hq-figure-val num-monument"><TelleTall verdi={f.val} forsinkelse={0.1 + i * 0.08} />{f.enhet && <small>{f.enhet}</small>}</div>
                <div className="hq-figure-sub">{f.sub}</div>
              </div>
            ))}
          </div>

          {/* Progresjonsgraf */}
          {user?.id && <ProgresjonOvelse userId={user.id} />}

          {/* 1RM Kalkulator */}
          {user?.id && <OneRMKalkulator userId={user.id} />}

          <div className="st-charts">
            <div className="glass-card st-chart-card">
              <div className="st-chart-title">Økter per uke</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={aktivitet} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                  <CartesianGrid {...RUTENETT} vertical={false} />
                  <XAxis dataKey="uke" {...AKSE} />
                  <YAxis {...AKSE} allowDecimals={false} />
                  <Tooltip content={<AtelierTooltip enhet="økter" />} cursor={MARKOR} />
                  <Bar dataKey="okter" name="Økter" fill={GULL} shape={<TikkSoyle />} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {muskelfokus.length > 0 && (
              <div className="glass-card st-chart-card">
                <div className="st-chart-title">Muskelfokus</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={muskelfokus} layout="vertical" margin={{ top:5, right:10, bottom:0, left:60 }}>
                    <CartesianGrid {...RUTENETT} horizontal={false} />
                    <XAxis type="number" {...AKSE} allowDecimals={false} />
                    <YAxis dataKey="gruppe" type="category" {...AKSE} tick={{ ...AKSE.tick, fill: 'rgba(242,236,225,0.6)' }} />
                    <Tooltip content={<AtelierTooltip enhet="logger" />} cursor={MARKOR} />
                    <Bar dataKey="okter" name="Loggede" shape={<TikkSoyleH />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Volumgraf */}
          {user?.id && <Volumgraf userId={user.id} />}

          <div className="glass-card st-tips-card">
            <div className="st-tips-hode">
              <h2 className="hq-section-title">Råd for <em>{brukerMal === 'ned_i_vekt' ? 'vektnedgang'
                : brukerMal === 'bygge_muskler' ? 'muskelvekst'
                : brukerMal === 'kondisjon' ? 'kondisjon' : 'vedlikehold'}</em></h2>
              <span className="eyebrow">Basert på målet ditt</span>
            </div>
            <div className="st-tips-list">
              {tipsListe.map((t, i) => <div key={i} className="st-tip-row"><span className="st-tip-nr">{String(i + 1).padStart(2, '0')}</span><span>{t.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '')}</span></div>)}
            </div>
            <div className="st-vann-boks">
              <div className="st-vann-icon"><Droplet size={20} strokeWidth={1.3} /></div>
              <div>
                <div className="st-vann-tittel">Vann & kosthold er avgjørende</div>
                <div className="st-vann-tekst">Trening er bare én del av ligningen. Uten tilstrekkelig vann (2–3 liter/dag) og et godt kosthold vil du ikke nå resultatene dine uansett hvor hardt du trener. Protein, søvn og hydrering er like viktig som selve treningsøktene.</div>
              </div>
            </div>
          </div>

          {/* Eksport-seksjon */}
          <div className="st-eksport">
            <div>
              <div className="st-eksport-t">Eksporter dataene dine</div>
              <div className="st-eksport-s">Alle sett som CSV, klar for Excel eller Numbers.</div>
            </div>
            <button className="btn btn-ghost" onClick={eksporterTilCSV}>
              <Download size={14} strokeWidth={1.5} /> Last ned CSV
            </button>
          </div>
        </>
      )}

      {aktivFane === 'pr' && <PRTracker userId={user?.id} supabase={supabase} />}

      {aktivFane === 'vekt' && (
        <div className="st-vekt-page">
          <div className="glass-card st-vekt-input-card">
            <div className="st-chart-title">Dagens vekt</div>
            <div className="st-vekt-form">
              <input className="input st-vekt-input" type="number" min={30} max={300} step={0.1}
                placeholder="f.eks. 82.5" value={nyVekt}
                onChange={e => setNyVekt(e.target.value === '' ? '' : parseFloat(e.target.value))} />
              <span className="st-vekt-kg">kg</span>
              <button className="btn btn-primary" onClick={loggVekt} disabled={loggVektMut.isPending || !nyVekt}>
                {loggVektMut.isPending ? <span className="spinner" style={{ width:14, height:14 }} /> : <><Plus size={14} strokeWidth={1.6} /> Logg</>}
              </button>
            </div>
            {vektEndring !== null && (
              <div className="st-vekt-endring"
                style={{ color: parseFloat(vektEndring) < 0 ? 'var(--green)' : parseFloat(vektEndring) > 0 ? 'var(--orange)' : 'rgba(242,236,225,0.4)' }}>
                {parseFloat(vektEndring) < 0 ? '↓' : parseFloat(vektEndring) > 0 ? '↑' : '→'}
                &nbsp;{Math.abs(parseFloat(vektEndring))} kg totalt siden start
              </div>
            )}

            {onsketVektMaal > 0 && vektLogger.length > 0 && (() => {
              const sistVekt    = vektLogger[vektLogger.length-1].vekt
              const foersteVekt = vektLogger[0].vekt
              const diff        = sistVekt - onsketVektMaal
              const erNadd      = diff <= 0
              const nedGangSoFar = foersteVekt - sistVekt
              const totalMaal   = foersteVekt - onsketVektMaal
              const pct         = totalMaal > 0 ? Math.max(0, Math.min(100, Math.round((nedGangSoFar/totalMaal)*100))) : (erNadd ? 100 : 0)
              const farge       = erNadd ? 'var(--green)' : 'var(--cyan)'
              return (
                <div style={{ marginTop:'1rem', padding:'1rem', borderRadius:12, background:`${farge}08`, border:`1px solid ${farge}20` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:'0.8rem', fontWeight:700, color:farge }}>Mot målvekt {onsketVektMaal} kg</span>
                    <span className="num-monument" style={{ fontSize:'2rem', color:'var(--ink)' }}>{pct}<span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>%</span></span>
                  </div>
                  <div className="tick-track" style={{ marginBottom: 8 }}><div className="tick-fill" style={{ width: `${pct}%` }} /></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'rgba(242,236,225,0.3)' }}>
                    <span>Start: {foersteVekt} kg</span>
                    <span style={{ color:farge }}>{erNadd ? 'Målet er nådd' : `${Math.abs(diff).toFixed(1)} kg igjen`}</span>
                    <span>Mål: {onsketVektMaal} kg</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {vektLogger.length > 1 && (
            <div className="glass-card st-chart-card">
              <div className="st-chart-title">Vektutvikling</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={vektLogger} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                  <CartesianGrid {...RUTENETT} vertical={false} />
                  <XAxis dataKey="dato" {...AKSE} tickFormatter={d => d.slice(5)} />
                  <YAxis domain={['auto','auto']} {...AKSE} />
                  <Tooltip content={<AtelierTooltip />} cursor={{ stroke: 'rgba(242,236,225,0.15)' }} />
                  <Line dataKey="vekt" name="Vekt" unit=" kg" type="monotone" stroke={GULL} strokeWidth={1.5}
                    dot={{ fill:'#0B0A09', stroke: GULL, strokeWidth: 1.2, r:3.5 }} activeDot={{ r:5, fill: GULL, stroke: '#0B0A09' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {vektLogger.length > 0 && (
            <div className="glass-card st-vekt-liste">
              <div className="st-chart-title">Historikk</div>
              <div className="st-vekt-rows">
                {[...vektLogger].reverse().map((v, i) => {
                  const forrige = vektLogger[vektLogger.length - 2 - i]
                  const diff    = forrige ? v.vekt - forrige.vekt : null
                  return (
                    <div key={v.dato} className="st-vekt-row">
                      <span className="st-vekt-dato">{format(new Date(v.dato), 'd. MMM yyyy', { locale:nb })}</span>
                      <span className="st-vekt-tall">{v.vekt} kg</span>
                      {diff !== null && (
                        <span style={{ fontSize:'0.75rem', color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'rgba(242,236,225,0.3)', marginLeft:8 }}>
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

      <style>{`
        .st-page{max-width:1000px}
        .st-page .page-title em{font-style:italic}
        .st-faner{display:inline-flex;gap:4px;padding:5px;margin-bottom:2.25rem;border:1px solid var(--line);border-radius:999px;background:rgba(242,236,225,.02)}
        .st-fane{display:inline-flex;align-items:center;gap:8px;padding:.65rem 1.2rem;border-radius:999px;border:none;background:transparent;color:var(--text-secondary);font-size:.86rem;cursor:pointer;transition:all .3s var(--ease-out)}
        .st-fane:hover{color:var(--ink)}
        .st-fane.active{background:var(--ink);color:#0B0A09;font-weight:500}
        .st-figurer{grid-template-columns:repeat(4,1fr);margin-bottom:2.5rem}
        @media(max-width:760px){.st-figurer{grid-template-columns:1fr 1fr}.st-figurer .hq-figure:nth-child(3){grid-column:auto;border-top:1px solid var(--line)}.st-figurer .hq-figure:nth-child(4){border-top:1px solid var(--line)}.st-figurer .hq-figure:nth-child(odd){border-left:none}}
        .st-figurer .hq-figure-val{font-size:clamp(2.2rem,5vw,3rem)}
        .st-charts{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
        @media(max-width:700px){.st-charts{grid-template-columns:1fr}}
        .st-chart-card{padding:1.5rem}
        .st-chart-title{margin-bottom:1.25rem!important;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .st-tips-card{padding:1.75rem;margin:1rem 0}
        .st-tips-hode{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem}
        .st-tips-hode h2 em{font-style:italic;color:var(--gold)}
        .st-tips-list{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-bottom:1.25rem}
        .st-tip-row{display:grid;grid-template-columns:40px 1fr;gap:8px;background:none!important;border-radius:0!important;border-left:none!important;font-size:.92rem;color:var(--text-secondary);padding:1rem 0;border-bottom:1px solid var(--line);line-height:1.55}
        .st-tip-nr{font-family:var(--font-mono);font-size:.64rem;color:var(--gold);padding-top:4px}
        .st-vann-boks{display:flex;gap:16px;align-items:flex-start;padding:1.25rem;border:1px solid var(--line);border-radius:18px;background:rgba(242,236,225,.02)}
        .st-vann-icon{width:40px;height:40px;border-radius:50%;border:1px solid rgba(201,169,110,.45);color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .st-vann-tittel{font-family:var(--font-serif);font-weight:400!important;font-size:1.35rem;line-height:1.1;color:var(--ink);margin-bottom:6px}
        .st-vann-tekst{font-size:.84rem;color:var(--text-muted);line-height:1.65}
        .st-eksport{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1.5rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:1.5rem}
        .st-eksport-t{font-family:var(--font-serif);font-size:1.5rem;line-height:1.1}
        .st-eksport-s{font-size:.82rem;color:var(--text-muted);margin-top:4px}
        .st-vekt-page{display:flex;flex-direction:column;gap:1rem}
        .st-vekt-input-card{padding:1.5rem}
        .st-vekt-form{display:flex;align-items:center;gap:10px;margin-bottom:.75rem}
        .st-vekt-input{max-width:160px;font-size:1.1rem!important}
        .st-vekt-kg{font-size:1.4rem!important;color:var(--text-muted)!important}
        .st-vekt-endring{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em}
        .st-vekt-liste{padding:1.5rem}
        .st-vekt-rows{display:flex;flex-direction:column;border-top:1px solid var(--line)}
        .st-vekt-row{display:flex;align-items:baseline;gap:10px;padding:.85rem 0;border-bottom:1px solid var(--line)}
        .st-vekt-dato{flex:1;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.06em;color:var(--text-muted)}
        .st-vekt-tall{font-family:var(--font-serif);font-size:1.5rem;color:var(--ink)}
        .pr-page{display:flex;flex-direction:column;gap:1rem}
        .pr-header{display:flex;align-items:center;justify-content:space-between;padding:1.5rem;gap:1rem;flex-wrap:wrap}
        .pr-header-t{font-family:var(--font-serif);font-weight:400;font-size:1.9rem;line-height:1;color:var(--ink);margin-bottom:8px}
        .pr-header-t em{font-style:italic;color:var(--gold)}
        .pr-header-s{font-size:.84rem;color:var(--text-muted)}
        .pr-ny-btn{font-size:.84rem!important;padding:.6rem 1.1rem!important;gap:7px!important}
        .pr-feiring{display:flex;align-items:center;gap:16px;padding:1.25rem 1.5rem;border-color:rgba(201,169,110,.45)!important;animation:prFeirPop .6s var(--ease-spring)}
        @keyframes prFeirPop{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}
        .pr-feiring-em{width:48px;height:48px;border-radius:50%;background:var(--gold);color:#17130C;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pr-feiring-t{font-family:var(--font-serif);font-size:1.5rem;line-height:1.1;color:var(--gold-hi);margin-bottom:3px}
        .pr-feiring-s{font-size:.82rem;color:var(--text-secondary)}
        .pr-kat-rad{display:flex;gap:6px;flex-wrap:wrap}
        .pr-kat-btn{padding:7px 14px;border-radius:999px;font-size:.8rem;background:transparent;border:1px solid var(--line);color:var(--text-secondary);cursor:pointer;transition:all .25s}
        .pr-kat-btn:hover{color:var(--ink);border-color:var(--line-strong)}
        .pr-kat-btn.on{background:var(--ink);border-color:var(--ink);color:#0B0A09}
        .pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.75rem}
        @media(max-width:600px){.pr-grid{grid-template-columns:repeat(2,1fr)}}
        .pr-kort{padding:1.25rem;cursor:pointer;display:flex;flex-direction:column;min-height:200px}
        .pr-kort:hover{border-color:rgba(201,169,110,.4)!important;transform:translateY(-3px)}
        .pr-kort-aktiv{border-color:rgba(201,169,110,.25)!important}
        .pr-kort-topp{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem}
        .pr-kort-em{display:flex}
        .pr-kort-kat{font-family:var(--font-mono);font-size:.56rem;text-transform:uppercase;letter-spacing:.16em;color:var(--text-muted)}
        .pr-kort-navn{font-size:.9rem;color:var(--text-secondary);margin-bottom:auto;line-height:1.3}
        .pr-kort-kg{font-family:var(--font-serif);font-size:2.8rem;line-height:.9;letter-spacing:-.03em;color:var(--ink);margin-top:1rem}
        .pr-kort-kglbl{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.12em;color:var(--gold);text-transform:uppercase}
        .pr-kort-reps{font-family:var(--font-mono);font-size:.66rem;color:var(--text-muted);margin-top:8px;letter-spacing:.06em}
        .pr-kort-dato{font-family:var(--font-mono);font-size:.58rem;color:rgba(242,236,225,.22);margin-top:2px}
        .pr-kort-tom{display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--text-muted);margin-top:1rem}
        .pr-laster{display:flex;align-items:center;justify-content:center;padding:3rem}
        .pr-modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:1rem}
        .pr-modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:28px!important}
        .pr-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.5rem 1rem}
        .pr-modal-tittel em{font-style:italic}
        .pr-modal-body{padding:0 1.5rem 1.25rem;display:flex;flex-direction:column;gap:1rem}
        .pr-ov-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;max-height:240px;overflow-y:auto;margin-top:6px}
        .pr-ov-btn{padding:.65rem .8rem;border-radius:12px;font-size:.8rem;background:transparent;border:1px solid var(--line);color:var(--text-secondary);cursor:pointer;transition:all .2s;text-align:left}
        .pr-ov-btn:hover{color:var(--ink);border-color:var(--line-strong)}
        .pr-ov-btn.on{background:var(--ink);border-color:var(--ink);color:#0B0A09}
        .pr-tall-rad{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .pr-nåvaerende{display:flex;align-items:center;gap:10px;font-size:.82rem;color:var(--text-muted);padding:.75rem 0 .75rem 1rem;border-left:1px solid var(--gold);flex-wrap:wrap}
        .pr-nåvaerende strong{color:var(--ink);font-weight:500}
        .pr-ny-rekord-badge{padding:3px 10px;border-radius:999px;background:var(--gold);color:#17130C;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase}
        .kal-lbl{margin-bottom:-6px}
        .kal-modal-x{width:34px;height:34px;border-radius:50%;background:none;border:1px solid var(--line);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .kal-modal-x:hover{color:var(--ink);border-color:var(--line-strong)}
        .kal-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:1rem 1.5rem 1.5rem;border-top:1px solid var(--line)}
      `}</style>
    </div>
  )
}