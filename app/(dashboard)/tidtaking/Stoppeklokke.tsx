'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Flag, Clock } from 'lucide-react'

interface Runde {
  nummer: number
  tid: number
  diff: number
}

export default function Stoppeklokke() {
  const [aktiv, setAktiv] = useState(false)
  const [tid, setTid] = useState(0) // i sekunder
  const [runder, setRunder] = useState<Runde[]>([])
  const [startTid, setStartTid] = useState<number | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (aktiv) {
      interval = setInterval(() => {
        setTid(prev => prev + 1)
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [aktiv])

  const startPause = () => {
    if (!aktiv && tid === 0) {
      setStartTid(Date.now())
    }
    setAktiv(!aktiv)
  }

  const reset = () => {
    setAktiv(false)
    setTid(0)
    setRunder([])
    setStartTid(null)
  }

  const taRunde = () => {
    const forrigeTid = runder.length > 0 ? runder[runder.length - 1].tid : 0
    const nyRunde = {
      nummer: runder.length + 1,
      tid: tid,
      diff: tid - forrigeTid
    }
    setRunder([...runder, nyRunde])
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDiff = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `+${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        startPause()
      } else if (e.code === 'KeyR') {
        reset()
      } else if (e.code === 'Enter') {
        if (aktiv || tid > 0) taRunde()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [aktiv, tid])

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Clock className="text-blue-500" />
        Stoppeklokke
      </h2>

      {/* Stor timer */}
      <div className="text-center mb-8">
        <div className="text-8xl font-bold font-mono mb-2">
          {formatTime(tid)}
        </div>
        <div className="text-gray-500">
          {aktiv ? '⏱️ Løper...' : tid > 0 ? '⏸️ Pauset' : '⏱️ Klar til start'}
        </div>
      </div>

      {/* Hovedkontroller */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={startPause}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${aktiv 
              ? 'bg-yellow-500 hover:bg-yellow-600' 
              : 'bg-green-500 hover:bg-green-600'
            } text-white transition transform hover:scale-105 shadow-lg
          `}
        >
          {aktiv ? <Pause size={36} /> : <Play size={36} />}
        </button>

        <button
          onClick={reset}
          className="w-20 h-20 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition transform hover:scale-105 shadow-lg flex items-center justify-center"
        >
          <RotateCcw size={28} />
        </button>

        <button
          onClick={taRunde}
          disabled={!aktiv && tid === 0}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            ${(!aktiv && tid === 0)
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600'
            } text-white transition transform hover:scale-105 shadow-lg
          `}
        >
          <Flag size={28} />
        </button>
      </div>

      {/* Runder */}
      {runder.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Runder</h3>
            <span className="text-sm text-gray-500">
              Siste runde: {formatDiff(runder[runder.length - 1].diff)}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
            {runder.map((runde, index) => (
              <div 
                key={runde.nummer}
                className={`
                  flex items-center justify-between p-3
                  ${index !== runder.length - 1 ? 'border-b' : ''}
                  ${index === runder.length - 1 ? 'bg-purple-50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${index === runder.length - 1 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-200'
                    }
                  `}>
                    {runde.nummer}
                  </span>
                  <span className="font-mono">{formatTime(runde.tid)}</span>
                </div>
                {runde.nummer > 1 && (
                  <span className="text-sm text-gray-500 font-mono">
                    {formatDiff(runde.diff)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hurtigstarter */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            reset()
            setTid(60)
          }}
          className="py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          1:00
        </button>
        <button
          onClick={() => {
            reset()
            setTid(180)
          }}
          className="py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          3:00
        </button>
        <button
          onClick={() => {
            reset()
            setTid(300)
          }}
          className="py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          5:00
        </button>
      </div>

      {/* Keyboard shortcuts */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> start/pause • 
        <kbd className="px-2 py-1 bg-gray-100 rounded ml-1">R</kbd> nullstill • 
        <kbd className="px-2 py-1 bg-gray-100 rounded ml-1">Enter</kbd> ny runde
      </div>
    </div>
  )
}