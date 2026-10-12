'use client'

import { useSyncExternalStore } from 'react'

const abonner = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}

/** Om nettleseren mener den er på nett. «true» betyr ikke at serveren svarer – bare at den kan prøve. */
export function useErPaNett() {
  return useSyncExternalStore(abonner, () => navigator.onLine, () => true)
}
