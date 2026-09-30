'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { X, Trash2, FolderOpen, Star, Library, Save, Dumbbell } from 'lucide-react'
import { OVELSER as BIBLIOTEK, muskler, visesBakfra } from '@/data/ovelsesbibliotek'
import { MuskelkartMini } from '@/components/atelier/Muskelkart'

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

// «Bytt øvelse» søker i hele biblioteket
const ALLE_OVELSER = BIBLIOTEK.map(o => ({ navn: o.navn, kategori: o.kategori, sett: o.sett, reps: o.reps, hvile: o.hvile }))

function Merke({ navn, hoyde = 50 }: { navn: string; hoyde?: number }) {
  const b = BIBLIOTEK.find(o => o.navn.toLowerCase() === navn.toLowerCase())
  if (!b) return <Dumbbell size={18} strokeWidth={1.3} style={{ color: 'var(--text-muted)' }} />
  const m = muskler(b)
  return <MuskelkartMini {...m} bakfra={visesBakfra(m.primaer)} hoyde={hoyde} />
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
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
          emoji: o.emoji || '',
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
            {mode === 'bytte' && <>Bytt <em>øvelse</em></>}
            {mode !== 'bytte' && aktivFane === 'program' && <>Mine <em>programmer</em></>}
            {mode !== 'bytte' && aktivFane === 'favoritter' && <>Favoritt<em>øvelser</em></>}
            {mode !== 'bytte' && aktivFane === 'lagre' && <>Lagre som <em>program</em></>}
          </span>
          <button className="pr-lukk-btn" onClick={onClose} aria-label="Lukk"><X size={15} strokeWidth={1.5} /></button>
        </div>

        {/* Faner */}
        <div className="pr-faner">
          {mode !== 'bytte' && (
            <button 
              onClick={() => setAktivFane('program')}
              className={`pr-fane-btn${aktivFane === 'program' ? ' on' : ''}`}
            >
              <FolderOpen size={13} strokeWidth={1.5} /> Programmer ({programmer.length})
            </button>
          )}
          <button 
            onClick={() => setAktivFane('favoritter')}
            className={`pr-fane-btn${aktivFane === 'favoritter' ? ' on' : ''}`}
          >
            <Star size={13} strokeWidth={1.5} /> Favoritter ({laster ? '…' : favoritter.length})
          </button>
          {mode === 'bytte' && (
            <button 
              onClick={() => setAktivFane('alle')}
              className={`pr-fane-btn${aktivFane === 'alle' ? ' on' : ''}`}
            >
              <Library size={13} strokeWidth={1.5} /> Alle øvelser
            </button>
          )}
          {currentOvelser && currentOvelser.length > 0 && mode !== 'bytte' && (
            <button 
              onClick={() => setAktivFane('lagre')}
              className={`pr-fane-btn${aktivFane === 'lagre' ? ' on' : ''}`}
            >
              <Save size={13} strokeWidth={1.5} /> Lagre nåværende
            </button>
          )}
        </div>

        {/* Body */}
        <div className="pr-modal-body">

          {laster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner-lg" style={{ margin: '0 auto' }} />
              <p style={{ color: 'rgba(242,236,225,0.4)', marginTop: '1rem', fontSize: '0.82rem' }}>Laster...</p>
            </div>
          ) : (
            <>
              {/* Programmer-fane */}
              {aktivFane === 'program' && (
                <>
                  {programmer.length === 0 ? (
                    <div className="pr-tom-melding">
                      <strong>Ingen programmer ennå.</strong>Lagre en økt som program, så kan du legge den inn i kalenderen med ett trykk.
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
                            aria-label="Slett program"
                          >
                            <Trash2 size={14} strokeWidth={1.4} />
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
                      <strong>Ingen favoritter ennå.</strong>
                      Trykk «Favoritt» på en øvelse under trening for å samle den her.
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
                            <span className="pr-fav-em"><Merke navn={fav.ovelse_navn} /></span>
                            <button 
                              className="pr-slett-btn"
                              onClick={(e) => { e.stopPropagation(); slettFavoritt(fav.id) }}
                              aria-label="Fjern favoritt"
                            >
                              <X size={13} strokeWidth={1.5} />
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
                      placeholder="Søk etter øvelse …"
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
                        {kat === 'alle' ? 'Alle' : kat.charAt(0).toUpperCase() + kat.slice(1)}
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
                          emoji: '',
                          sett: ov.sett,
                          reps: ov.reps,
                          hvile: ov.hvile
                        })}
                      >
                        <div className="pr-alle-em"><Merke navn={ov.navn} /></div>
                        <div className="pr-alle-navn">{ov.navn}</div>
                        <div className="pr-alle-detalj">{ov.sett} × {ov.reps}</div>
                        <div className="pr-alle-kat" style={{ fontSize: '0.55rem', color: 'rgba(242,236,225,0.3)' }}>{ov.kategori}</div>
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
                    {currentOvelser.length} øvelser blir lagret
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={lagreSomProgram} 
                    disabled={lagrer || !nyttProgramNavn.trim()}
                  >
                    {lagrer 
                      ? <span className="spinner" style={{ width: 14, height: 14 }} /> 
                      : 'Lagre program'
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .pr-modal-bg { position: fixed; inset: 0; background: rgba(5,5,4,0.72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .pr-modal { width: 100%; max-width: 700px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 28px !important; }
        .pr-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 1.5rem 1rem; flex-shrink: 0; }
        .pr-modal-tittel { font-family: var(--font-serif); font-weight: 400; font-size: 1.9rem; line-height: 1; color: var(--ink); }
        .pr-modal-tittel em { font-style: italic; color: var(--gold); }
        .pr-lukk-btn { width: 34px; height: 34px; border-radius: 50%; background: none; border: 1px solid var(--line); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .pr-lukk-btn:hover { color: var(--ink); border-color: var(--line-strong); }
        .pr-faner { display: flex; gap: 4px; padding: 0 1.5rem 1rem; flex-shrink: 0; border-bottom: 1px solid var(--line); overflow-x: auto; }
        .pr-fane-btn { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 0.55rem 1rem; border-radius: 999px; border: 1px solid var(--line); background: none; color: var(--text-secondary); font-size: 0.82rem; cursor: pointer; transition: all 0.25s; }
        .pr-fane-btn:hover { color: var(--ink); }
        .pr-fane-btn.on { background: var(--ink); border-color: var(--ink); color: #0B0A09; }
        .pr-modal-body { padding: 1.25rem 1.5rem 1.5rem; overflow-y: auto; flex: 1; }
        .pr-tom-melding { padding: 2rem 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }
        .pr-tom-melding strong { display: block; font-family: var(--font-serif); font-weight: 400; font-size: 1.6rem; color: var(--ink); margin-bottom: 6px; }
        .pr-liste { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
        .pr-rad { display: flex; align-items: center; gap: 12px; padding: 1rem 0.25rem; border-bottom: 1px solid var(--line); cursor: pointer; transition: padding 0.3s var(--ease-out); }
        .pr-rad:hover { padding-left: 0.75rem; }
        .pr-rad-info { flex: 1; min-width: 0; }
        .pr-rad-navn { font-family: var(--font-serif); font-size: 1.45rem; line-height: 1.1; color: var(--ink); }
        .pr-rad-sub { font-size: 0.84rem; color: var(--text-secondary); margin-top: 4px; }
        .pr-rad-meta { font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-top: 6px; }
        .pr-slett-btn { width: 30px; height: 30px; border-radius: 50%; background: none; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .pr-slett-btn:hover { color: var(--danger); border-color: rgba(224,97,79,0.4); }
        .pr-fav-grid, .pr-alle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .pr-fav-kort, .pr-alle-kort { display: flex; flex-direction: column; gap: 4px; padding: 0.9rem; border-radius: 18px; border: 1px solid var(--line); cursor: pointer; transition: all 0.3s var(--ease-out); background: rgba(242,236,225,0.015); }
        .pr-fav-kort:hover, .pr-alle-kort:hover { border-color: rgba(201,169,110,0.45); transform: translateY(-2px); }
        .pr-fav-topp { display: flex; align-items: flex-start; justify-content: space-between; }
        .pr-fav-em, .pr-alle-em { height: 52px; display: flex; align-items: center; margin-bottom: 6px; }
        .pr-fav-navn, .pr-alle-navn { font-family: var(--font-serif); font-size: 1.2rem; line-height: 1.1; color: var(--ink); }
        .pr-fav-detalj, .pr-alle-detalj { font-family: var(--font-mono); font-size: 0.66rem; color: var(--gold); }
        .pr-fav-hvile { font-family: var(--font-mono); font-size: 0.58rem; color: var(--text-muted); }
        .pr-sok-felt { margin-bottom: 0.75rem; }
        .pr-kat-filter { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 1rem; }
        .pr-kat-btn { flex-shrink: 0; padding: 7px 14px; border-radius: 999px; font-size: 0.8rem; background: none; border: 1px solid var(--line); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .pr-kat-btn.on { background: var(--ink); border-color: var(--ink); color: #0B0A09; }
        .pr-lagre-form { display: flex; flex-direction: column; gap: 0.9rem; }
        .pr-lagre-info { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); }
      `}</style>
    </div>
  )
}