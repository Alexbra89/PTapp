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

// Alle øvelser – importeres fra DB-strukturen eller hardkodes her
// Hvis du har en egen øvelsesliste, kan du importere den. Her bruker vi en grunnleggende liste.
const ALLE_OVELSER = [
  { navn: 'Benkpress', emoji: '🏋️', kategori: 'bryst', sett: 4, reps: '8-10', hvile: '90s' },
  { navn: 'Push-up', emoji: '💪', kategori: 'bryst', sett: 4, reps: '12-15', hvile: '60s' },
  { navn: 'Skråbenkpress', emoji: '📐', kategori: 'bryst', sett: 3, reps: '10-12', hvile: '75s' },
  { navn: 'Dips', emoji: '⬇️', kategori: 'bryst', sett: 3, reps: '10-12', hvile: '75s' },
  { navn: 'Pull-ups', emoji: '🤸', kategori: 'rygg', sett: 4, reps: '6-10', hvile: '2min' },
  { navn: 'Markløft', emoji: '⚡', kategori: 'rygg', sett: 4, reps: '5-6', hvile: '3min' },
  { navn: 'Lat pulldown', emoji: '⬇️', kategori: 'rygg', sett: 3, reps: '10-12', hvile: '75s' },
  { navn: 'Hantelroing', emoji: '💪', kategori: 'rygg', sett: 4, reps: '10×2', hvile: '60s' },
  { navn: 'Knebøy', emoji: '🦵', kategori: 'bein', sett: 4, reps: '8-10', hvile: '2min' },
  { navn: 'Legpress', emoji: '🔧', kategori: 'bein', sett: 4, reps: '10-12', hvile: '90s' },
  { navn: 'Rumensk markløft', emoji: '🍑', kategori: 'bein', sett: 3, reps: '10-12', hvile: '90s' },
  { navn: 'Utfall', emoji: '🚶', kategori: 'bein', sett: 3, reps: '12×2', hvile: '60s' },
  { navn: 'Military press', emoji: '⬆️', kategori: 'skuldre', sett: 4, reps: '8-10', hvile: '2min' },
  { navn: 'Sidehev', emoji: '🔼', kategori: 'skuldre', sett: 3, reps: '12-15', hvile: '60s' },
  { navn: 'Face pull', emoji: '🎯', kategori: 'skuldre', sett: 3, reps: '15-20', hvile: '45s' },
  { navn: 'Biceps curl', emoji: '💪', kategori: 'bicep', sett: 3, reps: '10-12', hvile: '60s' },
  { navn: 'Hammer curl', emoji: '🔨', kategori: 'bicep', sett: 3, reps: '10-12', hvile: '60s' },
  { navn: 'Preacher curl', emoji: '🙏', kategori: 'bicep', sett: 3, reps: '10-12', hvile: '60s' },
  { navn: 'Triceps pushdown', emoji: '📉', kategori: 'tricep', sett: 3, reps: '12-15', hvile: '60s' },
  { navn: 'Skull crushers', emoji: '💀', kategori: 'tricep', sett: 3, reps: '10-12', hvile: '75s' },
  { navn: 'Overhead triceps ext.', emoji: '⬆️', kategori: 'tricep', sett: 3, reps: '10-12', hvile: '75s' },
  { navn: 'Planke', emoji: '🧘', kategori: 'core', sett: 3, reps: '45-60 sek', hvile: '45s' },
  { navn: 'Crunches', emoji: '🔄', kategori: 'core', sett: 3, reps: '20', hvile: '45s' },
  { navn: 'Russian twist', emoji: '🔃', kategori: 'core', sett: 3, reps: '20', hvile: '45s' },
  { navn: 'Burpees', emoji: '🔥', kategori: 'fullkropp', sett: 4, reps: '10', hvile: '60s' },
  { navn: 'Thrusters', emoji: '🚀', kategori: 'fullkropp', sett: 3, reps: '10', hvile: '90s' },
  { navn: 'Kettlebell swing', emoji: '🔔', kategori: 'fullkropp', sett: 4, reps: '15', hvile: '60s' },
]

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
  const [alleLaster, setAlleLaster] = useState(false)
  const [aktivFane, setAktivFane] = useState<'program'|'favoritter'|'alle'|'lagre'>(
    mode === 'bytte' ? 'favoritter' : 'program'
  )
  const [nyttProgramNavn, setNyttProgramNavn] = useState('')
  const [nyttProgramBeskrivelse, setNyttProgramBeskrivelse] = useState('')
  const [lagrer, setLagrer] = useState(false)
  const [sokeord, setSokeord] = useState('')
  const [valgtKategori, setValgtKategori] = useState('alle')

  // Hent kategorier fra alle øvelser
  const kategorier = ['alle', ...new Set(ALLE_OVELSER.map(o => o.kategori))]

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

  const slettFavoritt = async (id: string) => {
    await supabase.from('favoritt_ovelser').delete().eq('id', id)
    hentData()
  }

  const slettProgram = async (id: string) => {
    await supabase.from('treningsprogrammer').delete().eq('id', id)
    hentData()
  }

  // Filtrer alle øvelser basert på søk og kategori
  const filtrerteOvelser = ALLE_OVELSER.filter(o => {
    const matchKategori = valgtKategori === 'alle' || o.kategori === valgtKategori
    const matchSok = sokeord === '' || o.navn.toLowerCase().includes(sokeord.toLowerCase())
    return matchKategori && matchSok
  })

  return (
    <div className="pr-modal-bg" onClick={onClose}>
      <div className="pr-modal glass-card" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="pr-modal-header">
          <span className="pr-modal-tittel">
            {mode === 'bytte' && '🔄 Bytt øvelse'}
            {mode !== 'bytte' && aktivFane === 'program' && '📁 Mine programmer'}
            {mode !== 'bytte' && aktivFane === 'favoritter' && '⭐ Favorittøvelser'}
            {mode !== 'bytte' && aktivFane === 'alle' && '📚 Alle øvelser'}
            {mode !== 'bytte' && aktivFane === 'lagre' && '💾 Lagre som program'}
          </span>
          <button className="pr-lukk-btn" onClick={onClose}>✕</button>
        </div>

        {/* Faner */}
        <div className="pr-faner">
          {mode !== 'bytte' && (
            <button 
              onClick={() => setAktivFane('program')}
              className={`pr-fane-btn${aktivFane === 'program' ? ' on' : ''}`}
            >
              📁 Programmer ({programmer.length})
            </button>
          )}
          <button 
            onClick={() => setAktivFane('favoritter')}
            className={`pr-fane-btn${aktivFane === 'favoritter' ? ' on' : ''}`}
          >
            ⭐ Favoritter ({laster ? '…' : favoritter.length})
          </button>
          {mode === 'bytte' && (
            <button 
              onClick={() => setAktivFane('alle')}
              className={`pr-fane-btn${aktivFane === 'alle' ? ' on' : ''}`}
            >
              📚 Alle øvelser
            </button>
          )}
          {currentOvelser && currentOvelser.length > 0 && mode !== 'bytte' && (
            <button 
              onClick={() => setAktivFane('lagre')}
              className={`pr-fane-btn${aktivFane === 'lagre' ? ' on' : ''}`}
            >
              💾 Lagre nåværende
            </button>
          )}
        </div>

        {/* Body */}
        <div className="pr-modal-body">

          {laster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner-lg" style={{ margin: '0 auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem', fontSize: '0.82rem' }}>Laster...</p>
            </div>
          ) : (
            <>
              {/* Programmer-fane */}
              {aktivFane === 'program' && (
                <>
                  {programmer.length === 0 ? (
                    <div className="pr-tom-melding">
                      Ingen lagrede programmer ennå. Lagre en økt som program!
                    </div>
                  ) : (
                    <div className="pr-liste">
                      {programmer.map(prog => (
                        <div 
                          key={prog.id} 
                          className="pr-rad"
                          onClick={() => onSelectProgram?.(prog)}
                        >
                          <div className="pr-rad-info">
                            <div className="pr-rad-navn">{prog.navn}</div>
                            {prog.beskrivelse && (
                              <div className="pr-rad-sub">{prog.beskrivelse}</div>
                            )}
                            <div className="pr-rad-meta">
                              {prog.ovelser.length} øvelser • {format(new Date(prog.opprettet), 'dd.MM.yyyy', { locale: nb })}
                            </div>
                          </div>
                          <button 
                            className="pr-slett-btn"
                            onClick={(e) => { e.stopPropagation(); slettProgram(prog.id) }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Favoritter-fane */}
              {aktivFane === 'favoritter' && (
                <>
                  {favoritter.length === 0 ? (
                    <div className="pr-tom-melding">
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
                      <div>Ingen favoritter ennå.</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'rgba(255,255,255,0.3)' }}>
                        Klikk ⭐ ved en øvelse under trening for å legge den til.
                      </div>
                    </div>
                  ) : (
                    <div className="pr-fav-grid">
                      {favoritter.map(fav => (
                        <div 
                          key={fav.id} 
                          className="pr-fav-kort"
                          onClick={() => onSelectFavoritt?.(fav)}
                        >
                          <div className="pr-fav-topp">
                            <span className="pr-fav-em">{fav.emoji}</span>
                            <button 
                              className="pr-slett-btn"
                              onClick={(e) => { e.stopPropagation(); slettFavoritt(fav.id) }}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="pr-fav-navn">{fav.ovelse_navn}</div>
                          <div className="pr-fav-detalj">{fav.sett} × {fav.reps}</div>
                          <div className="pr-fav-hvile">{fav.hvile} hvile</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Alle øvelser-fane (kun i bytte-modus) */}
              {aktivFane === 'alle' && (
                <>
                  {/* Søkefelt */}
                  <div className="pr-sok-felt">
                    <input
                      type="text"
                      className="input"
                      placeholder="🔍 Søk etter øvelse..."
                      value={sokeord}
                      onChange={(e) => setSokeord(e.target.value)}
                    />
                  </div>

                  {/* Kategorifilter */}
                  <div className="pr-kat-filter">
                    {kategorier.map(kat => (
                      <button
                        key={kat}
                        className={`pr-kat-btn${valgtKategori === kat ? ' on' : ''}`}
                        onClick={() => setValgtKategori(kat)}
                      >
                        {kat === 'alle' ? '📋 Alle' : kat.charAt(0).toUpperCase() + kat.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Øvelsesliste */}
                  <div className="pr-alle-grid">
                    {filtrerteOvelser.map((ov, idx) => (
                      <div
                        key={idx}
                        className="pr-alle-kort"
                        onClick={() => onSelectFavoritt?.({
                          id: `temp_${idx}`,
                          ovelse_navn: ov.navn,
                          ovelse_id: ov.navn.toLowerCase().replace(/\s+/g, '-'),
                          emoji: ov.emoji,
                          sett: ov.sett,
                          reps: ov.reps,
                          hvile: ov.hvile
                        })}
                      >
                        <div className="pr-alle-em">{ov.emoji}</div>
                        <div className="pr-alle-navn">{ov.navn}</div>
                        <div className="pr-alle-detalj">{ov.sett} × {ov.reps}</div>
                        <div className="pr-alle-kat" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>{ov.kategori}</div>
                      </div>
                    ))}
                    {filtrerteOvelser.length === 0 && (
                      <div className="pr-tom-melding" style={{ gridColumn: '1/-1' }}>
                        Ingen øvelser funnet
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Lagre-fane */}
              {aktivFane === 'lagre' && currentOvelser && currentOvelser.length > 0 && (
                <div className="pr-lagre-form">
                  <input
                    className="input"
                    placeholder="Programnavn (f.eks. Push dag, 5×5, etc.)"
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
                  <div className="pr-lagre-info">
                    📋 {currentOvelser.length} øvelser blir lagret
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={lagreSomProgram} 
                    disabled={lagrer || !nyttProgramNavn.trim()}
                  >
                    {lagrer 
                      ? <span className="spinner" style={{ width: 14, height: 14 }} /> 
                      : '💾 Lagre program'
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .pr-modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .pr-modal {
          width: 100%;
          max-width: 680px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 16px;
        }
        .pr-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .pr-modal-tittel {
          font-family: var(--font-display, sans-serif);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
        }
        .pr-lukk-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          width: 30px;
          height: 30px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .pr-lukk-btn:hover {
          background: rgba(255,80,80,0.15);
          border-color: rgba(255,80,80,0.3);
          color: #ff5555;
        }
        .pr-faner {
          display: flex;
          gap: 4px;
          padding: 0.75rem 1.5rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .pr-fane-btn {
          padding: 5px 12px;
          border-radius: 8px 8px 0 0;
          font-size: 0.75rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-family: var(--font-body, sans-serif);
          transition: all 0.15s;
          margin-bottom: -1px;
        }
        .pr-fane-btn.on {
          background: rgba(0,245,255,0.08);
          border-color: rgba(0,245,255,0.2);
          color: var(--cyan, #00f5ff);
        }
        .pr-modal-body {
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        .pr-tom-melding {
          text-align: center;
          padding: 2rem 1rem;
          color: rgba(255,255,255,0.4);
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .pr-liste {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pr-rad {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          transition: all 0.15s;
        }
        .pr-rad:hover {
          background: rgba(0,245,255,0.06);
          border-color: rgba(0,245,255,0.2);
        }
        .pr-rad-info { flex: 1; min-width: 0; }
        .pr-rad-navn {
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 2px;
        }
        .pr-rad-sub {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          margin-bottom: 2px;
        }
        .pr-rad-meta {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.25);
        }
        .pr-slett-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 4px 6px;
          border-radius: 6px;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .pr-slett-btn:hover {
          background: rgba(255,80,80,0.12);
          color: #ff5555;
        }
        .pr-fav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .pr-fav-kort {
          padding: 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          transition: all 0.15s;
        }
        .pr-fav-kort:hover {
          background: rgba(0,245,255,0.07);
          border-color: rgba(0,245,255,0.25);
          transform: translateY(-1px);
        }
        .pr-fav-topp {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .pr-fav-em { font-size: 1.3rem; }
        .pr-fav-navn {
          font-size: 0.82rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .pr-fav-detalj {
          font-size: 0.7rem;
          color: var(--cyan, #00f5ff);
          margin-bottom: 2px;
        }
        .pr-fav-hvile {
          font-size: 0.62rem;
          color: rgba(255,255,255,0.28);
        }
        .pr-sok-felt {
          margin-bottom: 0.75rem;
        }
        .pr-kat-filter {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .pr-kat-btn {
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 0.7rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          transition: all 0.12s;
          font-family: var(--font-body, sans-serif);
        }
        .pr-kat-btn:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
        }
        .pr-kat-btn.on {
          background: rgba(0,245,255,0.12);
          border-color: rgba(0,245,255,0.35);
          color: var(--cyan, #00f5ff);
        }
        .pr-alle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .pr-alle-kort {
          padding: 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: all 0.12s;
          text-align: center;
        }
        .pr-alle-kort:hover {
          background: rgba(0,245,255,0.07);
          border-color: rgba(0,245,255,0.25);
          transform: translateY(-1px);
        }
        .pr-alle-em {
          font-size: 1.4rem;
          margin-bottom: 4px;
        }
        .pr-alle-navn {
          font-size: 0.78rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pr-alle-detalj {
          font-size: 0.65rem;
          color: var(--cyan, #00f5ff);
        }
        .pr-lagre-form {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .pr-lagre-info {
          font-size: 0.75rem;
          color: rgba(0,245,255,0.7);
          background: rgba(0,245,255,0.05);
          border: 1px solid rgba(0,245,255,0.1);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .spinner-lg {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: var(--cyan, #00f5ff);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}