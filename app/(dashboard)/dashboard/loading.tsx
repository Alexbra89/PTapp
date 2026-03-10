export default function DashboardLoading() {
  return (
    <div className="anim-fade-up" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div className="ov-skel" style={{ width: 220, height: 36, borderRadius: 8, marginBottom: 6 }} />
        <div className="ov-skel" style={{ width: 180, height: 16, borderRadius: 6 }} />
      </div>

      {/* Stats-rad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="ov-skel" style={{ width: 60, height: 12, borderRadius: 4, marginBottom: 10 }} />
            <div className="ov-skel" style={{ width: 80, height: 28, borderRadius: 6, marginBottom: 6 }} />
            <div className="ov-skel" style={{ width: 50, height: 10, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Snarveier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
            <div className="ov-skel" style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 10 }} />
            <div className="ov-skel" style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 6 }} />
            <div className="ov-skel" style={{ width: '50%', height: 12, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Aktivitet chart */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="ov-skel" style={{ width: 180, height: 20, borderRadius: 6, marginBottom: '1.25rem' }} />
        <div className="ov-skel" style={{ width: '100%', height: 160, borderRadius: 12 }} />
      </div>

      <style>{`
        @keyframes ov-skel-pulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
        .ov-skel { background:rgba(255,255,255,0.07); animation:ov-skel-pulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
