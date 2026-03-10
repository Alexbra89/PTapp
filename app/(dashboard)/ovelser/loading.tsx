// app/(dashboard)/ovelser/loading.tsx
// Vises automatisk av Next.js mens ovelser/page.tsx laster.

import React from 'react'

function SkeletonBox({ w, h, r = 8, opacity = 1 }: { w: number | string; h: number; r?: number; opacity?: number }) {
  return (
    <div
      className="ov-skel"
      style={{
        width: typeof w === 'number' ? w : w,
        height: h,
        borderRadius: r,
        opacity,
      }}
    />
  )
}

export default function OvelserLoading() {
  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <SkeletonBox w={260} h={36} r={8} />
        <div style={{ marginTop: 10 }}><SkeletonBox w={200} h={18} r={6} opacity={0.5} /></div>
      </div>

      {/* Søk */}
      <SkeletonBox w="100%" h={46} r={12} />
      <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem', display: 'flex', gap: 6 }}>
        {[80, 90, 100].map((w, i) => <SkeletonBox key={i} w={w} h={32} r={999} opacity={0.6} />)}
      </div>

      {/* Kategorier */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
        {[60, 70, 55, 80, 75, 65, 70, 65, 70, 85].map((w, i) => (
          <SkeletonBox key={i} w={w} h={28} r={999} opacity={Math.max(0.2, 0.65 - i * 0.04)} />
        ))}
      </div>

      {/* Gruppe-header skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonBox w={24} h={24} r={6} />
        <SkeletonBox w={80} h={16} r={4} />
        <div style={{ marginLeft: 'auto' }}><SkeletonBox w={28} h={20} r={999} /></div>
      </div>

      {/* Grid: 20 kort */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
        gap: 10,
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="ov-skel-card"
            style={{
              opacity: Math.max(0.12, 0.85 - i * 0.035),
              animationDelay: `${i * 0.04}s`,
            }}
          >
            {/* SVG-placeholder */}
            <div style={{ width: 68, height: 68, borderRadius: 14, background: 'rgba(0,245,255,0.05)', flexShrink: 0 }} />
            {/* Tekst */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <SkeletonBox w="75%" h={13} r={4} />
              <SkeletonBox w="45%" h={10} r={4} opacity={0.5} />
              <SkeletonBox w="55%" h={9}  r={4} opacity={0.35} />
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <SkeletonBox w={38} h={18} r={999} opacity={0.4} />
                <SkeletonBox w={52} h={18} r={999} opacity={0.3} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
