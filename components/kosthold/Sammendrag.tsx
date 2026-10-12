'use client'

import Link from 'next/link'
import { TickRing } from '@/components/atelier/Dial'
import { TelleTall } from '@/components/atelier/TelleTall'
import { NAVN, type Totaler, visGram, visKcal } from '@/lib/kosthold/naering'
import type { Ernaeringsmal } from '@/hooks/useKosthold'

const MAKRO = [
  { k: 'protein', navn: 'Protein' },
  { k: 'karbohydrater', navn: 'Karbohydrater' },
  { k: 'fett', navn: 'Fett' },
] as const

export function Makrolinje({ navn, verdi, mal }: { navn: string; verdi: number; mal: number | null }) {
  const pst = mal ? Math.min(100, (verdi / mal) * 100) : 0
  const over = !!mal && verdi > mal * 1.05
  return (
    <div className={`ko-makro-rad${over ? ' over' : ''}`}>
      <span className="ko-makro-navn">{navn}</span>
      <span className="ko-makro-tall"><b>{visGram(verdi)}</b>{mal ? <> / {mal} g</> : ' g'}</span>
      {mal ? (
        <div className="tick-track" role="progressbar" aria-label={`${navn}: ${visGram(verdi)} av ${mal} g`} aria-valuemin={0} aria-valuemax={mal} aria-valuenow={Math.round(verdi)}>
          <div className="tick-fill" style={{ width: `${pst}%` }} />
        </div>
      ) : null}
    </div>
  )
}

/** Ring for energi + tre makrolinjer. Samme komponent på dashbordet og i dagboken. */
export default function Sammendrag({ totaler, mal, ringStorrelse = 150 }: { totaler: Totaler; mal: Ernaeringsmal | null | undefined; ringStorrelse?: number }) {
  const v = totaler.verdier
  const igjen = mal ? mal.kcal - v.kcal : null
  const ufullstendig = totaler.ufullstendig.filter(k => k !== 'sukker' && k !== 'mettet_fett' && k !== 'fiber' && k !== 'salt')
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TickRing
          value={v.kcal} max={mal?.kcal ?? 0} size={ringStorrelse}
          label={<span className="num-monument ko-ring-tall"><TelleTall verdi={Math.round(v.kcal)} /></span>}
          sub={mal ? `av ${visKcal(mal.kcal)} kcal` : 'kcal i dag'}
        />
        {igjen !== null && (
          <div className={`ko-igjen${igjen < 0 ? ' over' : ''}`} data-testid="kcal-igjen">
            {igjen >= 0 ? <><strong>{visKcal(igjen)}</strong> kcal igjen</> : <><strong>{visKcal(-igjen)}</strong> kcal over målet</>}
          </div>
        )}
      </div>
      <div className="ko-makro">
        {MAKRO.map(m => <Makrolinje key={m.k} navn={m.navn} verdi={v[m.k]} mal={mal ? mal[m.k] : null} />)}
        {ufullstendig.length > 0 && (
          <p className="ko-ufullstendig">Noen registreringer mangler {ufullstendig.map(k => NAVN[k].toLowerCase()).join(', ')} – summen kan være litt lav.</p>
        )}
        {!mal && (
          <div className="ko-ingen-mal">
            <p className="ko-ufullstendig">Du har ikke satt mål for kalorier og makroer ennå.</p>
            <Link href="/kosthold/mal" className="btn btn-ghost konto-knapp">Sett mål</Link>
          </div>
        )}
      </div>
    </>
  )
}
