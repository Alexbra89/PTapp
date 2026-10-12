'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  tittel: React.ReactNode
  overtittel?: string
  onLukk: () => void
  children: React.ReactNode
  /** Hindrer lukking mens noe lagres */
  laast?: boolean
}

// Bunnark på mobil, dialog midt på skjermen på desktop. Samme form som øvelsesarket (.bib-ark).
// Lukkes med Escape, klikk utenfor eller lukkeknappen. Fokus flyttes inn i arket og tilbake etterpå.
export default function Ark({ tittel, overtittel, onLukk, children, laast }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lukk = useRef(onLukk)
  lukk.current = onLukk

  useEffect(() => {
    const forrigeFokus = document.activeElement as HTMLElement | null
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !laast) lukk.current() }
    window.addEventListener('keydown', esc)
    const forrige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = forrige
      forrigeFokus?.focus?.({ preventScroll: true })
    }
  }, [laast])

  return createPortal(
    <>
      <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !laast && onLukk()} />
      <motion.div
        ref={ref}
        tabIndex={-1}
        className="bib-ark ko-ark"
        role="dialog" aria-modal="true" aria-label={typeof tittel === 'string' ? tittel : overtittel}
        initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        style={{ outline: 'none' }}
      >
        <div className="sheet-grip" />
        <div className="ko-ark-hode">
          <div style={{ minWidth: 0 }}>
            {overtittel && <span className="eyebrow eyebrow-gold">{overtittel}</span>}
            <h2 className="ko-ark-tittel">{tittel}</h2>
          </div>
          <button className="ko-ark-lukk" onClick={onLukk} aria-label="Lukk" disabled={laast}><X size={18} strokeWidth={1.5} /></button>
        </div>
        {children}
      </motion.div>
    </>,
    document.body,
  )
}
