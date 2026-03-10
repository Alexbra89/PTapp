'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useUser, useProfil, useDagensOkter, useStats } from '@/hooks/useSupabaseQuery'

export default function DashboardPage() {
  const idag   = new Date().toISOString().split('T')[0]
  const time   = new Date().getHours()
  const hilsen = time < 10 ? 'God morgen' : time < 17 ? 'God dag' : 'God kveld'
  const dagNavn = format(new Date(), 'EEEE d. MMMM', { locale: nb })

  // ── Alle data caches av React Query – ingen re-fetch ved navigasjon ────────
  const { data: user }                          = useUser()
  const { data: profil }                        = useProfil(user?.id)
  const { data: dagensOkter = [], isFetching: okterFetcher } = useDagensOkter(user?.id, idag)
  const { data: stats }                         = useStats(user?.id)

  const fornavn = profil?.navn?.split(' ')[0]
    ?? user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Utøver'

  const treningsmaal = profil?.mal ?? 'bygge_muskler'
  const malTips: Record<string, { tekst: string; farge: string }> = {
    ned_i_vekt:    { tekst: 'Husk: kosthold er 80% av vektreduksjon! 🥗', farge: 'var(--cyan)'   },
    bygge_muskler: { tekst: 'Øk progressivt og spis nok protein! 🥩',    farge: 'var(--purple)' },
    vedlikehold:   { tekst: 'Konsistens er nøkkelen! Bra jobba ⚖️',       farge: 'var(--green)'  },
    kondisjon:     { tekst: 'Tren i sone 2 for best kondisjon! ❤️',       farge: 'var(--orange)' },
  }
  const tips = malTips[treningsmaal] ?? malTips.bygge_muskler

  const HURTIGLENKER = [
    { href: '/treninger',  icon: '⚡', label: 'Start trening',  sub: 'Generer ny økt',        color: '#00f5ff' },
    { href: '/kalender',   icon: '📅', label: 'Kalender',       sub: 'Se ukens plan',         color: '#00ff88' },
    { href: '/ovelser',    icon: '💪', label: 'Øvelsesbibl.',   sub: '100+ øvelser',          color: '#b44eff' },
    { href: '/statistikk', icon: '📊', label: 'Statistikk',     sub: 'Fremgang & mål',        color: '#ff8c00' },
    { href: '/statistikk', icon: '🏆', label: 'Utfordringer',   sub: 'Ukentlige mål',         color: '#ff6600' },
    { href: '/profiler',   icon: '👤', label: 'Profil',         sub: 'Rediger innstillinger', color: '#a855f7' },
  ]

  return (
    <div className="db-page anim-fade-up">

      {/* ── Hero med justert knapp for mobil ── */}
      <div className="db-hero glass-card">
        <div className="db-hero-shine" />
        <div className="db-hero-inner" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '24px',
          padding: '24px',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div className="db-hero-left" style={{ width: '100%' }}>
            <div className="db-dato-badge" style={{ marginBottom: '12px' }}>
              <span className="neon-dot-cyan anim-pulse" />
              <span className="db-dato-txt">{dagNavn}</span>
            </div>
            
            <h1 className="db-hilsen" style={{ 
              fontSize: 'clamp(2rem, 8vw, 2.8rem)', 
              lineHeight: '1.1',
              marginBottom: '16px',
              fontWeight: '900'
            }}>
              {hilsen},<br /> {fornavn}!
            </h1>

            <div
              className="db-tips-badge"
              style={{
                background: `${tips.farge}12`,
                borderColor: `${tips.farge}40`,
                borderWidth: '1px',
                borderStyle: 'solid',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderRadius: '100px',
                marginBottom: '20px'
              }}
            >
              <span
                className="neon-dot"
                style={{ 
                  background: tips.farge, 
                  boxShadow: `0 0 12px ${tips.farge}`, 
                  marginRight: '10px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }}
              />
              <span className="db-tips-txt" style={{ color: tips.farge, fontWeight: '600', fontSize: '0.9rem' }}>
                {tips.tekst}
              </span>
            </div>
          </div>
          
          <Link 
            href="/treninger" 
            className="btn btn-primary db-hero-cta" 
            style={{ 
              width: '100%',
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              marginTop: '0'
            }}
          >
            ⚡ Start treningsøkt
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="db-stats">
        {[
          { label: 'Streak',     val: stats?.streak     ?? 0, suffix: 'dager', color: '#ff8c00', icon: '🔥' },
          { label: 'Totalt',     val: stats?.totalOkter ?? 0, suffix: 'økter', color: '#00f5ff', icon: '📅' },
          { label: 'Denne uken', val: stats?.ukeMaal    ?? 0, suffix: 'økter', color: '#00ff88', icon: '📆' },
        ].map(s => (
          <div key={s.label} className="stat-card db-stat">
            <div className="db-stat-top">
              <span className="db-stat-icon">{s.icon}</span>
              <span className="db-stat-lbl-badge" style={{ background: `${s.color}18`, color: s.color }}>
                {s.label}
              </span>
            </div>
            <div className="db-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="db-stat-sub">{s.suffix}</div>
          </div>
        ))}
      </div>

      {/* ── Hurtiglenker ── */}
      <div className="db-seksjon">
        <div className="db-seksjon-header">
          <span className="db-seksjon-tittel">⚡ Hurtignavigasjon</span>
        </div>
        <div className="db-hurtig-grid">
          {HURTIGLENKER.map(l => (
            <Link key={l.href + l.label} href={l.href} className="db-hurtig-kort"
              style={{ '--akk': l.color } as React.CSSProperties}>
              <div className="db-hurtig-ikon-boks"
                style={{ background: `linear-gradient(135deg, ${l.color}22, ${l.color}08)`, border: `1px solid ${l.color}35` }}>
                <span className="db-hurtig-ikon">{l.icon}</span>
              </div>
              <div className="db-hurtig-tekst">
                <span className="db-hurtig-label">{l.label}</span>
                <span className="db-hurtig-sub">{l.sub}</span>
              </div>
              <span className="db-hurtig-pil" style={{ color: l.color }}>›</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Dagens plan ── */}
      <div className="db-seksjon">
        <div className="db-seksjon-header">
          <span className="db-seksjon-tittel">📅 Dagens plan</span>
          <Link href="/kalender" className="db-seksjon-lenke">Se kalender →</Link>
        </div>

        {dagensOkter.length === 0 ? (
          <div className="glass-card db-ingen">
            <div className="db-ingen-ikon">📅</div>
            <h3 className="db-ingen-tittel">Ingen økt planlagt i dag</h3>
            <p className="db-ingen-sub">Gå til kalender for å planlegge, eller start en rask økt</p>
            <div className="db-ingen-btns">
              <Link href="/treninger" className="btn btn-primary">⚡ Generer økt nå</Link>
              <Link href="/kalender"  className="btn btn-ghost">📅 Åpne kalender</Link>
            </div>
          </div>
        ) : (
          <div className="db-okter">
            {dagensOkter.map((okt: any) => (
              <Link key={okt.id} href={`/treninger/okt?okt=${okt.id}`} className="db-okt glass-card">
                <div className="db-okt-ikon">
                  {okt.type === 'cardio' ? '🏃' : okt.type === 'hvile' ? '😴' : '🏋️'}
                </div>
                <div className="db-okt-info">
                  <div className="db-okt-tittel">{okt.tittel}</div>
                  <div className="db-okt-meta">{okt.varighet_min} min · {okt.type}</div>
                </div>
                <span className="db-okt-arrow">▶</span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}