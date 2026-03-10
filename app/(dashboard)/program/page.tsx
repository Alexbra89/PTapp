'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, Target, Scale, Ruler, Dumbbell, Calendar, TrendingUp, Edit2 } from 'lucide-react'
import ProfilSkjema from './components/ProfilSkjema'
import AnbefaltOpplegg from './components/AnbefaltOpplegg'
import type { BrukerProfil } from '@/types'

export default function ProgramSide() {
  const [profil, setProfil] = useState<BrukerProfil | null>(null)
  const [laster, setLaster] = useState(true)
  const [redigerer, setRedigerer] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    hentProfil()
  }, [])

  const hentProfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiler')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfil(data as BrukerProfil)
    }
    setLaster(false)
  }

  const beregnBMI = (vekt: number, hoyde: number) => {
    const hoydeIMeter = hoyde / 100
    return (vekt / (hoydeIMeter * hoydeIMeter)).toFixed(1)
  }

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { tekst: 'Undervekt', farge: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (bmi < 25) return { tekst: 'Normalvekt', farge: 'text-green-600', bg: 'bg-green-100' }
    if (bmi < 30) return { tekst: 'Overvekt', farge: 'text-orange-600', bg: 'bg-orange-100' }
    return { tekst: 'Fedme', farge: 'text-red-600', bg: 'bg-red-100' }
  }

  if (laster) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!profil || redigerer) {
    return <ProfilSkjema onSave={() => {
      setRedigerer(false)
      hentProfil()
    }} />
  }

  const bmi = beregnBMI(profil.vekt, profil.hoyde)
  const bmiStatus = getBMIStatus(parseFloat(bmi))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-500" />
          Mitt personlige program
        </h1>
        <button
          onClick={() => setRedigerer(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <Edit2 size={18} />
          Rediger profil
        </button>
      </div>

      {/* Profilkort */}
      <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          Din profil
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Navn</p>
            <p className="font-semibold">{profil.navn}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Vekt</p>
            <p className="font-semibold flex items-center gap-1">
              <Scale size={16} />
              {profil.vekt} kg
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Høyde</p>
            <p className="font-semibold flex items-center gap-1">
              <Ruler size={16} />
              {profil.hoyde} cm
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Mål</p>
            <p className="font-semibold capitalize">
              {profil.mal === 'ned_i_vekt' && '⬇️ Ned i vekt'}
              {profil.mal === 'bygge_muskler' && '💪 Bygge muskler'}
              {profil.mal === 'vedlikehold' && '⚖️ Vedlikehold'}
            </p>
          </div>
        </div>

        {/* BMI visning */}
        <div className="mt-4 pt-4 border-t border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Din BMI</p>
              <p className="text-2xl font-bold">{bmi}</p>
            </div>
            <div className={`px-4 py-2 rounded-full ${bmiStatus.bg} ${bmiStatus.farge} font-medium`}>
              {bmiStatus.tekst}
            </div>
          </div>
        </div>
      </div>

      {/* Anbefalt opplegg */}
      <AnbefaltOpplegg profil={profil} />

      {/* Ukentlig plan */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="text-blue-500" />
          Din ukentlige plan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dag 1: Bryst + Triceps */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-600">Mandag</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Fokus: Bryst</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Benkpress - 3x8-10
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Skråbenk - 3x10-12
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Flyes - 3x12-15
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Triceps pushdown - 3x12
              </li>
            </ul>
          </div>

          {/* Dag 2: Rygg + Biceps */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-600">Tirsdag</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Fokus: Rygg</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Pull-ups - 3x maks
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Roing - 3x10-12
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Markløft - 3x8
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Bicepscurl - 3x12
              </li>
            </ul>
          </div>

          {/* Dag 3: Bein + Skuldre */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-purple-600">Torsdag</h3>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Fokus: Bein</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Knebøy - 4x8-10
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Utfall - 3x12 per bein
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Skulderpress - 3x10
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Sidehev - 3x15
              </li>
            </ul>
          </div>

          {/* Dag 4: Helkropp / Kondisjon */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-orange-600">Lørdag</h3>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Kondisjon</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Intervalltrening - 20 min
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Burpees - 3x15
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Fjellklatrer - 3x30 sek
              </li>
              <li className="flex items-center gap-2">
                <Dumbbell size={14} className="text-gray-400" />
                Planke - 3x60 sek
              </li>
            </ul>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          ℹ️ Denne planen er tilpasset ditt mål om {profil.mal === 'ned_i_vekt' ? 'vekttap' : 
             profil.mal === 'bygge_muskler' ? 'muskelvekst' : 'vedlikehold'}
        </p>
      </div>

      {/* Fremgang siste uker */}
      <div className="card bg-gradient-to-r from-green-50 to-blue-50">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="text-green-600" />
          Din fremgang
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Forrige uke</p>
            <p className="text-xl font-bold">4 økter</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Denne uken</p>
            <p className="text-xl font-bold">3 økter</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total vekt</p>
            <p className="text-xl font-bold">2,450 kg</p>
          </div>
        </div>
      </div>
    </div>
  )
}