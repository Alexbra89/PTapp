'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Dumbbell, Library, CalendarDays, Trophy, BarChart3, User, Timer,
  LogOut, MoreHorizontal, ArrowUpRight, Flame, ClipboardList, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dial } from '@/components/atelier/Dial'
import { BRAND } from '@/lib/brand'
import { SideSkjelett } from '@/components/atelier/Skjelett'
import Introduksjon, { INTRO_NOKKEL } from '@/components/Introduksjon'
import { useProfil } from '@/hooks/useSupabaseQuery'

const NAV = [
  { href: '/',             icon: LayoutGrid,   label: 'Oversikt' },
  { href: '/treninger',    icon: Dumbbell,     label: 'Treninger' },
  { href: '/ovelser',      icon: Library,      label: 'Øvelser' },
  { href: '/kalender',     icon: CalendarDays, label: 'Kalender' },
  { href: '/utfordringer', icon: Trophy,       label: 'Utfordringer' },
  { href: '/statistikk',   icon: BarChart3,    label: 'Statistikk' },
  { href: '/tidtaking',    icon: Timer,        label: 'Tidtaking' },
  { href: '/oppvarming',   icon: Flame,        label: 'Oppvarming' },
  { href: '/program',      icon: ClipboardList, label: 'Program' },
  { href: '/deling',       icon: Users,        label: 'Deling' },
  { href: '/profiler',     icon: User,         label: 'Profil' },
]

// Mobil: fire faste + "Mer"-ark med resten
const DOCK = ['/', '/treninger', '/kalender', '/statistikk']

const erAktiv = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' || pathname === '/dashboard' : pathname.startsWith(href)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loggingUt, setLoggingUt] = useState(false)
  const [visMer, setVisMer] = useState(false)
  // Innholdet er innloggings- og tidsavhengig (dato, hilsen, «i dag», brukerdata) og hentes uansett
  // i nettleseren. Å rendre det først etter mount fjerner hydreringsfeil fra forhåndsrendring.
  const [klar, setKlar] = useState(false)
  useEffect(() => { setKlar(true) }, [])

  useEffect(() => {
    const sjekkInnlogging = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) router.push('/login')
    }

    sjekkInnlogging()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN') {
        setUser(session?.user)
        router.refresh()
      }
    })

    return () => subscription?.unsubscribe()
  }, [router, supabase])

  useEffect(() => { setVisMer(false) }, [pathname])

  // Introduksjon første gang: vises når profilen mangler mål og den ikke er fullført/hoppet over på denne enheten
  const { data: profil, isFetched: profilHentet } = useProfil(user?.id)
  const [introFerdig, setIntroFerdig] = useState(true)
  useEffect(() => { try { setIntroFerdig(localStorage.getItem(INTRO_NOKKEL) === '1') } catch {} }, [])
  const visIntro = klar && !!user && profilHentet && !profil?.mal && !introFerdig

  const loggUt = async () => {
    setLoggingUt(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initialer = (user?.user_metadata?.full_name ?? user?.email ?? '?')
    .split(/[\s@]/).filter(Boolean).map((s: string) => s[0]).join('').toUpperCase().slice(0, 2)

  const fornavn = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Medlem'

  const merAktiv = !DOCK.some(h => erAktiv(pathname, h))
  const erForside = pathname === '/' || pathname === '/dashboard'

  return (
    <>
      <AnimatePresence>
        {visIntro && <Introduksjon key="intro" bruker={user} harProfil={!!profil} navn={profil?.navn} onFerdig={() => setIntroFerdig(true)} />}
      </AnimatePresence>

      <div className="app-bg" aria-hidden>
        <Dial className="app-bg-dial" />
      </div>

      {/* ── Skinne (desktop) ── */}
      <aside className="dash-sidebar">
        <Link href="/" className="dash-sidebar-logo">
          <span className="wordmark"><em>{BRAND.navn}</em></span>
          <span className="wordmark-sub">{BRAND.under}</span>
        </Link>

        <div className="dash-sidebar-nav">
          <div className="dash-sidebar-section-label">Register</div>
          <nav>
            {NAV.map((item, i) => {
              const aktiv = erAktiv(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`dash-nav-item ${aktiv ? 'active' : ''}`}
                  style={{ isolation: 'isolate' }}
                >
                  {aktiv && (
                    <motion.span
                      layoutId="nav-pill"
                      className="dash-nav-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="dash-nav-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dash-nav-icon"><Icon size={17} strokeWidth={1.4} /></span>
                  <span className="dash-nav-label">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="dash-sidebar-footer">
          <div className="member-card">
            <div className="member-top">
              <span className="eyebrow eyebrow-gold">{BRAND.kort}</span>
            </div>
            <div className="member-row">
              <div className="dash-user-avatar">{initialer}</div>
              <div className="dash-user-info">
                <div className="dash-user-name">{fornavn}</div>
                <div className="dash-user-email">{user?.email}</div>
              </div>
              <button className="dash-logout-btn" onClick={loggUt} disabled={loggingUt} aria-label="Logg ut" title="Logg ut">
                {loggingUt
                  ? <span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(242,236,225,0.2)', borderTopColor: 'currentColor' }} />
                  : <LogOut size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        {/* ── Toppstripe (mobil) ── */}
        <header className="dash-topbar">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span className="wordmark"><em>{BRAND.navn}</em></span>
          </Link>
          <Link href="/profiler" className="dash-user-avatar dash-topbar-avatar" style={{ textDecoration: 'none' }} aria-label="Profil">
            {initialer}
          </Link>
        </header>

        <div className="dash-content">
          {klar ? (
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          ) : (
            <SideSkjelett variant={erForside ? 'oversikt' : 'standard'} />
          )}
        </div>

        {!erForside && (
          <div className="dash-footer-nav">
            <button className="dash-back-button" onClick={() => router.back()}>
              <span className="line" /> Tilbake
            </button>
          </div>
        )}
      </main>

      {/* ── Flytende dokk (mobil) ── */}
      <nav className="dock" aria-label="Hovedmeny">
        {DOCK.map(href => {
          const item = NAV.find(n => n.href === href)!
          const aktiv = erAktiv(pathname, href)
          const Icon = item.icon
          return (
            <Link key={href} href={href} prefetch className={`dock-item ${aktiv ? 'active' : ''}`}>
              {aktiv && (
                <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
              )}
              <Icon size={18} strokeWidth={aktiv ? 1.8 : 1.4} />
              <span className="dock-item-label">{item.label}</span>
            </Link>
          )
        })}
        <button className={`dock-item ${merAktiv ? 'active' : ''}`} onClick={() => setVisMer(true)} aria-label="Mer">
          {merAktiv && (
            <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
          )}
          <MoreHorizontal size={18} strokeWidth={1.5} />
          <span className="dock-item-label">Mer</span>
        </button>
      </nav>

      {/* ── "Mer"-ark (mobil) ── */}
      <AnimatePresence>
        {visMer && (
          <>
            <motion.div
              className="sheet-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setVisMer(false)}
            />
            <motion.div
              className="sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setVisMer(false) }}
            >
              <div className="sheet-grip" />
              <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>Register</div>
              {NAV.filter(n => !DOCK.includes(n.href)).map(item => {
                const Icon = item.icon
                const i = NAV.indexOf(item)
                return (
                  <Link key={item.href} href={item.href} className="sheet-link">
                    <span className="dash-nav-index">{String(i + 1).padStart(2, '0')}</span>
                    <Icon size={18} strokeWidth={1.4} style={{ color: erAktiv(pathname, item.href) ? 'var(--gold)' : undefined }} />
                    <span style={{ flex: 1 }} className="serif">
                      <span style={{ fontSize: '1.45rem' }}>{item.label}</span>
                    </span>
                    <ArrowUpRight size={16} strokeWidth={1.4} style={{ opacity: 0.4 }} />
                  </Link>
                )
              })}
              <button className="sheet-link sheet-link-danger" onClick={loggUt} disabled={loggingUt}>
                <span className="dash-nav-index" />
                <LogOut size={18} strokeWidth={1.4} />
                <span style={{ flex: 1 }}>{loggingUt ? 'Logger ut …' : 'Logg ut'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
