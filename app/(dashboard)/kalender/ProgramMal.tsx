'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'

interface Program {
  id: string
  navn: string
  beskrivelse: string
  ovelser: any[]
  opprettet: string
}

interface FavorittOvelse {
  id: string
  ovelse_navn: string
  ovelse_id: string
  emoji: string
  sett: number
  reps: string
  hvile: string
}

export default function ProgramMal({ 
  userId, 
  onClose, 
  onSelectProgram,
  onSelectFavoritt,
  currentOvelser,
  mode = 'select'
}: { 
  userId: string
  onClose: () => void
  onSelectProgram?: (program: Program) => void
  onSelectFavoritt?: (ovelse: FavorittOvelse) => void
  currentOvelser?: any[]
  mode?: 'select' | 'bytte'
}) {
  const supabase = createClient()
  const [programmer, setProgrammer] = useState<Program[]>([])
  const [favoritter, setFavoritter] = useState<FavorittOvelse[]>([])
  const [laster, setLaster] = useState(true)
  const [aktivFane, setAktivFane] = useState<'program'|'favoritter'|'lagre'>('program')
  const [nyttProgramNavn, setNyttProgramNavn] = useState('')
  const [nyttProgramBeskrivelse, setNyttProgramBeskrivelse] = useState('')
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    hentData()
  }, [userId])

  const hentData = async () => {
    const { data: progData } = await supabase
      .from('treningsprogrammer')
      .select('*')
      .eq('bruker_id', userId)
      .order('opprettet', { ascending: false })

    const { data: favData } = await supabase
      .from('favoritt_ovelser')
      .select('*')
      .eq('bruker_id', userId)
      .order('created_at', { ascending: false })

    setProgrammer(progData || [])
    setFavoritter(favData || [])
    setLaster(false)
  }

  const lagreSomProgram = async () => {
    if (!nyttProgramNavn.trim() || !currentOvelser?.length) return
    
    setLagrer(true)
    const { error } = await supabase
      .from('treningsprogrammer')
      .insert([{
        bruker_id: userId,
        navn: nyttProgramNavn,
        beskrivelse: nyttProgramBeskrivelse,
        ovelser: currentOvelser.map((o: any) => ({
          navn: o.navn,
          sett: o.sett,
          reps: o.reps,
          hvile: o.hvile,
          kg: o.kg || 0,
          emoji: o.emoji || '💪',
          muskler: o.muskler || ''
        }))
      }])
    
    if (!error) {
      hentData()
      setNyttProgramNavn('')
      setNyttProgramBeskrivelse('')
      setAktivFane('program')
    }
    setLagrer(false)
  }

  const leggTilFavoritt = async (ovelse: any) => {
    const { error } = await supabase
      .from('favoritt_ovelser')
      .insert([{
        bruker_id: userId,
        ovelse_navn: ovelse.navn,
        ovelse_id: ovelse.navn.toLowerCase().replace(/\s+/g, '-'),
        emoji: ovelse.emoji || '💪',
        sett: ovelse.sett,
        reps: ovelse.reps,
        hvile: ovelse.hvile
      }])
    
    if (!error) hentData()
  }

  const slettFavoritt = async (id: string) => {
    await supabase.from('favoritt_ovelser').delete().eq('id', id)
    hentData()
  }

  const slettProgram = async (id: string) => {
    await supabase.from('treningsprogrammer').delete().eq('id', id)
    hentData()
  }

  if (laster) {
    return (
      <div className="pr-modal-bg" onClick={onClose}>
        <div className="pr-modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="pr-modal-header">
            <span className="pr-modal-tittel">📁 Laster...</span>
            <button className="kal-modal-x" onClick={onClose}>✕</button>
          </div>
          <div className="pr-modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-modal-bg" onClick={onClose}>
      <div className="pr-modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="pr-modal-header">
          <span className="pr-modal-tittel">
            {aktivFane === 'program' && '📁 Mine programmer'}
            {aktivFane === 'favoritter' && '⭐ Favorittøvelser'}
            {aktivFane === 'lagre' && '💾 Lagre som program'}
          </span>
          <button className="kal-modal-x" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '0 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setAktivFane('program')}
            className={`pr-kat-btn${aktivFane === 'program' ? ' on' : ''}`}
            style={{ fontSize: '0.75rem' }}
          >
            📁 Programmer ({programmer.length})
          </button>
          <button 
            onClick={() => setAktivFane('favoritter')}
            className={`pr-kat-btn${aktivFane === 'favoritter' ? ' on' : ''}`}
            style={{ fontSize: '0.75rem' }}
          >
            ⭐ Favoritter ({favoritter.length})
          </button>
          {currentOvelser && currentOvelser.length > 0 && mode !== 'bytte' && (
            <button 
              onClick={() => setAktivFane('lagre')}
              className={`pr-kat-btn${aktivFane === 'lagre' ? ' on' : ''}`}
              style={{ fontSize: '0.75rem' }}
            >
              💾 Lagre nåværende
            </button>
          )}
        </div>

        <div className="pr-modal-body">
          {aktivFane === 'program' && (
            <>
              {programmer.length === 0 ? (
                <div className="st-tip-row" style={{ textAlign: 'center' }}>
                  Ingen lagrede programmer. Lagre en økt som program!
                </div>
              ) : (
                <div className="pr-grid" style={{ gridTemplateColumns: '1fr', maxHeight: '400px', overflowY: 'auto' }}>
                  {programmer.map(prog => (
                    <div key={prog.id} className="pr-kort" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }} onClick={() => onSelectProgram?.(prog)}>
                        <div className="pr-kort-navn">{prog.navn}</div>
                        {prog.beskrivelse && <div className="pr-kort-reps" style={{ fontSize: '0.7rem' }}>{prog.beskrivelse}</div>}
                        <div className="pr-kort-dato">{prog.ovelser.length} øvelser • {format(new Date(prog.opprettet), 'dd.MM.yyyy', { locale: nb })}</div>
                      </div>
                      <button 
                        className="kal-del-btn" 
                        onClick={(e) => { e.stopPropagation(); slettProgram(prog.id) }}
                        style={{ padding: '4px 8px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {aktivFane === 'favoritter' && (
            <>
              {favoritter.length === 0 ? (
                <div className="st-tip-row" style={{ textAlign: 'center' }}>
                  Ingen favoritter. Høyreklikk på en øvelse for å legge til favoritt!
                </div>
              ) : (
                <div className="pr-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', maxHeight: '400px', overflowY: 'auto' }}>
                  {favoritter.map(fav => (
                    <div key={fav.id} className="pr-kort" style={{ cursor: 'pointer' }} onClick={() => onSelectFavoritt?.(fav)}>
                      <div className="pr-kort-topp" style={{ justifyContent: 'space-between' }}>
                        <span className="pr-kort-em">{fav.emoji}</span>
                        <button 
                          className="kal-del-btn" 
                          onClick={(e) => { e.stopPropagation(); slettFavoritt(fav.id) }}
                          style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="pr-kort-navn" style={{ fontSize: '0.85rem' }}>{fav.ovelse_navn}</div>
                      <div className="pr-kort-reps" style={{ fontSize: '0.7rem' }}>{fav.sett} × {fav.reps}</div>
                      <div className="pr-kort-dato" style={{ fontSize: '0.6rem' }}>{fav.hvile} hvile</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {aktivFane === 'lagre' && currentOvelser && currentOvelser.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                className="input"
                placeholder="Programnavn (f.eks. Push dag, 5x5, etc.)"
                value={nyttProgramNavn}
                onChange={e => setNyttProgramNavn(e.target.value)}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Beskrivelse (valgfritt)"
                value={nyttProgramBeskrivelse}
                onChange={e => setNyttProgramBeskrivelse(e.target.value)}
              />
              <div className="st-tip-row" style={{ fontSize: '0.75rem', background: 'rgba(0,245,255,0.05)' }}>
                📋 {currentOvelser.length} øvelser blir lagret
              </div>
              <button 
                className="btn btn-primary" 
                onClick={lagreSomProgram} 
                disabled={lagrer || !nyttProgramNavn.trim()}
              >
                {lagrer ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '💾 Lagre program'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}