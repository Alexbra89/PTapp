'use client'

import { useState } from 'react'
import ovelserData from '@/data/ovelser.json'

interface ValgtOvelse {
  id: string
  navn: string
  emoji?: string
  muskelgruppe: string
  sett: number
  reps: string
}

interface OvelseJSON {
  id: string
  navn: string
  muskelgruppe: string
  utstyr: string
  vanskelighetsgrad: string
  beskrivelse: string
}

interface Props {
  onSelect: (ovelser: ValgtOvelse[]) => void
  valgteOvelser?: ValgtOvelse[]
}

export default function OvelsesVelger({ onSelect, valgteOvelser = [] }: Props) {
  const [sok, setSok] = useState('')
  const [valgtKategori, setValgtKategori] = useState<string>('alle')
  const [midlertidigValgte, setMidlertidigValgte] = useState<ValgtOvelse[]>(valgteOvelser)
  
  // Konverter JSON-strukturen til en flat array
  const alleOvelser: (OvelseJSON & { kategori: string })[] = []
  Object.keys(ovelserData).forEach(kategori => {
    const ovelser = (ovelserData as any)[kategori]
    ovelser.forEach((o: OvelseJSON) => {
      alleOvelser.push({
        ...o,
        kategori: kategori
      })
    })
  })
  
  // Hent unike kategorier
  const kategorier = ['alle', ...Object.keys(ovelserData)]
  
  // Filtrer øvelser basert på søk og kategori
  const filtrerteOvelser = alleOvelser.filter((o) => {
    const matchSok = sok === '' || 
      o.navn.toLowerCase().includes(sok.toLowerCase()) ||
      o.muskelgruppe.toLowerCase().includes(sok.toLowerCase())
    
    const matchKategori = valgtKategori === 'alle' || o.kategori === valgtKategori
    
    return matchSok && matchKategori
  })
  
  const toggleOvelse = (ovelse: typeof alleOvelser[0]) => {
    const finnes = midlertidigValgte.find(o => o.id === ovelse.id)
    if (finnes) {
      setMidlertidigValgte(midlertidigValgte.filter(o => o.id !== ovelse.id))
    } else {
      setMidlertidigValgte([...midlertidigValgte, {
        id: ovelse.id,
        navn: ovelse.navn,
        emoji: '💪', // Standard emoji siden JSON mangler dette
        muskelgruppe: ovelse.muskelgruppe,
        sett: 3, // Standard sett
        reps: '10' // Standard reps
      }])
    }
  }
  
  const oppdaterSett = (id: string, sett: number) => {
    setMidlertidigValgte(midlertidigValgte.map(o => 
      o.id === id ? { ...o, sett } : o
    ))
  }
  
  const oppdaterReps = (id: string, reps: string) => {
    setMidlertidigValgte(midlertidigValgte.map(o => 
      o.id === id ? { ...o, reps } : o
    ))
  }
  
  return (
    <div className="ov-velger">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        
        {/* Venstre: Bibliotek */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📚 Velg øvelser</h3>
          
          <input
            className="input"
            placeholder="Søk etter øvelse..."
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            style={{ marginBottom: '1rem' }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {kategorier.map(kat => (
              <button
                key={kat}
                onClick={() => setValgtKategori(kat)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: valgtKategori === kat ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
                  color: valgtKategori === kat ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {kat === 'alle' ? 'Alle' : kat}
              </button>
            ))}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filtrerteOvelser.map((ovelse) => {
              const erValgt = midlertidigValgte.find(o => o.id === ovelse.id)
              return (
                <div
                  key={ovelse.id}
                  onClick={() => toggleOvelse(ovelse)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: erValgt ? 'rgba(0,245,255,0.1)' : 'transparent',
                    border: erValgt ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>💪</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ovelse.navn}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {ovelse.muskelgruppe} • {ovelse.vanskelighetsgrad} • {ovelse.utstyr}
                    </div>
                  </div>
                  <span>{erValgt ? '✅' : '➕'}</span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Høyre: Valgte øvelser */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📋 Din økt ({midlertidigValgte.length})</h3>
          
          {midlertidigValgte.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
              Velg øvelser fra venstre
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {midlertidigValgte.map((ovelse) => (
                <div
                  key={ovelse.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>{ovelse.emoji || '💪'}</span>
                    <span style={{ fontWeight: 600, flex: 1 }}>{ovelse.navn}</span>
                    <button
                      onClick={() => toggleOvelse(ovelse as any)}
                      style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Sett</label>
                      <input
                        type="number"
                        min="1"
                        value={ovelse.sett}
                        onChange={(e) => oppdaterSett(ovelse.id, parseInt(e.target.value) || 1)}
                        style={{ width: '60px', padding: '0.25rem' }}
                        className="input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Reps</label>
                      <input
                        type="text"
                        value={ovelse.reps}
                        onChange={(e) => oppdaterReps(ovelse.id, e.target.value)}
                        style={{ width: '80px', padding: '0.25rem' }}
                        className="input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => onSelect(midlertidigValgte)}
          >
            ✅ Bruk disse øvelsene
          </button>
        </div>
      </div>
    </div>
  )
}