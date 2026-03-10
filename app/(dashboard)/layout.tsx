'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/',           icon: '⚡', label: 'Dashboard'  },
  { href: '/treninger',  icon: '🏋️', label: 'Treninger'  },
  { href: '/ovelser',    icon: '💪', label: 'Øvelser'    },
  { href: '/kalender',   icon: '📅', label: 'Kalender'   },
  { href: '/statistikk', icon: '📊', label: 'Statistikk' },
  { href: '/profiler',   icon: '👤', label: 'Profil'     },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [user,     setUser]     = useState<any>(null)
  const [loggingUt, setLoggingUt] = useState(false)

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
      <div className="app-bg" aria-hidden="true">
        <div className="app-bg-grid" />
        <div className="app-bg-blob app-bg-blob-1" />
        <div className="app-bg-blob app-bg-blob-2" />
        <div className="app-bg-blob app-bg-blob-3" />
      </div>

      <div className="dash-root">
        {/* SIDEBAR (Vises på PC - bruker dine eksisterende klasser) */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-logo">
            <div className="dash-sidebar-logo-icon">🏋️</div>
            <span className="dash-sidebar-logo-text">Treningsapp</span>
          </div>

          <div className="dash-sidebar-nav">
            <div className="dash-sidebar-section-label">Meny</div>
            <nav>
              {NAV.map(item => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`dash-nav-item${isActive ? ' active' : ''}`}
                  >
                    <span className="dash-nav-icon">{item.icon}</span>
                    <span className="dash-nav-label">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="dash-sidebar-footer">
            <button className="dash-logout-btn" onClick={loggUt} disabled={loggingUt}>
              {loggingUt ? '...' : '🚪'} Logg ut
            </button>
          </div>
        </aside>

        {/* HOVEDINNHOLD */}
        <main className="dash-main">
          {/* pb-20 sørger for at innholdet ikke havner bak mobilmenyen */}
          <div className="dash-content pb-20 md:pb-0">
            {children}
          </div>
        </main>

        {/* MOBILMENY (Vises KUN på mobil via 'md:hidden') */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-black/80 p-3 backdrop-blur-lg border-t border-white/10 md:hidden">
          {NAV.map(item => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className="flex flex-col items-center gap-1 no-underline"
              >
                <span className={`text-xl ${isActive ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                  {item.label === 'Dashboard' ? 'Hjem' : item.label}
                </span>
              </Link>
            )
          })}
</nav>
      </div>
    </>
  )
}