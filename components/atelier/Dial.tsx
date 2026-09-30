// Urskive-bezel: 60 tikk, lengre hvert femte, med romertall på kvartene.
// Brukes som stille bakgrunnsmotiv og som fremdriftsring.
export function Dial({ className = '' }: { className?: string }) {
  const ticks = Array.from({ length: 120 })
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden>
      <circle cx="200" cy="200" r="198" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="0.4" />
      <circle cx="200" cy="200" r="92" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 5" />
      {ticks.map((_, i) => {
        const major = i % 10 === 0
        const mid = i % 5 === 0
        const len = major ? 22 : mid ? 14 : 7
        const a = (i / ticks.length) * Math.PI * 2
        const r1 = 190, r2 = r1 - len
        return (
          <line
            key={i}
            x1={200 + Math.sin(a) * r1} y1={200 - Math.cos(a) * r1}
            x2={200 + Math.sin(a) * r2} y2={200 - Math.cos(a) * r2}
            stroke="currentColor" strokeWidth={major ? 1.1 : 0.6}
          />
        )
      })}
      {['XII', 'III', 'VI', 'IX'].map((t, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <text
            key={t} x={200 + Math.sin(a) * 128} y={200 - Math.cos(a) * 128 + 5}
            textAnchor="middle" fontSize="14" fill="currentColor"
            fontFamily="Instrument Serif, serif" fontStyle="italic"
          >{t}</text>
        )
      })}
    </svg>
  )
}

// Fremdriftsring med tikk – fylte tikk i gull opp til verdien.
export function TickRing({
  value, max, size = 132, label, sub,
}: { value: number; max: number; size?: number; label?: React.ReactNode; sub?: string }) {
  const n = 48
  const filled = Math.round(Math.min(1, max > 0 ? value / max : 0) * n)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2
          const on = i < filled
          return (
            <line
              key={i}
              x1={50 + Math.sin(a) * 48} y1={50 - Math.cos(a) * 48}
              x2={50 + Math.sin(a) * (on ? 40 : 43)} y2={50 - Math.cos(a) * (on ? 40 : 43)}
              stroke={on ? '#C9A96E' : 'rgba(242,236,225,0.18)'}
              strokeWidth={on ? 1.4 : 0.8}
              style={{ transition: `stroke 0.4s ${i * 12}ms` }}
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label}
        {sub && <span className="eyebrow" style={{ marginTop: 4, fontSize: '0.54rem' }}>{sub}</span>}
      </div>
    </div>
  )
}
