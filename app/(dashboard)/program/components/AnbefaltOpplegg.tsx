'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Flame, Clock, Target, TrendingUp } from 'lucide-react'
import type { BrukerProfil } from '@/types'

interface Props {
  profil: BrukerProfil
}

export default function AnbefaltOpplegg({ profil }: Props) {
  const [uker, setUker] = useState(1)

  const beregnProtein = () => {
    if (profil.mal === 'bygge_muskler') return (profil.vekt * 2).toFixed(0)
    if (profil.mal === 'ned_i_vekt') return (profil.vekt * 2.2).toFixed(0)
    return (profil.vekt * 1.6).toFixed(0)
  }

  const beregnKalorier = () => {
    const vekt = profil.vekt
    const hoyde = profil.hoyde
    const alder = new Date().getFullYear() - (profil.fodselsar || 1990)
    
    // Mifflin-St Jeor formel for menn (forenklet, antar mann)
    const bmr = 10 * vekt + 6.25 * hoyde - 5 * alder + 5
    
    if (profil.mal === 'ned_i_vekt') return Math.round(bmr * 1.2 - 500)
    if (profil.mal === 'bygge_muskler') return Math.round(bmr * 1.2 + 300)
    return Math.round(bmr * 1.2)
  }

  const getUkentligVolum = () => {
    if (profil.mal === 'bygge_muskler') return '10-20 sett per muskelgruppe'
    if (profil.mal === 'ned_i_vekt') return '15-25 sett per muskelgruppe (høyere volum)'
    return '8-15 sett per muskelgruppe'
  }

  const getHviletid = () => {
    if (profil.mal === 'bygge_muskler') return '60-90 sekunder'
    if (profil.mal === 'ned_i_vekt') return '30-60 sekunder'
    return '60-90 sekunder'
  }

  const getRepsRange = () => {
    if (profil.mal === 'bygge_muskler') return '8-12 reps'
    if (profil.mal === 'ned_i_vekt') return '12-15 reps'
    return '8-15 reps'
  }

  return (
    <div className="space-y-4">
      {/* Hovedkort med anbefalinger */}
      <div className="card bg-gradient-to-r from-purple-500 to-blue-500 text-white">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          Ditt anbefalte opplegg
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-purple-100 text-sm">Daglige kalorier</p>
            <p className="text-2xl font-bold">{beregnKalorier()}</p>
            <p className="text-xs text-purple-200">kcal</p>
          </div>
          <div>
            <p className="text-purple-100 text-sm">Protein</p>
            <p className="text-2xl font-bold">{beregnProtein()}g</p>
            <p className="text-xs text-purple-200">per dag</p>
          </div>
          <div>
            <p className="text-purple-100 text-sm">Vann</p>
            <p className="text-2xl font-bold">{(profil.vekt * 0.033).toFixed(1)}L</p>
            <p className="text-xs text-purple-200">per dag</p>
          </div>
          <div>
            <p className="text-purple-100 text-sm">Søvn</p>
            <p className="text-2xl font-bold">7-9t</p>
            <p className="text-xs text-purple-200">per natt</p>
          </div>
        </div>

        {/* Progress bar for ukentlig fremgang */}
        <div className="bg-white/20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Ukentlig fremgang</span>
            <span>{uker} uke</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={uker}
            onChange={(e) => setUker(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div>
              <p className="text-purple-200">Forventet vekt</p>
              <p className="font-semibold">
                {profil.mal === 'ned_i_vekt' && (profil.vekt - uker * 0.5).toFixed(1)} kg
                {profil.mal === 'bygge_muskler' && (profil.vekt + uker * 0.2).toFixed(1)} kg
                {profil.mal === 'vedlikehold' && profil.vekt + ' kg'}
              </p>
            </div>
            <div>
              <p className="text-purple-200">Styrkeøkning</p>
              <p className="font-semibold">+{uker * 5}%</p>
            </div>
            <div>
              <p className="text-purple-200">Forbrente kalorier</p>
              <p className="font-semibold">~{uker * 3500} kcal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detaljerte anbefalinger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Dumbbell size={18} className="text-blue-500" />
            Styrketrening
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-600">Økter per uke:</span>
              <span className="font-medium">{profil.mal === 'bygge_muskler' ? '4-5' : '3-4'}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Reps per sett:</span>
              <span className="font-medium">{getRepsRange()}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Sett per øvelse:</span>
              <span className="font-medium">3-4</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Ukentlig volum:</span>
              <span className="font-medium">{getUkentligVolum()}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Hviletid:</span>
              <span className="font-medium">{getHviletid()}</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            Kondisjon & Oppvarming
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-600">Kondisjonsøkter:</span>
              <span className="font-medium">{profil.mal === 'ned_i_vekt' ? '3-4' : '2-3'}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Intensitet:</span>
              <span className="font-medium">
                {profil.mal === 'ned_i_vekt' ? 'Moderat-Høy' : 'Moderat'}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Oppvarming:</span>
              <span className="font-medium">10-15 min</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Nedtrapping:</span>
              <span className="font-medium">5-10 min</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Ukentlig tidsbruk:</span>
              <span className="font-medium">4-6 timer</span>
            </li>
          </ul>
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Progresjonsplan (neste 4 uker)
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Uke 1</p>
              <p className="font-semibold">Base</p>
              <p className="text-xs">Finn riktig vekt</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Uke 2</p>
              <p className="font-semibold">Øk reps</p>
              <p className="text-xs">+2 reps per sett</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Uke 3</p>
              <p className="font-semibold">Øk vekt</p>
              <p className="text-xs">+2.5-5 kg</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Uke 4</p>
              <p className="font-semibold">Topp uke</p>
              <p className="text-xs">Prøv ny max</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ukemeny forslag */}
      <div className="card">
        <h3 className="font-semibold mb-3">🍽️ Forslag til ukemeny</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-600 mb-1">Frokost</p>
            <p className="text-gray-600">Havregrøt med bær</p>
            <p className="text-gray-600">Proteinpannekaker</p>
            <p className="text-gray-600">Eggerøre og kalkun</p>
          </div>
          <div>
            <p className="font-medium text-green-600 mb-1">Lunsj</p>
            <p className="text-gray-600">Kyllingsalat</p>
            <p className="text-gray-600">Tunfiskwraps</p>
            <p className="text-gray-600">Kalkunbrød</p>
          </div>
          <div>
            <p className="font-medium text-purple-600 mb-1">Middag</p>
            <p className="text-gray-600">Laks og grønnsaker</p>
            <p className="text-gray-600">Kylling og ris</p>
            <p className="text-gray-600">Magert kjøttdeig</p>
          </div>
        </div>
      </div>

      {/* Motivasjon */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          💡 <span className="font-semibold">Motivasjonstips:</span> {profil.mal === 'ned_i_vekt' 
            ? 'Husk at 80% er kosthold, 20% er trening. Du klarer dette!' 
            : profil.mal === 'bygge_muskler' 
            ? 'Progresiv overbelastning er nøkkelen. Øk vekt eller reps hver uke!'
            : 'Det viktigste er å være konsistent. Fortsett å møte opp!'}
        </p>
      </div>
    </div>
  )
}