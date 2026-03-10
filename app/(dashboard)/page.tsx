'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'

export default function DashboardPage() {
  const supabase = createClient()
  const [user,         setUser]         = useState<any>(null)
  const [dagensOkter,  setDagensOkter]  = useState<any[]>([])
  const [stats,        setStats]        = useState({ streak: 0, totalOkter: 0, ukeMaal: 0 })
  const [laster,       setLaster]       = useState(true)
  const [treningsmaal, setTreningsmaal] = useState('bygge_muskler')

  const time    = new Date().getHours()
  const hilsen  = time < 10 ? 'God morgen' : time < 17 ? 'God dag' : 'God kveld'
  const dagNavn = format(new Date(), 'EEEE d. MMMM', { locale: nb })

  useEffect(() => { hentData() }, [])

  const hentData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaster(false); return }
    setUser(user)

    const idag = new Date().toISOString().split('T')[0]

    const [{ data: okter }, { data: profil }] = await Promise.all([
      supabase.from('okter').select('*').eq('bruker_id', user.id).eq('dato', idag),
      supabase.from('profiler').select('navn, mal').eq('id', user.id).single(),
    ])

    setDagensOkter(okter ?? [])
    if (profil?.mal)  setTreningsmaal(profil.mal)
    if (profil?.navn) setUser((u: any) => ({ ...u, navn: profil.navn }))

    const { count: totalOkter } = await supabase
      .from('okter').select('*', { count: 'exact', head: true }).eq('bruker_id', user.id)

    const { data: datoer } = await supabase.from('okter').select('dato')
      .eq('bruker_id', user.id).order('dato', { ascending: false }).limit(30)
    const today   = new Date(); today.setHours(0, 0, 0, 0)
    const datoSet = new Set((datoer ?? []).map((d: any) => d.dato))
    let streak = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      if (datoSet.has(d.toISOString().split('T')[0])) streak++
      else if (i > 0) break
    }

    const mandag = new Date(today)
    mandag.setDate(today.getDate() - (today.getDay() + 6) % 7)
    const { count: ukeMaal } = await supabase.from('okter')
      .select('*', { count: 'exact', head: true })
      .eq('bruker_id', user.id)
      .gte('dato', mandag.toISOString().split('T')[0])

    setStats({ streak, totalOkter: totalOkter ?? 0, ukeMaal: ukeMaal ?? 0 })
    setLaster(false)
  }

  const fornavn = user?.navn?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Utøver'

  const malTips: Record<string, { tekst: string; farge: string }> = {
    ned_i_vekt:    { tekst: 'Husk: kosthold er 80% av vektreduksjon! 🥗', farge: 'var(--cyan)'   },
    bygge_muskler: { tekst: 'Øk progressivt og spis nok protein! 🥩',    farge: 'var(--purple)' },
    vedlikehold:   { tekst: 'Konsistens er nøkkelen! Bra jobba ⚖️',       farge: 'var(--green)'  },
    kondisjon:     { tekst: 'Tren i sone 2 for best kondisjon! ❤️',       farge: 'var(--orange)' },
  }
  const tips = malTips[treningsmaal] ?? malTips.bygge_muskler

  const HURTIGLENKER = [
    { href: '/treninger',  icon: '⚡', label: 'Start trening',     sub: 'Generer ny økt',        color: '#00f5ff' },
    { href: '/kalender',   icon: '📅', label: 'Kalender',          sub: 'Se ukens plan',         color: '#00ff88' },
    { href: '/ovelser',    icon: '💪', label: 'Øvelsesbibl.',      sub: '100+ øvelser',          color: '#b44eff' },
    { href: '/statistikk', icon: '📊', label: 'Statistikk',        sub: 'Fremgang & mål',        color: '#ff8c00' },
    { href: '/statistikk', icon: '🏆', label: 'Utfordringer',      sub: 'Ukentlige mål',         color: '#ff6600' },
    { href: '/profiler',   icon: '👤', label: 'Profil',            sub: 'Rediger innstillinger', color: '#a855f7' },
  ]

  if (laster) return (
    <div className="db-loading">
      <div className="spinner-lg" />
    </div>
  )

  return (
    <div className="db-page anim-fade-up">

      {/* ── Hero ── */}
      <div className="db-hero glass-card">
        <div className="db-hero-shine" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-dato-badge">
              <span className="neon-dot-cyan anim-pulse" />
              <span className="db-dato-txt">{dagNavn}</span>
            </div>
            <h1 className="db-hilsen">{hilsen}, {fornavn}!</h1>
            <div
              className="db-tips-badge"
              style={{
                background:   `${tips.farge}12`,
                borderColor:  `${tips.farge}40`,
              }}
            >
              <span
                className="neon-dot"
                style={{ background: tips.farge, boxShadow: `0 0 8px ${tips.farge}` }}
              />
              <span className="db-tips-txt" style={{ color: tips.farge }}>{tips.tekst}</span>
            </div>
          </div>
          <Link href="/treninger" className="btn btn-primary db-hero-cta">
            ⚡ Start treningsøkt
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="db-stats">
        {[
          { label: 'Streak',     val: stats.streak,     suffix: 'dager', color: '#ff8c00', icon: '🔥' },
          { label: 'Totalt',     val: stats.totalOkter, suffix: 'økter', color: '#00f5ff', icon: '📅' },
          { label: 'Denne uken', val: stats.ukeMaal,    suffix: 'økter', color: '#00ff88', icon: '📆' },
        ].map(s => (
          <div key={s.label} className="stat-card db-stat">
            <div className="db-stat-top">
              <span className="db-stat-icon">{s.icon}</span>
              <span
                className="db-stat-lbl-badge"
                style={{ background: `${s.color}18`, color: s.color }}
              >
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
            <Link
              key={l.href + l.label}
              href={l.href}
              className="db-hurtig-kort"
              style={{ '--akk': l.color } as React.CSSProperties}
            >
              <div
                className="db-hurtig-ikon-boks"
                style={{
                  background: `linear-gradient(135deg, ${l.color}22, ${l.color}08)`,
                  border:     `1px solid ${l.color}35`,
                }}
              >
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
            {dagensOkter.map(okt => (
              <Link
                key={okt.id}
                href={`/treninger/okt?okt=${okt.id}`}
                className="db-okt glass-card"
              >
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
