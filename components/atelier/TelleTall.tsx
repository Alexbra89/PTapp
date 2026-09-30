'use client'

import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// Tall som teller opp til verdien – brukes på monumentale nøkkeltall.
// Skriver direkte til DOM-en (ingen re-render per frame) og respekterer «redusert bevegelse».
export function TelleTall({
  verdi, desimaler = 0, varighet = 1.4, forsinkelse = 0,
}: { verdi: number; desimaler?: number; varighet?: number; forsinkelse?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const forrige = useRef(0)
  const rolig = useReducedMotion()
  const fmt = (n: number) => n.toLocaleString('nb-NO', { minimumFractionDigits: desimaler, maximumFractionDigits: desimaler })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (rolig) { el.textContent = fmt(verdi); forrige.current = verdi; return }
    const kontroll = animate(forrige.current, verdi, {
      duration: varighet, delay: forsinkelse, ease: [0.16, 1, 0.3, 1],
      onUpdate: v => { el.textContent = fmt(v) },
    })
    forrige.current = verdi
    return () => kontroll.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdi, rolig])

  return <span ref={ref}>{fmt(rolig ? verdi : 0)}</span>
}
