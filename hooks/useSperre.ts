'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Hindrer utilsiktede duplikater ved raske gjentatte trykk (dobbelttrykk, «hakkete» skjerm).
 * En handling med samme nøkkel kan ikke startes igjen mens den pågår, og heller ikke i en kort pause
 * etter at den lyktes. Feiler den, slippes sperren med en gang, så «Prøv igjen» virker straks.
 * `laast(nokkel)` brukes til å deaktivere knappen imens.
 */
export function useSperre(pauseMs = 1200) {
  const aktive = useRef(new Set<string>())
  const [, oppdater] = useState(0)

  const slipp = useCallback((nokkel: string) => { aktive.current.delete(nokkel); oppdater(n => n + 1) }, [])

  const kjor = useCallback(<T,>(nokkel: string, handling: () => Promise<T>): Promise<T> | null => {
    if (aktive.current.has(nokkel)) return null
    aktive.current.add(nokkel)
    oppdater(n => n + 1)
    const p = Promise.resolve().then(handling)
    p.then(() => setTimeout(() => slipp(nokkel), pauseMs), () => slipp(nokkel))
    return p
  }, [pauseMs, slipp])

  const laast = useCallback((nokkel: string) => aktive.current.has(nokkel), [])
  return { kjor, laast }
}
