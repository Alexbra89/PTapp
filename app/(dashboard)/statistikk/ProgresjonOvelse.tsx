'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { AtelierTooltip, AKSE, RUTENETT, GULL } from '@/components/atelier/chart'

// Lazy-load Recharts
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })

// Liste over alle øvelser (samme som i PR-tracker)
const ALLE_OVELSER = [
  { id:'benkpress', navn:'Benkpress', emoji:'🏋️', kategori:'Bryst' },
  { id:'skraabenkpress', navn:'Skråbenkpress', emoji:'📐', kategori:'Bryst' },
  { id:'markloeft', navn:'Markløft', emoji:'⚡', kategori:'Rygg' },
  { id:'kneboey', navn:'Knebøy', emoji:'🦵', kategori:'Bein' },
  { id:'pullups', navn:'Pull-ups', emoji:'🤸', kategori:'Rygg' },
  { id:'militarypress', navn:'Military press', emoji:'⬆️', kategori:'Skuldre' },
  { id:'bicepscurl', navn:'Biceps curl', emoji:'💪', kategori:'Bicep' },
  { id:'hammercurl', navn:'Hammer curl', emoji:'🔨', kategori:'Bicep' },
  { id:'triceppushdown', navn:'Triceps pushdown', emoji:'📉', kategori:'Tricep' },
  { id:'sidehev', navn:'Sidehev', emoji:'🔼', kategori:'Skuldre' },
  { id:'legpress', navn:'Legpress', emoji:'🔧', kategori:'Bein' },
  { id:'romenmarkloeft', navn:'Rumensk markløft', emoji:'🍑', kategori:'Bein' },
  { id:'kabelsittroign', navn:'Sittende kabelroing', emoji:'🚣', kategori:'Rygg' },
  { id:'latpulldown', navn:'Lat pulldown', emoji:'⬇️', kategori:'Rygg' },
  { id:'pushups', navn:'Push-ups', emoji:'💪', kategori:'Bryst' },
  { id:'dips', navn:'Dips', emoji:'⬇️', kategori:'Bryst' },
  { id:'roing', navn:'Roing', emoji:'🚣', kategori:'Rygg' },
  { id:'utfall', navn:'Utfall', emoji:'🚶', kategori:'Bein' },
  { id:'planke', navn:'Planke', emoji:'🧘', kategori:'Core' },
  { id:'crunches', navn:'Crunches', emoji:'🔄', kategori:'Core' },
  // ... legg til alle dine øvelser her
]

interface Props {
  userId: string
}

export default function ProgresjonOvelse({ userId }: Props) {
  const [valgtOvelse, setValgtOvelse] = useState<string>('benkpress')
  const [data, setData] = useState<any[]>([])
  const [laster, setLaster] = useState(true)
  const [tidsrom, setTidsrom] = useState<'3m' | '6m' | '12m' | 'all'>('6m')
  const supabase = createClient()

  useEffect(() => {
    if (!userId || !valgtOvelse) return

    const hentData = async () => {
      setLaster(true)
      
      // Hent alle logger for denne øvelsen
      const { data: logger } = await supabase
        .from('treningslogger')
        .select('dato, sett')
        .eq('bruker_id', userId)
        .eq('ovelse_id', valgtOvelse)
        .order('dato', { ascending: true })

      if (!logger || logger.length === 0) {
        setData([])
        setLaster(false)
        return
      }

      // Beregn beste sett per dag (max kg * reps)
      const dagligBeste: Record<string, number> = {}
      
      logger.forEach((logg: any) => {
        const dato = logg.dato
        const besteSett = logg.sett.reduce((max: number, sett: any) => {
          const vekt = sett.vekt || 0
          const reps = sett.reps || 0
          const total = vekt * reps
          return Math.max(max, total)
        }, 0)

        if (!dagligBeste[dato] || besteSett > dagligBeste[dato]) {
          dagligBeste[dato] = besteSett
        }
      })

      // Konverter til array for graf
      const chartData = Object.entries(dagligBeste).map(([dato, verdi]) => ({
        dato,
        verdi,
        visDato: format(new Date(dato), 'dd.MM')
      }))

      // Filtrer basert på valgt tidsrom
      const now = new Date()
      const filterDato = (dato: string) => {
        const d = new Date(dato)
        if (tidsrom === '3m') return d >= subMonths(now, 3)
        if (tidsrom === '6m') return d >= subMonths(now, 6)
        if (tidsrom === '12m') return d >= subMonths(now, 12)
        return true // 'all'
      }

      const filtrert = chartData.filter(d => filterDato(d.dato))
      setData(filtrert)
      setLaster(false)
    }

    hentData()
  }, [userId, valgtOvelse, tidsrom])

  const valgtOvelseData = ALLE_OVELSER.find(o => o.id === valgtOvelse)
  const siste  = data.length ? (data[data.length - 1] as any).verdi : 0
  const forste = data.length ? (data[0] as any).verdi : 0
  const endring = forste > 0 ? Math.round(((siste - forste) / forste) * 100) : 0

  return (
    <div className="progresjon-card glass-card crop">
      <div className="progresjon-header">
        <div>
          <span className="eyebrow eyebrow-gold">Progresjon · {valgtOvelseData?.kategori}</span>
          <h3 className="progresjon-navn">{valgtOvelseData?.navn}</h3>
        </div>

        <div className="progresjon-kontroller">
          <select
            className="input progresjon-select"
            value={valgtOvelse}
            onChange={(e) => setValgtOvelse(e.target.value)}
            aria-label="Velg øvelse"
          >
            {ALLE_OVELSER.map(o => (
              <option key={o.id} value={o.id}>{o.navn}</option>
            ))}
          </select>

          <div className="progresjon-tidsrom">
            {[
              { verdi: '3m', label: '3M' },
              { verdi: '6m', label: '6M' },
              { verdi: '12m', label: '1Å' },
              { verdi: 'all', label: 'Alt' }
            ].map(t => (
              <button
                key={t.verdi}
                className={`progresjon-tidsrom-btn ${tidsrom === t.verdi ? 'active' : ''}`}
                onClick={() => setTidsrom(t.verdi as any)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {laster ? (
        <div className="progresjon-laster">
          <span className="spinner-lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="progresjon-tom">
          <div className="progresjon-tom-t">Ingen data ennå.</div>
          <div className="progresjon-tom-s">Logg noen økter med {valgtOvelseData?.navn?.toLowerCase()}, så tegner kurven seg selv.</div>
        </div>
      ) : (
        <>
          <div className="progresjon-tall">
            <div className="num-monument progresjon-siste">{siste.toLocaleString('nb-NO')}<small>kg·reps</small></div>
            <div className={`progresjon-endring${endring < 0 ? ' ned' : ''}`}>
              {endring >= 0 ? '+' : ''}{endring}%
              <span>i perioden</span>
            </div>
          </div>
          <div className="progresjon-graf">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...RUTENETT} vertical={false} />
                <XAxis dataKey="visDato" {...AKSE} interval={Math.max(0, Math.floor(data.length / 6))} />
                <YAxis {...AKSE} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip content={<AtelierTooltip enhet="kg·reps" />} cursor={{ stroke: 'rgba(242,236,225,0.15)' }} />
                <Line
                  type="monotone"
                  dataKey="verdi"
                  stroke={GULL}
                  strokeWidth={1.6}
                  dot={{ fill: '#0B0A09', stroke: GULL, strokeWidth: 1.2, r: 3 }}
                  activeDot={{ r: 5, fill: GULL, stroke: '#0B0A09' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <style>{`
        .progresjon-card { padding: 1.75rem; margin-bottom: 1rem; }
        @media (max-width: 520px) { .progresjon-card { padding: 1.4rem 1.1rem; } }
        .progresjon-header { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem; }
        @media (min-width: 768px) { .progresjon-header { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
        .progresjon-navn { font-family: var(--font-serif); font-weight: 400; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; letter-spacing: -0.02em; margin-top: 0.75rem; }
        .progresjon-kontroller { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .progresjon-select { width: auto; min-width: 190px; padding: 0.6rem 1rem; border-radius: 999px; cursor: pointer; }
        .progresjon-tidsrom { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--line); border-radius: 999px; }
        .progresjon-tidsrom-btn { padding: 0.45rem 0.8rem; border-radius: 999px; font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.08em; background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.25s; }
        .progresjon-tidsrom-btn:hover { color: var(--ink); }
        .progresjon-tidsrom-btn.active { background: var(--ink); color: #0B0A09; }
        .progresjon-laster { display: flex; justify-content: center; padding: 4rem; }
        .progresjon-tom { padding: 3rem 0 1.5rem; border-top: 1px solid var(--line); }
        .progresjon-tom-t { font-family: var(--font-serif); font-size: 1.8rem; color: var(--ink); margin-bottom: 0.4rem; }
        .progresjon-tom-s { font-size: 0.88rem; color: var(--text-muted); }
        .progresjon-tall { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; padding-top: 1.25rem; border-top: 1px solid var(--line); margin-bottom: 1rem; flex-wrap: wrap; }
        .progresjon-siste { font-size: clamp(3rem, 9vw, 4.5rem); color: var(--ink); display: flex; align-items: baseline; gap: 8px; }
        .progresjon-siste small { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.14em; color: var(--gold); text-transform: uppercase; }
        .progresjon-endring { font-family: var(--font-serif); font-size: 2rem; color: var(--sage); display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
        .progresjon-endring.ned { color: var(--ember); }
        .progresjon-endring span { font-family: var(--font-mono); font-size: 0.56rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); margin-top: 6px; }
        .progresjon-graf { width: 100%; }
      `}</style>
    </div>
  )
}
