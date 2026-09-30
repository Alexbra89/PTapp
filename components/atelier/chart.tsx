// Felles grafstil for Recharts – samme språk som resten av Atelier:
// hårstrek-rutenett, mono-akser, tikk-søyler i stedet for massive stolper.

export const GULL = '#C9A96E'
export const PLATINA = '#B8BEC6'

export const AKSE = {
  tick: { fill: 'rgba(242,236,225,0.34)', fontSize: 10, fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
  axisLine: false,
  tickLine: false,
} as const

export const RUTENETT = { stroke: 'rgba(242,236,225,0.06)', strokeDasharray: '0' } as const

export const MARKOR = { fill: 'rgba(242,236,225,0.03)' }

export function AtelierTooltip({ active, payload, label, enhet }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(20,19,17,0.96)', border: '1px solid rgba(242,236,225,0.14)', borderRadius: 14,
      padding: '10px 14px', boxShadow: '0 20px 40px -16px rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,236,225,0.4)', marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: '1.6rem', lineHeight: 1, color: '#F2ECE1' }}>
            {typeof p.value === 'number' ? p.value.toLocaleString('nb-NO') : p.value}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: GULL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {p.unit?.trim() || enhet || p.name}
          </span>
        </div>
      ))}
    </div>
  )
}

// Loddrett tikk-søyle: stablede hårstreker, maks 22px bred, sentrert i båndet
export function TikkSoyle({ x, y, width, height, fill = GULL }: any) {
  if (!height || height <= 0) return null
  const w = Math.min(22, width)
  const x0 = x + (width - w) / 2
  const segs = []
  for (let yy = y + height; yy > y + 1; yy -= 5) segs.push(<rect key={yy} x={x0} y={yy - 2} width={w} height={2} fill={fill} />)
  return <g>{segs}</g>
}

// Vannrett tikk-søyle (for layout="vertical")
export function TikkSoyleH({ x, y, width, height, fill = PLATINA }: any) {
  if (!width || width <= 0) return null
  const h = Math.min(16, height)
  const y0 = y + (height - h) / 2
  const segs = []
  for (let xx = x; xx < x + width - 1; xx += 5) segs.push(<rect key={xx} x={xx} y={y0} width={2} height={h} fill={fill} />)
  return <g>{segs}</g>
}
