'use client'

import { useState } from 'react'
import Tabata from './Tabata'
import Stoppeklokke from './Stoppeklokke'

export default function TidtakingSide() {
  const [modus, setModus] = useState<'tabata' | 'stoppeklokke'>('tabata')

  return (
    <div className="tid-page">
      <div className="page-header">
        <h1 className="page-title">Tidtaking<em className="gold">.</em></h1>
        <p className="page-subtitle">Intervaller, stoppeklokke og nedtelling</p>
      </div>

      <div className="st-faner" role="tablist" style={{ marginBottom: '1.5rem' }}>
        {([['tabata', 'Tabata'], ['stoppeklokke', 'Stoppeklokke']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={modus === k} className={`st-fane${modus === k ? ' active' : ''}`} onClick={() => setModus(k)}>{l}</button>
        ))}
      </div>

      {/* Begge beholdes montert, så en løpende klokke ikke nullstilles ved fanebytte */}
      <div style={{ display: modus === 'tabata' ? 'block' : 'none' }}><Tabata /></div>
      <div style={{ display: modus === 'stoppeklokke' ? 'block' : 'none' }}><Stoppeklokke synlig={modus === 'stoppeklokke'} /></div>
    </div>
  )
}
