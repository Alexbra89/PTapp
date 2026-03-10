// app/(dashboard)/ovelser/loading.tsx
// Vises automatisk av Next.js mens ovelser/page.tsx laster.
// Gir øyeblikkelig visuell respons – null spinner.

export default function OvelserLoading() {
  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={skeletonStyle(240, 32, 8)} />
        <div style={{ ...skeletonStyle(160, 18, 6), marginTop: 8, opacity: 0.5 }} />
      </div>

      {/* Søk skeleton */}
      <div style={{ ...skeletonStyle('100%', 44, 12), marginBottom: '1rem' }} />

      {/* Filterknopper skeleton */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['Alle', 'Bryst', 'Rygg', 'Bein', 'Skuldre', 'Bicep', 'Tricep', 'Core'].map((_, i) => (
          <div
            key={i}
            style={{
              ...skeletonStyle(60 + i * 8, 28, 999),
              opacity: 0.6 - i * 0.04,
            }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              height: 160,
              opacity: Math.max(0.15, 1 - i * 0.04),
              animation: 'ov-skeleton-pulse 1.6s ease-in-out infinite',
              animationDelay: `${i * 0.05}s`,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '1rem',
            }}
          >
            {/* SVG placeholder */}
            <div style={{
              width: 72, height: 72, borderRadius: 14,
              background: 'rgba(0,245,255,0.06)',
            }} />
            {/* Navn placeholder */}
            <div style={skeletonStyle(100, 14, 6)} />
            <div style={{ ...skeletonStyle(60, 10, 4), opacity: 0.5 }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ov-skeleton-pulse {
          0%, 100% { opacity: inherit; }
          50%       { opacity: calc(var(--base-opacity, 0.5) * 0.6); }
        }
      `}</style>
    </div>
  )
}

function skeletonStyle(
  width: number | string,
  height: number,
  radius: number,
): React.CSSProperties {
  return {
    width: typeof width === 'number' ? width : width,
    height,
    borderRadius: radius,
    background: 'rgba(255,255,255,0.06)',
    animation: 'ov-skeleton-pulse 1.6s ease-in-out infinite',
  }
}
