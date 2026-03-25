'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(5,5,18,0.95)', border:'1px solid rgba(0,245,255,0.2)', borderRadius:10, padding:'8px 14px' }}>
      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.72rem', marginBottom:4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color:p.color, fontSize:'0.85rem', fontWeight:600 }}>
          {p.name}: {p.value.toLocaleString('no')} kg
        </div>
      ))}
    </div>
  )
}

export default function Volumgraf({ userId }: { userId: string }) {
  const [data, setData] = useState<{ uke: string; kg: number }[]>([])
  const [laster, setLaster] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const hentVolum = async () => {
      const siste8Uker = []
      for (let i = 7; i >= 0; i--) {
        const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
        const slutt = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
        
        const { data: logger } = await supabase
          .from('treningslogger')
          .select('sett')
          .eq('bruker_id', userId)
          .gte('dato', format(start, 'yyyy-MM-dd'))
          .lte('dato', format(slutt, 'yyyy-MM-dd'))

        let ukeKg = 0
        if (logger) {
          for (const logg of logger) {
            if (logg.sett && Array.isArray(logg.sett)) {
              for (const sett of logg.sett) {
                const vekt = sett.vekt || sett.kg || 0
                const reps = sett.reps || 0
                ukeKg += vekt * reps
              }
            }
          }
        }

        siste8Uker.push({
          uke: `U${format(subWeeks(new Date(), i), 'w', { locale: nb })}`,
          kg: Math.round(ukeKg)
        })
      }

      setData(siste8Uker)
      setLaster(false)
    }

    hentVolum()
  }, [userId])

  if (laster) {
    return <div className="glass-card st-chart-card"><div className="st-chart-title">📊 Treningsvolum <span className="st-mal-badge">Laster...</span></div></div>
  }

  return (
    <div className="glass-card st-chart-card">
      <div className="st-chart-title">
        📊 Treningsvolum (kg per uke)
        <span className="st-mal-badge">Totalt løftet</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top:5, right:10, bottom:0, left:-20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="uke" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="kg" name="Løftet" fill="var(--green)" radius={[4,4,0,0]} fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}