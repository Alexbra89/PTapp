'use client'

import Link from 'next/link'
import { ArrowUpRight, ScanBarcode, BookOpen } from 'lucide-react'
import { useKostDag, useErnaeringsmal, erIkkeOppsatt } from '@/hooks/useKosthold'
import { summer } from '@/lib/kosthold/naering'
import Sammendrag from './Sammendrag'

/**
 * Snarvei og dagens tall på dashbordet. Leser nøyaktig de samme spørringene som dagboken
 * (samme cache), og summerer med samme funksjon – tallene er alltid identiske.
 */
export default function DashbordKost({ userId, dato }: { userId?: string; dato: string }) {
  const dag = useKostDag(userId, dato)
  const { data: mal } = useErnaeringsmal(userId)
  const totaler = summer(dag.data ?? [])

  return (
    <section aria-labelledby="hq-kost-tittel">
      <div className="hq-section-head">
        <h2 className="hq-section-title" id="hq-kost-tittel">Kosthold <em>/ Matscanner</em></h2>
        <Link href="/kosthold" className="hq-link">Dagbok <ArrowUpRight size={12} /></Link>
      </div>
      <div className="glass-card hq-kost" data-testid="dashbord-kost">
        {dag.isError ? (
          <p className="pf-dempet">
            {erIkkeOppsatt(dag.error) ? 'Kostholdsmodulen er ikke aktivert i databasen ennå.' : 'Kunne ikke hente dagens kosthold akkurat nå.'}
          </p>
        ) : dag.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><span className="spinner-lg" /></div>
        ) : (
          <div className="hq-kost-topp"><Sammendrag totaler={totaler} mal={mal} ringStorrelse={132} /></div>
        )}
        <div className="hq-kost-knapper">
          <Link href="/kosthold/legg-til?metode=strekkode" className="btn btn-primary"><ScanBarcode size={17} strokeWidth={1.5} /> Skann mat</Link>
          <Link href="/kosthold" className="btn btn-ghost"><BookOpen size={16} strokeWidth={1.5} /> Kostholdsdagbok</Link>
        </div>
      </div>
    </section>
  )
}
