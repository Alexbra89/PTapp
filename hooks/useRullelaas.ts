'use client'

import { useEffect } from 'react'

// Felles scroll-lås for ark og dialoger. Telles, så overlappende ark (ett animeres ut mens neste
// åpnes) ikke kan etterlate siden låst: siden låses ved første ark og låses opp først når det siste
// lukkes. Hvert ark som husket «forrige» verdi selv, kunne huske «låst» fra det andre arket.
let antall = 0
let opprinnelig = ''

export function laasRulling(): () => void {
  if (antall++ === 0) {
    opprinnelig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  let sluppet = false
  return () => {
    if (sluppet) return
    sluppet = true
    if (--antall === 0) document.body.style.overflow = opprinnelig
  }
}

/** Låser scrolling av siden så lenge komponenten er montert (og `aktiv` er sann). */
export function useRullelaas(aktiv = true) {
  useEffect(() => (aktiv ? laasRulling() : undefined), [aktiv])
}
