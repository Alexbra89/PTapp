'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame, Timer, Heart, Activity, Play, Pause, RotateCcw, Check } from 'lucide-react'

type OppvarmingType = 'boksesekk' | 'romaskin' | 'elipsemaskin' | 'tredemølle' | 'dynamisk'

interface OppvarmingSession {
  type: OppvarmingType
  tid: number // i sekunder
  intensitet: 'lav' | 'moderat' | 'høy'
  fullfort: boolean
}

export default function OppvarmingSide() {
  const [aktive, setAktive] = useState<OppvarmingSession[]>([])
  const [valgtType, setValgtType] = useState<OppvarmingType | null>(null)
  const [tid, setTid] = useState(300) // 5 minutter default
  const [pulssjekk, setPulssjekk] = useState(false)
  const [puls, setPuls] = useState('')
  const supabase = createClient()

  const oppvarmingstyper = [
    {
      type: 'boksesekk' as OppvarmingType,
      navn: 'Boksesekk',
      ikon: '🥊',
      beskrivelse: 'Perfekt for overkropp og koordinasjon',
      tid: 300, // 5 min
      kalorier: '30-40 kcal'
    },
    {
      type: 'romaskin' as OppvarmingType,
      navn: 'Romaskin',
      ikon: '🚣',
      beskrivelse: 'Helkropp - aktiverer rygg, bein og armer',
      tid: 300,
      kalorier: '35-45 kcal'
    },
    {
      type: 'elipsemaskin' as OppvarmingType,
      navn: 'Ellipsemaskin',
      ikon: '🏃',
      beskrivelse: 'Skånsom helkropps oppvarming',
      tid: 300,
      kalorier: '30-40 kcal'
    },
    {
      type: 'tredemølle' as OppvarmingType,
      navn: 'Tredemølle',
      ikon: '🎽',
      beskrivelse: 'Gå eller jogg - øk gradvis',
      tid: 300,
      kalorier: '35-50 kcal'
    },
    {
      type: 'dynamisk' as OppvarmingType,
      navn: 'Dynamisk tøying',
      ikon: '🤸',
      beskrivelse: 'Arm- og beinsving, utfall, knebøy',
      tid: 180,
      kalorier: '15-20 kcal'
    }
  ]

  const startOppvarming = (type: OppvarmingType) => {
    const nySession: OppvarmingSession = {
      type,
      tid: oppvarmingstyper.find(o => o.type === type)?.tid || 300,
      intensitet: 'lav',
      fullfort: false
    }
    setAktive([...aktive, nySession])
    setValgtType(null)
  }

  const fullforOppvarming = async (index: number) => {
    const oppdaterte = [...aktive]
    oppdaterte[index].fullfort = true
    setAktive(oppdaterte)

    // Logg oppvarmingen til dagens trening
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const idag = new Date().toISOString().split('T')[0]
    
    // Sjekk om det finnes en treningslogg for i dag
    const { data: eksisterende } = await supabase
      .from('treningslogger')
      .select('id, oppvarming')
      .eq('bruker_id', user.id)
      .eq('dato', idag)
      .limit(1)

    if (eksisterende && eksisterende.length > 0) {
      // Oppdater eksisterende med oppvarming
      await supabase
        .from('treningslogger')
        .update({ 
          oppvarming: [...(eksisterende[0].oppvarming || []), oppdaterte[index].type]
        })
        .eq('id', eksisterende[0].id)
    }
  }

  const formatTid = (sekunder: number) => {
    const min = Math.floor(sekunder / 60)
    const sek = sekunder % 60
    return `${min}:${sek.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Flame className="text-orange-500" />
          Oppvarming
        </h1>
        <p className="text-gray-600 mt-1">
          Velg oppvarming før du starter hovedøkten
        </p>
      </div>

      {/* Aktive oppvarminger */}
      {aktive.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Pågående oppvarming</h2>
          {aktive.map((session, idx) => !session.fullfort && (
            <div key={idx} className="card bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {oppvarmingstyper.find(o => o.type === session.type)?.ikon}
                  </span>
                  <div>
                    <h3 className="font-medium capitalize">{session.type}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Timer size={14} />
                      {formatTid(session.tid)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => fullforOppvarming(idx)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <Check size={18} />
                  Fullført
                </button>
              </div>

              {/* Enkel timer (placeholder) */}
              <div className="mt-3">
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full w-1/3"></div>
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">1:30 igjen</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Oppvarmingskategorier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {oppvarmingstyper.map((type) => (
          <button
            key={type.type}
            onClick={() => startOppvarming(type.type)}
            className="card text-left hover:shadow-md transition group"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{type.ikon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg group-hover:text-blue-600 transition">
                    {type.navn}
                  </h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {formatTid(type.tid)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{type.beskrivelse}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>🔥 {type.kalorier}</span>
                  <span>❤️ Moderat intensitet</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pulsmåling */}
      <div className="card bg-gradient-to-r from-red-50 to-orange-50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Heart className="text-red-500" />
          Pulsmåling
        </h2>
        
        {!pulssjekk ? (
          <button
            onClick={() => setPulssjekk(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Mål puls etter oppvarming
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Mål pulsen i 15 sekunder og gang med 4
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                value={puls}
                onChange={(e) => setPuls(e.target.value)}
                placeholder="Din puls"
                className="input flex-1"
              />
              <button
                onClick={() => {
                  alert(`Målpuls: ${puls} slag/min. ` + 
                    (parseInt(puls) > 120 ? 'Litt høy, ta det rolig' : 'Perfekt!'))
                  setPulssjekk(false)
                  setPuls('')
                }}
                className="btn-primary"
              >
                Sjekk
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Målpuls bør være 50-70% av makspuls (220 - alder)
            </div>
          </div>
        )}
      </div>

      {/* Tips for god oppvarming */}
      <div className="card bg-blue-50">
        <h3 className="font-semibold mb-2">💡 Tips for god oppvarming</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Start rolig og øk intensiteten gradvis</li>
          <li>Du bør begynne å svette lett etter 5-10 minutter</li>
          <li>Kombiner gjerne to ulike oppvarmingsmetoder</li>
          <li>Avslutt med dynamisk tøying for de musklene du skal trene</li>
          <li>Drikk vann før du starter hovedøkten</li>
        </ul>
      </div>
    </div>
  )
}