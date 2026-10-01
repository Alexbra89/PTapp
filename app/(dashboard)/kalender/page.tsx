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
import ProgramMal from './ProgramMal'
import { ChevronLeft, ChevronRight, Plus, FolderOpen, Dumbbell, Activity, Moon, Sparkles, Pencil, Trash2, ChevronDown, ArrowRight, Check, CalendarPlus, X } from 'lucide-react'
import { muskler as musklerFor, visesBakfra, MUSKELNAVN, utvalg, froFraDato, finnOvelseNavn } from '@/data/ovelsesbibliotek'
import { MuskelkartMini } from '@/components/atelier/Muskelkart'
import { hentInnstillinger } from '@/lib/innstillinger'

type OktType = 'styrke' | 'cardio' | 'hvile' | 'annet'
interface Okt {
  id: string; dato: string; tittel: string; type: OktType
  varighet_min: number; notater?: string; fullfort?: boolean
  ovelser?: { navn: string; sett: number; reps: string; kg?: number }[]
}

// Slå opp øvelsen i biblioteket for muskelkart og muskelnavn
function OvelseMerke({ navn }: { navn: string }) {
  const b = finnOvelseNavn(navn)
  if (!b) return <span className="kal-ov-em"><Dumbbell size={14} strokeWidth={1.3} style={{ color: 'var(--text-muted)' }} /></span>
  const m = musklerFor(b)
  return <span className="kal-ov-em"><MuskelkartMini {...m} bakfra={visesBakfra(m.primaer)} hoyde={38} /></span>
}
const musklerTekst = (navn: string) => {
  const b = finnOvelseNavn(navn)
  return b ? musklerFor(b).primaer.slice(0, 2).map(x => MUSKELNAVN[x]).join(' · ') : ''
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

type Forslag = { navn: string; emoji: string; muskler: string; sett: number; reps: string }
// Forslag fra det felles biblioteket, stabile per dato
function hentAnbefaltOvelser(tittel: string, dato: string): Forslag[] {
  const grupper = parsGrupper(tittel)
  const antall = grupper.length === 1 ? 4 : grupper.length === 2 ? 3 : 2
  const res: Forslag[] = []
  grupper.forEach((g, i) => {
    for (const o of utvalg(g, 'alle', antall, froFraDato(dato) + i, hentInnstillinger().niva)) {
      if (!res.some(r => r.navn === o.navn)) res.push({ navn: o.navn, emoji: '', muskler: o.muskelgruppe, sett: o.sett, reps: o.reps })
    }
  })
  return res
}

const TYPE_META: Record<OktType, { color: string; ikon: typeof Dumbbell; label: string }> = {
  styrke: { color: 'var(--gold)',     ikon: Dumbbell, label: 'Styrke' },
  cardio: { color: 'var(--sage)',     ikon: Activity, label: 'Cardio' },
  hvile:  { color: 'var(--platinum)', ikon: Moon,     label: 'Hvile'  },
  annet:  { color: 'var(--ember)',    ikon: Sparkles, label: 'Annet'  },
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
  const [slettId,     setSlettId]     = useState<string | null>(null)
  const [visProgramMal, setVisProgramMal] = useState(false)
  const [lagreFeil,   setLagreFeil]   = useState('')

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
            .select('id, dato, tittel, type, varighet_min, notater, ovelser, fullfort')
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
    setLagreFeil('')
    try {
      await lagreOktMut.mutateAsync({
        userId: user.id, dato,
        tittel: form.tittel, type: form.type,
        varighet_min: form.varighet_min, notater: form.notater,
        id: editOkt?.id,
        ovelser,
      })
    } catch (e: any) {
      // Uten dette ble modalen stående stille ved nettverks-/databasefeil
      setLagreFeil(e?.message ?? 'Kunne ikke lagre økten.')
      return
    }
    setVisModal(false)
    setEditOkt(null)
  }

const brukProgram = async (program: any) => {
  if (!user) return
  const datoStr = format(valgtDag, 'yyyy-MM-dd')
  const ovelser = program.ovelser.map((o: any) => ({
    navn: o.navn,
    sett: o.sett,
    reps: o.reps,
    kg: o.kg || 0
  }))
  
  try {
  await lagreOktMut.mutateAsync({
    userId: user.id,
    dato: datoStr,
    tittel: program.navn,
    type: 'styrke',
    varighet_min: 60,
    notater: '',
    ovelser: ovelser
  })
  } catch {
    return
  }
  
  setVisProgramMal(false)
  qc.invalidateQueries({ queryKey: QK.okterManed(user.id, format(maned, 'yyyy-MM')) })
}

  const slettOkt = async (okt: Okt, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    setSlettId(null)
    const qKey = QK.okterManed(user.id, format(maned, 'yyyy-MM'))
    qc.setQueryData(qKey, (gammel: Okt[] = []) => gammel.filter(o => o.id !== okt.id))
    slettOktMut.mutate({
      id: okt.id, userId: user.id,
      maned: format(maned, 'yyyy-MM'), dato: okt.dato,
    })
  }

  const lagrer = lagreOktMut.isPending

  return (
    <div className="kal-page anim-fade-up">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title">Kalenderen<em className="gold">.</em></h1>
        <p className="page-subtitle">Planlegg uken · trykk en økt for å starte den</p>
      </div>

      <div className="kal-maned-sum">
        <div><span className="eyebrow">Økter i {format(maned, 'MMMM', { locale: nb })}</span><strong>{okterArr.length}</strong></div>
        <div><span className="eyebrow">Fullført</span><strong className="gold">{okterArr.filter((o: Okt) => o.fullfort).length}</strong></div>
        <div><span className="eyebrow">Minutter planlagt</span><strong>{okterArr.reduce((s: number, o: Okt) => s + (o.varighet_min || 0), 0).toLocaleString('nb-NO')}</strong></div>
      </div>

      <div className="kal-layout">
        <div className="kal-venstre">
          <div className="kal-nav glass-card">
            <button className="kal-nav-btn" onClick={() => bytManed(-1)} aria-label="Forrige måned"><ChevronLeft size={16} strokeWidth={1.5} /></button>
            <span className="kal-nav-tittel">
              {format(maned, 'MMMM yyyy', { locale: nb })}
              {isFetching && <span className="kal-sync-dot" />}
            </span>
            <button className="kal-nav-btn" onClick={() => bytManed(1)} aria-label="Neste måned"><ChevronRight size={16} strokeWidth={1.5} /></button>
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
                          <span key={i} className={`kal-prikk${e.fullfort ? ' ferdig' : ''}`}
                            style={{ background: e.fullfort ? 'var(--gold)' : TYPE_META[e.type]?.color ?? 'var(--gold)' }} />
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
            <div className="kal-dag-knapper">
              <button className="btn btn-ghost" onClick={() => setVisProgramMal(true)}><FolderOpen size={14} strokeWidth={1.5} /> Program</button>
              <button className="btn btn-primary" onClick={åpnNy}><Plus size={14} strokeWidth={1.6} /> Ny økt</button>
            </div>
          </div>

          {dagensOkter.length === 0 ? (
            <div className="kal-ingen glass-card">
              <div className="kal-ingen-t">En ledig dag.</div>
              <div className="kal-ingen-s">Planlegg en økt, eller hent et ferdig program.</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={åpnNy}><CalendarPlus size={14} strokeWidth={1.5} /> Planlegg økt</button>
                <button className="btn btn-ghost" onClick={() => setVisProgramMal(true)}><FolderOpen size={14} strokeWidth={1.5} /> Bruk program</button>
              </div>
            </div>
          ) : (
            <div className="kal-okter-liste">
              {dagensOkter.map(okt => {
                const meta = TYPE_META[okt.type]
                const ovList = okt.ovelser ?? []
                const aapen = visDetalj === okt.id
                const bekrefter = slettId === okt.id
                return (
                  <div key={okt.id} className={`kal-okt glass-card${okt.fullfort ? ' ferdig' : ''}`}>
                    <div className="kal-okt-topp"
                      onClick={() => { if (!bekrefter) setVisDetalj(aapen ? null : okt.id) }}>
                      <div className="kal-okt-icon" style={{ color: meta.color }}>
                        {okt.fullfort ? <Check size={16} strokeWidth={2} /> : <meta.ikon size={16} strokeWidth={1.4} />}
                      </div>
                      <div className="kal-okt-info">
                        <div className="kal-okt-navn">{okt.tittel}</div>
                        <div className="kal-okt-meta">
                          <span style={{ color: meta.color }}>{meta.label}</span>
                          <span>{okt.varighet_min} min</span>
                          {ovList.length > 0 && <span>{ovList.length} øvelser</span>}
                          {okt.fullfort && <span className="kal-ferdig-merke">Fullført</span>}
                        </div>
                      </div>
                      <div className="kal-okt-ctrl">
                        {bekrefter ? (
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
                            <button className="kal-ikon-btn" aria-label="Rediger"
                              onClick={e => åpnRediger(okt, e)}><Pencil size={14} strokeWidth={1.4} /></button>
                            <button className="kal-ikon-btn fare" aria-label="Slett"
                              onClick={e => { e.stopPropagation(); setSlettId(okt.id) }}><Trash2 size={14} strokeWidth={1.4} /></button>
                            <span className={`kal-toggle${aapen ? ' open' : ''}`}><ChevronDown size={16} strokeWidth={1.4} /></span>
                          </>
                        )}
                      </div>
                    </div>

                    {aapen && !bekrefter && (
                      <div className="kal-okt-detalj">
                        {okt.notater && <div className="kal-notater">{okt.notater}</div>}
                        {ovList.length > 0 ? (
                          <div className="kal-ov-liste">
                            <div className="kal-ov-lbl">Planlagte øvelser</div>
                            {ovList.map((ov, i) => {
                              const mTekst = musklerTekst(ov.navn)
                              return (
                                <div key={i} className="kal-ov-rad">
                                  <OvelseMerke navn={ov.navn} />
                                  <div className="kal-ov-info">
                                    <div className="kal-ov-navn">{ov.navn}</div>
                                    {mTekst && <div className="kal-ov-musk">{mTekst}</div>}
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
                                <span className="eyebrow eyebrow-gold">Forslag</span>
                                <span className="kal-ov-lbl-hint">Varieres automatisk per dag</span>
                              </div>
                              {forslag.map((ov, i) => (
                                <div key={i} className="kal-ov-rad kal-ov-preview">
                                  <OvelseMerke navn={ov.navn} />
                                  <div className="kal-ov-info">
                                    <div className="kal-ov-navn">{ov.navn}</div>
                                    <div className="kal-ov-musk">{musklerTekst(ov.navn) || ov.muskler}</div>
                                  </div>
                                  <div className="kal-ov-tall kal-ov-tall-preview">
                                    {ov.sett}×{ov.reps}
                                  </div>
                                </div>
                              ))}
                              <div className="kal-preview-note">
                                Endelig utvalg gjøres når du starter økten.
                              </div>
                            </div>
                          ) : (
                            <div className="kal-ingen-ov">
                              Ingen øvelser lagt til — genereres automatisk når du starter
                            </div>
                          )
                        })()}
                        
                        <button
                          className="btn btn-primary kal-start-btn"
                          onClick={() => router.push(`/treninger/okt?okt=${okt.id}`)}
                        >
                          <span>{okt.fullfort ? 'Åpne økten igjen' : 'Start økten'}</span>
                          <span className="hq-cta-arrow" style={{ width: 34, height: 34 }}><ArrowRight size={16} strokeWidth={1.5} /></span>
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

      {visModal && (
        <div className="kal-modal-bg" onClick={() => setVisModal(false)}>
          <div className="kal-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="kal-modal-header">
              <h3>{editOkt ? 'Rediger økt' : `Ny økt — ${format(valgtDag, 'd. MMM', { locale: nb })}`}</h3>
              <button className="kal-modal-x" onClick={() => setVisModal(false)} aria-label="Lukk"><X size={15} strokeWidth={1.5} /></button>
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
                    onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {(() => { const Ikon = TYPE_META[t].ikon; return <Ikon size={13} strokeWidth={1.5} /> })()} {TYPE_META[t].label}
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
            {lagreFeil && <div className="login-error-box" style={{ margin: '0 1.5rem 1rem' }}><span className="login-error-text">{lagreFeil}</span></div>}
            <div className="kal-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setVisModal(false); setLagreFeil('') }}>Avbryt</button>
              <button className="btn btn-primary"
                onClick={lagreOkt} disabled={lagrer || !form.tittel.trim()}>
                {lagrer ? <span className="spinner" style={{ width: 14, height: 14 }} /> : editOkt ? 'Lagre' : 'Opprett'}
              </button>
            </div>
          </div>
        </div>
      )}

      {visProgramMal && user && (
        <ProgramMal 
          userId={user.id}
          onClose={() => setVisProgramMal(false)}
          onSelectProgram={brukProgram}
        />
      )}

      <style>{`
        .kal-page{max-width:1080px;width:100%}
        .kal-page .page-title em{font-style:italic}
        .kal-maned-sum{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:2rem}
        .kal-maned-sum>div{padding:1.1rem 1rem;display:flex;flex-direction:column;gap:8px}
        .kal-maned-sum>div+div{border-left:1px solid var(--line)}
        .kal-maned-sum strong{font-family:var(--font-serif);font-weight:400;font-size:2.4rem;line-height:1}
        .kal-layout{display:grid;grid-template-columns:340px 1fr;gap:1.25rem;align-items:start}
        @media(max-width:860px){.kal-layout{grid-template-columns:1fr}}
        .kal-venstre{display:flex;flex-direction:column;gap:.75rem}
        .kal-nav{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem}
        .kal-nav-btn{width:36px;height:36px;border-radius:50%;background:transparent;border:1px solid var(--line);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s}
        .kal-nav-btn:hover{color:var(--ink);border-color:var(--line-strong)}
        .kal-nav-tittel{font-family:var(--font-serif)!important;font-weight:400!important;font-size:1.7rem!important;color:var(--ink);text-transform:capitalize;display:flex;align-items:center;gap:10px}
        .kal-sync-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--gold);animation:pulse 1s ease-in-out infinite}
        .kal-grid{padding:1rem}
        .kal-ukedager{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px}
        .kal-ukd{text-align:center;padding:4px 0}
        .kal-dager{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
        .kal-dag{aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:background .2s,border-color .2s;border:1px solid transparent;gap:3px;position:relative}
        .kal-dag:hover{background:rgba(242,236,225,.05)}
        .kal-tom{cursor:default}
        .kal-dag-nr{font-family:var(--font-mono);font-size:.74rem;color:var(--text-secondary);line-height:1}
        .kal-idag{border-color:rgba(201,169,110,.55)!important}
        .kal-idag .kal-dag-nr{color:var(--gold-hi)}
        .kal-valgt{background:var(--ink)!important;border-color:var(--ink)!important}
        .kal-valgt .kal-dag-nr{color:#0B0A09!important;font-weight:500}
        .kal-prikker{display:flex;gap:2px;justify-content:center;position:absolute;bottom:18%}
        .kal-prikk{width:3px;height:3px;border-radius:50%}
        .kal-prikk.ferdig{width:4px;height:4px;box-shadow:0 0 0 2px rgba(201,169,110,.2)}
        .kal-valgt .kal-prikk{background:#0B0A09!important;box-shadow:none}
        .kal-legend{display:flex;justify-content:space-between;padding:.8rem 1rem;flex-wrap:wrap;gap:8px}
        .kal-leg-item{display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)}
        .kal-leg-prikk{width:6px;height:6px;border-radius:50%}
        .kal-hoeyre{display:flex;flex-direction:column;gap:.75rem;min-width:0}
        .kal-dag-header{display:flex;align-items:flex-end;justify-content:space-between;padding:1.5rem;gap:1rem;flex-wrap:wrap}
        .kal-dag-tittel{font-family:var(--font-serif)!important;font-weight:400!important;font-size:2.1rem!important;line-height:1;color:var(--ink);margin-bottom:8px}
        .kal-dag-sub{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--text-muted)}
        .kal-dag-knapper{display:flex;gap:8px}
        .kal-dag-knapper .btn{font-size:.82rem;padding:.6rem 1.05rem;gap:7px}
        .kal-ingen{display:flex;flex-direction:column;align-items:flex-start;padding:2rem 1.5rem}
        .kal-ingen-t{font-family:var(--font-serif);font-size:1.7rem;color:var(--ink);margin-bottom:6px}
        .kal-ingen-s{font-size:.86rem;color:var(--text-muted)}
        .kal-okter-liste{display:flex;flex-direction:column;gap:.75rem}
        .kal-okt{overflow:hidden}
        .kal-okt.ferdig{border-color:rgba(201,169,110,.4)!important;background:linear-gradient(180deg,rgba(201,169,110,.06),rgba(201,169,110,.01)),var(--bg-card)!important}
        .kal-okt-topp{display:flex;align-items:center;gap:14px;padding:1.2rem 1.35rem;cursor:pointer}
        .kal-okt-icon{width:42px;height:42px;border-radius:50%;border:1px solid var(--line-strong);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kal-okt.ferdig .kal-okt-icon{background:var(--gold);border-color:var(--gold);color:#17130C!important}
        .kal-okt-info{flex:1;min-width:0}
        .kal-okt-navn{font-family:var(--font-serif);font-size:1.5rem;line-height:1.05;color:var(--ink);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .kal-okt-meta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)}
        .kal-ferdig-merke{color:var(--gold)}
        .kal-okt-ctrl{display:flex;align-items:center;gap:4px;flex-shrink:0}
        .kal-ikon-btn{width:32px;height:32px;border-radius:50%;background:none;border:1px solid transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .kal-ikon-btn:hover{border-color:var(--line-strong);color:var(--ink)}
        .kal-ikon-btn.fare:hover{color:var(--danger);border-color:rgba(224,97,79,.4)}
        .kal-toggle{color:var(--text-muted);display:flex;transition:transform .35s var(--ease-out)}
        .kal-toggle.open{transform:rotate(180deg)}
        .kal-slett-ja{padding:6px 12px;border-radius:999px;font-size:.76rem;cursor:pointer;background:var(--danger);border:none;color:#0B0A09;font-weight:500}
        .kal-slett-nei{padding:6px 12px;border-radius:999px;font-size:.76rem;cursor:pointer;background:none;border:1px solid var(--line-strong);color:var(--text-secondary)}
        .kal-okt-detalj{padding:0 1.35rem 1.35rem;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:1rem}
        .kal-notater{font-size:.86rem;color:var(--text-secondary);padding:.2rem 0 .2rem 1rem;border-left:1px solid var(--gold);margin-top:1rem;background:none;border-radius:0}
        .kal-ov-liste{display:flex;flex-direction:column;margin-top:.75rem}
        .kal-ov-lbl{margin-bottom:8px!important}
        .kal-ov-lbl-preview{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
        .kal-ov-lbl-hint{font-size:.72rem;color:var(--text-muted)}
        .kal-ov-rad{display:flex;align-items:center;gap:12px;padding:.55rem 0;border-bottom:1px solid var(--line)}
        .kal-ov-rad:last-of-type{border-bottom:none}
        .kal-ov-em{width:30px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kal-ov-info{flex:1;min-width:0}
        .kal-ov-navn{font-size:.92rem;color:var(--ink)}
        .kal-ov-musk{font-family:var(--font-mono);font-size:.56rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-top:3px}
        .kal-ov-tall{font-family:var(--font-mono);font-size:.74rem;color:var(--text-secondary);flex-shrink:0;white-space:nowrap}
        .kal-preview-note{font-size:.76rem;color:var(--text-muted);padding-top:.75rem}
        .kal-ingen-ov{font-size:.84rem;color:var(--text-muted);padding:1rem 0}
        .kal-start-btn{width:100%;justify-content:space-between!important;padding:.9rem .55rem .9rem 1.4rem!important}
        .kal-modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:1rem}
        .kal-modal{width:100%;max-width:500px;max-height:90vh;overflow-y:auto;padding:0;border-radius:28px!important}
        .kal-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.5rem 1rem}
        .kal-modal-x{width:34px;height:34px;border-radius:50%;background:none;border:1px solid var(--line);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .kal-modal-x:hover{color:var(--ink);border-color:var(--line-strong)}
        .kal-modal-body{padding:.5rem 1.5rem 1.25rem;display:flex;flex-direction:column;gap:.9rem}
        .kal-lbl{margin-bottom:-4px}
        .kal-type-rad,.kal-var-rad{display:flex;gap:6px;flex-wrap:wrap}
        .kal-type-btn,.kal-var-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;font-size:.8rem;border:1px solid var(--line);background:none;color:var(--text-secondary);cursor:pointer;transition:all .2s}
        .kal-type-btn.on{background:var(--ink)!important;border-color:var(--ink)!important;color:#0B0A09!important}
        .kal-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:1rem 1.5rem 1.5rem;border-top:1px solid var(--line)}
        @media(max-width:600px){.kal-dag-header{flex-direction:column;align-items:flex-start}.kal-dag-knapper{width:100%}.kal-dag-knapper .btn{flex:1}.kal-maned-sum strong{font-size:1.9rem}}
      `}</style>
    </div>
  )
}