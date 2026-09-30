'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { AtelierTooltip, TikkSoyle, AKSE, RUTENETT, MARKOR, PLATINA } from '@/components/atelier/chart'

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  }, [userId])

  if (laster) {
    return <div className="glass-card st-chart-card"><div className="st-chart-title">Volum per uke</div><div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner-lg" /></div></div>
  }

  return (
    <div className="glass-card st-chart-card">
      <div className="st-chart-title">
        Volum per uke <span style={{ marginLeft: 'auto' }}>kg × reps</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top:5, right:10, bottom:0, left:-20 }}>
          <CartesianGrid {...RUTENETT} vertical={false} />
          <XAxis dataKey="uke" {...AKSE} />
          <YAxis {...AKSE} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
          <Tooltip content={<AtelierTooltip enhet="kg" />} cursor={MARKOR} />
          <Bar dataKey="kg" name="Løftet" fill={PLATINA} shape={<TikkSoyle />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}