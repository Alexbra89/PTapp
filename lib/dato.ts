import { format, parseISO, isValid } from 'date-fns'

// Lokal kalenderdato som 'yyyy-MM-dd'.
// Bruk ALDRI toISOString() til dette: den gir UTC-dato, som i Norge er
// gårsdagen mellom kl. 00 og 01/02, og forskyver datoer laget ved lokal midnatt.
export const lokalDato = (d: Date = new Date()) => format(d, 'yyyy-MM-dd')

// Datoer fra databasen kan i teorien mangle eller være ugyldige. Disse krasjer ikke.
// parseISO tolker 'yyyy-MM-dd' som lokal dato (new Date(...) tolker den som UTC).
export const tilDato = (s: unknown): Date | null => {
  if (typeof s !== 'string' || !s) return null
  const d = parseISO(s)
  return isValid(d) ? d : null
}

export const formaterDato = (s: unknown, monster: string, opts?: Parameters<typeof format>[2]) => {
  const d = tilDato(s)
  return d ? format(d, monster, opts) : ''
}
