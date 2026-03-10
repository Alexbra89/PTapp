'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/', icon: '⚡', label: 'Dashboard' },
  { href: '/treninger', icon: '🏋️', label: 'Treninger' },
  { href: '/ovelser', icon: '💪', label: 'Øvelser' },
  { href: '/kalender', icon: '📅', label: 'Kalender' },
  { href: '/statistikk', icon: '📊', label: 'Statistikk' },
  { href: '/profiler', icon: '👤', label: 'Profil' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loggingUt, setLoggingUt] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

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
    || 'Bruker'

  return (
    <>
      <div className="app-bg" aria-hidden>
        <div className="app-bg-grid" />
        <div className="app-bg-blob app-bg-blob-1" />
        <div className="app-bg-blob app-bg-blob-2" />
        <div className="app-bg-blob app-bg-blob-3" />
      </div>

      {/* Mobil overlay */}
      {sidebarOpen && (
        <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dash-sidebar-logo">
          <div className="dash-sidebar-logo-icon">🏋️</div>
          <span className="dash-sidebar-logo-text">Treningsapp</span>
        </div>

        <div className="dash-sidebar-nav">
          <div className="dash-sidebar-section-label">Meny</div>
          <nav>
            {NAV.map(item => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`dash-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="dash-nav-icon">{item.icon}</span>
                  <span className="dash-nav-label">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="dash-sidebar-footer">
          <div className="dash-user-row">
            <div className="dash-user-avatar">{initialer}</div>
            <div className="dash-user-info">
              <div className="dash-user-name">{fornavn}</div>
              <div className="dash-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="dash-logout-btn" onClick={loggUt} disabled={loggingUt}>
            {loggingUt ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🚪'} Logg ut
          </button>
        </div>
      </aside>

      <main className="dash-main">
        {/* Topprad med hamburger og tilbakeknapp */}
        <div className="dash-header">
          <div className="dash-header-left">
            <button 
              className="dash-hamburger" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Meny"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            
            {/* Tilbakeknapp (vises på mobil når sidebar er lukket) */}
            {!sidebarOpen && (
              <button 
                className="dash-back-btn" 
                onClick={() => router.back()}
                aria-label="Tilbake"
              >
                ←
              </button>
            )}
          </div>

          <div className="dash-header-right">
            <span className="badge badge-cyan">
              <span className="neon-dot neon-dot-cyan anim-pulse" />
              Live
            </span>
            <div className="dash-header-avatar">{initialer}</div>
          </div>
        </div>

        {/* Innhold */}
        <div className="dash-content">
          {children}
        </div>
      </main>
    </>
  )
}