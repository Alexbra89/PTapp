import { format } from 'date-fns'

// Lokal kalenderdato som 'yyyy-MM-dd'.
// Bruk ALDRI toISOString() til dette: den gir UTC-dato, som i Norge er
// gårsdagen mellom kl. 00 og 01/02, og forskyver datoer laget ved lokal midnatt.
export const lokalDato = (d: Date = new Date()) => format(d, 'yyyy-MM-dd')
