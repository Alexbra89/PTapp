'use client'

import { useSyncExternalStore } from 'react'

// Personlige innstillinger på denne enheten (lyd og vibrasjon er en egenskap ved telefonen, ikke kontoen)
export interface Innstillinger {
  lyd: boolean
  vibrasjon: boolean
  hvile: 'ovelse' | number   // 'ovelse' = hviletid fra øvelsen, ellers fast antall sekunder
}

const NOKKEL = 'abpt_innstillinger'
const STANDARD: Innstillinger = { lyd: true, vibrasjon: true, hvile: 'ovelse' }
const lyttere = new Set<() => void>()
let cache: Innstillinger | null = null

export function hentInnstillinger(): Innstillinger {
  if (cache) return cache
  if (typeof window === 'undefined') return STANDARD
  try { cache = { ...STANDARD, ...JSON.parse(localStorage.getItem(NOKKEL) ?? '{}') } } catch { cache = STANDARD }
  return cache!
}

export function lagreInnstillinger(endring: Partial<Innstillinger>) {
  cache = { ...hentInnstillinger(), ...endring }
  try { localStorage.setItem(NOKKEL, JSON.stringify(cache)) } catch {}
  lyttere.forEach(l => l())
}

export function useInnstillinger(): Innstillinger {
  return useSyncExternalStore(
    l => { lyttere.add(l); return () => { lyttere.delete(l) } },
    hentInnstillinger,
    () => STANDARD,
  )
}

export function vibrer(monster: number | number[]) {
  if (!hentInnstillinger().vibrasjon) return
  try { navigator.vibrate?.(monster) } catch {}
}

// Hviletid i sekunder: fast valg fra innstillingene, ellers øvelsens egen
export function valgtHvile(ovelsensHvile: number): number {
  const h = hentInnstillinger().hvile
  return h === 'ovelse' ? ovelsensHvile : h
}
