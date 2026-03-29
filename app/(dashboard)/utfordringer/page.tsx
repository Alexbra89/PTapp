'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useSupabaseQuery'

// ─── MANUELLE UTFORDRINGER (krever bruker-input) ──────────────────────────────
const MANUELLE_UTFORDRINGER = [
  { id: 'skritt', tittel: '10.000 skritt', beskrivelse: 'Gå 10.000 skritt i dag', maal: 10000, enhet: 'skritt', emoji: '👣', kategori: 'helse', sjeldenhet: 'vanlig' },
  { id: 'vann', tittel: 'Drikk 2,5L vann', beskrivelse: 'Drikk 2,5 liter vann i dag', maal: 2500, enhet: 'ml', emoji: '💧', kategori: 'helse', sjeldenhet: 'vanlig' },
  { id: 'sovn', tittel: 'Sov 7+ timer', beskrivelse: 'Sov minst 7 timer i natt', maal: 7, enhet: 'timer', emoji: '😴', kategori: 'helse', sjeldenhet: 'sjelden' },
  { id: 'strekk', tittel: 'Strekk 10 min', beskrivelse: 'Strekk deg i 10 minutter', maal: 10, enhet: 'min', emoji: '🧘', kategori: 'helse', sjeldenhet: 'vanlig' },
  { id: 'protein', tittel: 'Proteinrik dag', beskrivelse: 'Spis protein til alle måltider', maal: 3, enhet: 'måltider', emoji: '🥩', kategori: 'kosthold', sjeldenhet: 'vanlig' },
  { id: 'sukker', tittel: 'Ingen sukker', beskrivelse: 'Unngå sukker i dag', maal: 1, enhet: 'dag', emoji: '🚫', kategori: 'kosthold', sjeldenhet: 'sjelden' },
  { id: 'planke', tittel: 'Planke 2 min', beskrivelse: 'Hold planke i 2 minutter totalt', maal: 120, enhet: 'sek', emoji: '💪', kategori: 'styrke', sjeldenhet: 'sjelden' },
  { id: 'gange', tittel: '20 min gange', beskrivelse: 'Gå en tur på minst 20 minutter', maal: 20, enhet: 'min', emoji: '🚶', kategori: 'kondisjon', sjeldenhet: 'vanlig' },
]

// ─── AUTOMATISKE UTFORDRINGER (henter data fra databasen) ─────────────────────
const AUTOMATISKE_UTFORDRINGER = [
  { id: 'workouts_5', tittel: 'Nykommer', beskrivelse: 'Fullfør 5 treningsøkter totalt', maal: 5, enhet: 'økter', emoji: '🌟', kategori: 'konsistens', sjeldenhet: 'vanlig', krav_type: 'okter' },
  { id: 'workouts_20', tittel: 'Bruker', beskrivelse: 'Fullfør 20 treningsøkter totalt', maal: 20, enhet: 'økter', emoji: '⭐', kategori: 'konsistens', sjeldenhet: 'vanlig', krav_type: 'okter' },
  { id: 'workouts_50', tittel: 'Entusiast', beskrivelse: 'Fullfør 50 treningsøkter totalt', maal: 50, enhet: 'økter', emoji: '🔥', kategori: 'konsistens', sjeldenhet: 'sjelden', krav_type: 'okter' },
  { id: 'workouts_100', tittel: 'Veteran', beskrivelse: 'Fullfør 100 treningsøkter totalt', maal: 100, enhet: 'økter', emoji: '🏅', kategori: 'konsistens', sjeldenhet: 'episk', krav_type: 'okter' },
  { id: 'kg_5000', tittel: 'Jernmann', beskrivelse: 'Løft totalt 5.000 kg', maal: 5000, enhet: 'kg', emoji: '🏋️', kategori: 'styrke', sjeldenhet: 'vanlig', krav_type: 'kg' },
  { id: 'kg_10000', tittel: 'Sterkmann', beskrivelse: 'Løft totalt 10.000 kg', maal: 10000, enhet: 'kg', emoji: '💪', kategori: 'styrke', sjeldenhet: 'sjelden', krav_type: 'kg' },
  { id: 'kg_25000', tittel: 'Legende', beskrivelse: 'Løft totalt 25.000 kg', maal: 25000, enhet: 'kg', emoji: '🏆', kategori: 'styrke', sjeldenhet: 'episk', krav_type: 'kg' },
  { id: 'streak_7', tittel: 'Disiplinert', beskrivelse: '7 dagers treningsstreak', maal: 7, enhet: 'dager', emoji: '🔥', kategori: 'konsistens', sjeldenhet: 'sjelden', krav_type: 'streak' },
  { id: 'streak_14', tittel: 'Utholdende', beskrivelse: '14 dagers treningsstreak', maal: 14, enhet: 'dager', emoji: '⚡', kategori: 'konsistens', sjeldenhet: 'episk', krav_type: 'streak' },
  { id: 'streak_30', tittel: 'Legendarisk', beskrivelse: '30 dagers treningsstreak', maal: 30, enhet: 'dager', emoji: '👑', kategori: 'konsistens', sjeldenhet: 'episk', krav_type: 'streak' },
  { id: 'volume_5k', tittel: 'Volume Hunter', beskrivelse: 'Løft 5.000 kg på én uke', maal: 5000, enhet: 'kg', emoji: '📈', kategori: 'prestasjon', sjeldenhet: 'sjelden', krav_type: 'volum_uke' },
  { id: 'volume_10k', tittel: 'Volume Monster', beskrivelse: 'Løft 10.000 kg på én uke', maal: 10000, enhet: 'kg', emoji: '🦖', kategori: 'prestasjon', sjeldenhet: 'episk', krav_type: 'volum_uke' },
  { id: 'full_body', tittel: 'Full kropp', beskrivelse: 'Tren alle muskelgrupper (bryst, rygg, bein, skuldre, armer, core)', maal: 6, enhet: 'grupper', emoji: '🧬', kategori: 'prestasjon', sjeldenhet: 'sjelden', krav_type: 'alle_muskler' },
  { id: 'leg_day', tittel: 'Leg day lover', beskrivelse: 'Tren bein 3 ganger på én uke', maal: 3, enhet: 'ganger', emoji: '🦵', kategori: 'prestasjon', sjeldenhet: 'sjelden', krav_type: 'bein_uke' },
]

interface Utfordring {
  id: string
  tittel: string
  beskrivelse: string
  maal: number
  enhet: string
  emoji: string
  kategori: string
  sjeldenhet: 'vanlig' | 'sjelden' | 'episk'
  fullfort: boolean
  fremgang: number
  automatisk: boolean
  krav_type?: string
}

export default function UtfordringerPage() {
  const supabase = createClient()
  const { data: user, isLoading: userLaster } = useUser()
  const [utfordringer, setUtfordringer] = useState<Utfordring[]>([])
  const [poeng, setPoeng] = useState<number>(0)
  const [nivaa, setNivaa] = useState<number>(1)
  const [laster, setLaster] = useState(true)
  const [aktivKategori, setAktivKategori] = useState('alle')
  const [isClient, setIsClient] = useState(false)

  // Sett isClient til true når komponenten mountes
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Hent automatiske data fra databasen
  useEffect(() => {
    if (!user?.id) return

    const hentDataOgBeregn = async () => {
      setLaster(true)

      // Hent treningslogger
      const { data: logger } = await supabase
        .from('treningslogger')
        .select('*')
        .eq('bruker_id', user.id)

      // Hent okter
      const { data: okter } = await supabase
        .from('okter')
        .select('*')
        .eq('bruker_id', user.id)
        .order('dato', { ascending: true })

      // Beregn total kg
      let totalKg = 0
      if (logger) {
        for (const logg of logger) {
          if (logg.sett && Array.isArray(logg.sett)) {
            for (const sett of logg.sett) {
              const vekt = sett.vekt || sett.kg || 0
              const reps = sett.reps || 0
              totalKg += vekt * reps
            }
          }
        }
      }

      // Beregn streak
      let streak = 0
      if (okter && okter.length > 0) {
        const datoer = new Set(okter.map(o => o.dato))
        let currentDate = new Date()
        currentDate.setHours(0, 0, 0, 0)
        for (let i = 0; i < 60; i++) {
          const datoStr = currentDate.toISOString().split('T')[0]
          if (datoer.has(datoStr)) {
            streak++
            currentDate.setDate(currentDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      // Beregn uke-volum (siste 7 dager)
      const ukeStart = new Date()
      ukeStart.setDate(ukeStart.getDate() - 7)
      let ukeKg = 0
      if (logger) {
        for (const logg of logger) {
          if (new Date(logg.dato) >= ukeStart && logg.sett) {
            for (const sett of logg.sett) {
              const vekt = sett.vekt || sett.kg || 0
              const reps = sett.reps || 0
              ukeKg += vekt * reps
            }
          }
        }
      }

      // Tell muskelgrupper
      const muskelgrupper = new Set<string>()
      let legCount = 0
      if (logger) {
        for (const logg of logger) {
          if (logg.muskelgruppe) {
            const muskelListe = logg.muskelgruppe.split(',').map((m: string) => m.trim().toLowerCase())
            muskelListe.forEach((m: string) => muskelgrupper.add(m))
            if (muskelListe.some((m: string) => m.includes('bein') || m.includes('leg') || m.includes('quad') || m.includes('hamstring'))) {
              legCount++
            }
          }
        }
      }

      // Bygg automatiske utfordringer med fremgang
      const automatiskeMedFremgang = AUTOMATISKE_UTFORDRINGER.map(uf => {
        let fremgang = 0
        switch (uf.krav_type) {
          case 'okter': fremgang = okter?.length || 0; break
          case 'kg': fremgang = totalKg; break
          case 'streak': fremgang = streak; break
          case 'volum_uke': fremgang = ukeKg; break
          case 'alle_muskler': fremgang = muskelgrupper.size; break
          case 'bein_uke': fremgang = legCount; break
          default: fremgang = 0
        }
        const fullfort = fremgang >= uf.maal
        return {
          ...uf,
          id: `auto_${uf.id}`,
          kategori: uf.kategori,
          sjeldenhet: uf.sjeldenhet as 'vanlig' | 'sjelden' | 'episk',
          fullfort,
          fremgang: Math.min(fremgang, uf.maal),
          automatisk: true,
        }
      })

      // Hent lagrede manuelle utfordringer fra localStorage
      const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
      let lagretManuelle: any = {}
      try {
        const lagret = localStorage.getItem(`manuelle_utfordringer_${ukeNr}`)
        if (lagret) {
          lagretManuelle = JSON.parse(lagret)
        }
      } catch (e) {
        console.error('Kunne ikke hente fra localStorage', e)
      }
      
      const manuelleMedStatus = MANUELLE_UTFORDRINGER.map((uf, i) => ({
        ...uf,
        id: `man_${uf.id}`,
        kategori: uf.kategori,
        sjeldenhet: uf.sjeldenhet as 'vanlig' | 'sjelden' | 'episk',
        fullfort: lagretManuelle[i]?.fullfort ?? false,
        fremgang: lagretManuelle[i]?.fremgang ?? 0,
        automatisk: false,
      }))

      // Kombiner og sorter
      const alle = [...automatiskeMedFremgang, ...manuelleMedStatus]
      const sortert = alle.sort((a, b) => {
        if (a.fullfort === b.fullfort) return 0
        return a.fullfort ? 1 : -1
      })

      // Beregn poeng
      let totalPoeng = 0
      for (let i = 0; i <= 4; i++) {
        try {
          const ukeData = JSON.parse(localStorage.getItem(`manuelle_utfordringer_${ukeNr - i}`) ?? '{}')
          Object.values(ukeData).forEach((u: any) => {
            if (u.fullfort) totalPoeng += 10
          })
        } catch (e) {}
      }
      // Legg til poeng for automatiske fullførte
      totalPoeng += automatiskeMedFremgang.filter(u => u.fullfort).length * 20

      setUtfordringer(sortert)
      setPoeng(totalPoeng)
      setNivaa(Math.floor(totalPoeng / 50) + 1)
      setLaster(false)
    }

    hentDataOgBeregn()
  }, [user?.id, supabase])

  // Oppdater manuell utfordring
  const toggleManuellUtfordring = (idx: number, nyFremgang: number) => {
    const ukeNr = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    const oppdatert = utfordringer.map((u, i) => {
      if (i !== idx || u.automatisk) return u
      const nyF = Math.min(nyFremgang, u.maal)
      const nyFullfort = nyF >= u.maal
      return { ...u, fremgang: nyF, fullfort: nyFullfort }
    })
    setUtfordringer(oppdatert)

    // Lagre til localStorage
    const lagret: any = {}
    oppdatert.forEach((u, i) => {
      if (!u.automatisk) {
        lagret[i] = { fullfort: u.fullfort, fremgang: u.fremgang }
      }
    })
    localStorage.setItem(`manuelle_utfordringer_${ukeNr}`, JSON.stringify(lagret))

    // Oppdater poeng hvis nettopp fullført
    const bleFullfort = oppdatert[idx].fullfort && !utfordringer[idx].fullfort
    if (bleFullfort) {
      setPoeng(p => p + 10)
      setNivaa(Math.floor((poeng + 10) / 50) + 1)
    }
  }

  const getSjeldenhetFarge = (sjeldenhet?: string) => {
    switch(sjeldenhet) {
      case 'vanlig': return '#a0a0a0'
      case 'sjelden': return '#b44eff'
      case 'episk': return '#ff8c00'
      default: return '#a0a0a0'
    }
  }

  const kategorier = ['alle', 'styrke', 'konsistens', 'prestasjon', 'helse', 'kosthold', 'kondisjon']
  const katEmoji: Record<string, string> = {
    styrke: '🏋️', konsistens: '🔥', prestasjon: '🏆', helse: '💚', kosthold: '🥗', kondisjon: '🏃'
  }

  const filtrerte = aktivKategori === 'alle'
    ? utfordringer
    : utfordringer.filter(u => u.kategori === aktivKategori)

  const prosentTilNesteNivaa = (poeng % 50) / 50 * 100

  // Vis spinner mens vi laster
  if (userLaster || laster || !isClient) {
    return (
      <div className="utf-page anim-fade-up" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
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
          <p className="page-subtitle">Fullfør utfordringer og tjen belønninger</p>
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

      {/* Kategori-filter */}
      <div className="utf-kategori-filter glass-card">
        {kategorier.map(kat => (
          <button
            key={kat}
            className={`utf-kategori-btn ${aktivKategori === kat ? 'active' : ''}`}
            onClick={() => setAktivKategori(kat)}
          >
            {kat === 'alle' ? '📋 Alle' : `${katEmoji[kat]} ${kat.charAt(0).toUpperCase() + kat.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Utfordringsliste */}
      <div className="utf-liste">
        {filtrerte.length === 0 ? (
          <div className="utf-empty" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
            <div>Ingen utfordringer i denne kategorien</div>
          </div>
        ) : (
          filtrerte.map((u, idx) => {
            const prosent = Math.min(100, Math.round((u.fremgang / u.maal) * 100))
            const sjeldenhetFarge = getSjeldenhetFarge(u.sjeldenhet)
            const erAutomatisk = u.automatisk

            return (
              <div key={u.id} className={`utf-kort glass-card ${u.fullfort ? 'utf-done' : ''}`}>
                <div className="utf-kort-header">
                  <div className="utf-kort-em" style={{ background: `${sjeldenhetFarge}20` }}>
                    {u.emoji}
                  </div>
                  <div className="utf-kort-info">
                    <div className="utf-kort-tittel">
                      {u.tittel}
                      {erAutomatisk && <span className="utf-auto-badge">🤖 Auto</span>}
                    </div>
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
                    {u.fremgang.toLocaleString('no')} / {u.maal.toLocaleString('no')} {u.enhet}
                  </span>
                </div>

                {!erAutomatisk && (
                  <div className="utf-kontroller">
                    {u.maal > 1000 ? (
                      <div className="utf-slider-wrapper">
                        <input
                          type="range"
                          min="0"
                          max={u.maal}
                          value={u.fremgang}
                          onChange={(e) => toggleManuellUtfordring(idx, parseInt(e.target.value))}
                          className="utf-slider"
                          disabled={u.fullfort}
                        />
                        <button
                          className="utf-fullfor-knapp"
                          onClick={() => toggleManuellUtfordring(idx, u.maal)}
                          disabled={u.fullfort}
                        >
                          Fullfør
                        </button>
                      </div>
                    ) : (
                      <div className="utf-knapper">
                        <button
                          className="utf-minus-knapp"
                          onClick={() => toggleManuellUtfordring(idx, Math.max(0, u.fremgang - 1))}
                          disabled={u.fullfort}
                        >
                          −
                        </button>
                        <button
                          className="utf-plus-knapp"
                          onClick={() => toggleManuellUtfordring(idx, u.fremgang + 1)}
                          disabled={u.fullfort}
                        >
                          +
                        </button>
                        <button
                          className="utf-fullfor-knapp"
                          onClick={() => toggleManuellUtfordring(idx, u.maal)}
                          disabled={u.fullfort}
                        >
                          Fullfør 🎉
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {u.fullfort && (
                  <div className="utf-belonning">
                    <span className="utf-belonning-ikon">🏆</span>
                    <span className="utf-belonning-tekst">
                      {erAutomatisk ? `+20 poeng for å fullføre "${u.tittel}"!` : `+10 poeng for å fullføre "${u.tittel}"!`}
                    </span>
                    <span className="utf-belonning-poeng">{erAutomatisk ? '+20' : '+10'} poeng</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`
        .utf-page { max-width: 900px; margin: 0 auto; }
        .utf-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
        .utf-level-card { background: rgba(0,245,255,0.1); border: 1px solid rgba(0,245,255,0.2); border-radius: 12px; padding: 1rem; min-width: 200px; }
        .utf-level-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .utf-level-badge { background: var(--cyan); color: #000; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
        .utf-level-poeng { color: #fff; font-weight: 600; }
        .utf-level-progress { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-bottom: 0.5rem; overflow: hidden; }
        .utf-level-progress-bar { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--purple)); transition: width 0.3s ease; }
        .utf-level-next { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
        .utf-kategori-filter { display: flex; gap: 6px; flex-wrap: wrap; padding: 0.75rem; margin-bottom: 1rem; }
        .utf-kategori-btn { padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.15s; font-family: var(--font-body); }
        .utf-kategori-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
        .utf-kategori-btn.active { background: rgba(0,245,255,0.12); border-color: rgba(0,245,255,0.35); color: var(--cyan); }
        .utf-liste { display: flex; flex-direction: column; gap: 1rem; }
        .utf-kort { padding: 1.25rem; transition: all 0.3s ease; }
        .utf-done { border-color: rgba(0,255,136,0.3) !important; background: rgba(0,255,136,0.05) !important; }
        .utf-kort-header { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .utf-kort-em { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
        .utf-kort-info { flex: 1; }
        .utf-kort-tittel { font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: #fff; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .utf-auto-badge { font-size: 0.6rem; background: rgba(0,245,255,0.15); border: 1px solid rgba(0,245,255,0.25); color: var(--cyan); padding: 2px 6px; border-radius: 999px; font-weight: 400; }
        .utf-kort-besk { font-size: 0.8rem; color: rgba(255,255,255,0.5); }
        .utf-kort-sjeldenhet { font-size: 1.2rem; }
        .utf-kort-fremdrift { margin-bottom: 1rem; }
        .utf-fremdrift-bar-bg { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 0.5rem; overflow: hidden; }
        .utf-fremdrift-bar-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--purple)); transition: width 0.3s ease; }
        .utf-fremdrift-tekst { font-size: 0.8rem; color: rgba(255,255,255,0.6); }
        .utf-kontroller { display: flex; gap: 0.5rem; }
        .utf-slider-wrapper { display: flex; gap: 0.5rem; width: 100%; }
        .utf-slider { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; }
        .utf-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--cyan); cursor: pointer; box-shadow: 0 0 10px var(--cyan); }
        .utf-knapper { display: flex; gap: 0.5rem; width: 100%; }
        .utf-minus-knapp, .utf-plus-knapp { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff; font-size: 1.2rem; cursor: pointer; }
        .utf-minus-knapp:hover, .utf-plus-knapp:hover { background: rgba(255,255,255,0.1); }
        .utf-fullfor-knapp { flex: 1; padding: 0.5rem; border-radius: 8px; border: none; background: var(--cyan); color: #000; font-weight: 600; cursor: pointer; }
        .utf-fullfor-knapp:disabled { opacity: 0.3; cursor: not-allowed; }
        .utf-belonning { margin-top: 1rem; padding: 0.75rem; border-radius: 8px; background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.15); display: flex; align-items: center; gap: 0.75rem; }
        .utf-belonning-ikon { font-size: 1.2rem; }
        .utf-belonning-tekst { flex: 1; font-size: 0.9rem; font-weight: 600; color: #fff; }
        .utf-belonning-poeng { font-size: 0.8rem; color: var(--green); }
        .utf-empty { text-align: center; padding: 3rem; color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  )
}