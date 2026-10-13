'use client'

import { Minus, Plus } from 'lucide-react'
import { useVann, VannIkkeOppsattFeil, feilTekst } from '@/hooks/useKosthold'
import { useErPaNett } from '@/hooks/useErPaNett'
import { VANN_MAKS, VANN_MAL } from '@/lib/kosthold/vann'
import Melding from './Melding'

/**
 * Glass vann for en dag. Knappene er låst til dagens antall er lastet: et trykk på + uten
 * kjent utgangspunkt kunne ellers lagret «1» over et antall som allerede finnes.
 */
export default function Vannteller({ userId, dato }: { userId?: string; dato: string }) {
  const { query, ko, glass, lagrer, feil } = useVann(userId, dato)
  const paNett = useErPaNett()

  if (query.error instanceof VannIkkeOppsattFeil) {
    return <Melding type="advarsel"><strong>Vanntelleren er ikke aktivert ennå.</strong> Kjør <code>docs/migrasjoner/vann.sql</code> i Supabase (SQL Editor).</Melding>
  }

  // Lesefeil før noe er lastet: vis feilen, aldri 0 med aktive knapper
  if (glass === null && query.isError) {
    return (
      <section className="glass-card ko-vann" data-testid="vannteller">
        <Melding type="feil">
          Fikk ikke hentet vann for denne dagen. Ingenting kan endres før det er hentet.
          <div style={{ marginTop: 8 }}><button className="btn btn-ghost konto-knapp" onClick={() => query.refetch()} data-testid="vann-prov-igjen">Prøv igjen</button></div>
        </Melding>
      </section>
    )
  }

  const lastet = glass !== null
  const n = glass ?? 0
  const kanEndre = lastet && paNett && !!ko

  return (
    <section className="glass-card ko-vann" aria-busy={!lastet} data-testid="vannteller">
      <div className="ko-vann-hode">
        <div>
          <h3 className="ko-maltid-navn">Vann</h3>
          <div className="ko-maltid-sum">{lastet ? <><b data-testid="vann-antall">{n}</b> av {VANN_MAL} glass{lagrer ? ' · lagrer …' : ''}</> : 'Henter …'}</div>
        </div>
        <div className="ko-vann-knapper">
          <button className="ko-pluss" onClick={() => ko?.endre(-1)} disabled={!kanEndre || n <= 0} aria-label="Ett glass mindre" data-testid="vann-minus"><Minus size={18} strokeWidth={1.5} /></button>
          <button className="ko-pluss" onClick={() => ko?.endre(1)} disabled={!kanEndre || n >= VANN_MAKS} aria-label="Ett glass til" data-testid="vann-pluss"><Plus size={18} strokeWidth={1.5} /></button>
        </div>
      </div>
      <div className="ko-vann-glass" aria-hidden>
        {Array.from({ length: Math.max(VANN_MAL, n) }, (_, i) => <span key={i} className={i < n ? 'fylt' : ''} />)}
      </div>
      {feil ? <Melding type="feil">{feilTekst(feil)} Antallet er tilbake til det som er lagret.</Melding> : null}
    </section>
  )
}
