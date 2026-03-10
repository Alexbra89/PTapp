'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Activity } from 'lucide-react'

export default function Tabata() {
  const [aktiv, setAktiv] = useState(false)
  const [arbeidTid, setArbeidTid] = useState(20) // 20 sekunder
  const [hvileTid, setHvileTid] = useState(10) // 10 sekunder
  const [runder, setRunder] = useState(8)
  const [gjeldendeRunde, setGjeldendeRunde] = useState(1)
  const [sekunder, setSekunder] = useState(20)
  const [erArbeid, setErArbeid] = useState(true)
  const [lyd, setLyd] = useState(true)
  const [fullforteRunder, setFullforteRunder] = useState<number[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (aktiv) {
      interval = setInterval(() => {
        setSekunder(prev => {
          if (prev <= 1) {
            // Bytt mellom arbeid og hvile
            if (erArbeid) {
              // Gå til hvile
              setErArbeid(false)
              if (lyd) new Audio('/beep.mp3').play().catch(() => {})
              return hvileTid
            } else {
              // Ny runde
              if (gjeldendeRunde < runder) {
                setGjeldendeRunde(prev => prev + 1)
                setErArbeid(true)
                setFullforteRunder(prev => [...prev, gjeldendeRunde])
                if (lyd) new Audio('/beep.mp3').play().catch(() => {})
                return arbeidTid
              } else {
                // Ferdig!
                setAktiv(false)
                setFullforteRunder(prev => [...prev, gjeldendeRunde])
                if (lyd) new Audio('/complete.mp3').play().catch(() => {})
                return 0
              }
            }
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [aktiv, erArbeid, gjeldendeRunde, runder, arbeidTid, hvileTid, lyd])

  const reset = () => {
    setAktiv(false)
    setGjeldendeRunde(1)
    setErArbeid(true)
    setSekunder(arbeidTid)
    setFullforteRunder([])
  }

  const neste = () => {
    if (erArbeid) {
      setErArbeid(false)
      setSekunder(hvileTid)
    } else {
      if (gjeldendeRunde < runder) {
        setGjeldendeRunde(prev => prev + 1)
        setErArbeid(true)
        setSekunder(arbeidTid)
        setFullforteRunder(prev => [...prev, gjeldendeRunde])
      }
    }
  }

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const justerVerdi = (
    type: 'arbeid' | 'hvile' | 'runder', 
    økning: boolean
  ) => {
    if (type === 'arbeid') {
      const ny = økning ? arbeidTid + 5 : Math.max(5, arbeidTid - 5)
      setArbeidTid(ny)
      if (!aktiv && erArbeid) setSekunder(ny)
    } else if (type === 'hvile') {
      const ny = økning ? hvileTid + 5 : Math.max(5, hvileTid - 5)
      setHvileTid(ny)
      if (!aktiv && !erArbeid) setSekunder(ny)
    } else {
      setRunder(økning ? runder + 1 : Math.max(1, runder - 1))
    }
  }

  return (
    <div className="card">
      {/* Header med lydkontroll */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-purple-500" />
          Tabata
        </h2>
        <button
          onClick={() => setLyd(!lyd)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          {lyd ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Innstillinger */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center">
          <label className="text-sm text-gray-500">Arbeid</label>
          <div className="flex items-center justify-center gap-1 mt-1">
            <button
              onClick={() => justerVerdi('arbeid', false)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              -
            </button>
            <span className="font-bold w-12">{arbeidTid}s</span>
            <button
              onClick={() => justerVerdi('arbeid', true)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              +
            </button>
          </div>
        </div>

        <div className="text-center">
          <label className="text-sm text-gray-500">Hvile</label>
          <div className="flex items-center justify-center gap-1 mt-1">
            <button
              onClick={() => justerVerdi('hvile', false)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              -
            </button>
            <span className="font-bold w-12">{hvileTid}s</span>
            <button
              onClick={() => justerVerdi('hvile', true)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              +
            </button>
          </div>
        </div>

        <div className="text-center">
          <label className="text-sm text-gray-500">Runder</label>
          <div className="flex items-center justify-center gap-1 mt-1">
            <button
              onClick={() => justerVerdi('runder', false)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              -
            </button>
            <span className="font-bold w-12">{runder}</span>
            <button
              onClick={() => justerVerdi('runder', true)}
              className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
              disabled={aktiv}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Stor timer */}
      <div className="text-center mb-6">
        <div className="text-8xl font-bold font-mono mb-2">
          {formatTime(sekunder)}
        </div>
        <div className="text-xl font-medium">
          {erArbeid ? '💪 ARBEID' : '😮‍💨 HVILE'}
        </div>
        <div className="text-gray-500 mt-1">
          Runde {gjeldendeRunde} / {runder}
        </div>
      </div>

      {/* Kontroller */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setAktiv(!aktiv)}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${aktiv 
              ? 'bg-yellow-500 hover:bg-yellow-600' 
              : 'bg-green-500 hover:bg-green-600'
            } text-white transition transform hover:scale-105
          `}
        >
          {aktiv ? <Pause size={30} /> : <Play size={30} />}
        </button>

        <button
          onClick={reset}
          className="w-16 h-16 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition transform hover:scale-105 flex items-center justify-center"
        >
          <RotateCcw size={24} />
        </button>

        <button
          onClick={neste}
          disabled={!aktiv}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${aktiv 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-300 cursor-not-allowed'
            } text-white transition transform hover:scale-105
          `}
        >
          <SkipForward size={24} />
        </button>
      </div>

      {/* Fremdrift */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Fremdrift</span>
          <span>{fullforteRunder.length} / {runder} runder</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-purple-500 h-3 rounded-full transition-all"
            style={{ width: `${(fullforteRunder.length / runder) * 100}%` }}
          />
        </div>

        {/* Runde-indikatorer */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: runder }).map((_, i) => (
            <div
              key={i}
              className={`
                flex-1 h-2 rounded-full
                ${i < fullforteRunder.length 
                  ? 'bg-green-500' 
                  : i === gjeldendeRunde - 1 && aktiv
                  ? 'bg-purple-500 animate-pulse'
                  : 'bg-gray-200'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Instruksjoner */}
      <div className="mt-6 p-3 bg-purple-50 rounded-lg text-sm">
        <p className="font-medium mb-1">💪 Slik gjør du:</p>
        <ul className="text-gray-600 space-y-1 list-disc list-inside">
          <li>{arbeidTid} sekunder maksimal innsats</li>
          <li>{hvileTid} sekunder hvile</li>
          <li>Gjenta i {runder} runder</li>
          <li>Total tid: {formatTime((arbeidTid + hvileTid) * runder)}</li>
        </ul>
      </div>
    </div>
  )
}