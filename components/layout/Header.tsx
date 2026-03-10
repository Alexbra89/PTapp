'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'

interface Props {
  bruker: any
}

export default function Header({ bruker }: Props) {
  const [visMeny, setVisMeny] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-end">
          {/* Brukermeny */}
          <div className="relative">
            <button
              onClick={() => setVisMeny(!visMeny)}
              className="flex items-center gap-3 focus:outline-none"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={20} className="text-blue-600" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {bruker?.user_metadata?.full_name || 'Bruker'}
                </p>
                <p className="text-xs text-gray-500">
                  {bruker?.email}
                </p>
              </div>
            </button>

            {/* Dropdown-meny */}
            {visMeny && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setVisMeny(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      setVisMeny(false)
                      router.push('/dashboard/program')
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Innstillinger
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logg ut
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}