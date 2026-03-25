'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OneRM {
  ovelse_navn: string
  kg: number
  reps: number
  estimated_1rm: number
  dato: string
}

export default function OneRMKalkulator({ userId }: { userId: string }) {
  const [data, setData] = useState<OneRM[]>([])
  const [laster, setLaster] = useState(true)
  const supabase = createClient()

  // Brzycki formel: 1RM = vekt × (36 / (37 - reps))
  const beregn1RM = (vekt: number, reps: number) => {
    if (reps >= 37) return vekt // Sikkerhetsmargin
    return Math.round(vekt * (36 / (37 - reps)))
  }

  useEffect(() => {
    const hentTungeSett = async () => {
      const { data: logger } = await supabase
        .from('treningslogger')
        .select('ovelse_navn, sett, dato')
        .eq('bruker_id', userId)
        .order('dato', { ascending: false })

      if (!logger) return

      // Finn tyngste sett per øvelse
      const perOvelse: Record<string, { kg: number; reps: number; dato: string }> = {}
      
      for (const logg of logger) {
        if (!logg.sett || !Array.isArray(logg.sett)) continue
        
        for (const sett of logg.sett) {
          const vekt = sett.vekt || sett.kg || 0
          const reps = sett.reps || 0
          
          if (vekt > 0 && reps > 0) {
            const eksisterende = perOvelse[logg.ovelse_navn]
            const estimert = beregn1RM(vekt, reps)
            
            if (!eksisterende || estimert > beregn1RM(eksisterende.kg, eksisterende.reps)) {
              perOvelse[logg.ovelse_navn] = {
                kg: vekt,
                reps: reps,
                dato: logg.dato
              }
            }
          }
        }
      }

      const resultat = Object.entries(perOvelse)
        .map(([ovelse_navn, { kg, reps, dato }]) => ({
          ovelse_navn,
          kg,
          reps,
          estimated_1rm: beregn1RM(kg, reps),
          dato
        }))
        .sort((a, b) => b.estimated_1rm - a.estimated_1rm)
        .slice(0, 10) // Topp 10

      setData(resultat)
      setLaster(false)
    }

    hentTungeSett()
  }, [userId])

  if (laster) {
    return <div className="st-chart-title">🏆 Estimert 1RM <span className="st-mal-badge">Laster...</span></div>
  }

  if (data.length === 0) {
    return (
      <div className="glass-card st-chart-card">
        <div className="st-chart-title">🏆 Estimert 1RM</div>
        <div className="st-tip-row" style={{ textAlign: 'center' }}>
          Logg tunge sett for å se estimert maksstyrke
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card st-chart-card">
      <div className="st-chart-title">
        🏆 Estimert 1RM (One Rep Max)
        <span className="st-mal-badge">Brzycki-formel</span>
      </div>
      <div className="pr-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {data.map((item) => (
          <div key={item.ovelse_navn} className="pr-kort" style={{ textAlign: 'center' }}>
            <div className="pr-kort-navn">{item.ovelse_navn}</div>
            <div className="pr-kort-kg" style={{ fontSize: '1.2rem' }}>
              {item.estimated_1rm} <span className="pr-kort-kglbl">kg</span>
            </div>
            <div className="pr-kort-reps" style={{ fontSize: '0.65rem' }}>
              Basert på {item.kg} kg × {item.reps} reps
            </div>
            <div className="pr-kort-dato">{item.dato}</div>
          </div>
        ))}
      </div>
    </div>
  )
}