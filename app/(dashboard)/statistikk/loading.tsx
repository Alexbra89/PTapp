export default function StatistikkLoading() {
  return (
    <div className="anim-fade-up" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header">
        <div className="ov-skel" style={{ width: 200, height: 32, borderRadius: 8, marginBottom: 6 }} />
        <div className="ov-skel" style={{ width: 280, height: 16, borderRadius: 6 }} />
      </div>

      {/* Fane-velger */}
      <div className="glass-card" style={{ display: 'flex', gap: 8, padding: '0.75rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ov-skel" style={{ flex: 1, height: 36, borderRadius: 8 }} />
        ))}
      </div>

      {/* Stats-kort */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="ov-skel" style={{ width: 80, height: 14, borderRadius: 4, marginBottom: 10 }} />
            <div className="ov-skel" style={{ width: 100, height: 28, borderRadius: 6, marginBottom: 6 }} />
            <div className="ov-skel" style={{ width: 60, height: 12, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div className="ov-skel" style={{ width: 160, height: 20, borderRadius: 6, marginBottom: '1.25rem' }} />
        <div className="ov-skel" style={{ width: '100%', height: 200, borderRadius: 12 }} />
      </div>

      {/* Muskelfokus */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="ov-skel" style={{ width: 140, height: 20, borderRadius: 6, marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ov-skel" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="ov-skel" style={{ flex: 1, height: 10, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ov-skel-pulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
        .ov-skel { background:rgba(255,255,255,0.07); animation:ov-skel-pulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
