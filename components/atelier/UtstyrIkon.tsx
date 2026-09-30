import type { UtstyrType } from '@/data/ovelsesbibliotek'

// Ikonsett for utstyr – 24×24, 1.4 strek, runde ender. Samme grammatikk som Lucide,
// men tegnet for treningsutstyr som Lucide ikke dekker godt.
const TEGNING: Record<UtstyrType, React.ReactNode> = {
  stang: (
    <>
      <path d="M2 12h20" />
      <rect x="4.5" y="7" width="2.5" height="10" rx="0.8" />
      <rect x="17" y="7" width="2.5" height="10" rx="0.8" />
      <path d="M7 9.5v5M17 9.5v5" />
    </>
  ),
  manualer: (
    <>
      <path d="M8 12h8" />
      <path d="M4.5 9l1.5-1.5h2l.8 1.5v6l-.8 1.5H6L4.5 15z" />
      <path d="M19.5 9L18 7.5h-2l-.8 1.5v6l.8 1.5H18l1.5-1.5z" />
    </>
  ),
  kabel: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V17" />
      <path d="M8 19.5h8" />
      <path d="M9 19.5L12 17l3 2.5" />
    </>
  ),
  maskin: (
    <>
      <path d="M5 21V3h14v18" />
      <path d="M5 21h14" />
      <rect x="9" y="11" width="6" height="7" rx="0.6" />
      <path d="M9 13.3h6M9 15.7h6M12 5v6" />
    </>
  ),
  kettlebell: (
    <>
      <path d="M8.5 9.5V7.5a3.5 3.5 0 0 1 7 0v2" />
      <path d="M6.5 15a5.5 5.5 0 1 1 11 0c0 2.2-1 4.2-2.4 5.5H8.9C7.5 19.2 6.5 17.2 6.5 15z" />
    </>
  ),
  strikk: (
    <>
      <path d="M4 7c3 0 3 10 8 10s5-10 8-10" />
      <circle cx="4" cy="7" r="1.6" />
      <circle cx="20" cy="7" r="1.6" />
    </>
  ),
  kondisjon: <path d="M2.5 12h4l2-5 4 10 2.5-7 1.5 2h5" />,
  kroppsvekt: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7v7M6.5 9.5l5.5 1.5 5.5-1.5M9 21l3-7 3 7" />
    </>
  ),
}

export function UtstyrIkon({ type, size = 18, className }: { type: UtstyrType; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden
    >
      {TEGNING[type]}
    </svg>
  )
}
