export default function KalenderLoading() {
  return (
    <div className="anim-fade-up" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header">
        <div className="ov-skel" style={{ width: 180, height: 32, borderRadius: 8, marginBottom: 6 }} />
        <div className="ov-skel" style={{ width: 260, height: 16, borderRadius: 6 }} />
      </div>

      {/* Navigasjon + måned */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="ov-skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div className="ov-skel" style={{ width: 160, height: 24, borderRadius: 6, flex: 1 }} />
        <div className="ov-skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div className="ov-skel" style={{ width: 80, height: 32, borderRadius: 8 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
        {/* Kalender-grid */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          {/* Ukedager */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="ov-skel" style={{ height: 20, borderRadius: 4 }} />
            ))}
          </div>
          {/* Dager */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="ov-skel" style={{ height: 64, borderRadius: 10 }} />
            ))}
          </div>
        </div>

        {/* Høyre panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="ov-skel" style={{ width: 140, height: 20, borderRadius: 6, marginBottom: '1rem' }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="ov-skel" style={{ height: 72, borderRadius: 12 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ov-skel-pulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
        .ov-skel { background:rgba(255,255,255,0.07); animation:ov-skel-pulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
