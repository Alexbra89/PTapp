export default function TreningerLoading() {
  return (
    <div className="anim-fade-up" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div className="ov-skel" style={{ width: 160, height: 32, borderRadius: 8, marginBottom: 6 }} />
        <div className="ov-skel" style={{ width: 240, height: 16, borderRadius: 6 }} />
      </div>

      {/* Sted + Gruppe velger */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div className="ov-skel" style={{ width: 100, height: 14, borderRadius: 4, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ov-skel" style={{ width: 100, height: 36, borderRadius: 999 }} />
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="ov-skel" style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="ov-skel" style={{ width: 80, height: 36, borderRadius: 999 }} />
          ))}
        </div>
      </div>

      {/* Øvelse-lista */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ov-skel" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div className="ov-skel" style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="ov-skel" style={{ width: '55%', height: 16, borderRadius: 4, marginBottom: 6 }} />
            <div className="ov-skel" style={{ width: '35%', height: 12, borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="ov-skel" style={{ width: 44, height: 22, borderRadius: 999 }} />
            ))}
          </div>
        </div>
      ))}

      {/* Start-knapp */}
      <div className="ov-skel" style={{ width: '100%', height: 48, borderRadius: 12, marginTop: '1rem' }} />

      <style>{`
        @keyframes ov-skel-pulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
        .ov-skel { background:rgba(255,255,255,0.07); animation:ov-skel-pulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
