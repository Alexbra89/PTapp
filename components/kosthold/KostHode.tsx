'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ScanBarcode, Apple, Target } from 'lucide-react'
import Melding from './Melding'
import { erIkkeOppsatt, feilTekst } from '@/hooks/useKosthold'

const FANER = [
  { href: '/kosthold', navn: 'Dagbok', ikon: BookOpen },
  { href: '/kosthold/legg-til', navn: 'Legg til', ikon: ScanBarcode },
  { href: '/kosthold/matvarer', navn: 'Matvarer', ikon: Apple },
  { href: '/kosthold/mal', navn: 'Mål', ikon: Target },
]

export default function KostHode({ tittel, undertittel }: { tittel: React.ReactNode; undertittel: string }) {
  const sti = usePathname()
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{tittel}</h1>
        <p className="page-subtitle">{undertittel}</p>
      </div>
      <nav className="ko-faner" aria-label="Kosthold">
        {FANER.map(f => {
          const aktiv = f.href === '/kosthold' ? sti === '/kosthold' : sti.startsWith(f.href)
          return (
            <Link key={f.href} href={f.href} className={`ko-fane${aktiv ? ' on' : ''}`} aria-current={aktiv ? 'page' : undefined}>
              <f.ikon size={15} strokeWidth={1.5} /> {f.navn}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

/** Felles visning når data ikke kan hentes. */
export function Datafeil({ feil, onPrøvIgjen }: { feil: unknown; onPrøvIgjen?: () => void }) {
  if (erIkkeOppsatt(feil)) {
    return <Melding type="advarsel"><strong>Kostholdsmodulen er ikke aktivert ennå.</strong> Databasetabellene mangler – kjør <code>docs/migrasjoner/kosthold.sql</code> i Supabase (SQL Editor). Treningsdelen påvirkes ikke.</Melding>
  }
  return (
    <Melding type="feil">
      {feilTekst(feil)}
      {onPrøvIgjen && <div style={{ marginTop: 8 }}><button className="btn btn-ghost konto-knapp" onClick={onPrøvIgjen}>Prøv igjen</button></div>}
    </Melding>
  )
}
