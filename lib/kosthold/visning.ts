import { format, isToday, isYesterday } from 'date-fns'
import { nb } from 'date-fns/locale'
import { tilDato } from '@/lib/dato'
import { enhetNavn, type Enhet } from './naering'

/** «I dag», «I går» eller «mandag 6. oktober». */
export function dagTekst(dato: string) {
  const d = tilDato(dato)
  if (!d) return dato
  if (isToday(d)) return 'I dag'
  if (isYesterday(d)) return 'I går'
  const t = format(d, 'EEEE d. MMMM', { locale: nb })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const tallTekst = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
export const mengdeTekst = (mengde: number, enhet: Enhet) => `${tallTekst(mengde)} ${enhetNavn(enhet, mengde)}`
