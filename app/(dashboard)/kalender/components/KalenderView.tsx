'use client'

interface Props {
  visManed: Date
  valgtDato: Date
  onDatoChange: (dato: Date) => void
  treningsDager: string[]
}

export default function KalenderView({ visManed, valgtDato, onDatoChange, treningsDager }: Props) {
  const dagerIUken = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
  
  const getDagerIManed = () => {
    const year = visManed.getFullYear()
    const month = visManed.getMonth()
    const forsteDag = new Date(year, month, 1)
    const sisteDag = new Date(year, month + 1, 0)
    
    const startDag = forsteDag.getDay() || 7 // 0 = søndag, juster til 7
    const antallDager = sisteDag.getDate()
    
    return { startDag: startDag - 1, antallDager }
  }

  const { startDag, antallDager } = getDagerIManed()
  const blanks = Array.from({ length: startDag }, (_, i) => i)
  const dager = Array.from({ length: antallDager }, (_, i) => i + 1)

  const erValgtDato = (dag: number) => {
    return valgtDato.getDate() === dag && 
           valgtDato.getMonth() === visManed.getMonth() &&
           valgtDato.getFullYear() === visManed.getFullYear()
  }

  const harTrening = (dag: number) => {
    const datoStreng = new Date(
      visManed.getFullYear(),
      visManed.getMonth(),
      dag
    ).toISOString().split('T')[0]
    return treningsDager.includes(datoStreng)
  }

  const erIdag = (dag: number) => {
    const idag = new Date()
    return idag.getDate() === dag && 
           idag.getMonth() === visManed.getMonth() &&
           idag.getFullYear() === visManed.getFullYear()
  }

  return (
    <div>
      {/* Dagnavn */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dagerIUken.map(dag => (
          <div key={dag} className="text-center text-sm font-medium text-gray-500 py-2">
            {dag}
          </div>
        ))}
      </div>

      {/* Kalendergitter */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(blank => (
          <div key={`blank-${blank}`} className="aspect-square p-1" />
        ))}

        {dager.map(dag => {
          const valgt = erValgtDato(dag)
          const trent = harTrening(dag)
          const idag = erIdag(dag)

          return (
            <button
              key={dag}
              onClick={() => onDatoChange(new Date(visManed.getFullYear(), visManed.getMonth(), dag))}
              className={`
                aspect-square p-1 rounded-lg transition-all relative group
                ${valgt 
                  ? 'bg-blue-500 text-white shadow-md scale-105 z-10' 
                  : 'hover:bg-gray-100'
                }
                ${idag && !valgt ? 'ring-2 ring-blue-200' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className={`
                  text-sm font-medium
                  ${valgt ? 'text-white' : idag ? 'text-blue-600' : 'text-gray-700'}
                `}>
                  {dag}
                </span>
                {trent && (
                  <div className={`
                    w-1.5 h-1.5 rounded-full mt-0.5
                    ${valgt ? 'bg-white' : 'bg-green-500'}
                  `} />
                )}
              </div>

              {/* Tooltip på hover */}
              {trent && !valgt && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-20">
                  💪 Treningsdag
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Forklaring */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Har trent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Valgt dag</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 ring-2 ring-blue-200 rounded-full"></div>
          <span>I dag</span>
        </div>
      </div>
    </div>
  )
}