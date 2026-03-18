'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useSupabaseQuery'
import Link from 'next/link'

interface Utfordring {
  id: string
  tittel: string
  beskrivelse: string
  maal: number
  enhet: string
  emoji: string
  fullfort: boolean
  fremgang: number
  belonning?: { navn: string; ikon: string; farge: string }
  sjeldenhet?: 'vanlig' | 'sjelden' | 'episk'
}

const UTFORDRINGER_POOL = [
  { tittel:'10.000 skritt',   beskrivelse:'Gå 10.000 skritt i dag',              maal:10000, enhet:'skritt',   emoji:'👣', sjeldenhet:'vanlig' },
  { tittel:'Drikk 2,5L vann', beskrivelse:'Drikk 2,5 liter vann i dag',          maal:2500,  enhet:'ml',       emoji:'💧', sjeldenhet:'vanlig' },
  { tittel:'3 treningsøkter', beskrivelse:'Fullfør 3 treningsøkter denne uken',  maal:3,     enhet:'økter',    emoji:'🏋️', sjeldenhet:'vanlig' },
  { tittel:'Sov 7+ timer',    beskrivelse:'Sov minst 7 timer 3 netter på rad',   maal:3,     enhet:'netter',   emoji:'😴', sjeldenhet:'sjelden' },
  { tittel:'Spis grønnsaker', beskrivelse:'Spis 3 grønnsaker per dag i 5 dager', maal:5,     enhet:'dager',    emoji:'🥦', sjeldenhet:'vanlig' },
  { tittel:'Ingen sukker',    beskrivelse:'Unngå sukker i 3 dager denne uken',   maal:3,     enhet:'dager',    emoji:'🚫', sjeldenhet:'sjelden' },
  { tittel:'Strekk 10 min',   beskrivelse:'Strekk deg i 10 min etter trening',   maal:10,    enhet:'min',      emoji:'🧘', sjeldenhet:'vanlig' },
  { tittel:'Ned 0,5 kg',      beskrivelse:'Gå ned 0,5 kg denne uken',            maal:1,     enhet:'kg',       emoji:'⚖️', sjeldenhet:'episk' },
  { tittel:'Planke 2 min',    beskrivelse:'Hold planke i 2 minutter totalt',      maal:120,   enhet:'sek',      emoji:'💪', sjeldenhet:'sjelden' },
  { tittel:'20 min gange',    beskrivelse:'Gå en tur på minst 20 minutter',       maal:20,    enhet:'min',      emoji:'🚶', sjeldenhet:'vanlig' },
  { tittel:'Push-up streak',  beskrivelse:'Gjør 100 push-ups fordelt på dagen',   maal:100,   enhet:'push-ups', emoji:'🤸', sjeldenhet:'sjelden' },
  { tittel:'Proteinrik dag',  beskrivelse:'Spis protein til hvert måltid i dag',  maal:3,     enhet:'måltider', emoji:'🥩', sjeldenhet:'vanlig' },
  { tittel:'5 km løping',     beskrivelse:'Løp 5 kilometer denne uken',           maal:5,     enhet:'km',       emoji:'🏃', sjeldenhet:'sjelden' },
  { tittel:'Ny pers',         beskrivelse:'Sett ny personlig rekord',             maal:1,     enhet:'pers',     emoji:'🏆', sjeldenhet:'episk' },
  { tittel:'100 kg benk',     beskrivelse:'Løft 100 kg i benkpress',              maal:100,   enhet:'kg',       emoji:'🏋️', sjeldenhet:'episk' },
]

const BELONNINGER = [
  { navn: 'Bronse-mester', ikon: '🥉', farge: '#cd7f32' },
  { navn: 'Sølv-mester', ikon: '🥈', farge: '#c0c0c0' },
  { navn: 'Gull-mester', ikon: '🥇', farge: '#ffd700' },
  { navn: 'Vann-mester', ikon: '💧', farge: '#00f5ff' },
  { navn: 'Skritt-mester', ikon: '👣', farge: '#8B4513' },
  { navn: 'Stål-mester', ikon: '⚡', farge: '#b44eff' },
  { navn: 'Utholdenhet', ikon: '🔥', farge: '#ff8c00' },
  { navn: 'Muskel-mester', ikon: '💪', farge: '#ff4488' },
]

function getUkensUtfordringer(ukeNr: number, mal: string) {
  const seed = ukeNr * 7 + (mal === 'ned_i_vekt' ? 1 : mal === 'bygge_muskler' ? 2 : 3)
  const pool = mal === 'ned_i_vekt'
    ? UTFORDRINGER_POOL.filter(u => ['💧','👣','⚖️','🚶','🚫'].includes(u.emoji))
    : mal === 'bygge_muskler'
    ? UTFORDRINGER_POOL.filter(u => ['🏋️','💪','🤸','🥩','🧘','🏆'].includes(u.emoji))
    : UTFORDRINGER_POOL
  
  return [...pool]
    .sort((a, b) => ((seed * a.tittel.length * 31) % pool.length) - ((seed * b.tittel.length * 17) % pool.length))
    .slice(0, 5)
    .map(u => ({
      ...u,
      sjeldenhet: u.sjeldenhet as 'vanlig' | 'sjelden' | 'episk',
      belonning: BELONNINGER[Math.floor(Math.abs(seed + u.tittel.length) % BELONNINGER.length)]
    }))
}

export default function UtfordringerPage() {
  const { data: user } = useUser()
  const [isClient, setIsClient] = useState(false)
  const [utfordringer, setUtfordringer] = useState<Utfordring[]>([])
  const [valgtUke, setValgtUke] = useState<number>(0)
  const [historiskeUtfordringer, setHistoriskeUtfordringer] = useState<Record<number, Utfordring[]>>({})
  const [poeng, setPoeng] = useState<number>(0)
  const [nivaa, setNivaa] = useState<number>(1)
  const [ukeNummer, setUkeNummer] = useState<string>('')

  useEffect(() => {
    setIsClient(true)
    setUkeNummer(format(new Date(), 'w', { locale: nb }))
    
    const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    setValgtUke(ukeNr)
    
    const hentData = async () => {
      if (!user?.id) return
      
      const { data: profil } = await createClient()
        .from('profiler')
        .select('mal')
        .eq('id', user.id)
        .single()
      
      const mal = profil?.mal || 'bygge_muskler'
      const ukens = getUkensUtfordringer(ukeNr, mal)
      
      const lagret = JSON.parse(localStorage.getItem(`utfordringer_${ukeNr}`) ?? '{}')
      const oppdatert = ukens.map((u, i) => ({
        ...u,
        id: `${ukeNr}_${i}`,
        fullfort: lagret[i]?.fullfort ?? false,
        fremgang: lagret[i]?.fremgang ?? 0,
        sjeldenhet: u.sjeldenhet,
      }))
      
      setUtfordringer(oppdatert)
      
      const historikkData: Record<number, Utfordring[]> = {}
      for (let i = 1; i <= 4; i++) {
        const gammelUke = ukeNr - i
        const gammelLagret = JSON.parse(localStorage.getItem(`utfordringer_${gammelUke}`) ?? '{}')
        if (Object.keys(gammelLagret).length > 0) {
          const gammelMal = mal
          const gammelListe = getUkensUtfordringer(gammelUke, gammelMal)
          historikkData[gammelUke] = gammelListe.map((u, idx) => ({
            ...u,
            id: `${gammelUke}_${idx}`,
            fullfort: gammelLagret[idx]?.fullfort ?? false,
            fremgang: gammelLagret[idx]?.fremgang ?? 0,
            sjeldenhet: u.sjeldenhet,
          }))
        }
      }
      setHistoriskeUtfordringer(historikkData)
      
      let totalPoeng = 0
      for (let i = 0; i <= 10; i++) {
        const ukeData = JSON.parse(localStorage.getItem(`utfordringer_${ukeNr - i}`) ?? '{}')
        Object.values(ukeData).forEach((u: any) => {
          if (u.fullfort) totalPoeng += 10
        })
      }
      setPoeng(totalPoeng)
      setNivaa(Math.floor(totalPoeng / 50) + 1)
    }
    
    hentData()
  }, [user])

  const toggleUtfordring = (idx: number, fremgang: number) => {
    const oppdatert = utfordringer.map((u, i) => {
      if (i !== idx) return u
      const nyF = Math.min(fremgang, u.maal)
      return { ...u, fremgang: nyF, fullfort: nyF >= u.maal }
    })
    
    setUtfordringer(oppdatert)
    
    const lagret: any = {}
    oppdatert.forEach((u, i) => { 
      lagret[i] = { fullfort: u.fullfort, fremgang: u.fremgang } 
    })
    localStorage.setItem(`utfordringer_${valgtUke}`, JSON.stringify(lagret))
    
    const fullfortNaa = oppdatert[idx].fullfort && !utfordringer[idx].fullfort
    if (fullfortNaa) {
      setPoeng(p => p + 10)
      setNivaa(Math.floor((poeng + 10) / 50) + 1)
    }
  }

  const alleFullfort = utfordringer.length > 0 && utfordringer.every(u => u.fullfort)
  const prosentFullfort = utfordringer.length > 0 
    ? Math.round((utfordringer.filter(u => u.fullfort).length / utfordringer.length) * 100)
    : 0
  const prosentTilNesteNivaa = (poeng % 50) / 50 * 100

  const getSjeldenhetFarge = (sjeldenhet?: string) => {
    switch(sjeldenhet) {
      case 'vanlig': return '#a0a0a0'
      case 'sjelden': return '#b44eff'
      case 'episk': return '#ff8c00'
      default: return '#a0a0a0'
    }
  }

  if (!isClient) {
    return (
      <div className="utf-page anim-fade-up" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner-lg" />
      </div>
    )
  }

  return (
    <div className="utf-page anim-fade-up" suppressHydrationWarning>
      {/* Header med nivå og poeng */}
      <div className="utf-header glass-card">
        <div className="utf-header-left">
          <h1 className="page-title">🏆 Utfordringer</h1>
          <p className="page-subtitle">Fullfør ukentlige utfordringer og tjen belønninger</p>
        </div>
        <div className="utf-level-card">
          <div className="utf-level-info">
            <span className="utf-level-badge">Nivå {nivaa}</span>
            <span className="utf-level-poeng">{poeng} poeng</span>
          </div>
          <div className="utf-level-progress">
            <div className="utf-level-progress-bar" style={{ width: `${prosentTilNesteNivaa}%` }} />
          </div>
          <div className="utf-level-next">{50 - (poeng % 50)} poeng til nivå {nivaa + 1}</div>
        </div>
      </div>

      {/* Ukens utfordringer med fremdrift */}
      <div className="utf-uke-card glass-card">
        <div className="utf-uke-header">
          <div>
            <h2 className="utf-uke-tittel">Uke {ukeNummer}</h2>
            <p className="utf-uke-sub">Nye utfordringer hver mandag</p>
          </div>
          <div className="utf-uke-progress-circle">
            <svg width="60" height="60" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--cyan)"
                strokeWidth="3"
                strokeDasharray={`${prosentFullfort}, 100`}
              />
              <text x="18" y="20.5" textAnchor="middle" fill="#fff" fontSize="6">
                {prosentFullfort}%
              </text>
            </svg>
          </div>
        </div>

        {alleFullfort && (
          <div className="utf-feiring glass-card">
            <div className="utf-feiring-em">🏆</div>
            <div>
              <div className="utf-feiring-tittel">Utrolig! Du fullførte ALLE ukens utfordringer!</div>
              <div className="utf-feiring-sub">+50 poeng · Nye utfordringer venter neste uke</div>
            </div>
          </div>
        )}

        <div className="utf-liste">
          {utfordringer.map((u, i) => {
            const prosent = Math.min(100, Math.round((u.fremgang / u.maal) * 100))
            const sjeldenhetFarge = getSjeldenhetFarge(u.sjeldenhet)
            
            return (
              <div key={u.id} className={`utf-kort glass-card ${u.fullfort ? 'utf-done' : ''}`}>
                <div className="utf-kort-header">
                  <div className="utf-kort-em" style={{ background: `${sjeldenhetFarge}20` }}>
                    {u.emoji}
                  </div>
                  <div className="utf-kort-info">
                    <div className="utf-kort-tittel">{u.tittel}</div>
                    <div className="utf-kort-besk">{u.beskrivelse}</div>
                  </div>
                  {u.sjeldenhet && (
                    <div className="utf-kort-sjeldenhet" style={{ color: sjeldenhetFarge }}>
                      {u.sjeldenhet === 'episk' ? '🌟' : u.sjeldenhet === 'sjelden' ? '✨' : '·'}
                    </div>
                  )}
                </div>

                <div className="utf-kort-fremdrift">
                  <div className="utf-fremdrift-bar-bg">
                    <div className="utf-fremdrift-bar-fill" style={{ width: `${prosent}%` }} />
                  </div>
                  <span className="utf-fremdrift-tekst">
                    {u.fremgang} / {u.maal} {u.enhet}
                  </span>
                </div>

                <div className="utf-kontroller">
                  {u.maal > 1000 ? (
                    <div className="utf-slider-wrapper">
                      <input
                        type="range"
                        min="0"
                        max={u.maal}
                        value={u.fremgang}
                        onChange={(e) => toggleUtfordring(i, parseInt(e.target.value))}
                        className="utf-slider"
                      />
                      <button
                        className="utf-fullfor-knapp"
                        onClick={() => toggleUtfordring(i, u.maal)}
                        disabled={u.fullfort}
                      >
                        Fullfør
                      </button>
                    </div>
                  ) : (
                    <div className="utf-knapper">
                      <button
                        className="utf-minus-knapp"
                        onClick={() => toggleUtfordring(i, Math.max(0, u.fremgang - 1))}
                        disabled={u.fullfort}
                      >
                        −
                      </button>
                      <button
                        className="utf-plus-knapp"
                        onClick={() => toggleUtfordring(i, u.fremgang + 1)}
                        disabled={u.fullfort}
                      >
                        +
                      </button>
                      <button
                        className="utf-fullfor-knapp"
                        onClick={() => toggleUtfordring(i, u.maal)}
                        disabled={u.fullfort}
                      >
                        Fullfør 🎉
                      </button>
                    </div>
                  )}
                </div>

                {u.fullfort && u.belonning && (
                  <div className="utf-belonning" style={{ background: `${u.belonning.farge}15` }}>
                    <span className="utf-belonning-ikon">{u.belonning.ikon}</span>
                    <span className="utf-belonning-tekst">Belønning: {u.belonning.navn}</span>
                    <span className="utf-belonning-poeng">+10 poeng</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tidligere uker */}
      {Object.keys(historiskeUtfordringer).length > 0 && (
        <div className="utf-historikk glass-card">
          <h2 className="utf-historikk-tittel">📜 Tidligere uker</h2>
          <div className="utf-historikk-grid">
            {Object.entries(historiskeUtfordringer).map(([uke, utfordringer]) => {
              const fullforte = utfordringer.filter(u => u.fullfort).length
              return (
                <div key={uke} className="utf-historikk-kort">
                  <div className="utf-historikk-header">
                    <span className="utf-historikk-uke">Uke {uke}</span>
                    <span className="utf-historikk-status">
                      {fullforte}/{utfordringer.length} fullført
                    </span>
                  </div>
                  <div className="utf-historikk-progress">
                    <div className="utf-historikk-progress-bar" 
                         style={{ width: `${(fullforte / utfordringer.length) * 100}%` }} />
                  </div>
                  <div className="utf-historikk-belonninger">
                    {utfordringer.filter(u => u.fullfort && u.belonning).map((u, idx) => (
                      <span key={idx} className="utf-historikk-belonning" 
                            style={{ background: u.belonning?.farge }}>
                        {u.belonning?.ikon}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        .utf-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .utf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .utf-level-card {
          background: rgba(0,245,255,0.1);
          border: 1px solid rgba(0,245,255,0.2);
          border-radius: 12px;
          padding: 1rem;
          min-width: 200px;
        }
        .utf-level-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .utf-level-badge {
          background: var(--cyan);
          color: #000;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .utf-level-poeng {
          color: #fff;
          font-weight: 600;
        }
        .utf-level-progress {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }
        .utf-level-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--cyan), var(--purple));
          transition: width 0.3s ease;
        }
        .utf-level-next {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
        }
        .utf-uke-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .utf-uke-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .utf-uke-tittel {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff;
        }
        .utf-uke-sub {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
        }
        .utf-liste {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .utf-kort {
          padding: 1.25rem;
          transition: all 0.3s ease;
        }
        .utf-done {
          border-color: rgba(0,255,136,0.3) !important;
          background: rgba(0,255,136,0.05) !important;
        }
        .utf-kort-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .utf-kort-em {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .utf-kort-info {
          flex: 1;
        }
        .utf-kort-tittel {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.25rem;
        }
        .utf-kort-besk {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
        }
        .utf-kort-sjeldenhet {
          font-size: 1.2rem;
        }
        .utf-kort-fremdrift {
          margin-bottom: 1rem;
        }
        .utf-fremdrift-bar-bg {
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }
        .utf-fremdrift-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--cyan), var(--purple));
          transition: width 0.3s ease;
        }
        .utf-fremdrift-tekst {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
        }
        .utf-kontroller {
          display: flex;
          gap: 0.5rem;
        }
        .utf-slider-wrapper {
          display: flex;
          gap: 0.5rem;
          width: 100%;
        }
        .utf-slider {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          outline: none;
        }
        .utf-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--cyan);
          cursor: pointer;
          box-shadow: 0 0 10px var(--cyan);
        }
        .utf-knapper {
          display: flex;
          gap: 0.5rem;
          width: 100%;
        }
        .utf-minus-knapp, .utf-plus-knapp {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .utf-minus-knapp:hover, .utf-plus-knapp:hover {
          background: rgba(255,255,255,0.1);
        }
        .utf-fullfor-knapp {
          flex: 1;
          padding: 0.5rem;
          border-radius: 8px;
          border: none;
          background: var(--cyan);
          color: #000;
          font-weight: 600;
          cursor: pointer;
        }
        .utf-fullfor-knapp:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .utf-belonning {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .utf-belonning-ikon {
          font-size: 1.2rem;
        }
        .utf-belonning-tekst {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
        }
        .utf-belonning-poeng {
          font-size: 0.8rem;
          color: var(--green);
        }
        .utf-feiring {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          background: rgba(255,215,0,0.1) !important;
          border-color: rgba(255,215,0,0.3) !important;
        }
        .utf-feiring-em {
          font-size: 3rem;
        }
        .utf-feiring-tittel {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffd700;
          margin-bottom: 0.25rem;
        }
        .utf-feiring-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
        }
        .utf-historikk {
          padding: 1.5rem;
        }
        .utf-historikk-tittel {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
        }
        .utf-historikk-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .utf-historikk-kort {
          padding: 1rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .utf-historikk-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .utf-historikk-uke {
          font-weight: 600;
          color: #fff;
        }
        .utf-historikk-status {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
        }
        .utf-historikk-progress {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }
        .utf-historikk-progress-bar {
          height: 100%;
          background: var(--cyan);
          transition: width 0.3s ease;
        }
        .utf-historikk-belonninger {
          display: flex;
          gap: 0.25rem;
        }
        .utf-historikk-belonning {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  )
}