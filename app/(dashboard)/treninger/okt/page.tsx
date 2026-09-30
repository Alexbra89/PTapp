'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { OVELSER as BIBLIOTEK, utvalg, type Ovelse } from '@/data/ovelsesbibliotek'
import { useUser, useLagreOkt, useSlettOkt, QK } from '@/hooks/useSupabaseQuery'
import ProgramMal from '../../kalender/ProgramMal'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Plus, Minus, Play, Pause, RotateCcw, Star, Repeat, ChevronDown, ArrowRight, Bookmark, Flame, Trophy, SkipForward } from 'lucide-react'
import { Dial } from '@/components/atelier/Dial'
import { OppvarmingIkon } from '@/components/atelier/Glyph'
import { TelleTall } from '@/components/atelier/TelleTall'
import { lokalDato } from '@/lib/dato'
import { lyd } from '@/lib/lyd'
import { useSkjermVaaken } from '@/hooks/useSkjermVaaken'
import { finnPrOvelse } from '@/lib/prOvelser'


function spillAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const spill = (f: number, t: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(0.4, ctx.currentTime+t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+0.25)
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.3)
    }
    spill(880,0); spill(1100,0.18); spill(1320,0.36)
  } catch {}
}

type Sted   = 'hjemme' | 'gym'
type Gruppe = 'bryst'|'rygg'|'bein'|'skuldre'|'bicep'|'tricep'|'core'|'fullkropp'|'tabata'|'cardio'|'styrkeløft'|'mobilitet'|'eksplosivitet'|'isolasjon'

interface OvelseDB {
  navn: string; sett: number; reps: string; hvile: string
  utstyr: string; emoji: string; tips: string; muskler: string; beskrivelse: string
}
interface OvelseLogg extends OvelseDB {
  sett_logg: { reps: number; kg: number; fullfort: boolean }[]
  expanded: boolean
}

const OPPVARMING = [
  { id:'boksesekk',    navn:'Boksesekk',       emoji:'🥊', varighet:'10 min', beskrivelse:'3 runder à 3 min med 1 min pause. Jab, kryss, krokkslag.' },
  { id:'froskehopp',   navn:'Froskehopp',       emoji:'🐸', varighet:'8 min',  beskrivelse:'4×10 froskehopp. Squat ned og eksplodér fremover. Land mykt.' },
  { id:'fjellklatrer', navn:'Fjellklatrere',    emoji:'⛰️', varighet:'8 min',  beskrivelse:'4×30 sek fjellklatrere med 15 sek pause.' },
  { id:'strekk',       navn:'Dynamisk strekk',  emoji:'🧘', varighet:'10 min', beskrivelse:'Arm-sirkler, benstrekk, hoftesirkler, torso-rotasjoner.' },
  { id:'hopping',      navn:'Hopping/tau',      emoji:'⬆️', varighet:'10 min', beskrivelse:'5×1 min hopping med 30 sek pause.' },
  { id:'romaskin',     navn:'Romaskin',          emoji:'🚣', varighet:'12 min', beskrivelse:'3×4 min romaskin. Start lett, øk intensitet.' },
  { id:'sykkel',       navn:'Stasjonær sykkel', emoji:'🚴', varighet:'10 min', beskrivelse:'10 min lett sykling.' },
  { id:'elipsemaskin', navn:'Elipsemaskin',      emoji:'🏃', varighet:'10 min', beskrivelse:'10 min på elipsemaskin. Lav intensitet.' },
  { id:'tredemill',    navn:'Tredemølle',        emoji:'👟', varighet:'10 min', beskrivelse:'5 min gange + 5 min rolig jogg.' },
]

const DB: Record<Gruppe, Record<Sted, OvelseDB[]>> = {
  bryst: {
    hjemme: [
      { navn:'Push-up', sett:4, reps:'12-15', hvile:'60s', utstyr:'Ingen', emoji:'💪', muskler:'Pecs, triceps', beskrivelse:'Grunnleggende brystøvelse.', tips:'Kroppen rett som planke' },
    ],
    gym: [
      { navn:'Benkpress', sett:4, reps:'8-10', hvile:'90s', utstyr:'Vektstang', emoji:'🏋️', muskler:'Pecs, triceps', beskrivelse:'Klassisk styrkeøvelse.', tips:'Skulderblad inn og ned' },
    ],
  },
  rygg: {
    hjemme: [{ navn:'Hantelroing enarms', sett:4, reps:'10×2', hvile:'60s', utstyr:'Hantel + benk', emoji:'💪', muskler:'Øvre rygg, biceps', beskrivelse:'Støtt hånd og kne på benk.', tips:'Albuen opp og bak' }],
    gym: [{ navn:'Pull-ups', sett:4, reps:'6-10', hvile:'2min', utstyr:'Pull-up stang', emoji:'🤸', muskler:'Lats, biceps', beskrivelse:'Kongen av ryggøvelser.', tips:'Full strekk ned' }],
  },
  bein: {
    hjemme: [{ navn:'Hantelknebøy', sett:4, reps:'12', hvile:'75s', utstyr:'Hantler', emoji:'🏋️', muskler:'Quads, glutes', beskrivelse:'Hantler ved siden.', tips:'Knær over tær' }],
    gym: [{ navn:'Knebøy', sett:4, reps:'8-10', hvile:'2min', utstyr:'Vektstang', emoji:'🦵', muskler:'Quads, glutes', beskrivelse:'Kongen av beinøvelser.', tips:'Bryst opp' }],
  },
  skuldre: {
    hjemme: [{ navn:'Sidehev', sett:3, reps:'12-15', hvile:'60s', utstyr:'Hantler', emoji:'🔼', muskler:'Lateral deltoid', beskrivelse:'Løft armene ut til siden.', tips:'Løft til skulderhøyde' }],
    gym: [{ navn:'Military press', sett:4, reps:'8-10', hvile:'2min', utstyr:'Vektstang', emoji:'⬆️', muskler:'Alle deltoider', beskrivelse:'Stående press.', tips:'Stram core' }],
  },
  bicep: {
    hjemme: [{ navn:'Biceps curl', sett:3, reps:'10-12', hvile:'60s', utstyr:'Hantler', emoji:'💪', muskler:'Biceps brachii', beskrivelse:'Curl hantlene opp.', tips:'Albuen fast ved siden' }],
    gym: [{ navn:'Biceps curl stang', sett:3, reps:'10-12', hvile:'60s', utstyr:'EZ-stang', emoji:'💪', muskler:'Biceps brachii', beskrivelse:'Undergrep på stang.', tips:'Ingen sving' }],
  },
  tricep: {
    hjemme: [{ navn:'Trang push-up', sett:3, reps:'12-15', hvile:'60s', utstyr:'Ingen', emoji:'💪', muskler:'Triceps', beskrivelse:'Hendene smalere enn skuldrene.', tips:'Albuer nær' }],
    gym: [{ navn:'Triceps pushdown', sett:3, reps:'12-15', hvile:'60s', utstyr:'Kabelmaskin', emoji:'📉', muskler:'Triceps', beskrivelse:'Albuer fast ved siden.', tips:'Klem ned helt' }],
  },
  core: {
    hjemme: [{ navn:'Planke', sett:3, reps:'45-60 sek', hvile:'45s', utstyr:'Ingen', emoji:'🧘', muskler:'Hele core', beskrivelse:'På underarm, kroppen rett.', tips:'Stram ALT' }],
    gym: [{ navn:'Cable crunch', sett:3, reps:'12-15', hvile:'60s', utstyr:'Kabelmaskin', emoji:'🎯', muskler:'Rectus abdominis', beskrivelse:'Kne ned foran kabel.', tips:'Hoften beveger seg ikke' }],
  },
  fullkropp: {
    hjemme: [{ navn:'Burpees', sett:4, reps:'10', hvile:'60s', utstyr:'Ingen', emoji:'🔥', muskler:'Full kropp', beskrivelse:'Push-up → hopp inn → hopp opp.', tips:'Teknisk korrekt' }],
    gym: [{ navn:'Thrusters', sett:3, reps:'10', hvile:'90s', utstyr:'Hantler', emoji:'🚀', muskler:'Bein + skuldre', beskrivelse:'Kombiner squat og skulderpresse.', tips:'Flytende bevegelse' }],
  },
  tabata: {
    hjemme: [{ navn:'Tabata Burpees', sett:8, reps:'20s on/10s off', hvile:'1min', utstyr:'Ingen', emoji:'🔥', muskler:'Full kropp', beskrivelse:'8 runder = 4 minutter.', tips:'GI ALT i 20 sek' }],
    gym: [{ navn:'Tabata Romaskin', sett:8, reps:'20s on/10s off', hvile:'1min', utstyr:'Romaskin', emoji:'🚣', muskler:'Full kropp', beskrivelse:'Full kraft på romaskin.', tips:'BEIN→HELLING→ARMER' }],
  },
  cardio: {
    hjemme: [{ navn:'Boksesekk runder', sett:5, reps:'3 min', hvile:'1min', utstyr:'Boksesekk', emoji:'🥊', muskler:'Full kropp', beskrivelse:'5 runder à 3 min.', tips:'Hofte med hvert slag' }],
    gym: [{ navn:'Romaskin intervall', sett:6, reps:'500m', hvile:'90s', utstyr:'Romaskin', emoji:'🚣', muskler:'Full kropp', beskrivelse:'6×500m med 90 sek pause.', tips:'BEIN→HELLING→ARMER' }],
  },
  styrkeløft: {
    hjemme: [],
    gym: [{ navn:'Markløft (konvensjonell)', sett:4, reps:'5', hvile:'3min', utstyr:'Vektstang', emoji:'⚡', muskler:'Hel kropp', beskrivelse:'Stangen over fotmidten.', tips:'Ryggen rett' }],
  },
  mobilitet: {
    hjemme: [{ navn:'Cat-Cow', sett:3, reps:'10', hvile:'30s', utstyr:'Ingen', emoji:'🐱🐮', muskler:'Rygg', beskrivelse:'På alle fire, veksle mellom å krumme og senke ryggen.', tips:'Sakte' }],
    gym: [],
  },
  eksplosivitet: {
    hjemme: [{ navn:'Box jumps', sett:4, reps:'5', hvile:'60s', utstyr:'Box', emoji:'📦', muskler:'Eksplosiv bein', beskrivelse:'Hopp opp på en boks.', tips:'Land mykt' }],
    gym: [{ navn:'Power clean', sett:4, reps:'3-5', hvile:'2min', utstyr:'Vektstang', emoji:'⚡', muskler:'Hel kropp', beskrivelse:'Trekk stangen fra gulv til skuldre.', tips:'Eksplosivt hofte-støt' }],
  },
  isolasjon: {
    hjemme: [],
    gym: [{ navn:'Pec deck', sett:3, reps:'10-12', hvile:'60s', utstyr:'Maskin', emoji:'🔀', muskler:'Bryst', beskrivelse:'Sitt i maskin, press albuene sammen.', tips:'Klem i midten' }],
  },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]]
  }
  return a
}

const UTKAST_NOKKEL = 'okt_utkast'

// Biblioteksøvelse → formatet økta bruker
const fraBibliotek = (o: Ovelse): OvelseDB => ({
  navn: o.navn, sett: o.sett, reps: o.reps, hvile: o.hvile, utstyr: o.utstyr, emoji: '',
  tips: o.tips[0] ?? '', muskler: o.muskelgruppe, beskrivelse: o.beskrivelse,
})
// Biblioteket først; den gamle lokale listen brukes bare for kategorier biblioteket mangler
const ALLE_KJENTE: OvelseDB[] = [...BIBLIOTEK.map(fraBibliotek), ...Object.values(DB).flatMap(d => [...d.hjemme, ...d.gym])]

// «90s», «2min», «3 min», «75s» → sekunder. «–» eller ukjent gir 0 (ingen hvile).
function hvileSekunder(hvile: string): number {
  const t = (hvile || '').toLowerCase()
  const min = t.match(/(\d+(?:[.,]\d+)?)\s*min/)
  if (min) return Math.round(parseFloat(min[1].replace(',', '.')) * 60)
  const sek = t.match(/(\d+)\s*s/)
  if (sek) return parseInt(sek[1])
  return 0
}
const fmtHvile = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

type Historikk = Record<string, { forrige: { reps: number; kg: number }[]; beste: number }>

function OktInner() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [okter,      setOkter]      = useState<OvelseLogg[]>([])
  const [oppvar,     setOppvar]     = useState<typeof OPPVARMING>([])
  const [tittel,     setTittel]     = useState('')
  const [lagrer,     setLagrer]     = useState(false)
  const [lagretMsg,  setLagretMsg]  = useState('')
  const [laster,     setLaster]     = useState(true)
  const [oktNotat,   setOktNotat]   = useState('')
  const [dagensDato, setDagensDato] = useState('')
  const [visFavorittModal, setVisFavorittModal] = useState(false)
  const [bytteIndex, setBytteIndex] = useState<number | null>(null)
  const [bekrefter,  setBekrefter]  = useState(false)
  const [lagretOktId, setLagretOktId] = useState<string | null>(searchParams.get('okt'))
  // Forrige resultat og beste løft per øvelse (fra treningslogger)
  const [historikk, setHistorikk] = useState<Historikk>({})
  // Nye rekorder denne økta: øvelsesnavn → tyngste kg
  const [nyePR, setNyePR] = useState<Record<string, number>>({})
  // Hviletimer som starter når et sett hukes av
  const [hvile, setHvile] = useState<{ slutt: number; total: number; ovelse: string } | null>(null)
  const [hvileIgjen, setHvileIgjen] = useState(0)
  const qc = useQueryClient()
  const [feiring,    setFeiring]    = useState<{ sett: number; ovelser: number; kg: number; tid: number } | null>(null)
  useSkjermVaaken(!laster && !feiring) // skjermen skal ikke slukke midt i et sett
  const [gjenopprettet, setGjenopprettet] = useState(false)
  const meldingRef = useRef<NodeJS.Timeout | null>(null)
  const visMelding = (msg: string) => {
    setLagretMsg(msg)
    if (meldingRef.current) clearTimeout(meldingRef.current)
    meldingRef.current = setTimeout(() => setLagretMsg(''), 2800)
  }

  // ✅ FIX 1: Hent userId direkte fra Supabase, ikke useUser()
  // useUser() kan returnere et objekt der .id ikke er direkte tilgjengelig
  const [userId, setUserId] = useState<string | null>(null)

  // ── Stoppeklokke ───────────────────────────────────────────────────────────
  const [klokkeMode, setKlokkeMode] = useState<'stopp'|'ned'>('stopp')
  const [sekunder,   setSekunder]   = useState(0)
  const [kjoerer,    setKjoerer]    = useState(false)
  const [nedMal,     setNedMal]     = useState(3)
  const [alarm,      setAlarm]      = useState(false)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)

  // ✅ FIX 2: Hent userId ved mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  }, [])

  useEffect(() => {
    if (kjoerer) {
      intervalRef.current = setInterval(() => {
        setSekunder(s => {
          if (klokkeMode === 'ned') {
            if (s <= 1) { setKjoerer(false); setAlarm(true); spillAlarm(); return 0 }
            return s - 1
          }
          return s + 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [kjoerer, klokkeMode])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- kjøres bevisst kun ved oppstart
  useEffect(() => { bygg() }, [])

  useEffect(() => {
    const dato = lokalDato()
    setDagensDato(dato)
    const lagret = localStorage.getItem(`notat_${dato}`)
    if (lagret) setOktNotat(lagret)
  }, [])

  const nullstillKlokke = () => { setKjoerer(false); setSekunder(0); setAlarm(false) }
  const startKlokke     = () => { setAlarm(false); if (klokkeMode === 'ned') setSekunder(nedMal * 60); setKjoerer(true) }
  const formatTid       = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const byttOvelse = (index: number, nyOvelse: any) => {
    const ny: OvelseLogg = {
      ...okter[index],
      navn: nyOvelse.ovelse_navn,
      emoji: nyOvelse.emoji || '💪',
      sett: nyOvelse.sett,
      reps: nyOvelse.reps,
      hvile: nyOvelse.hvile,
      muskler: '',
      beskrivelse: '',
      tips: '',
      utstyr: '',
      expanded: true,
      sett_logg: Array.from({ length: nyOvelse.sett }, () => ({
        reps: parseInt(String(nyOvelse.reps).split('-')[0]) || 10,
        kg: 0,
        fullfort: false
      }))
    }
    setOkter(prev => prev.map((o, i) => i === index ? ny : o))
    // ✅ FIX 3: Lukk modal ETTER state-oppdatering, ingen alert()
    setVisFavorittModal(false)
    setBytteIndex(null)
  }

  // ─── FAVORITT-FUNKSJON ────────────────────────────────────────────────────────
  const leggTilFavoritt = async (ovelse: any) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      visMelding('Du må være logget inn.')
      return
    }
    
    try {
      const { data: eksisterende } = await supabase
        .from('favoritt_ovelser')
        .select('id')
        .eq('bruker_id', currentUser.id)
        .eq('ovelse_navn', ovelse.navn)
        .maybeSingle()
      
      if (eksisterende) {
        visMelding(`${ovelse.navn} er allerede blant favorittene.`)
        return
      }
      
      const { error } = await supabase
        .from('favoritt_ovelser')
        .insert({
          bruker_id: currentUser.id,
          ovelse_navn: ovelse.navn,
          ovelse_id: ovelse.navn.toLowerCase().replace(/\s+/g, '-'),
          emoji: ovelse.emoji || '💪',
          sett: ovelse.sett,
          reps: ovelse.reps,
          hvile: ovelse.hvile
        })
      
      if (error) {
        console.error('Feil ved lagring av favoritt:', error)
        visMelding(`Kunne ikke lagre favoritt: ${error.message}`)
      } else {
        visMelding(`${ovelse.navn} er lagt til i favoritter.`)
      }
    } catch (err) {
      console.error('Uventet feil:', err)
      visMelding('Noe gikk galt. Prøv igjen.')
    }
  }

  const bygg = async (brukUtkast = true) => {
    // Fortsett en uavsluttet økt (samme økt-lenke, siste 12 timer) i stedet for å bygge på nytt
    if (brukUtkast) {
      try {
        const u = JSON.parse(localStorage.getItem(UTKAST_NOKKEL) ?? 'null')
        if (u && u.nokkel === searchParams.toString() && Date.now() - u.lagret < 12 * 3600_000 && u.okter?.length) {
          setOkter(u.okter); setTittel(u.tittel ?? ''); setOppvar(u.oppvar ?? [])
          if (u.lagretOktId) setLagretOktId(u.lagretOktId)
          setGjenopprettet(true); setLaster(false)
          return
        }
      } catch {}
    }
    const oktId       = searchParams.get('okt')
    const ovelserParam = searchParams.get('ovelser')
    const modus       = searchParams.get('modus')

    const hentSisteTreningsData = async (userId: string, ovelseNavn: string) => {
      const { data } = await supabase
        .from('treningslogger')
        .select('sett, dato')
        .eq('bruker_id', userId)
        .eq('ovelse_navn', ovelseNavn)
        .order('dato', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data?.sett && data.sett.length > 0) {
        return { sett_logg: data.sett.map((s: any) => ({ reps: s.reps, kg: s.vekt || s.kg || 0 })) }
      }
      return null
    }

    if (modus === 'custom' && ovelserParam) {
      try {
        const customOvelser = JSON.parse(decodeURIComponent(ovelserParam))
        const alle = ALLE_KJENTE
        const norm = (n: string) => n.toLowerCase().trim().replace(/\s+/g, ' ')
        let oveler = customOvelser.map((o: any) => {
          const match = alle.find(e => norm(e.navn) === norm(o.navn || ''))
          const sett = o.sett || 3; const reps = o.reps || '10'
          if (match) return { ...match, sett, reps, expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(reps.split('-')[0])||10, kg: 0, fullfort: false })) }
          // Øvelser valgt fra biblioteket: hent beskrivelse, tips og hvile derfra
          const bib = BIBLIOTEK.find(b => b.id === o.id || norm(b.navn) === norm(o.navn || ''))
          if (bib) return { navn: bib.navn, sett, reps: String(reps), hvile: bib.hvile, utstyr: bib.utstyr, emoji: '', muskler: bib.muskelgruppe, beskrivelse: bib.beskrivelse, tips: bib.tips[0] ?? '', expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(String(reps).split('-')[0])||10, kg: 0, fullfort: false })) }
          return { navn: o.navn||'Ukjent', sett, reps, hvile:'75s', utstyr:'–', emoji:'⚡', muskler:'–', beskrivelse:'', tips:'–', expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(reps.split('-')[0])||10, kg: 0, fullfort: false })) }
        })
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          for (let i = 0; i < oveler.length; i++) {
            const s = await hentSisteTreningsData(u.id, oveler[i].navn)
            if (s) { oveler[i].sett = s.sett_logg.length; oveler[i].sett_logg = s.sett_logg.map((x: any) => ({ ...x, fullfort: false })); if (s.sett_logg[0]) oveler[i].reps = s.sett_logg[0].reps.toString() }
          }
        }
        setOkter(oveler); setTittel('Egendefinert økt'); setLaster(false); return
      } catch (e) { console.error('❌ FEIL:', e) }
    }

    if (oktId) {
      const { data } = await createClient().from('okter').select('*').eq('id', oktId).single()
      if (data) {
        let ovelserData = data.ovelser ?? []
        if (ovelserParam) { try { ovelserData = JSON.parse(ovelserParam) } catch {} }
        const alle = ALLE_KJENTE
        const norm = (n: string) => n.toLowerCase().trim().replace(/\s+/g, ' ')
        let oveler = ovelserData.map((o: any) => {
          const match = alle.find(e => norm(e.navn) === norm(o.navn || ''))
          const sett = o.sett || 3; const reps = o.reps || '10'
          if (match) return { ...match, sett, reps, expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(reps.split('-')[0])||10, kg: o.kg||0, fullfort: false })) }
          return { navn: o.navn||'Ukjent', sett, reps, hvile:'75s', utstyr:'–', emoji:'⚡', muskler:'–', beskrivelse:'', tips:'–', expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(reps.split('-')[0])||10, kg: o.kg||0, fullfort: false })) }
        })
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          for (let i = 0; i < oveler.length; i++) {
            const s = await hentSisteTreningsData(u.id, oveler[i].navn)
            if (s) { oveler[i].sett = s.sett_logg.length; oveler[i].sett_logg = s.sett_logg.map((x: any) => ({ ...x, fullfort: false })); if (s.sett_logg[0]) oveler[i].reps = s.sett_logg[0].reps.toString() }
          }
        }
        setOkter(oveler); setTittel(data.tittel); setLaster(false); return
      }
    }

    const grupperStr = searchParams.get('grupper') ?? ''
    const sted       = (searchParams.get('sted') ?? 'gym') as Sted
    const intensitet = searchParams.get('intensitet') ?? 'Moderat'
    const dag        = parseInt(searchParams.get('dag') ?? '0')
    const oppvIds    = (searchParams.get('oppvarming') ?? '').split(',').filter(Boolean)
    const grupper    = grupperStr.split(',').filter(Boolean) as Gruppe[]
    const antall     = intensitet === 'Lett' ? 2 : intensitet === 'Hard' ? 4 : 3

    let alle: OvelseDB[] = []
    grupper.forEach(g => {
      const fraBib = utvalg(g, sted, antall).map(fraBibliotek)
      const pool = fraBib.length ? fraBib : shuffle(DB[g]?.[sted] ?? []).slice(0, antall)
      alle = alle.concat(pool.map(o => ({
        ...o, sett: intensitet === 'Hard' ? o.sett+1 : intensitet === 'Lett' ? Math.max(2,o.sett-1) : o.sett,
      })))
    })

    let logg: OvelseLogg[] = alle.map(o => ({
      ...o, expanded: true,
      sett_logg: Array.from({length: o.sett}, () => ({ reps: parseInt(o.reps.split('-')[0])||10, kg: 0, fullfort: false })),
    }))

    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      for (let i = 0; i < logg.length; i++) {
        const s = await hentSisteTreningsData(u.id, logg[i].navn)
        if (s) { logg[i].sett = s.sett_logg.length; logg[i].sett_logg = s.sett_logg.map((x: any) => ({ ...x, fullfort: false })); if (s.sett_logg[0]) logg[i].reps = s.sett_logg[0].reps.toString() }
      }
    }

    const opp      = OPPVARMING.filter(o => oppvIds.includes(o.id))
    const dagsNavn = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'][dag]
    const t        = grupper.length > 0 ? grupper.map(g=>g[0].toUpperCase()+g.slice(1)).join(' & ') + ' — ' + dagsNavn : 'Treningsøkt'
    setOkter(logg); setOppvar(opp); setTittel(t); setLaster(false)
  }

  // Autolagring av pågående økt – overlever at appen lukkes eller telefonen går tom for strøm
  useEffect(() => {
    if (laster || feiring || !okter.length) return
    try {
      localStorage.setItem(UTKAST_NOKKEL, JSON.stringify({
        nokkel: searchParams.toString(), lagret: Date.now(), okter, tittel, oppvar, lagretOktId,
      }))
    } catch {}
  }, [okter, tittel, oppvar, lagretOktId, laster, feiring]) // eslint-disable-line react-hooks/exhaustive-deps

  const startPaNytt = () => {
    try { localStorage.removeItem(UTKAST_NOKKEL) } catch {}
    setGjenopprettet(false); setLaster(true); setOkter([])
    bygg(false)
  }

  // Hent historikk for alle øvelsene i én spørring
  const ovelsesnavn = okter.map(o => o.navn).join('|')
  useEffect(() => {
    if (laster || !ovelsesnavn) return
    let avbrutt = false
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const navn = Array.from(new Set(ovelsesnavn.split('|')))
      const { data } = await supabase.from('treningslogger').select('ovelse_navn, dato, sett')
        .eq('bruker_id', u.id).in('ovelse_navn', navn).order('dato', { ascending: false }).limit(300)
      if (avbrutt || !data) return
      const h: Historikk = {}
      for (const rad of data as any[]) {
        const sett = (rad.sett ?? []).map((x: any) => ({ reps: x.reps ?? 0, kg: x.vekt ?? x.kg ?? 0 }))
        const tyngst = Math.max(0, ...sett.map((x: any) => x.kg))
        if (!h[rad.ovelse_navn]) h[rad.ovelse_navn] = { forrige: sett, beste: tyngst }
        else h[rad.ovelse_navn].beste = Math.max(h[rad.ovelse_navn].beste, tyngst)
      }
      setHistorikk(h)
    })()
    return () => { avbrutt = true }
  }, [laster, ovelsesnavn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hviletimer – tidsstempelbasert, så den tåler at skjermen låses
  useEffect(() => {
    if (!hvile) return
    const id = setInterval(() => {
      const rest = hvile.slutt - Date.now()
      if (rest <= 0) {
        lyd.arbeid()
        try { navigator.vibrate?.(200) } catch {}
        setHvile(null); setHvileIgjen(0)
        return
      }
      setHvileIgjen(rest)
    }, 200)
    return () => clearInterval(id)
  }, [hvile])

  const startHvile = (o: OvelseLogg) => {
    const sek = hvileSekunder(o.hvile)
    if (!sek) return
    lyd.klargjor()
    setHvile({ slutt: Date.now() + sek * 1000, total: sek * 1000, ovelse: o.navn })
    setHvileIgjen(sek * 1000)
  }

  // Huk av et sett: start hvile og sjekk om det er ny rekord
  const hukAv = (oIdx: number, sIdx: number) => {
    const o = okter[oIdx]
    const s = o.sett_logg[sIdx]
    const nyStatus = !s.fullfort
    oppdaterSett(oIdx, sIdx, 'fullfort', nyStatus)
    if (!nyStatus) return
    const sisteSett = okter.every((x, i) => x.sett_logg.every((y, j) => (i === oIdx && j === sIdx) || y.fullfort))
    if (!sisteSett) startHvile(o)
    const beste = historikk[o.navn]?.beste ?? 0
    if (beste > 0 && s.kg > beste && s.kg > (nyePR[o.navn] ?? 0)) {
      setNyePR(p => ({ ...p, [o.navn]: s.kg }))
      lyd.ferdig()
      visMelding(`Ny rekord i ${o.navn.toLowerCase()}: ${s.kg} kg`)
    }
  }

  const oppdaterSett = (oIdx: number, sIdx: number, felt: string, val: any) =>
    setOkter(prev => prev.map((o,i) => i!==oIdx ? o : {
      ...o, sett_logg: o.sett_logg.map((s,j) => j!==sIdx ? s : {...s,[felt]:val})
    }))

  // Én rad per økt: finnes den (åpnet fra kalenderen, eller lagret som utkast), oppdateres den.
  // Tidligere ble det laget en ny rad ved hvert lagre-trykk og ved fullføring – duplikater i kalenderen.
  const lagreOktRad = async (brukerId: string, dato: string, erFullfort: boolean) => {
    const rad = {
      bruker_id: brukerId, dato, tittel, type: 'styrke', fullfort: erFullfort,
      varighet_min: klokkeMode === 'stopp' && sekunder >= 60 ? Math.round(sekunder / 60) : 60,
      ovelser: okter.map(o => ({ navn: o.navn, sett: o.sett, reps: o.sett_logg.map(s=>s.reps).join('/'), kg: o.sett_logg.find(s=>s.kg>0)?.kg ?? 0 })),
    }
    if (lagretOktId) {
      const { error } = await supabase.from('okter').update(rad).eq('id', lagretOktId)
      return error
    }
    const { data, error } = await supabase.from('okter').insert([rad]).select('id').single()
    if (data?.id) setLagretOktId(data.id)
    return error
  }

  // Dashbord, kalender og statistikk leser fra React Query-cachen – den må friskes opp etter lagring
  const oppdaterCache = () => {
    for (const key of ['okter', 'okterIdag', 'stats', 'aktivitet']) qc.invalidateQueries({ queryKey: [key] })
  }

  const lagreOkt = async () => {
    setLagrer(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) { setLagrer(false); return }
    // Utkast skriver ikke treningslogger – de hører til fullførte økter og ville ellers blitt telt dobbelt
    const error = await lagreOktRad(currentUser.id, lokalDato(), false)
    visMelding(error ? `Kunne ikke lagre: ${error.message}` : 'Utkastet er lagret.')
    if (!error) oppdaterCache()
    setLagrer(false)
  }

  if (laster) return (
    <div className="okt-laster"><div className="spinner-lg"/><span className="eyebrow">Gjør klar økten</span></div>
  )

  const alleSett = okter.flatMap(o=>o.sett_logg)
  const fullfort = alleSett.filter(s=>s.fullfort).length
  const totalt   = alleSett.length
  const andel    = totalt ? fullfort / totalt : 0
  const tonnasje = Math.round(alleSett.filter(s=>s.fullfort).reduce((sum,s)=>sum + (s.kg||0)*(s.reps||0), 0))
  const alleFerdig = totalt > 0 && fullfort === totalt

  const fullforTrening = async () => {
    if (!alleFerdig) {
      visMelding(`Fullfør alle sett først. ${totalt - fullfort} igjen.`)
      return
    }
    if (!bekrefter) {
      setBekrefter(true)
      setTimeout(() => setBekrefter(false), 4000)
      return
    }
    setBekrefter(false)
    setLagrer(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) { setLagrer(false); return }

    const dato = lokalDato()
    const error = await lagreOktRad(currentUser.id, dato, true)

    if (error) {
      visMelding('Noe gikk galt ved lagring: ' + error.message)
    } else {
      const logger = okter
        .filter(o => o.sett_logg.some(s => s.kg > 0))
        .map(o => ({
          bruker_id: currentUser.id,
          dato,
          ovelse_navn: o.navn,
          muskelgruppe: o.muskler,
          sett: o.sett_logg.map(s => ({ reps: s.reps, vekt: s.kg, fullfort: s.fullfort })),
        }))
      // Én samlet insert i stedet for én forespørsel per øvelse
      const { error: loggFeil } = logger.length ? await supabase.from('treningslogger').insert(logger) : { error: null }
      if (loggFeil) visMelding('Økten er lagret, men settene kunne ikke logges: ' + loggFeil.message)
      // Oppdater personlige rekorder for øvelser som finnes i rekordlisten
      for (const [navn, kg] of Object.entries(nyePR)) {
        const pr = finnPrOvelse(navn)
        if (!pr) continue
        const reps = okter.find(o => o.navn === navn)?.sett_logg.find(x => x.kg === kg)?.reps ?? 1
        const { data: eks } = await supabase.from('pr_rekorder').select('id, kg').eq('bruker_id', currentUser.id).eq('ovelse_id', pr.id).maybeSingle()
        if (!eks) await supabase.from('pr_rekorder').insert([{ bruker_id: currentUser.id, ovelse_id: pr.id, kg, reps, dato }])
        else if (kg > eks.kg) await supabase.from('pr_rekorder').update({ kg, reps, dato }).eq('id', eks.id)
      }
      setHvile(null)
      try { localStorage.removeItem(UTKAST_NOKKEL) } catch {}
      oppdaterCache()
      setFeiring({ sett: fullfort, ovelser: okter.length, kg: tonnasje, tid: sekunder })
    }
    setLagrer(false)
  }

  return (
    <div className="okt-page">

      {/* ── Hode ── */}
      <motion.header className="okt-hode" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}>
        <div className="okt-hode-topp">
          <span className="eyebrow eyebrow-gold"><span className="neon-dot neon-dot-cyan anim-pulse" style={{ marginRight: 8, verticalAlign: 'middle' }} />Økt pågår</span>
          <button className="btn btn-subtle okt-lagre-btn" onClick={lagreOkt} disabled={lagrer}>
            {lagrer ? <span className="spinner" /> : <Bookmark size={14} strokeWidth={1.5} />} Lagre utkast
          </button>
        </div>
        <h1 className="okt-tittel">{tittel}</h1>
        <div className="okt-fremdrift">
          <div className="okt-fremdrift-tall num-monument">
            {fullfort}<span>/{totalt}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="okt-fremdrift-meta">
              <span className="eyebrow">Sett fullført</span>
              <span className="eyebrow">{okter.length} øvelser · {new Intl.NumberFormat('nb-NO').format(tonnasje)} kg</span>
            </div>
            <div className="tick-track"><div className="tick-fill" style={{ width: `${andel*100}%` }} /></div>
          </div>
        </div>
      </motion.header>

      {gjenopprettet && (
        <div className="okt-gjenopprettet">
          <span>Du fortsetter der du slapp.</span>
          <button className="hq-link" onClick={startPaNytt}>Start på nytt</button>
        </div>
      )}

      <AnimatePresence>
        {hvile && (
          <motion.div className="okt-hvile" initial={{ opacity: 0, y: 30, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 30, x: '-50%' }}>
            <svg viewBox="0 0 36 36" className="okt-hvile-ring" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(242,236,225,0.12)" strokeWidth="2" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round"
                strokeDasharray={94.25} strokeDashoffset={94.25 * (1 - hvileIgjen / hvile.total)} transform="rotate(-90 18 18)" />
            </svg>
            <div className="okt-hvile-tekst">
              <span className="eyebrow">Hvile</span>
              <span className="mono okt-hvile-tid">{fmtHvile(hvileIgjen)}</span>
            </div>
            <button className="okt-hvile-knapp" onClick={() => setHvile(h => h && ({ ...h, slutt: h.slutt + 15000, total: h.total + 15000 }))}>+15s</button>
            <button className="okt-hvile-knapp" onClick={() => { setHvile(null); setHvileIgjen(0) }} aria-label="Hopp over hvile"><SkipForward size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lagretMsg && (
          <motion.div className="okt-toast" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}>
            {lagretMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Klokke ── */}
      <div className={`okt-klokke glass-card${alarm ? ' okt-alarm' : ''}`}>
        <div className="okt-klokke-rad1">
          <div className="okt-klokke-venstre">
            <div className="okt-klokke-info">{alarm ? 'Tiden er ute' : kjoerer ? (klokkeMode === 'ned' ? 'Hvile' : 'Tid brukt') : klokkeMode === 'ned' ? `Nedtelling · ${nedMal} min` : 'Stoppeklokke'}</div>
            <div className="okt-tid" style={{color: alarm ? 'var(--danger)' : kjoerer ? 'var(--ink)' : 'var(--text-muted)'}}>
              {formatTid(sekunder)}
            </div>
          </div>
          <div className="okt-klokke-hoeyre">
            <button className="okt-reset" onClick={nullstillKlokke} title="Nullstill" aria-label="Nullstill"><RotateCcw size={15} strokeWidth={1.5} /></button>
            {!kjoerer
              ? <button className="okt-play" onClick={startKlokke} aria-label="Start"><Play size={20} strokeWidth={1.5} fill="currentColor" /></button>
              : <button className="okt-play okt-play-on" onClick={() => setKjoerer(false)} aria-label="Pause"><Pause size={20} strokeWidth={1.5} fill="currentColor" /></button>
            }
          </div>
        </div>
        <div className="okt-klokke-rad2">
          <div className="okt-modus-rad">
            <button className={`okt-modus${klokkeMode==='stopp'?' on':''}`} onClick={() => { setKlokkeMode('stopp'); nullstillKlokke() }}>Stoppeklokke</button>
            <button className={`okt-modus${klokkeMode==='ned'?' on':''}`}  onClick={() => { setKlokkeMode('ned');  nullstillKlokke() }}>Nedtelling</button>
          </div>
          {klokkeMode === 'ned' && !kjoerer && (
            <div className="okt-ned-rad">
              <button className="okt-ned-btn" onClick={() => setNedMal(m=>Math.max(1,m-1))} aria-label="Minus"><Minus size={12} /></button>
              <span className="okt-ned-v">{nedMal}m</span>
              <button className="okt-ned-btn" onClick={() => setNedMal(m=>Math.min(120,m+1))} aria-label="Pluss"><Plus size={12} /></button>
              <div className="okt-quick-rad">
                {[1,2,3,5,10,15,20,30].map(m=>(
                  <button key={m} className={`okt-quick${nedMal===m?' on':''}`} onClick={()=>setNedMal(m)}>{m}m</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Oppvarming ── */}
      {oppvar.length > 0 && (
        <div className="okt-opp glass-card">
          <div className="okt-opp-title"><Flame size={14} strokeWidth={1.5} /> Oppvarming</div>
          {oppvar.map(o => (
            <div key={o.id} className="okt-opp-item">
              <span className="okt-opp-em"><OppvarmingIkon id={o.id} size={15} /></span>
              <div>
                <div className="okt-opp-navn">{o.navn} <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>· {o.varighet}</span></div>
                <div className="okt-opp-besk">{o.beskrivelse}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Øvelser ── */}
      <div className="okt-liste">
        {okter.map((o, oIdx) => {
          const done = o.sett_logg.every(s => s.fullfort)
          const ferdigeSett = o.sett_logg.filter(s => s.fullfort).length
          return (
            <motion.div
              key={oIdx}
              layout
              className={`okt-kort glass-card${done ? ' okt-kort-done' : ''}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 + oIdx * 0.05, ease: [0.16,1,0.3,1] }}
            >
              <div className="okt-ov-header"
                onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{...x,expanded:!x.expanded}))}>
                <div className="okt-ov-num">{done ? <Check size={14} strokeWidth={2} /> : String(oIdx+1).padStart(2,'0')}</div>
                <div className="okt-ov-info">
                  <div className="okt-ov-navn">{o.navn}</div>
                  <div className="okt-ov-musk">
                    <span>{o.sett} × {o.reps}</span>
                    <span>Hvile {o.hvile}</span>
                    {o.muskler && o.muskler !== '–' && <span>{o.muskler}</span>}
                  </div>
                </div>
                <span className="okt-ov-count mono">{ferdigeSett}/{o.sett_logg.length}</span>
                <span className={`okt-toggle${o.expanded ? ' open' : ''}`}><ChevronDown size={16} strokeWidth={1.4} /></span>
              </div>

              <AnimatePresence initial={false}>
                {o.expanded && (
                  <motion.div
                    className="okt-ov-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
                  >
                    <div className="okt-verktoy">
                      <button className="okt-fav-btn" onClick={(e) => { e.stopPropagation(); leggTilFavoritt(o) }}>
                        <Star size={12} strokeWidth={1.5} /> Favoritt
                      </button>
                      <button className="okt-bytte-btn" onClick={(e) => { e.stopPropagation(); setBytteIndex(oIdx); setVisFavorittModal(true) }}>
                        <Repeat size={12} strokeWidth={1.5} /> Bytt øvelse
                      </button>
                    </div>

                    {o.beskrivelse && <p className="okt-besk-txt">{o.beskrivelse}</p>}
                    {o.tips && o.tips !== '–' && <div className="okt-tips"><span className="eyebrow eyebrow-gold">Teknikk</span>{o.tips}</div>}

                    <div className="okt-sett-header">
                      <span>Sett</span><span>Reps</span><span>Kg</span><span /><span />
                    </div>
                    {o.sett_logg.map((s, sIdx) => (
                      <motion.div key={sIdx} layout className={`okt-sett-row${s.fullfort ? ' okt-sett-done' : ''}`}>
                        <span className="okt-sett-nr">{String(sIdx+1).padStart(2,'0')}</span>
                        <input className="input okt-input" type="number" inputMode="numeric" min={1} value={s.reps}
                          onChange={e => oppdaterSett(oIdx,sIdx,'reps',parseInt(e.target.value)||0)} />
                        <input className="input okt-input" type="number" inputMode="decimal" min={0} step={0.5}
                          value={s.kg||''} placeholder="0"
                          onChange={e => oppdaterSett(oIdx,sIdx,'kg',parseFloat(e.target.value)||0)} />
                        <motion.button
                          className={`okt-check${s.fullfort?' done':''}`}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => hukAv(oIdx, sIdx)}
                          aria-label={s.fullfort ? 'Merk som ikke fullført' : 'Merk som fullført'}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {s.fullfort
                              ? <motion.span key="on" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }} style={{ display: 'flex' }}><Check size={16} strokeWidth={2} /></motion.span>
                              : <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="okt-check-ring" />}
                          </AnimatePresence>
                        </motion.button>
                        <button className="okt-fjern" aria-label="Fjern sett"
                          onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{
                            ...x, sett: x.sett-1, sett_logg: x.sett_logg.filter((_,j) => j!==sIdx)
                          }))}><X size={13} strokeWidth={1.5} /></button>
                        {(() => {
                          const f = historikk[o.navn]?.forrige?.[sIdx]
                          const beste = historikk[o.navn]?.beste ?? 0
                          const erPR = beste > 0 && s.kg > beste
                          if (!f && !erPR) return null
                          return (
                            <span className="okt-forrige">
                              {f && <>Sist {f.kg ? `${f.kg} kg × ` : ''}{f.reps}</>}
                              {erPR && <span className="okt-pr"><Trophy size={10} strokeWidth={1.8} /> {s.fullfort ? 'Ny rekord' : `Over rekord (${beste} kg)`}</span>}
                            </span>
                          )
                        })()}
                      </motion.div>
                    ))}
                    <button className="okt-add-sett"
                      onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{
                        ...x, sett: x.sett+1,
                        sett_logg: [...x.sett_logg, {reps:parseInt(o.reps.split('-')[0])||10,kg:0,fullfort:false}]
                      }))}>
                      <Plus size={13} strokeWidth={1.5} /> Legg til sett
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* ── Notat ── */}
      <div className="okt-notat-seksjon glass-card">
        <div className="okt-notat-tittel">Notat <em>om økten</em></div>
        <textarea
          className="input okt-notat-textarea"
          placeholder="Energi, søvn, noe å huske til neste gang …"
          value={oktNotat}
          onChange={e => setOktNotat(e.target.value)}
          rows={3}
        />
        <button
          className="btn btn-ghost okt-notat-lagre"
          onClick={() => {
            if (!dagensDato || !oktNotat.trim()) return
            localStorage.setItem(`notat_${dagensDato}`, oktNotat)
            visMelding('Notatet er lagret.')
          }}
        >
          Lagre notat
        </button>
      </div>

      {/* ── Fullfør ── */}
      <div className="okt-avslutt">
        <motion.button
          className={`btn ${alleFerdig ? 'btn-gold' : 'btn-primary'} okt-fullfor${bekrefter ? ' bekreft' : ''}`}
          onClick={fullforTrening}
          disabled={lagrer}
          whileTap={{ scale: 0.98 }}
        >
          <span>{lagrer ? 'Lagrer …' : bekrefter ? 'Trykk igjen for å bekrefte' : alleFerdig ? 'Fullfør treningen' : `Fullfør treningen · ${totalt - fullfort} sett igjen`}</span>
          <span className="hq-cta-arrow">{lagrer ? <span className="spinner" style={{ borderColor: 'rgba(227,198,140,0.25)', borderTopColor: 'var(--gold-hi)' }} /> : <ArrowRight size={18} strokeWidth={1.5} />}</span>
        </motion.button>
        <span className="eyebrow" style={{ textAlign: 'center' }}>Lagres i kalenderen og statistikken</span>
      </div>

      {/* ── Fullført-seremoni ── */}
      <AnimatePresence>
        {feiring && (
          <motion.div className="feiring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="feiring-ring" initial={{ scale: 0.6, opacity: 0, rotate: -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 1.6, ease: [0.16,1,0.3,1] }}>
              <Dial className="w-full h-full" />
            </motion.div>
            <motion.div className="feiring-innhold" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 1, ease: [0.16,1,0.3,1] }}>
              <span className="eyebrow eyebrow-gold">{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <h2 className="feiring-tittel">Fullført<em>.</em></h2>
              <p className="feiring-sub">{tittel}</p>
              {Object.keys(nyePR).length > 0 && (
                <p className="feiring-pr"><Trophy size={13} strokeWidth={1.6} /> {Object.keys(nyePR).length === 1 ? 'Ny rekord' : `${Object.keys(nyePR).length} nye rekorder`}: {Object.entries(nyePR).map(([n, kg]) => `${n} ${kg} kg`).join(' · ')}</p>
              )}
              <div className="feiring-tall">
                {[
                  { v: feiring.sett, l: 'Sett' },
                  { v: feiring.ovelser, l: 'Øvelser' },
                  { v: feiring.kg, l: 'Kg løftet' },
                ].map((t, i) => (
                  <motion.div key={t.l} className="feiring-tall-kol" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.12, duration: 0.8, ease: [0.16,1,0.3,1] }}>
                    <div className="num-monument"><TelleTall verdi={t.v} forsinkelse={0.8 + i * 0.12} /></div>
                    <span className="eyebrow">{t.l}</span>
                  </motion.div>
                ))}
              </div>
              <button className="btn btn-primary hq-cta" style={{ marginTop: '2.5rem' }} onClick={() => router.push('/kalender')}>
                <span>Til kalenderen</span>
                <span className="hq-cta-arrow"><ArrowRight size={18} strokeWidth={1.5} /></span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {visFavorittModal && userId && bytteIndex !== null && (
        <ProgramMal
          userId={userId}
          onClose={() => {
            setVisFavorittModal(false)
            setBytteIndex(null)
          }}
          onSelectFavoritt={(fav) => {
            byttOvelse(bytteIndex, fav)
          }}
          mode="bytte"
        />
      )}

      {visFavorittModal && !userId && (
        <div className="pr-modal-bg" onClick={() => setVisFavorittModal(false)}>
          <div className="pr-modal glass-card" style={{ maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Laster brukerdata …</p>
            <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setVisFavorittModal(false)}>Lukk</button>
          </div>
        </div>
      )}

      <style>{`
        .okt-page { max-width: 820px; width: 100%; margin: 0 auto; }
        .okt-laster { display:flex; flex-direction:column; align-items:center; gap:1.25rem; padding:6rem 0; }

        .okt-hode { margin-bottom: 1.75rem; }
        .okt-hode-topp { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding-bottom:1rem; border-bottom:1px solid var(--line); }
        .okt-lagre-btn { font-size:0.78rem !important; padding:0.5rem 0.95rem !important; gap:7px !important; }
        .okt-tittel { font-family: var(--font-serif); font-weight:400; font-size: clamp(2.4rem, 7vw, 3.8rem); line-height:0.95; letter-spacing:-0.03em; color: var(--ink); margin: 1.5rem 0 1.75rem; text-wrap: balance; }
        .okt-fremdrift { display:flex; align-items:flex-end; gap:1.5rem; }
        .okt-fremdrift-tall { font-size: clamp(3.6rem, 10vw, 5rem); color: var(--ink); }
        .okt-fremdrift-tall span { color: var(--text-muted); font-size: 0.45em; margin-left: 2px; }
        .okt-fremdrift-meta { display:flex; justify-content:space-between; gap:1rem; margin-bottom:10px; flex-wrap:wrap; }

        .okt-toast { position: fixed; left: 50%; bottom: calc(110px + env(safe-area-inset-bottom)); z-index: 70; padding: 0.8rem 1.3rem; border-radius: 999px; background: var(--ink); color: #0B0A09; font-size: 0.86rem; font-weight: 500; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.7); white-space: nowrap; max-width: calc(100vw - 32px); overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 901px) { .okt-toast { bottom: 2rem; } }
        .okt-hvile { position: fixed; left: 50%; bottom: calc(96px + env(safe-area-inset-bottom)); z-index: 69; display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 10px; border-radius: 999px; background: rgba(26,25,22,0.94); border: 1px solid rgba(201,169,110,0.4); backdrop-filter: blur(16px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.8); }
        @media (min-width: 901px) { .okt-hvile { bottom: 2rem; } }
        .okt-hvile ~ * .okt-toast, .okt-hvile + .okt-toast { bottom: calc(170px + env(safe-area-inset-bottom)); }
        .okt-hvile-ring { width: 40px; height: 40px; }
        .okt-hvile-tekst { display: flex; flex-direction: column; gap: 2px; min-width: 56px; }
        .okt-hvile-tid { font-size: 1.25rem; color: var(--ink); line-height: 1; }
        .okt-hvile-knapp { height: 36px; min-width: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--ink); font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .okt-hvile-knapp:hover { border-color: var(--gold); color: var(--gold-hi); }
        .okt-gjenopprettet { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 1rem; margin-bottom: 1rem; border-left: 1px solid var(--gold); background: rgba(201,169,110,0.05); font-size: 0.88rem; color: var(--ink); }
        .okt-gjenopprettet .hq-link { background: none; border: none; cursor: pointer; }
        .okt-forrige { grid-column: 2 / -1; display: flex; align-items: center; gap: 10px; margin-top: -2px; font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.06em; color: var(--text-muted); }
        .okt-pr { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: var(--gold); color: #17130C; letter-spacing: 0.1em; text-transform: uppercase; }
        .feiring-pr { display: inline-flex; align-items: center; gap: 8px; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid rgba(201,169,110,0.5); color: var(--gold-hi); font-size: 0.84rem; }

        .okt-klokke { display:flex; flex-direction:column; gap:1rem; padding:1.4rem 1.5rem; margin-bottom:1rem; }
        .okt-alarm { border-color: rgba(224,97,79,0.5) !important; animation: alarmP 0.8s ease-in-out infinite alternate; }
        @keyframes alarmP { from{box-shadow:0 0 0 0 rgba(224,97,79,0);} to{box-shadow:0 0 0 6px rgba(224,97,79,0.12);} }
        .okt-klokke-rad1 { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
        .okt-klokke-info { font-family: var(--font-mono); font-size:0.6rem; letter-spacing:0.18em; text-transform:uppercase; color: var(--text-muted); margin-bottom: 6px; }
        .okt-tid { font-size: clamp(2.8rem, 9vw, 3.6rem); line-height:1; font-variant-numeric: tabular-nums; transition: color 0.3s; }
        .okt-klokke-hoeyre { display:flex; gap:10px; align-items:center; }
        .okt-play { width:60px; height:60px; border-radius:50%; border:none; cursor:pointer; background: var(--ink); color:#0B0A09; display:flex; align-items:center; justify-content:center; transition: transform 0.25s var(--ease-out), background 0.25s; box-shadow: 0 12px 30px -12px rgba(201,169,110,0.5); }
        .okt-play:hover { transform: scale(1.05); background: #FBF6EC; }
        .okt-play:active { transform: scale(0.94); }
        .okt-play-on { background: transparent; color: var(--gold-hi); border: 1px solid rgba(201,169,110,0.5); box-shadow: none; }
        .okt-play-on:hover { background: rgba(201,169,110,0.08); }
        .okt-reset { width:40px; height:40px; border-radius:50%; background:transparent; border:1px solid var(--line); color: var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition: all 0.25s; }
        .okt-reset:hover { color: var(--ink); border-color: var(--line-strong); transform: rotate(-60deg); }
        .okt-klokke-rad2 { display:flex; flex-direction:column; gap:10px; padding-top: 1rem; border-top: 1px solid var(--line); }
        .okt-modus-rad { display:flex; gap:6px; }
        .okt-modus { padding:6px 14px; border-radius:999px; font-size:0.74rem; border:1px solid var(--line); color: var(--text-secondary); cursor:pointer; transition: all 0.2s; }
        .okt-ned-rad { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .okt-ned-btn { width:28px; height:28px; border-radius:50%; background:transparent; border:1px solid var(--line-strong); color: var(--ink); cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .okt-ned-v { font-size:1rem; color: var(--gold); min-width:36px; text-align:center; }
        .okt-quick-rad { display:flex; gap:4px; flex-wrap:wrap; }
        .okt-quick { padding:4px 9px; border-radius:999px; font-family: var(--font-mono); font-size:0.62rem; border:1px solid var(--line); color: var(--text-muted); cursor:pointer; transition: all 0.2s; }

        .okt-opp { padding:1.4rem 1.5rem; margin-bottom:1rem; }
        .okt-opp-title { display:flex; align-items:center; gap:8px; font-family: var(--font-mono); font-size:0.62rem; letter-spacing:0.18em; text-transform:uppercase; color: var(--ember); margin-bottom:1rem; }
        .okt-opp-item { display:flex; align-items:flex-start; gap:12px; padding: 0.7rem 0; border-top: 1px solid var(--line); }
        .okt-opp-em { width:30px; height:30px; border-radius:50%; border:1px solid rgba(224,122,79,0.4); color: var(--ember); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .okt-opp-navn { font-size:0.92rem; font-weight:500; color: var(--ink); margin-bottom:2px; }
        .okt-opp-besk { font-size:0.8rem; color: var(--text-muted); line-height:1.5; }

        .okt-liste { display:flex; flex-direction:column; gap:0.75rem; }
        .okt-kort { overflow:hidden; }
        .okt-kort-done { border-color: rgba(201,169,110,0.35) !important; background: linear-gradient(180deg, rgba(201,169,110,0.06), rgba(201,169,110,0.01)), var(--bg-card) !important; }
        .okt-ov-header { display:flex; align-items:center; gap:14px; padding:1.25rem 1.4rem; cursor:pointer; }
        .okt-ov-num { width:36px; height:36px; border-radius:50%; flex-shrink:0; border:1px solid var(--line-strong); color: var(--text-secondary); font-family: var(--font-mono); font-size:0.68rem; display:flex; align-items:center; justify-content:center; transition: all 0.4s var(--ease-out); }
        .okt-kort-done .okt-ov-num { background: var(--gold); border-color: var(--gold); color: #17130C; }
        .okt-ov-info { flex:1; min-width:0; }
        .okt-ov-navn { font-family: var(--font-serif); font-size:1.55rem; line-height:1.05; letter-spacing:-0.01em; color: var(--ink); }
        .okt-ov-musk { display:flex; gap:12px; flex-wrap:wrap; margin-top:6px; font-family: var(--font-mono); font-size:0.6rem; letter-spacing:0.12em; text-transform:uppercase; color: var(--text-muted); }
        .okt-ov-count { font-size:0.72rem; color: var(--text-muted); }
        .okt-kort-done .okt-ov-count { color: var(--gold); }
        .okt-toggle { color: var(--text-muted); display:flex; transition: transform 0.4s var(--ease-out); }
        .okt-toggle.open { transform: rotate(180deg); }

        .okt-ov-body { padding: 0 1.4rem; overflow:hidden; }
        .okt-ov-body > :last-child { margin-bottom: 1.4rem; }
        .okt-verktoy { display:flex; gap:6px; padding-top: 1rem; border-top: 1px solid var(--line); }
        .okt-fav-btn, .okt-bytte-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--line); color: var(--text-secondary); border-radius:999px; padding:6px 12px; font-size:0.74rem; cursor:pointer; transition: all 0.2s; }
        .okt-fav-btn:hover, .okt-bytte-btn:hover { border-color: rgba(201,169,110,0.5); color: var(--gold-hi); }
        .okt-besk-txt { font-size:0.88rem; color: var(--text-secondary); line-height:1.65; margin: 1rem 0 0; max-width: 60ch; }
        .okt-tips { display:flex; flex-direction:column; gap:4px; font-size:0.86rem; color: var(--ink); margin: 1rem 0 0; padding: 0.2rem 0 0.2rem 1rem; border-left: 1px solid var(--gold); }

        .okt-sett-header { display:grid; grid-template-columns: 34px 1fr 1fr 44px 28px; gap:8px; margin: 1.4rem 0 8px; padding: 0 6px; font-family: var(--font-mono); font-size:0.58rem; text-transform:uppercase; letter-spacing:0.16em; color: var(--text-muted); }
        .okt-sett-row { display:grid; grid-template-columns: 34px 1fr 1fr 44px 28px; gap:8px; align-items:center; margin-bottom:6px; border-radius:14px; padding: 4px 6px; transition: background 0.4s; }
        .okt-sett-done { background: rgba(201,169,110,0.06); }
        .okt-sett-header span:nth-child(2), .okt-sett-header span:nth-child(3) { text-align: center; }
        .okt-sett-header span:first-child { white-space: nowrap; }
        .okt-sett-nr { font-family: var(--font-mono); font-size:0.7rem; color: var(--text-muted); }
        .okt-sett-done .okt-sett-nr { color: var(--gold); }
        .okt-input { text-align:center; padding:0.6rem 0.4rem !important; font-size:1rem !important; border-radius: 12px !important; }
        .okt-sett-done .okt-input { color: var(--gold-hi); border-color: rgba(201,169,110,0.2); }
        .okt-check { width:44px; height:44px; border-radius:50%; border:1px solid var(--line-strong); background:transparent; color: var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition: background 0.3s, border-color 0.3s, color 0.3s; }
        .okt-check:hover { border-color: rgba(201,169,110,0.6); }
        .okt-check.done { background: var(--gold); border-color: var(--gold); color:#17130C; box-shadow: 0 0 0 5px rgba(201,169,110,0.12); }
        .okt-check-ring { width:8px; height:8px; border-radius:50%; background: var(--line-strong); }
        .okt-fjern { background:none; border:none; color: var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0.5; transition: all 0.2s; }
        .okt-fjern:hover { color: var(--danger); opacity:1; }
        .okt-add-sett { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:10px; background:none; border:1px dashed var(--line-strong); color: var(--text-muted); border-radius:14px; padding:0.7rem; font-size:0.8rem; cursor:pointer; width:100%; transition: all 0.25s; }
        .okt-add-sett:hover { border-color: var(--gold); color: var(--gold-hi); border-style: solid; }

        .okt-notat-seksjon { padding:1.5rem; margin-top:1rem; display:flex; flex-direction:column; gap:.9rem; }
        .okt-notat-tittel { font-family: var(--font-serif); font-size:1.6rem; line-height:1; }
        .okt-notat-tittel em { color: var(--gold); }
        .okt-notat-textarea { width:100%; resize:vertical; min-height:90px; line-height:1.6; }
        .okt-notat-lagre { font-size:.8rem !important; align-self:flex-end; padding: 0.55rem 1.1rem !important; }

        .okt-avslutt { display:flex; flex-direction:column; gap:12px; margin: 2rem 0 1rem; }
        .okt-fullfor { width:100%; justify-content:space-between; padding: 1.1rem 0.6rem 1.1rem 1.6rem; font-size: 1rem; }
        .okt-fullfor.bekreft { background: var(--gold-hi) !important; }

        .feiring { position: fixed; inset: 0; z-index: 200; display:flex; align-items:center; justify-content:center; padding: 1.5rem; background: radial-gradient(800px 500px at 50% 30%, rgba(201,169,110,0.16), transparent 60%), rgba(8,7,6,0.96); backdrop-filter: blur(10px); overflow: hidden; }
        .feiring-ring { position:absolute; width: min(120vw, 820px); aspect-ratio: 1; color: rgba(201,169,110,0.22); pointer-events:none; }
        .feiring-innhold { position:relative; width:100%; max-width: 460px; text-align:center; display:flex; flex-direction:column; align-items:center; }
        .feiring-tittel { font-family: var(--font-serif); font-weight:400; font-size: clamp(4.5rem, 18vw, 7.5rem); line-height:0.9; letter-spacing:-0.04em; margin-top: 1.25rem; }
        .feiring-tittel em { color: var(--gold); }
        .feiring-sub { color: var(--text-secondary); margin-top: 0.75rem; }
        .feiring-tall { display:grid; grid-template-columns: repeat(3,1fr); width:100%; margin-top: 2.5rem; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .feiring-tall-kol { padding: 1.25rem 0.5rem; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .feiring-tall-kol + .feiring-tall-kol { border-left: 1px solid var(--line); }
        .feiring-tall-kol .num-monument { font-size: clamp(2.2rem, 9vw, 3rem); }

        @media (max-width: 520px) {
          .okt-ov-header { padding: 1.1rem 1.1rem; gap: 12px; }
          .okt-ov-body { padding: 0 1.1rem; }
          .okt-ov-navn { font-size: 1.35rem; }
          .okt-sett-header, .okt-sett-row { grid-template-columns: 26px 1fr 1fr 44px 22px; gap: 6px; }
          .okt-klokke { padding: 1.2rem; }
        }

        .pr-modal-bg { position: fixed; inset: 0; background: rgba(5,5,4,0.7); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .pr-modal { width: 100%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
        .pr-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--line); flex-shrink: 0; }
        .pr-modal-tittel { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 400; color: var(--ink); }
        .pr-modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
      `}</style>
    </div>
  )
}

export default function OktPage() {
  return (
    <Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner-lg"/></div>}>
      <OktInner />
    </Suspense>
  )
}
