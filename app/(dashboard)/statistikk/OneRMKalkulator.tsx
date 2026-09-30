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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  }, [userId])

  if (laster) {
    return null
  }

  if (data.length === 0) {
    return (
      <div className="glass-card st-chart-card">
        <div className="st-chart-title">Estimert maks · 1RM</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Logg noen tunge sett, så regner vi ut hva du klarer på én repetisjon.</p>
      </div>
    )
  }

  return (
    <div className="glass-card st-chart-card" style={{ marginBottom: '1rem' }}>
      <div className="st-chart-title">
        Estimert maks · 1RM <span style={{ marginLeft: 'auto' }}>Brzycki</span>
      </div>
      <div className="rm-liste">
        {data.map((item, i) => (
          <div key={item.ovelse_navn} className="rm-rad">
            <span className="rm-nr">{String(i + 1).padStart(2, '0')}</span>
            <div className="rm-info">
              <div className="rm-navn">{item.ovelse_navn}</div>
              <div className="rm-basis">{item.kg} kg × {item.reps} · {item.dato}</div>
            </div>
            <div className="rm-kg num-monument">{item.estimated_1rm}<small>kg</small></div>
          </div>
        ))}
      </div>
      <style>{`
        .rm-liste { border-top: 1px solid var(--line); }
        .rm-rad { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 12px; padding: 1rem 0; border-bottom: 1px solid var(--line); }
        .rm-rad:last-child { border-bottom: none; }
        .rm-nr { font-family: var(--font-mono); font-size: 0.64rem; color: var(--gold); }
        .rm-navn { font-size: 0.95rem; color: var(--ink); }
        .rm-basis { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.06em; color: var(--text-muted); margin-top: 4px; }
        .rm-kg { font-size: 2.4rem; color: var(--ink); display: flex; align-items: baseline; gap: 5px; }
        .rm-kg small { font-family: var(--font-mono); font-size: 0.58rem; color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase; }
      `}</style>
    </div>
  )
}
