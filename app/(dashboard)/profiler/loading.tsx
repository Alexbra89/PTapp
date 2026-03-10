export default function ProfilLoading() {
  return (
    <div className="anim-fade-up" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div className="ov-skel" style={{ width: 120, height: 32, borderRadius: 8, marginBottom: 6 }} />
        <div className="ov-skel" style={{ width: 220, height: 16, borderRadius: 6 }} />
      </div>

      {/* Profilkort */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="ov-skel" style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <div className="ov-skel" style={{ width: 160, height: 24, borderRadius: 6, marginBottom: 8 }} />
            <div className="ov-skel" style={{ width: 200, height: 16, borderRadius: 4, marginBottom: 8 }} />
            <div className="ov-skel" style={{ width: 120, height: 24, borderRadius: 999 }} />
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div className="ov-skel" style={{ width: '70%', height: 24, borderRadius: 6, margin: '0 auto 6px' }} />
              <div className="ov-skel" style={{ width: '50%', height: 12, borderRadius: 4, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Mål-kort */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div className="ov-skel" style={{ width: 120, height: 18, borderRadius: 6, marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ov-skel" style={{ height: 52, borderRadius: 12 }} />
          ))}
        </div>
      </div>

      {/* BMI */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="ov-skel" style={{ width: 80, height: 18, borderRadius: 6, marginBottom: '1rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="ov-skel" style={{ width: 80, height: 48, borderRadius: 10 }} />
          <div className="ov-skel" style={{ flex: 1, height: 12, borderRadius: 999 }} />
        </div>
      </div>

      <style>{`
        @keyframes ov-skel-pulse { 0%,100%{opacity:.35} 50%{opacity:.65} }
        .ov-skel { background:rgba(255,255,255,0.07); animation:ov-skel-pulse 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
