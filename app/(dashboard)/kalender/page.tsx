'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths, getDay
} from 'date-fns'
import { nb } from 'date-fns/locale'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUser, useOkterManed, useLagreOkt, useSlettOkt, QK } from '@/hooks/useSupabaseQuery'

type OktType = 'styrke' | 'cardio' | 'hvile' | 'annet'
interface Okt {
  id: string; dato: string; tittel: string; type: OktType
  varighet_min: number; notater?: string
  ovelser?: { navn: string; sett: number; reps: string; kg?: number }[]
}

const OV_EMOJI: Record<string, string> = {
  'benkpress':'🏋️','skråbenkpress':'📐','push-up':'💪','dips':'⬇️','pull-ups':'🤸',
  'pull-up':'🤸','markløft':'⚡','lat pulldown':'⬇️','sittende kabelroing':'🚣',
  'hantelroing':'💪','knebøy':'🦵','legpress':'🔧','rumensk markløft':'🍑',
  'military press':'⬆️','sidehev':'🔼','face pull':'🎯','biceps curl':'💪',
  'hammer curl':'🔨','planke':'🧘','burpees':'🔥','kettlebell swing':'🔔',
}
const OV_MUSKLER: Record<string, string> = {
  'benkpress':'Pecs, triceps','skråbenkpress':'Øvre pecs','push-up':'Pecs, core',
  'pull-ups':'Lats, biceps','pull-up':'Lats, biceps','markløft':'Hel rygg, glutes',
  'knebøy':'Quads, glutes','military press':'Alle deltoider','planke':'Hele core',
}
const finnOvInfo = (navn: string) => ({
  emoji:   OV_EMOJI[navn.toLowerCase().trim()]   ?? '⚡',
  muskler: OV_MUSKLER[navn.toLowerCase().trim()] ?? '',
})

const PREV_DB: Record<string, { navn: string; emoji: string; muskler: string; sett: number; reps: string }[]> = {
  bryst: [
    { navn:'Benkpress',            emoji:'🏋️', muskler:'Pecs, triceps',    sett:4, reps:'8-10'  },
    { navn:'Skråbenkpress',        emoji:'📐', muskler:'Øvre pecs',        sett:3, reps:'10-12' },
    { navn:'Kabel pec fly',        emoji:'🔀', muskler:'Indre pecs',       sett:3, reps:'12-15' },
    { navn:'Dips',                 emoji:'⬇️', muskler:'Pecs, triceps',    sett:3, reps:'10-12' },
    { navn:'Brystpress maskin',    emoji:'🔧', muskler:'Pecs',             sett:3, reps:'12'    },
    { navn:'Push-up',              emoji:'💪', muskler:'Pecs, core',       sett:4, reps:'12-15' },
    { navn:'Hantelflyes',          emoji:'🦅', muskler:'Indre pecs',       sett:3, reps:'12'    },
  ],
  rygg: [
    { navn:'Pull-ups',             emoji:'🤸', muskler:'Lats, biceps',     sett:4, reps:'6-10'  },
    { navn:'Lat pulldown',         emoji:'⬇️', muskler:'Lats',             sett:3, reps:'10-12' },
    { navn:'Sittende kabelroing',  emoji:'🚣', muskler:'Midtre rygg',      sett:4, reps:'10-12' },
    { navn:'Markløft',             emoji:'⚡', muskler:'Hel rygg, glutes', sett:4, reps:'5-6'   },
    { navn:'Hantelroing enarms',   emoji:'💪', muskler:'Øvre rygg, biceps',sett:4, reps:'10×2'  },
    { navn:'T-bar roing',          emoji:'🔩', muskler:'Midtre rygg',      sett:4, reps:'8-10'  },
    { navn:'Face pull',            emoji:'🎯', muskler:'Bakre deltoid',    sett:3, reps:'15'     },
  ],
  bein: [
    { navn:'Knebøy',               emoji:'🦵', muskler:'Quads, glutes',    sett:4, reps:'8-10'  },
    { navn:'Legpress',             emoji:'🔧', muskler:'Quads, glutes',    sett:4, reps:'10-12' },
    { navn:'Rumensk markløft',     emoji:'🍑', muskler:'Hamstrings',       sett:3, reps:'10-12' },
    { navn:'Bulgarian split squat',emoji:'🏋️', muskler:'Quads, glutes',    sett:3, reps:'10×2'  },
    { navn:'Leg curl',             emoji:'🦵', muskler:'Hamstrings',       sett:3, reps:'12'    },
    { navn:'Leg extension',        emoji:'⬆️', muskler:'Quads',            sett:3, reps:'12-15' },
    { navn:'Stående tåhev',        emoji:'👣', muskler:'Leggmuskler',      sett:4, reps:'15-20' },
  ],
  skuldre: [
    { navn:'Military press',       emoji:'⬆️', muskler:'Alle deltoider',   sett:4, reps:'8-10'  },
    { navn:'Sidehev',              emoji:'🔼', muskler:'Lateral deltoid',  sett:3, reps:'12-15' },
    { navn:'Hantelpress sittende', emoji:'💺', muskler:'Fremre deltoid',   sett:3, reps:'10-12' },
    { navn:'Face pull',            emoji:'🎯', muskler:'Bakre deltoid',    sett:3, reps:'15'    },
    { navn:'Frontløft',            emoji:'⬆️', muskler:'Fremre deltoid',   sett:3, reps:'12'    },
    { navn:'Arnold press',         emoji:'🌀', muskler:'Alle deltoider',   sett:3, reps:'10'    },
    { navn:'Bakre flyes',          emoji:'🦅', muskler:'Bakre deltoid',    sett:3, reps:'15'    },
  ],
  bicep: [
    { navn:'Biceps curl',          emoji:'💪', muskler:'Biceps brachii',   sett:4, reps:'10-12' },
    { navn:'Hammer curl',          emoji:'🔨', muskler:'Brachialis',       sett:3, reps:'12'    },
    { navn:'Preacher curl',        emoji:'🙏', muskler:'Biceps',           sett:3, reps:'10'    },
    { navn:'Kabelbiceps curl',     emoji:'🔗', muskler:'Biceps',           sett:3, reps:'12-15' },
    { navn:'Konsentrasjonskurl',   emoji:'🎯', muskler:'Biceps topp',      sett:3, reps:'12'    },
    { navn:'Hengende bicepscurl',  emoji:'💪', muskler:'Biceps, brachialis',sett:3, reps:'10'   },
  ],
  tricep: [
    { navn:'Triceps pushdown',     emoji:'📉', muskler:'Triceps',          sett:4, reps:'12-15' },
    { navn:'Skull crushers',       emoji:'💀', muskler:'Triceps',          sett:3, reps:'10'    },
    { navn:'Overhead triceps ext.',emoji:'⬆️', muskler:'Langt hode',       sett:3, reps:'12'    },
    { navn:'Dips (triceps)',        emoji:'⬇️', muskler:'Triceps',          sett:3, reps:'12'    },
    { navn:'Kabeltriceps ext.',    emoji:'🔗', muskler:'Triceps',          sett:3, reps:'12-15' },
    { navn:'Nær-grep benkpress',   emoji:'🤏', muskler:'Triceps, pecs',    sett:3, reps:'10'    },
  ],
  core: [
    { navn:'Planke',               emoji:'🧘', muskler:'Hele core',        sett:3, reps:'60s'   },
    { navn:'Crunches',             emoji:'🔄', muskler:'Rectus abdominis', sett:3, reps:'20'    },
    { navn:'Russian twist',        emoji:'🔃', muskler:'Obliques',         sett:3, reps:'20×2'  },
    { navn:'Beinheving',           emoji:'🦵', muskler:'Nedre mage',       sett:3, reps:'15'    },
    { navn:'Kabelscoops',          emoji:'🔗', muskler:'Obliques',         sett:3, reps:'12×2'  },
    { navn:'Ab wheel rollout',     emoji:'⚙️', muskler:'Hele core',        sett:3, reps:'10'    },
    { navn:'Hollow hold',          emoji:'🎯', muskler:'Core stabilitet',  sett:3, reps:'30s'   },
  ],
  fullkropp: [
    { navn:'Knebøy',               emoji:'🦵', muskler:'Quads, glutes',    sett:4, reps:'8-10'  },
    { navn:'Benkpress',            emoji:'🏋️', muskler:'Pecs, triceps',    sett:4, reps:'8-10'  },
    { navn:'Pull-ups',             emoji:'🤸', muskler:'Lats, biceps',     sett:3, reps:'6-10'  },
    { navn:'Military press',       emoji:'⬆️', muskler:'Deltoider',        sett:3, reps:'8-10'  },
    { navn:'Markløft',             emoji:'⚡', muskler:'Hel rygg',         sett:3, reps:'5-6'   },
    { navn:'Planke',               emoji:'🧘', muskler:'Core',             sett:3, reps:'60s'   },
  ],
  cardio: [
    { navn:'Løping/tredemølle',    emoji:'🏃', muskler:'Kondisjon',        sett:1, reps:'30 min'},
    { navn:'Sykkel intervaller',   emoji:'🚴', muskler:'Kondisjon, bein',  sett:5, reps:'3 min' },
    { navn:'Romaskin',             emoji:'🚣', muskler:'Kondisjon, rygg',  sett:3, reps:'5 min' },
    { navn:'Burpees',              emoji:'🔥', muskler:'Full kropp',       sett:4, reps:'15'    },
    { navn:'Kettlebell swing',     emoji:'🔔', muskler:'Posterior chain',  sett:4, reps:'20'    },
    { navn:'Box jumps',            emoji:'📦', muskler:'Eksplosivitet',    sett:4, reps:'10'    },
  ],
  tabata: [
    { navn:'Burpees',              emoji:'🔥', muskler:'Full kropp',       sett:8, reps:'20s'   },
    { navn:'Fjellklatrere',        emoji:'⛰️', muskler:'Core, kondisjon',  sett:8, reps:'20s'   },
    { navn:'Jump squats',          emoji:'💥', muskler:'Bein, kondisjon',  sett:8, reps:'20s'   },
    { navn:'Push-up rask',         emoji:'💪', muskler:'Bryst, kondisjon', sett:8, reps:'20s'   },
  ],
}

function parsGrupper(tittel: string): string[] {
  const t = tittel.toLowerCase()
  const ALIASES: [RegExp, string][] = [
    [/bryst|chest/,         'bryst'],
    [/rygg|back/,           'rygg'],
    [/bein|legs?|squat/,    'bein'],
    [/skuld|shoulder/,      'skuldre'],
    [/bicep/,               'bicep'],
    [/tricep/,              'tricep'],
    [/core|mage|abs/,       'core'],
    [/full|total|kropp/,    'fullkropp'],
    [/cardio|løp|sykkel/,   'cardio'],
    [/tabata|hiit/,         'tabata'],
  ]
  const funnet: string[] = []
  for (const [re, key] of ALIASES) {
    if (re.test(t) && !funnet.includes(key)) funnet.push(key)
  }
  return funnet
}

function hentAnbefaltOvelser(tittel: string, dato: string): typeof PREV_DB[string] {
  const grupper = parsGrupper(tittel)
  if (grupper.length === 0) return []
  const seed = dato.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const resultat: typeof PREV_DB[string] = []
  for (const gruppe of grupper) {
    const pool   = PREV_DB[gruppe] ?? []
    const antall = grupper.length === 1 ? 4 : grupper.length === 2 ? 3 : 2
    const start  = seed % Math.max(1, pool.length)
    for (let i = 0; i < antall && i < pool.length; i++) {
      resultat.push(pool[(start + i) % pool.length])
    }
  }
  return resultat
}

const TYPE_META: Record<OktType, { color: string; emoji: string; label: string }> = {
  styrke: { color: 'var(--cyan)',   emoji: '🏋️', label: 'Styrke' },
  cardio: { color: 'var(--green)',  emoji: '🏃', label: 'Cardio' },
  hvile:  { color: 'var(--purple)', emoji: '😴', label: 'Hvile'  },
  annet:  { color: 'var(--orange)', emoji: '⚡', label: 'Annet'  },
}
const UKEDAGER = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

export default function KalenderPage() {
  const router   = useRouter()
  const supabase = createClient()
  const qc       = useQueryClient()

  const [maned,       setManed]       = useState(new Date())
  const [valgtDag,    setValgtDag]    = useState<Date>(new Date())
  const [visModal,    setVisModal]    = useState(false)
  const [editOkt,     setEditOkt]     = useState<Okt | null>(null)
  const [form,        setForm]        = useState({ tittel: '', type: 'styrke' as OktType, varighet_min: 60, notater: '' })
  const [visDetalj,   setVisDetalj]   = useState<string | null>(null)
  // Inline slett-bekreftelse — ingen confirm() dialog
  const [slettId,     setSlettId]     = useState<string | null>(null)

  const { data: user }                      = useUser()
  const { data: okterArr = [], isFetching } = useOkterManed(user?.id, maned)
  const lagreOktMut = useLagreOkt()
  const slettOktMut = useSlettOkt()

  const okter: Record<string, Okt[]> = {}
  okterArr.forEach((o: Okt) => {
    if (!okter[o.dato]) okter[o.dato] = []
    okter[o.dato].push(o)
  })

  const days        = eachDayOfInterval({ start: startOfMonth(maned), end: endOfMonth(maned) })
  const offset      = (getDay(startOfMonth(maned)) + 6) % 7
  const dagKey      = format(valgtDag, 'yyyy-MM-dd')
  const dagensOkter = okter[dagKey] ?? []

  const bytManed = (dir: 1 | -1) => {
    const ny = dir === 1 ? addMonths(maned, 1) : subMonths(maned, 1)
    setManed(ny)
    if (user) {
      qc.prefetchQuery({
        queryKey: QK.okterManed(user.id, format(ny, 'yyyy-MM')),
        staleTime: 3 * 60 * 1000,
        queryFn: async () => {
          const fra = format(startOfMonth(ny), 'yyyy-MM-dd')
          const til = format(endOfMonth(ny),   'yyyy-MM-dd')
          const { data } = await supabase.from('okter')
            .select('id, dato, tittel, type, varighet_min, notater, ovelser')
            .eq('bruker_id', user.id)
            .gte('dato', fra).lte('dato', til).order('dato')
          return data ?? []
        },
      })
    }
  }

  const åpnNy = () => {
    setEditOkt(null)
    setForm({ tittel: '', type: 'styrke', varighet_min: 60, notater: '' })
    setVisModal(true)
  }
  const åpnRediger = (o: Okt, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditOkt(o)
    setForm({ tittel: o.tittel, type: o.type, varighet_min: o.varighet_min, notater: o.notater ?? '' })
    setVisModal(true)
  }

const lagreOkt = async () => {
  if (!user || !form.tittel.trim()) return
  const dato = format(valgtDag, 'yyyy-MM-dd')
  const forslag = editOkt ? [] : hentAnbefaltOvelser(form.tittel, dato)
  const ovelser = forslag.map((o: any) => ({ navn: o.navn, sett: o.sett, reps: o.reps, kg: 0 }))
  await lagreOktMut.mutateAsync({
    userId: user.id, dato,
    tittel: form.tittel, type: form.type,
    varighet_min: form.varighet_min, notater: form.notater,
    id: editOkt?.id,
    ovelser,
  })
  setVisModal(false)
  setEditOkt(null)
}

  // Direkte slett — ingen confirm(), bruker inline bekreftelse
  const slettOkt = async (okt: Okt, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    setSlettId(null)
    // Optimistisk: fjern fra cache FØR Supabase svarer
    const qKey = QK.okterManed(user.id, format(maned, 'yyyy-MM'))
    qc.setQueryData(qKey, (gammel: Okt[] = []) => gammel.filter(o => o.id !== okt.id))
    // Kjør Supabase i bakgrunnen
    slettOktMut.mutate({
      id: okt.id, userId: user.id,
      maned: format(maned, 'yyyy-MM'), dato: okt.dato,
    })
  }

  const lagrer = lagreOktMut.isPending

  return (
    <div className="kal-page anim-fade-up">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title">Kalender</h1>
        <p className="page-subtitle">Planlegg og klikk deg rett inn i treningsøkten</p>
      </div>

      <div className="kal-layout">
        {/* ── VENSTRE ── */}
        <div className="kal-venstre">
          <div className="kal-nav glass-card">
            <button className="kal-nav-btn" onClick={() => bytManed(-1)}>‹</button>
            <span className="kal-nav-tittel">
              {format(maned, 'MMMM yyyy', { locale: nb })}
              {isFetching && <span className="kal-sync-dot" />}
            </span>
            <button className="kal-nav-btn" onClick={() => bytManed(1)}>›</button>
          </div>

          <div className="kal-grid glass-card">
            <div className="kal-ukedager">
              {UKEDAGER.map(d => <div key={d} className="kal-ukd">{d}</div>)}
            </div>
            <div className="kal-dager">
              {Array.from({ length: offset }).map((_, i) =>
                <div key={`e${i}`} className="kal-dag kal-tom" />
              )}
              {days.map(dag => {
                const key    = format(dag, 'yyyy-MM-dd')
                const events = okter[key] ?? []
                const valgt  = isSameDay(dag, valgtDag)
                const idag   = isToday(dag)
                return (
                  <div key={key}
                    className={['kal-dag', idag ? 'kal-idag' : '', valgt ? 'kal-valgt' : ''].filter(Boolean).join(' ')}
                    onClick={() => setValgtDag(dag)}>
                    <span className="kal-dag-nr">{format(dag, 'd')}</span>
                    {events.length > 0 && (
                      <div className="kal-prikker">
                        {events.slice(0, 3).map((e, i) => (
                          <span key={i} className="kal-prikk"
                            style={{ background: TYPE_META[e.type].color }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="kal-legend glass-card">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <div key={k} className="kal-leg-item">
                <span className="kal-leg-prikk" style={{ background: v.color }} />{v.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── HØYRE ── */}
        <div className="kal-hoeyre">
          <div className="kal-dag-header glass-card">
            <div>
              <div className="kal-dag-tittel">
                {format(valgtDag, 'EEEE d. MMMM', { locale: nb }).replace(/^\w/, c => c.toUpperCase())}
              </div>
              <div className="kal-dag-sub">
                {dagensOkter.length === 0
                  ? 'Ingen treningsøkter'
                  : `${dagensOkter.length} økt${dagensOkter.length > 1 ? 'er' : ''} planlagt`}
              </div>
            </div>
            <button className="btn btn-primary kal-legg-btn" onClick={åpnNy}>＋ Ny økt</button>
          </div>

          {dagensOkter.length === 0 ? (
            <div className="kal-ingen glass-card">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              <div className="kal-ingen-t">Ingen økt planlagt</div>
              <div className="kal-ingen-s">Trykk "Ny økt" for å planlegge</div>
              <button className="btn btn-primary"
                style={{ marginTop: '1rem', fontSize: '0.82rem' }} onClick={åpnNy}>
                ＋ Planlegg treningsøkt
              </button>
            </div>
          ) : (
            <div className="kal-okter-liste">
              {dagensOkter.map(okt => {
                const meta   = TYPE_META[okt.type]
                const ovList = okt.ovelser ?? []
                const aapen  = visDetalj === okt.id
                const bekrefter = slettId === okt.id
                return (
                  <div key={okt.id} className="kal-okt glass-card"
                    style={{ borderColor: `${meta.color}25` }}>
                    <div className="kal-okt-topp"
                      onClick={() => { if (!bekrefter) setVisDetalj(aapen ? null : okt.id) }}>
                      <div className="kal-okt-icon"
                        style={{ background: `${meta.color}12`, borderColor: `${meta.color}25` }}>
                        {meta.emoji}
                      </div>
                      <div className="kal-okt-info">
                        <div className="kal-okt-navn">{okt.tittel}</div>
                        <div className="kal-okt-meta">
                          <span className="kal-badge"
                            style={{ color: meta.color, borderColor: `${meta.color}30`, background: `${meta.color}10` }}>
                            {meta.label}
                          </span>
                          <span className="kal-meta-txt">⏱ {okt.varighet_min} min</span>
                          {ovList.length > 0 && <span className="kal-meta-txt">💪 {ovList.length} ovelser</span>}
                        </div>
                      </div>
                      <div className="kal-okt-ctrl">
                        {bekrefter ? (
                          // ── Inline bekreftelse – ingen confirm() ──
                          <>
                            <button className="kal-slett-ja"
                              onClick={e => slettOkt(okt, e)}>
                              Slett
                            </button>
                            <button className="kal-slett-nei"
                              onClick={e => { e.stopPropagation(); setSlettId(null) }}>
                              Avbryt
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="kal-edit-btn"
                              onClick={e => åpnRediger(okt, e)}>✏️</button>
                            <button className="kal-del-btn"
                              onClick={e => { e.stopPropagation(); setSlettId(okt.id) }}>🗑️</button>
                            <span className="kal-toggle">{aapen ? '▲' : '▼'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {aapen && !bekrefter && (
                      <div className="kal-okt-detalj">
                        {okt.notater && <div className="kal-notater">📝 {okt.notater}</div>}
                        {ovList.length > 0 ? (
                          <div className="kal-ov-liste">
                            <div className="kal-ov-lbl">Planlagte ovelser</div>
                            {ovList.map((ov, i) => {
                              const info = finnOvInfo(ov.navn)
                              return (
                                <div key={i} className="kal-ov-rad">
                                  <span className="kal-ov-em">{info.emoji}</span>
                                  <div className="kal-ov-info">
                                    <div className="kal-ov-navn">{ov.navn}</div>
                                    {info.muskler && <div className="kal-ov-musk">{info.muskler}</div>}
                                  </div>
                                  <div className="kal-ov-tall">{ov.sett}×{ov.reps}</div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (() => {
                          const forslag = hentAnbefaltOvelser(okt.tittel, okt.dato)
                          return forslag.length > 0 ? (
                            <div className="kal-ov-liste">
                              <div className="kal-ov-lbl-preview">
                                <span>✨ Anbefalte øvelser</span>
                                <span className="kal-ov-lbl-hint">Varieres automatisk per dag</span>
                              </div>
                              {forslag.map((ov, i) => (
                                <div key={i} className="kal-ov-rad kal-ov-preview">
                                  <span className="kal-ov-em">{ov.emoji}</span>
                                  <div className="kal-ov-info">
                                    <div className="kal-ov-navn">{ov.navn}</div>
                                    <div className="kal-ov-musk">{ov.muskler}</div>
                                  </div>
                                  <div className="kal-ov-tall kal-ov-tall-preview">
                                    {ov.sett}×{ov.reps}
                                  </div>
                                </div>
                              ))}
                              <div className="kal-preview-note">
                                💡 Endelig øvelsevalg skjer når du trykker Start
                              </div>
                            </div>
                          ) : (
                            <div className="kal-ingen-ov">
                              Ingen øvelser lagt til — genereres automatisk når du starter
                            </div>
                          )
                        })()}
                        
                        {/* Enkel start-knapp - bare sender ID */}
                        <button 
                          className="kal-start-btn"
                          onClick={() => {
                            router.push(`/treninger/okt?okt=${okt.id}`)
                          }}
                        >
                          ▶ Start treningsøkt
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {visModal && (
        <div className="kal-modal-bg" onClick={() => setVisModal(false)}>
          <div className="kal-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="kal-modal-header">
              <h3>{editOkt ? 'Rediger økt' : `Ny økt — ${format(valgtDag, 'd. MMM', { locale: nb })}`}</h3>
              <button className="kal-modal-x" onClick={() => setVisModal(false)}>✕</button>
            </div>
            <div className="kal-modal-body">
              <label className="kal-lbl">Tittel</label>
              <input className="input" placeholder="f.eks. Bryst & Tricep"
                value={form.tittel}
                onChange={e => setForm(f => ({ ...f, tittel: e.target.value }))} />

              <label className="kal-lbl">Type</label>
              <div className="kal-type-rad">
                {(Object.keys(TYPE_META) as OktType[]).map(t => (
                  <button key={t}
                    className={`kal-type-btn${form.type === t ? ' on' : ''}`}
                    style={form.type === t ? { borderColor: TYPE_META[t].color, color: TYPE_META[t].color, background: `${TYPE_META[t].color}12` } : {}}
                    onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {TYPE_META[t].emoji} {TYPE_META[t].label}
                  </button>
                ))}
              </div>

              <label className="kal-lbl">Varighet</label>
              <div className="kal-var-rad">
                {[30, 45, 60, 75, 90, 120].map(v => (
                  <button key={v}
                    className={`kal-var-btn${form.varighet_min === v ? ' on' : ''}`}
                    onClick={() => setForm(f => ({ ...f, varighet_min: v }))}>
                    {v} min
                  </button>
                ))}
              </div>

              <label className="kal-lbl">Notater (valgfritt)</label>
              <textarea className="input" rows={2} placeholder="Notater til økten..."
                value={form.notater}
                onChange={e => setForm(f => ({ ...f, notater: e.target.value }))} />
            </div>
            <div className="kal-modal-footer">
              <button className="btn btn-ghost" onClick={() => setVisModal(false)}>Avbryt</button>
              <button className="btn btn-primary"
                onClick={lagreOkt} disabled={lagrer || !form.tittel.trim()}>
                {lagrer ? <span className="spinner" style={{ width: 14, height: 14 }} /> : editOkt ? '💾 Lagre' : '＋ Opprett'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .kal-page{max-width:1060px;width:100%}
        .kal-layout{display:grid;grid-template-columns:320px 1fr;gap:1.25rem;align-items:start}
        @media(max-width:820px){.kal-layout{grid-template-columns:1fr}}
        .kal-venstre{display:flex;flex-direction:column;gap:.75rem}
        .kal-nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem}
        .kal-nav-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1rem;transition:all .15s;display:flex;align-items:center;justify-content:center}
        .kal-nav-btn:hover{background:rgba(255,255,255,.12);color:#fff}
        .kal-nav-tittel{font-family:var(--font-display,sans-serif);font-size:1rem;font-weight:700;color:#fff;text-transform:capitalize;display:flex;align-items:center;gap:8px}
        .kal-sync-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--cyan);animation:kal-pulse .8s ease-in-out infinite}
        @keyframes kal-pulse{0%,100%{opacity:.3}50%{opacity:1}}
        .kal-grid{padding:.875rem}
        .kal-ukedager{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px}
        .kal-ukd{text-align:center;font-size:.62rem;font-weight:700;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.06em;padding:4px 0}
        .kal-dager{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .kal-dag{aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;border:1px solid transparent;gap:2px}
        .kal-dag:hover{background:rgba(255,255,255,.06)}
        .kal-tom{cursor:default}
        .kal-dag-nr{font-size:.78rem;color:rgba(255,255,255,.5);line-height:1}
        .kal-idag{background:rgba(0,245,255,.08);border-color:rgba(0,245,255,.22)!important}
        .kal-idag .kal-dag-nr{color:var(--cyan,#00f5ff);font-weight:700}
        .kal-valgt{background:rgba(0,245,255,.14)!important;border-color:rgba(0,245,255,.45)!important}
        .kal-valgt .kal-dag-nr{color:var(--cyan,#00f5ff)!important;font-weight:700}
        .kal-prikker{display:flex;gap:2px;justify-content:center}
        .kal-prikk{width:4px;height:4px;border-radius:50%;box-shadow:0 0 4px currentColor}
        .kal-legend{display:flex;justify-content:space-around;padding:.6rem .875rem;flex-wrap:wrap;gap:6px}
        .kal-leg-item{display:flex;align-items:center;gap:5px;font-size:.68rem;color:rgba(255,255,255,.38)}
        .kal-leg-prikk{width:7px;height:7px;border-radius:50%}
        .kal-hoeyre{display:flex;flex-direction:column;gap:.75rem;min-width:0}
        .kal-dag-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;gap:1rem;flex-wrap:wrap}
        .kal-dag-tittel{font-family:var(--font-display,sans-serif);font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:2px}
        .kal-dag-sub{font-size:.75rem;color:rgba(255,255,255,.3)}
        .kal-legg-btn{font-size:.82rem!important;padding:.5rem 1rem!important}
        .kal-ingen{display:flex;flex-direction:column;align-items:center;text-align:center;padding:2.5rem 1.5rem}
        .kal-ingen-t{font-family:var(--font-display,sans-serif);font-size:.9rem;font-weight:700;color:#fff;margin-bottom:4px}
        .kal-ingen-s{font-size:.78rem;color:rgba(255,255,255,.3)}
        .kal-okter-liste{display:flex;flex-direction:column;gap:.75rem}
        .kal-okt{overflow:hidden;transition:border-color .2s}
        .kal-okt-topp{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem;cursor:pointer;transition:background .12s}
        .kal-okt-topp:hover{background:rgba(255,255,255,.02)}
        .kal-okt-icon{width:40px;height:40px;border-radius:10px;border:1px solid;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
        .kal-okt-info{flex:1;min-width:0}
        .kal-okt-navn{font-family:var(--font-display,sans-serif);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kal-okt-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .kal-badge{padding:2px 8px;border-radius:999px;font-size:.65rem;font-weight:600;border:1px solid}
        .kal-meta-txt{font-size:.7rem;color:rgba(255,255,255,.3)}
        .kal-okt-ctrl{display:flex;align-items:center;gap:4px;flex-shrink:0}
        .kal-edit-btn,.kal-del-btn{background:none;border:none;cursor:pointer;font-size:.85rem;padding:4px 6px;border-radius:6px;transition:background .12s}
        .kal-edit-btn:hover{background:rgba(255,255,255,.08)}
        .kal-del-btn:hover{background:rgba(255,50,50,.12)}
        .kal-slett-ja{padding:4px 10px;border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;background:rgba(255,50,50,.15);border:1px solid rgba(255,50,50,.3);color:#ff5555;transition:all .12s;font-family:var(--font-body,sans-serif)}
        .kal-slett-ja:hover{background:rgba(255,50,50,.28);border-color:rgba(255,50,50,.5)}
        .kal-slett-nei{padding:4px 10px;border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);transition:all .12s;font-family:var(--font-body,sans-serif)}
        .kal-slett-nei:hover{background:rgba(255,255,255,.1);color:#fff}
        .kal-toggle{font-size:.6rem;color:rgba(255,255,255,.22);margin-left:4px}
        .kal-okt-detalj{padding:0 1.25rem 1.25rem;border-top:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;gap:.75rem}
        .kal-notater{font-size:.78rem;color:rgba(255,255,255,.4);padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;margin-top:.75rem}
        .kal-ov-liste{display:flex;flex-direction:column;gap:0;margin-top:.5rem}
        .kal-ov-lbl{font-size:.6rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.25);font-weight:700;margin-bottom:8px}
        .kal-ov-lbl-preview{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .kal-ov-lbl-preview>span:first-child{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--cyan,#00f5ff);font-weight:700}
        .kal-ov-lbl-hint{font-size:.6rem;color:rgba(255,255,255,.2);font-style:italic}
        .kal-ov-preview{background:rgba(0,245,255,0.02);border-radius:8px;border:1px solid rgba(0,245,255,0.06);margin-bottom:3px}
        .kal-ov-preview:hover{background:rgba(0,245,255,0.05)!important;border-color:rgba(0,245,255,0.12)!important}
        .kal-ov-tall-preview{color:var(--cyan,#00f5ff);opacity:.7;font-weight:600}
        .kal-preview-note{font-size:.65rem;color:rgba(255,255,255,.2);text-align:center;padding:8px;margin-top:4px;border-top:1px solid rgba(255,255,255,.04)}
        .kal-ov-rad{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;transition:background .1s}
        .kal-ov-rad:hover{background:rgba(255,255,255,.03)}
        .kal-ov-em{font-size:1.1rem;flex-shrink:0}
        .kal-ov-info{flex:1;min-width:0}
        .kal-ov-navn{font-size:.82rem;color:rgba(255,255,255,.75);font-weight:500}
        .kal-ov-musk{font-size:.65rem;color:rgba(255,255,255,.3);margin-top:1px}
        .kal-ov-tall{font-size:.7rem;color:rgba(255,255,255,.3);flex-shrink:0;white-space:nowrap}
        .kal-ingen-ov{font-size:.78rem;color:rgba(255,255,255,.28);text-align:center;padding:12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px dashed rgba(255,255,255,.08);margin-top:.5rem}
        .kal-start-btn{width:100%;padding:.75rem;border-radius:10px;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.25);color:var(--cyan,#00f5ff);font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body,sans-serif);letter-spacing:.02em}
        .kal-start-btn:hover{background:rgba(0,245,255,.14);border-color:rgba(0,245,255,.45);box-shadow:0 0 20px rgba(0,245,255,.1)}
        .kal-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
        .kal-modal{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:0}
        .kal-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,.07)}
        .kal-modal-header h3{font-family:var(--font-display,sans-serif);font-size:1rem;font-weight:700;color:#fff}
        .kal-modal-x{background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.85rem;padding:4px 8px;border-radius:6px;transition:all .12s}
        .kal-modal-x:hover{background:rgba(255,255,255,.08);color:#fff}
        .kal-modal-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:.875rem}
        .kal-lbl{font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3);font-weight:700;margin-bottom:-6px}
        .kal-type-rad{display:flex;gap:6px;flex-wrap:wrap}
        .kal-type-btn{padding:5px 12px;border-radius:8px;font-size:.78rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);cursor:pointer;transition:all .12s;font-family:var(--font-body,sans-serif)}
        .kal-var-rad{display:flex;gap:6px;flex-wrap:wrap}
        .kal-var-btn{padding:5px 12px;border-radius:8px;font-size:.78rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);cursor:pointer;transition:all .12s;font-family:var(--font-body,sans-serif)}
        .kal-var-btn.on{background:rgba(0,245,255,.1);border-color:rgba(0,245,255,.3);color:var(--cyan,#00f5ff)}
        .kal-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,.07)}
        @media(max-width:600px){.kal-dag-header{flex-direction:column;align-items:flex-start}.kal-legg-btn{width:100%;justify-content:center}}
      `}</style>
    </div>
  )
}
