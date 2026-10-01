'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Footprints, Droplet, Moon, StretchHorizontal, Beef, CandyOff, Timer, Dumbbell, Flame, Trophy,
  TrendingUp, Layers, Check, Minus, Plus, Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useSupabaseQuery'
import { lokalDato } from '@/lib/dato'
import { TickRing } from '@/components/atelier/Dial'
import { TelleTall } from '@/components/atelier/TelleTall'

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
  kategori: string
  sjeldenhet: 'vanlig' | 'sjelden' | 'episk'
  fullfort: boolean
  fremgang: number
  automatisk: boolean
  krav_type?: string
}

// Linjeikoner i stedet for emojier – per utfordring, ellers per kategori
const IKON: Record<string, typeof Flame> = {
  man_skritt: Footprints, man_vann: Droplet, man_sovn: Moon, man_strekk: StretchHorizontal,
  man_protein: Beef, man_sukker: CandyOff, man_planke: Timer, man_gange: Footprints,
  okter: Layers, kg: Dumbbell, streak: Flame, volum_uke: TrendingUp, alle_muskler: Sparkles, bein_uke: Footprints,
}
const ikonFor = (u: Utfordring) => IKON[u.id] ?? (u.krav_type ? IKON[u.krav_type] : undefined) ?? Trophy

const SJELDENHET: Record<Utfordring['sjeldenhet'], string> = { vanlig: 'Vanlig', sjelden: 'Sjelden', episk: 'Episk' }
const POENG_AUTO = 20
const POENG_MANUELL = 10
const POENG_PER_NIVA = 50
const ukeNummer = () => Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

type Lagret = Record<string, { fullfort: boolean; fremgang: number }>
// Manuell fremgang lagres per id. Tidligere ble den lagret per posisjon i den sorterte listen
// og lest tilbake per posisjon i en annen liste – fremgangen havnet på feil utfordring.
const lesUke = (uke: number): Lagret => {
  try {
    const data = JSON.parse(localStorage.getItem(`manuelle_utfordringer_${uke}`) ?? '{}')
    return Object.fromEntries(Object.entries(data).filter(([k]) => k.startsWith('man_'))) as Lagret
  } catch { return {} }
}

export default function UtfordringerPage() {
  const supabase = createClient()
  const { data: user } = useUser()
  const [utfordringer, setUtfordringer] = useState<Utfordring[]>([])
  const [laster, setLaster] = useState(true)
  const [aktivKategori, setAktivKategori] = useState('alle')
  const [nettoFullfort, setNettoFullfort] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const hent = async () => {
      setLaster(true)
      const [{ data: logger }, { data: okterAlle }] = await Promise.all([
        supabase.from('treningslogger').select('dato, sett, muskelgruppe').eq('bruker_id', user.id),
        supabase.from('okter').select('dato, fullfort').eq('bruker_id', user.id),
      ])
      // Bare fullførte økter teller – planlagte økter er ikke gjennomført trening
      const okter = (okterAlle ?? []).filter((o: any) => o.fullfort === true)
      const volum = (l: any) => (Array.isArray(l.sett) ? l.sett : []).reduce((s: number, x: any) => s + (x.vekt || x.kg || 0) * (x.reps || 0), 0)
      const totalKg = (logger ?? []).reduce((s: number, l: any) => s + volum(l), 0)

      const datoer = new Set(okter.map((o: any) => o.dato))
      let streak = 0
      const d = new Date(); d.setHours(0, 0, 0, 0)
      if (!datoer.has(lokalDato(d))) d.setDate(d.getDate() - 1) // i dag teller ikke mot deg før dagen er over
      while (datoer.has(lokalDato(d)) && streak < 365) { streak++; d.setDate(d.getDate() - 1) }

      const ukeStart = new Date(); ukeStart.setDate(ukeStart.getDate() - 7)
      const denneUka = (logger ?? []).filter((l: any) => new Date(l.dato) >= ukeStart)
      const ukeKg = denneUka.reduce((s: number, l: any) => s + volum(l), 0)
      const erBein = (m: string) => /bein|leg|quad|hamstring|glute/.test(m)
      const beinUke = new Set(denneUka.filter((l: any) => erBein((l.muskelgruppe ?? '').toLowerCase())).map((l: any) => l.dato)).size
      const grupper = new Set<string>()
      for (const l of logger ?? []) for (const m of String(l.muskelgruppe ?? '').toLowerCase().split(',')) {
        const t = m.trim()
        if (/pec|bryst/.test(t)) grupper.add('bryst')
        else if (/lat|rygg|rhomb|erector/.test(t)) grupper.add('rygg')
        else if (erBein(t)) grupper.add('bein')
        else if (/delt|skuld/.test(t)) grupper.add('skuldre')
        else if (/bicep|tricep|underarm/.test(t)) grupper.add('armer')
        else if (/core|mage|abdom|obliq/.test(t)) grupper.add('core')
      }

      const auto: Utfordring[] = AUTOMATISKE_UTFORDRINGER.map(({ emoji, ...uf }) => {
        const verdi = ({ okter: okter.length, kg: totalKg, streak, volum_uke: ukeKg, alle_muskler: grupper.size, bein_uke: beinUke } as Record<string, number>)[uf.krav_type] ?? 0
        return { ...uf, id: `auto_${uf.id}`, sjeldenhet: uf.sjeldenhet as Utfordring['sjeldenhet'], fullfort: verdi >= uf.maal, fremgang: Math.min(Math.round(verdi), uf.maal), automatisk: true }
      })
      const lagret = lesUke(ukeNummer())
      const manuelle: Utfordring[] = MANUELLE_UTFORDRINGER.map(({ emoji, ...uf }) => {
        const id = `man_${uf.id}`
        return { ...uf, id, sjeldenhet: uf.sjeldenhet as Utfordring['sjeldenhet'], fullfort: lagret[id]?.fullfort ?? false, fremgang: lagret[id]?.fremgang ?? 0, automatisk: false }
      })
      setUtfordringer([...auto, ...manuelle])
      setLaster(false)
    }
    hent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const oppdater = (id: string, nyFremgang: number) => {
    setUtfordringer(liste => {
      const ny = liste.map(u => {
        if (u.id !== id || u.automatisk) return u
        const fremgang = Math.max(0, Math.min(nyFremgang, u.maal))
        const fullfort = fremgang >= u.maal
        if (fullfort && !u.fullfort) { setNettoFullfort(u.id); setTimeout(() => setNettoFullfort(null), 2400) }
        return { ...u, fremgang, fullfort }
      })
      const lagret: Lagret = {}
      for (const u of ny) if (!u.automatisk) lagret[u.id] = { fullfort: u.fullfort, fremgang: u.fremgang }
      try { localStorage.setItem(`manuelle_utfordringer_${ukeNummer()}`, JSON.stringify(lagret)) } catch {}
      return ny
    })
  }

  // Poeng: fullførte automatiske + manuelle de siste fem ukene
  const poengManuelle = (() => {
    if (typeof window === 'undefined') return 0
    let p = 0
    const naa = ukeNummer()
    for (let i = 1; i <= 4; i++) p += Object.values(lesUke(naa - i)).filter(u => u.fullfort).length * POENG_MANUELL
    return p + utfordringer.filter(u => !u.automatisk && u.fullfort).length * POENG_MANUELL
  })()
  const poeng = utfordringer.filter(u => u.automatisk && u.fullfort).length * POENG_AUTO + poengManuelle
  const nivaa = Math.floor(poeng / POENG_PER_NIVA) + 1
  const iNivaa = poeng % POENG_PER_NIVA

  const kategorier = ['alle', ...Array.from(new Set(utfordringer.map(u => u.kategori)))]
  const filtrerte = (aktivKategori === 'alle' ? utfordringer : utfordringer.filter(u => u.kategori === aktivKategori))
    .slice().sort((a, b) => Number(a.fullfort) - Number(b.fullfort) || (b.fremgang / b.maal) - (a.fremgang / a.maal))
  const antallFullfort = utfordringer.filter(u => u.fullfort).length

  if (laster) return null

  return (
    <div className="utf-page">
      <div className="page-header">
        <h1 className="page-title">Troféskapet<em className="gold">.</em></h1>
        <p className="page-subtitle">Milepæler som låses opp av seg selv · og ukens vaner</p>
      </div>

      <section className="utf-hero glass-card crop">
        <TickRing
          value={iNivaa} max={POENG_PER_NIVA} size={150}
          label={<span className="num-monument" style={{ fontSize: '3.4rem' }}><TelleTall verdi={nivaa} /></span>}
          sub="Nivå"
        />
        <div className="utf-hero-tall">
          <div><span className="eyebrow">Poeng</span><strong className="num-monument"><TelleTall verdi={poeng} forsinkelse={0.15} /></strong></div>
          <div><span className="eyebrow">Låst opp</span><strong className="num-monument"><TelleTall verdi={antallFullfort} forsinkelse={0.25} /><small>/{utfordringer.length}</small></strong></div>
          <p className="utf-hero-neste">{POENG_PER_NIVA - iNivaa} poeng til nivå {nivaa + 1}</p>
        </div>
      </section>

      <div className="bib-kategorier">
        {kategorier.map(k => (
          <button key={k} className={`bib-kat${aktivKategori === k ? ' on' : ''}`} onClick={() => setAktivKategori(k)}>
            {k === 'alle' ? 'Alle' : k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <div className="utf-grid">
        {filtrerte.map(u => {
          const Ikon = ikonFor(u)
          const pst = Math.min(100, Math.round((u.fremgang / u.maal) * 100))
          return (
            <motion.article key={u.id} layout className={`utf-kort glass-card ${u.sjeldenhet}${u.fullfort ? ' ferdig' : ''}`}>
              <div className="utf-kort-topp">
                <span className="utf-medalje"><Ikon size={20} strokeWidth={1.3} /></span>
                <span className="utf-merke">{u.automatisk ? 'Milepæl' : 'Ukens vane'} · {SJELDENHET[u.sjeldenhet]}</span>
              </div>
              <h3 className="utf-tittel">{u.tittel}</h3>
              <p className="utf-besk">{u.beskrivelse}</p>
              <div className="utf-fremdrift">
                <div className="tick-track"><div className="tick-fill" style={{ width: `${pst}%` }} /></div>
                <div className="utf-tall">
                  <span>{u.fremgang.toLocaleString('nb-NO')} / {u.maal.toLocaleString('nb-NO')} {u.enhet}</span>
                  <span className={u.fullfort ? 'gold' : ''}>{u.fullfort ? <><Check size={11} strokeWidth={2} /> +{u.automatisk ? POENG_AUTO : POENG_MANUELL}</> : `${pst}%`}</span>
                </div>
              </div>
              {!u.automatisk && !u.fullfort && (
                <div className="utf-kontroller">
                  {u.maal > 100 ? (
                    <input type="range" className="utf-slider" min={0} max={u.maal} step={u.maal / 20} value={u.fremgang}
                      onChange={e => oppdater(u.id, Number(e.target.value))} aria-label={u.tittel} />
                  ) : (
                    <span className="velger-stepper">
                      <button onClick={() => oppdater(u.id, u.fremgang - 1)} aria-label="Mindre"><Minus size={11} /></button>
                      <span className="mono">{u.fremgang}</span>
                      <button onClick={() => oppdater(u.id, u.fremgang + 1)} aria-label="Mer"><Plus size={11} /></button>
                    </span>
                  )}
                  <button className="btn btn-ghost utf-fullfor" onClick={() => oppdater(u.id, u.maal)}>Fullført</button>
                </div>
              )}
              <AnimatePresence>
                {nettoFullfort === u.id && (
                  <motion.div className="utf-feiring" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <span className="num-monument">+{POENG_MANUELL}</span><span className="eyebrow eyebrow-gold">poeng</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}
