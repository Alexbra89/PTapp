// Lastebilder i Atelier-stil: hårstrek-flater med et langsomt lysskimmer,
// formet som det ferdige innholdet (serif-tittel, tallrader, kort).

type Variant = 'oversikt' | 'liste' | 'kalender' | 'statistikk' | 'profil' | 'standard'

const Blokk = ({ b, h, r = 8, style }: { b: number | string; h: number; r?: number; style?: React.CSSProperties }) => (
  <span className="skj" style={{ width: b, height: h, borderRadius: r, ...style }} />
)

function Hode() {
  return (
    <div className="page-header">
      <Blokk b="min(340px, 70%)" h={48} r={10} />
      <Blokk b={220} h={10} r={4} style={{ marginTop: 18 }} />
    </div>
  )
}

function Tallrad({ antall = 3 }: { antall?: number }) {
  return (
    <div className="hq-figures" style={{ gridTemplateColumns: `repeat(${antall}, 1fr)` }}>
      {Array.from({ length: antall }).map((_, i) => (
        <div key={i} className="hq-figure">
          <Blokk b={70} h={8} r={3} />
          <Blokk b={90} h={40} r={8} style={{ marginTop: 16 }} />
          <Blokk b={110} h={8} r={3} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>
  )
}

function Kort({ h = 120 }: { h?: number }) {
  return (
    <div className="glass-card skj-kort" style={{ minHeight: h }}>
      <Blokk b={64} h={h - 28} r={14} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Blokk b={80} h={7} r={3} />
        <Blokk b="70%" h={22} r={6} />
        <Blokk b="40%" h={8} r={3} style={{ marginTop: 'auto' }} />
      </div>
    </div>
  )
}

export function SideSkjelett({ variant = 'standard' }: { variant?: Variant }) {
  return (
    <div className="skj-side" aria-busy="true" aria-label="Laster">
      {variant === 'oversikt' ? (
        <>
          <Blokk b="100%" h={1} r={0} />
          <Blokk b="min(420px, 80%)" h={72} r={12} style={{ marginTop: 28 }} />
          <Blokk b="min(300px, 60%)" h={72} r={12} style={{ marginTop: 10 }} />
          <div className="glass-card" style={{ padding: '2rem', marginTop: 36 }}>
            <Blokk b={140} h={8} r={3} />
            <Blokk b="min(360px, 70%)" h={96} r={12} style={{ marginTop: 18 }} />
            <Blokk b="100%" h={58} r={999} style={{ marginTop: 28 }} />
          </div>
          <div style={{ marginTop: 36 }}><Tallrad /></div>
        </>
      ) : (
        <>
          <Hode />
          {variant === 'statistikk' && <><Blokk b={300} h={46} r={999} style={{ marginBottom: 32 }} /><Tallrad antall={4} /><div className="glass-card" style={{ height: 320, marginTop: 32 }} /></>}
          {variant === 'kalender' && (
            <div className="kal-layout">
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div className="skj-kalender">{Array.from({ length: 35 }).map((_, i) => <Blokk key={i} b="100%" h={34} r={999} />)}</div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <Blokk b="60%" h={30} r={8} />
                <Blokk b="40%" h={8} r={3} style={{ marginTop: 14 }} />
                <Blokk b="100%" h={90} r={16} style={{ marginTop: 28 }} />
              </div>
            </div>
          )}
          {variant === 'liste' && (
            <>
              <Blokk b="100%" h={50} r={999} />
              <div className="skj-rad">{Array.from({ length: 7 }).map((_, i) => <Blokk key={i} b={78} h={34} r={999} />)}</div>
              <div className="bib-grid" style={{ marginTop: 40 }}>{Array.from({ length: 6 }).map((_, i) => <Kort key={i} />)}</div>
            </>
          )}
          {variant === 'profil' && (
            <>
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', gap: 20, alignItems: 'center' }}>
                <Blokk b={84} h={84} r={999} />
                <div style={{ flex: 1 }}><Blokk b="50%" h={32} r={8} /><Blokk b="35%" h={8} r={3} style={{ marginTop: 14 }} /></div>
              </div>
              <div style={{ marginTop: 32 }}><Tallrad /></div>
            </>
          )}
          {variant === 'standard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card" style={{ height: 120 }} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
