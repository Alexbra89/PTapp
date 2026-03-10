'use client'

import { useState } from 'react'
import Tabata from './Tabata'
import Stoppeklokke from './Stoppeklokke'
import { Timer, Activity } from 'lucide-react'

export default function TidtakingSide() {
  const [aktivModus, setAktivModus] = useState<'tabata' | 'stoppeklokke' | 'intervall'>('tabata')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Timer className="text-purple-500" />
          Tidtaking
        </h1>
        <p className="text-gray-600 mt-1">
          Tabata, stoppeklokke og intervalltidtaking
        </p>
      </div>

      {/* Modusvelger */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg max-w-md">
        <button
          onClick={() => setAktivModus('tabata')}
          className={`
            flex-1 py-2 px-4 rounded-md text-sm font-medium transition
            ${aktivModus === 'tabata' 
              ? 'bg-white text-purple-600 shadow' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Activity size={16} className="inline mr-1" />
          Tabata
        </button>
        <button
          onClick={() => setAktivModus('stoppeklokke')}
          className={`
            flex-1 py-2 px-4 rounded-md text-sm font-medium transition
            ${aktivModus === 'stoppeklokke' 
              ? 'bg-white text-purple-600 shadow' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Timer size={16} className="inline mr-1" />
          Stoppeklokke
        </button>
      </div>

      {/* Aktiv komponent */}
      <div className="max-w-2xl mx-auto">
        {aktivModus === 'tabata' && <Tabata />}
        {aktivModus === 'stoppeklokke' && <Stoppeklokke />}
      </div>
    </div>
  )
}