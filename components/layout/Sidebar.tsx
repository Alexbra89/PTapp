'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Dumbbell,
  Activity,
  Flame,
  Timer,
  BarChart3,
  Share2,
  Users,
  Home,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

interface Props {
  bruker: any
}

export default function Sidebar({ bruker }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navigasjon = [
    { navn: 'Oversikt', href: '/dashboard', icon: Home },
    { navn: 'Kalender', href: '/dashboard/kalender', icon: Calendar },
    { navn: 'Øvelser', href: '/dashboard/ovelser', icon: Dumbbell },
    { navn: 'Mitt program', href: '/dashboard/program', icon: Activity },
    { navn: 'Oppvarming', href: '/dashboard/oppvarming', icon: Flame },
    { navn: 'Tidtaking', href: '/dashboard/tidtaking', icon: Timer },
    { navn: 'Statistikk', href: '/dashboard/statistikk', icon: BarChart3 },
    { navn: 'Deling', href: '/dashboard/deling', icon: Share2 },
  ]

  // Sjekk om bruker er admin eller har tilgang til profiler
  const erSamboer = bruker?.user_metadata?.er_samboer || false
  if (erSamboer) {
    navigasjon.push({ navn: 'Profiler', href: '/dashboard/profiler', icon: Users })
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobil meny-knapp */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar for desktop */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200
        transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64
      `}>
        <div className="h-full px-3 py-6 overflow-y-auto">
          {/* Logo */}
          <div className="mb-8 px-3">
            <h1 className="text-2xl font-bold text-blue-600">💪 Treningsapp</h1>
            <p className="text-sm text-gray-500 mt-1">Hei, {bruker?.user_metadata?.full_name || 'Bruker'}!</p>
          </div>

          {/* Navigasjon */}
          <nav className="space-y-1">
            {navigasjon.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.navn}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition
                    ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.navn}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="absolute bottom-6 left-3 right-3">
            <div className="border-t pt-4">
              <p className="text-xs text-gray-400 text-center">
                Versjon 1.0.0
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}