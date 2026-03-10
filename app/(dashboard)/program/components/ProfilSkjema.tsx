'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Scale, Ruler, Target, User, Calendar as CalendarIcon } from 'lucide-react'

interface Props {
  onSave: () => void
}

export default function ProfilSkjema({ onSave }: Props) {
  const [navn, setNavn] = useState('')
  const [vekt, setVekt] = useState('70')
  const [hoyde, setHoyde] = useState('170')
  const [fodselsar, setFodselsar] = useState('1990')
  const [mal, setMal] = useState<'ned_i_vekt' | 'bygge_muskler' | 'vedlikehold'>('vedlikehold')
  const [laster, setLaster] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLaster(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiler')
      .upsert({
        id: user.id,
        navn,
        vekt: parseFloat(vekt),
        hoyde: parseInt(hoyde),
        fodselsar: parseInt(fodselsar),
        mal,
        epost: user.email,
        can_share_with: []
      })

    if (!error) {
      onSave()
    }

    setLaster(false)
  }

  const beregnAnbefaltKalorier = () => {
    const vektNum = parseFloat(vekt) || 70
    const hoydeNum = parseInt(hoyde) || 170
    const alder = new Date().getFullYear() - (parseInt(fodselsar) || 1990)
    
    // Mifflin-St Jeor formel for menn (forenklet)
    const bmr = 10 * vektNum + 6.25 * hoydeNum - 5 * alder + 5
    
    if (mal === 'ned_i_vekt') return Math.round(bmr * 1.2 - 500)
    if (mal === 'bygge_muskler') return Math.round(bmr * 1.2 + 300)
    return Math.round(bmr * 1.2)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="text-blue-500" />
          Fortell om deg selv
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Navn */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ditt navn
            </label>
            <input
              type="text"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              className="input"
              placeholder="Ola Nordmann"
              required
            />
          </div>

          {/* Vekt og høyde */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Scale size={16} />
                Vekt (kg)
              </label>
              <input
                type="number"
                value={vekt}
                onChange={(e) => setVekt(e.target.value)}
                className="input"
                step="0.1"
                min="30"
                max="200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Ruler size={16} />
                Høyde (cm)
              </label>
              <input
                type="number"
                value={hoyde}
                onChange={(e) => setHoyde(e.target.value)}
                className="input"
                min="100"
                max="250"
                required
              />
            </div>
          </div>

          {/* Fødselsår */}
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <CalendarIcon size={16} />
              Fødselsår
            </label>
            <input
              type="number"
              value={fodselsar}
              onChange={(e) => setFodselsar(e.target.value)}
              className="input"
              min="1900"
              max={new Date().getFullYear()}
              required
            />
          </div>

          {/* Mål */}
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1">
              <Target size={16} />
              Hva er ditt hovedmål?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMal('ned_i_vekt')}
                className={`
                  p-3 rounded-lg border-2 transition text-center
                  ${mal === 'ned_i_vekt' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-2xl mb-1 block">⬇️</span>
                <span className="text-sm font-medium">Ned i vekt</span>
              </button>
              <button
                type="button"
                onClick={() => setMal('bygge_muskler')}
                className={`
                  p-3 rounded-lg border-2 transition text-center
                  ${mal === 'bygge_muskler' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-2xl mb-1 block">💪</span>
                <span className="text-sm font-medium">Bygge muskler</span>
              </button>
              <button
                type="button"
                onClick={() => setMal('vedlikehold')}
                className={`
                  p-3 rounded-lg border-2 transition text-center
                  ${mal === 'vedlikehold' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-2xl mb-1 block">⚖️</span>
                <span className="text-sm font-medium">Vedlikehold</span>
              </button>
            </div>
          </div>

          {/* Anbefaling basert på valg */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">📊 Din anbefaling</h3>
            <p className="text-sm text-gray-700">
              Basert på din profil anbefaler vi:
            </p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
              <li>Ca. {beregnAnbefaltKalorier()} kalorier per dag</li>
              <li>{mal === 'ned_i_vekt' ? '3-4' : mal === 'bygge_muskler' ? '4-5' : '3'} styrkeøkter per uke</li>
              <li>{mal === 'ned_i_vekt' ? '2' : mal === 'bygge_muskler' ? '1-2' : '1-2'} kondisjonsøkter</li>
              <li>Fokuser på {mal === 'ned_i_vekt' ? 'sammensatte øvelser og høy intensitet' : 
                               mal === 'bygge_muskler' ? 'progressiv overbelastning' : 
                               'balansert trening'}</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={laster}
            className="w-full btn-primary disabled:opacity-50"
          >
            {laster ? 'Lagrer...' : 'Lagre profil og få ditt program'}
          </button>
        </form>
      </div>
    </div>
  )
}