'use client'

import { useEffect } from 'react'

// Holder skjermen våken mens `aktiv` er sann (Screen Wake Lock API).
// Nettleseren slipper låsen når fanen skjules, så den hentes på nytt når fanen blir synlig igjen.
// Støttes ikke overalt (eldre iOS) – da skjer det ingenting.
export function useSkjermVaaken(aktiv: boolean) {
  useEffect(() => {
    if (!aktiv || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let las: any = null
    let avsluttet = false
    const hent = async () => {
      try {
        if (document.visibilityState !== 'visible' || avsluttet) return
        las = await (navigator as any).wakeLock.request('screen')
      } catch { /* f.eks. strømsparing – ignorer */ }
    }
    const synlig = () => { if (document.visibilityState === 'visible') hent() }
    hent()
    document.addEventListener('visibilitychange', synlig)
    return () => {
      avsluttet = true
      document.removeEventListener('visibilitychange', synlig)
      try { las?.release() } catch {}
    }
  }, [aktiv])
}
