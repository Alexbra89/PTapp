'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, AlertTriangle } from 'lucide-react'

export interface VarselData { tekst: string; feil?: boolean; handling?: { tekst: string; gjor: () => void } }

/** Kort bekreftelse nederst på skjermen («Lagt til i frokost»). */
export function useVarsel() {
  const [varsel, setVarsel] = useState<VarselData | null>(null)
  const tid = useRef<ReturnType<typeof setTimeout>>(undefined)
  const vis = useCallback((v: VarselData) => {
    setVarsel(v)
    clearTimeout(tid.current)
    tid.current = setTimeout(() => setVarsel(null), v.feil ? 6000 : 3200)
  }, [])
  useEffect(() => () => clearTimeout(tid.current), [])
  return { varsel, vis, skjul: () => setVarsel(null) }
}

export function Varsel({ varsel, skjul }: { varsel: VarselData | null; skjul: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {varsel && (
        <motion.div
          key={varsel.tekst}
          className={`ko-varsel${varsel.feil ? ' feil' : ''}`}
          role={varsel.feil ? 'alert' : 'status'}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        >
          {varsel.feil ? <AlertTriangle size={15} /> : <Check size={15} strokeWidth={2} />}
          <span>{varsel.tekst}</span>
          {varsel.handling && <button onClick={() => { varsel.handling!.gjor(); skjul() }}>{varsel.handling.tekst}</button>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
