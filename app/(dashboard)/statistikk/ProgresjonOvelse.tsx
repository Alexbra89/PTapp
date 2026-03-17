'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

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

  return (
    <div className="progresjon-card glass-card">
      <div className="progresjon-header">
        <div className="progresjon-tittel">
          <span className="progresjon-emoji">{valgtOvelseData?.emoji}</span>
          <h3 className="progresjon-navn">{valgtOvelseData?.navn}</h3>
        </div>

        <div className="progresjon-kontroller">
          <select 
            className="progresjon-select"
            value={valgtOvelse}
            onChange={(e) => setValgtOvelse(e.target.value)}
          >
            {ALLE_OVELSER.map(o => (
              <option key={o.id} value={o.id}>
                {o.emoji} {o.navn}
              </option>
            ))}
          </select>

          <div className="progresjon-tidsrom">
            {[
              { verdi: '3m', label: '3m' },
              { verdi: '6m', label: '6m' },
              { verdi: '12m', label: '12m' },
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
          <span className="spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="progresjon-tom">
          <div className="progresjon-tom-emoji">📊</div>
          <div className="progresjon-tom-t">Ingen data for denne øvelsen</div>
          <div className="progresjon-tom-s">Logg noen økter for å se progresjon</div>
        </div>
      ) : (
        <div className="progresjon-graf">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="visDato" 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(data.length / 8)}
              />
              <YAxis 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="progresjon-tooltip">
                      <div className="progresjon-tooltip-dato">{label}</div>
                      <div className="progresjon-tooltip-verdi">
                        {payload[0].value} kg·reps
                      </div>
                    </div>
                  )
                }}
              />
              <Line 
                type="monotone" 
                dataKey="verdi" 
                stroke="var(--cyan)" 
                strokeWidth={2.5}
                dot={{ fill: 'var(--cyan)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <style>{`
        .progresjon-card {
          padding: 1.5rem;
          margin-bottom: 1rem;
        }
        .progresjon-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 768px) {
          .progresjon-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .progresjon-tittel {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .progresjon-emoji {
          font-size: 2rem;
        }
        .progresjon-navn {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
        }
        .progresjon-kontroller {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .progresjon-select {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          min-width: 180px;
        }
        .progresjon-select option {
          background: #030308;
        }
        .progresjon-tidsrom {
          display: flex;
          gap: 0.5rem;
        }
        .progresjon-tidsrom-btn {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.15s;
        }
        .progresjon-tidsrom-btn:hover {
          background: rgba(255,255,255,0.08);
        }
        .progresjon-tidsrom-btn.active {
          background: rgba(0,245,255,0.1);
          border-color: rgba(0,245,255,0.3);
          color: var(--cyan);
        }
        .progresjon-laster {
          display: flex;
          justify-content: center;
          padding: 3rem;
        }
        .progresjon-tom {
          text-align: center;
          padding: 3rem;
        }
        .progresjon-tom-emoji {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .progresjon-tom-t {
          font-family: var(--font-display);
          font-size: 1rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .progresjon-tom-s {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.3);
        }
        .progresjon-graf {
          width: 100%;
        }
        .progresjon-tooltip {
          background: rgba(3,3,8,0.95);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 8px;
          padding: 0.5rem 1rem;
        }
        .progresjon-tooltip-dato {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 0.25rem;
        }
        .progresjon-tooltip-verdi {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--cyan);
        }
      `}</style>
    </div>
  )
}