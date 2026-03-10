'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [epost, setEpost] = useState('')
  const [passord, setPassord] = useState('')
  const [navn, setNavn] = useState('')
  const [error, setError] = useState('')
  const [laster, setLaster] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true)
    setError('')

    try {
      // 1. Opprett bruker i Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: epost,
        password: passord,
        options: {
          data: {
            full_name: navn,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // 2. Opprett profil i profiler-tabellen
        const { error: profileError } = await supabase
          .from('profiler')
          .insert([
            {
              id: data.user.id,
              navn: navn,
              epost: epost,
              vekt: 70, // Standardverdier, kan endres senere
              hoyde: 170,
              mal: 'vedlikehold',
              er_samboer: false,
              can_share_with: [],
            },
          ])

        if (profileError) throw profileError
      }

      router.push('/')
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLaster(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-center text-blue-600 mb-2">💪 Treningsapp</h1>
          <h2 className="text-2xl font-semibold text-center">Opprett bruker</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="navn" className="block text-sm font-medium mb-1">
                Fullt navn
              </label>
              <input
                id="navn"
                type="text"
                required
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                className="input"
                placeholder="Ola Nordmann"
              />
            </div>

            <div>
              <label htmlFor="epost" className="block text-sm font-medium mb-1">
                Epost
              </label>
              <input
                id="epost"
                type="email"
                required
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                className="input"
                placeholder="din@epost.no"
              />
            </div>

            <div>
              <label htmlFor="passord" className="block text-sm font-medium mb-1">
                Passord
              </label>
              <input
                id="passord"
                type="password"
                required
                value={passord}
                onChange={(e) => setPassord(e.target.value)}
                className="input"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minst 6 tegn</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={laster}
            className="w-full btn-primary disabled:opacity-50"
          >
            {laster ? 'Oppretter...' : 'Registrer deg'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Har du allerede bruker?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Logg inn
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}