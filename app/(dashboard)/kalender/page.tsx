'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

type OktType = 'styrke'|'cardio'|'hvile'|'annet'

interface Okt {
  id: string; dato: string; tittel: string; type: OktType
  varighet_min: number; notater?: string
  ovelser?: { navn: string; sett: number; reps: string; kg?: number }[]
}

// ── Øvelsebase for beskrivelser ────────────────────────────────────────────────
const OV_DB: Record<string, { emoji: string; muskler: string; beskrivelse: string; tips: string }> = {
  'benkpress':         { emoji:'🏋️', muskler:'Pecs, triceps',       beskrivelse:'Ligg på flatbenk. Bredt grep på stangen. Senk kontrollert til brystet og press opp. Hold skulderblad inn og ned.', tips:'Skulderblad inn og ned hele veien' },
  'skråbenkpress':     { emoji:'📐', muskler:'Øvre pecs',           beskrivelse:'30-45° skråbenk. Aktiverer øvre brystmuskler. Press hantlene opp og inn over brystet.', tips:'30-45° er optimal vinkel' },
  'push-up':           { emoji:'💪', muskler:'Pecs, triceps, core', beskrivelse:'Hender litt bredere enn skuldrene. Kroppen rett. Senk brystet til nær gulvet og press opp.', tips:'Kroppen rett som planke' },
  'dips':              { emoji:'⬇️', muskler:'Pecs, triceps',       beskrivelse:'Hold i parallelle stenger. Lean fremover for brystfokus. Senk til 90° og press opp.', tips:'Len fremover for bryst, rett for triceps' },
  'kabel pec fly':     { emoji:'🔀', muskler:'Indre pecs',          beskrivelse:'Bring hender ned og inn i en bue foran kroppen. Kabelen gir konstant motstand.', tips:'Bøy lett i albuen hele veien' },
  'brystpress maskin': { emoji:'🔧', muskler:'Pecs',                beskrivelse:'God maskin for brystaktivering. Guider bevegelsen og lar deg fokusere på muskelaktivering.', tips:'Full ROM og klem i toppen' },
  'pull-ups':          { emoji:'🤸', muskler:'Lats, biceps',        beskrivelse:'Bredt overgrep. Trekk deg opp til haken er over stangen. Full strekk i bunn.', tips:'Full strekk ned, haken over stangen' },
  'pull-up':           { emoji:'🤸', muskler:'Lats, biceps',        beskrivelse:'Bredt overgrep. Trekk deg opp til haken er over stangen.', tips:'Trekk albuer ned og bak' },
  'markløft':          { emoji:'⚡', muskler:'Hel rygg, glutes',    beskrivelse:'Stangen over fotmidten. RETT RYGG. Press gulvet ned – ikke trekk med ryggen.', tips:'RYGGEN RETT – aldri rund rygg' },
  'lat pulldown':      { emoji:'⬇️', muskler:'Lats',               beskrivelse:'Len 15° bakover. Trekk stangen ned mot øvre bryst. Albuer ned mot hoftene.', tips:'Len 15° bakover, albuer mot hofter' },
  'sittende kabelroing':{ emoji:'🚣', muskler:'Midtre rygg',        beskrivelse:'Trekk hender inn mot navlen. Klem skulderblad i toppen.', tips:'Klem skulderblad, rett rygg' },
  'hantelroing':       { emoji:'💪', muskler:'Øvre rygg, biceps',   beskrivelse:'En arm om gangen, støtt hånd og kne på benk. Trekk albuen opp og bak.', tips:'Albuen opp og bak' },
  'knebøy':            { emoji:'🦵', muskler:'Quads, glutes',       beskrivelse:'Skulderbredde, tær ut. Ned til lårene er parallelle. Bryst opp hele veien.', tips:'Ned til parallell eller dypere' },
  'legpress':          { emoji:'🔧', muskler:'Quads, glutes',       beskrivelse:'Skulderbredde på plata. Ned til 90°. Aldri lås knærne.', tips:'Aldri lås knærne fullt ut' },
  'rumensk markløft':  { emoji:'🍑', muskler:'Hamstrings, glutes',  beskrivelse:'Rett rygg, lean fremover med hoften bak. Stopp ved strekk i hamstrings.', tips:'Rett rygg alltid' },
  'military press':    { emoji:'⬆️', muskler:'Alle deltoider',      beskrivelse:'Stående press fra haken til over hodet. Stram core, ikke lean bakover.', tips:'Stram core, ikke lean bakover' },
  'sidehev':           { emoji:'🔼', muskler:'Lateral deltoid',     beskrivelse:'Løft armene ut til siden i en bue til skulderhøyde.', tips:'Løft til skulderhøyde, pinkies litt opp' },
  'face pull':         { emoji:'🎯', muskler:'Bakre deltoid',       beskrivelse:'Kabelen på øyenivå. Trekk tauet mot ansiktet med høye albuer.', tips:'Albuer høye, trekk til ansiktet' },
  'biceps curl':       { emoji:'💪', muskler:'Biceps brachii',      beskrivelse:'Curl hantlene opp. Albuen forblir fast ved siden – ingen sving.', tips:'Albuen fast, ingen sving' },
  'hammer curl':       { emoji:'🔨', muskler:'Brachialis',          beskrivelse:'Nøytralt grep (tommel opp) curl. Bygger tykkere arm.', tips:'Tommel peker opp hele veien' },
  'preacher curl':     { emoji:'🙏', muskler:'Biceps',              beskrivelse:'Preacher benken isolerer biceps. Full strekk i bunn.', tips:'Full strekk i bunn, sakte ned' },
  'triceps pushdown':  { emoji:'📉', muskler:'Triceps',             beskrivelse:'Albuer fast ved siden, press ned. Klem triceps i bunnen.', tips:'Albuer faste, klem ned' },
  'skull crushers':    { emoji:'💀', muskler:'Triceps',             beskrivelse:'Ligg på benk. Bøy KUN albuene og senk mot pannen. Skuldrene beveger seg ikke.', tips:'KUN albuene bøyer' },
  'overhead triceps ext.':{ emoji:'⬆️', muskler:'Triceps (langt hode)', beskrivelse:'Hold hantel med begge hender over hodet. Senk bak hodet ved å bøye albuene.', tips:'Albuer nær hodet, full strekk opp' },
  'planke':            { emoji:'🧘', muskler:'Hele core',           beskrivelse:'På underarm, kroppen rett. Stram mage, rumpe og lår.', tips:'Stram ALT, hofte verken ned eller opp' },
  'crunches':          { emoji:'🔄', muskler:'Rectus abdominis',    beskrivelse:'Krøll KUN overkroppen. Hender ved tinning. Ikke hev hele ryggen.', tips:'Krøll – ikke hev. Hender ved tinning' },
  'russian twist':     { emoji:'🔃', muskler:'Obliques',            beskrivelse:'Lår 45° fra gulvet. Roter overkroppen side til side.', tips:'Roter fra midjen, ikke skuldrene' },
  'burpees':           { emoji:'🔥', muskler:'Full kropp',          beskrivelse:'Push-up → hopp inn → hopp opp med hendene over hodet.', tips:'Teknisk korrekt er viktigere enn fart' },
  'kettlebell swing':  { emoji:'🔔', muskler:'Posterior chain',     beskrivelse:'HIP HINGE – kraften fra hoften. Eksplosiv snap frem. Klem glutes øverst.', tips:'HIP HINGE, snap hoften frem' },
}

function finnOvInfo(navn: string) {
  const k = navn.toLowerCase().trim()
  return OV_DB[k] ?? { emoji:'⚡', muskler:'', beskrivelse: '', tips: '' }
}

const TYPE_META: Record<OktType, { color: string; emoji: string; label: string }> = {
  styrke: { color:'var(--cyan)',   emoji:'🏋️', label:'Styrke' },
  cardio: { color:'var(--green)',  emoji:'🏃', label:'Cardio' },
  hvile:  { color:'var(--purple)', emoji:'😴', label:'Hvile'  },
  annet:  { color:'var(--orange)', emoji:'⚡', label:'Annet'  },
}

const UKEDAGER = ['Man','Tir','Ons','Tor','Fre','Lør','Søn']

export default function KalenderPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [maned,       setManed]       = useState(new Date())
  const [valgtDag,    setValgtDag]    = useState<Date>(new Date())
  const [okter,       setOkter]       = useState<Record<string, Okt[]>>({})
  const [laster,      setLaster]      = useState(true)

  // Modal
  const [visModal,    setVisModal]    = useState(false)
  const [editOkt,     setEditOkt]     = useState<Okt|null>(null)
  const [form,        setForm]        = useState({ tittel:'', type:'styrke' as OktType, varighet_min:60, notater:'' })
  const [lagrer,      setLagrer]      = useState(false)
  const [nyOvNavn,    setNyOvNavn]    = useState('')

  // Detaljvisning
  const [visDetalj,   setVisDetalj]   = useState<string|null>(null)

  const hent = useCallback(async () => {
    setLaster(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLaster(false); return }
    const fra = format(startOfMonth(maned), 'yyyy-MM-dd')
    const til = format(endOfMonth(maned),   'yyyy-MM-dd')
    const { data } = await supabase.from('okter').select('*')
      .eq('bruker_id', user.id).gte('dato', fra).lte('dato', til).order('dato')
    const grouped: Record<string, Okt[]> = {}
    ;(data ?? []).forEach((o: Okt) => {
      if (!grouped[o.dato]) grouped[o.dato] = []
      grouped[o.dato].push(o)
    })
    setOkter(grouped)
    setLaster(false)
  }, [maned])

  useEffect(() => { hent() }, [hent])

  const lagreOkt = async () => {
    setLagrer(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLagrer(false); return }
    const dato = format(valgtDag, 'yyyy-MM-dd')
    if (editOkt) {
      await supabase.from('okter').update({ ...form, dato }).eq('id', editOkt.id)
    } else {
      await supabase.from('okter').insert([{ ...form, dato, bruker_id: user.id, ovelser:[] }])
    }
    await hent(); setVisModal(false); setLagrer(false); setEditOkt(null)
  }

  const slettOkt = async (id: string) => {
    if (!confirm('Slette denne økten?')) return
    await supabase.from('okter').delete().eq('id', id); await hent()
  }

  const startOktFraKalender = (okt: Okt) => {
    // Send grupper basert på tittel, og økt-id
    router.push(`/treninger/okt?okt=${okt.id}`)
  }

  const days       = eachDayOfInterval({ start: startOfMonth(maned), end: endOfMonth(maned) })
  const offset     = (getDay(startOfMonth(maned)) + 6) % 7
  const dagKey     = format(valgtDag, 'yyyy-MM-dd')
  const dagensOkter = okter[dagKey] ?? []

  const åpnNy = () => {
    setEditOkt(null)
    setForm({ tittel:'', type:'styrke', varighet_min:60, notater:'' })
    setVisModal(true)
  }

  const åpnRediger = (o: Okt, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditOkt(o)
    setForm({ tittel:o.tittel, type:o.type, varighet_min:o.varighet_min, notater:o.notater??'' })
    setVisModal(true)
  }

  return (
    <div className="kal-page anim-fade-up">
      <div className="page-header" style={{marginBottom:'1.25rem'}}>
        <h1 className="page-title">Kalender</h1>
        <p className="page-subtitle">Planlegg og klikk deg rett inn i treningsøkten</p>
      </div>

      <div className="kal-layout">

        {/* ── VENSTRE: kalender ── */}
        <div className="kal-venstre">
          {/* Måneds-nav */}
          <div className="kal-nav glass-card">
            <button className="kal-nav-btn" onClick={() => setManed(m => subMonths(m,1))}>‹</button>
            <span className="kal-nav-tittel">{format(maned, 'MMMM yyyy', { locale:nb })}</span>
            <button className="kal-nav-btn" onClick={() => setManed(m => addMonths(m,1))}>›</button>
          </div>

          <div className="kal-grid glass-card">
            <div className="kal-ukedager">
              {UKEDAGER.map(d => <div key={d} className="kal-ukd">{d}</div>)}
            </div>
            <div className="kal-dager">
              {Array.from({length:offset}).map((_,i) => <div key={`e${i}`} className="kal-dag kal-tom" />)}
              {days.map(dag => {
                const key    = format(dag, 'yyyy-MM-dd')
                const events = okter[key] ?? []
                const valgt  = isSameDay(dag, valgtDag)
                const idag   = isToday(dag)
                return (
                  <div key={key}
                    className={['kal-dag', idag?'kal-idag':'', valgt?'kal-valgt':''].filter(Boolean).join(' ')}
                    onClick={() => setValgtDag(dag)}>
                    <span className="kal-dag-nr">{format(dag,'d')}</span>
                    {events.length > 0 && (
                      <div className="kal-prikker">
                        {events.slice(0,3).map((e,i) => (
                          <span key={i} className="kal-prikk"
                            style={{background: TYPE_META[e.type].color}} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="kal-legend glass-card">
            {Object.entries(TYPE_META).map(([k,v]) => (
              <div key={k} className="kal-leg-item">
                <span className="kal-leg-prikk" style={{background:v.color}} />{v.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── HØYRE: dagspanel ── */}
        <div className="kal-hoeyre">
          {/* Dag-header */}
          <div className="kal-dag-header glass-card">
            <div>
              <div className="kal-dag-tittel">
                {format(valgtDag, 'EEEE d. MMMM', {locale:nb}).replace(/^\w/, c => c.toUpperCase())}
              </div>
              <div className="kal-dag-sub">
                {dagensOkter.length === 0 ? 'Ingen treningsøkter' : `${dagensOkter.length} økt${dagensOkter.length>1?'er':''} planlagt`}
              </div>
            </div>
            <button className="btn btn-primary kal-legg-btn" onClick={åpnNy}>＋ Ny økt</button>
          </div>

          {/* Innhold */}
          {laster ? (
            <div className="kal-spinner"><div className="spinner" /></div>
          ) : dagensOkter.length === 0 ? (
            <div className="kal-ingen glass-card">
              <div style={{fontSize:'2rem', marginBottom:'0.5rem'}}>📅</div>
              <div className="kal-ingen-t">Ingen økt planlagt</div>
              <div className="kal-ingen-s">Trykk "Ny økt" for å planlegge</div>
              <button className="btn btn-primary" style={{marginTop:'1rem', fontSize:'0.82rem'}} onClick={åpnNy}>
                ＋ Planlegg treningsøkt
              </button>
            </div>
          ) : (
            <div className="kal-okter-liste">
              {dagensOkter.map(okt => {
                const meta     = TYPE_META[okt.type]
                const ovList   = okt.ovelser ?? []
                const aapen    = visDetalj === okt.id

                return (
                  <div key={okt.id} className="kal-okt glass-card"
                    style={{borderColor: `${meta.color}25`}}>

                    {/* Økt-header – klikk for å ekspandere */}
                    <div className="kal-okt-topp"
                      onClick={() => setVisDetalj(aapen ? null : okt.id)}>
                      <div className="kal-okt-icon" style={{background:`${meta.color}12`, borderColor:`${meta.color}25`}}>
                        {meta.emoji}
                      </div>
                      <div className="kal-okt-info">
                        <div className="kal-okt-navn">{okt.tittel}</div>
                        <div className="kal-okt-meta">
                          <span className="kal-badge" style={{color:meta.color, borderColor:`${meta.color}30`, background:`${meta.color}10`}}>
                            {meta.label}
                          </span>
                          <span className="kal-meta-txt">⏱ {okt.varighet_min} min</span>
                          {ovList.length > 0 && <span className="kal-meta-txt">💪 {ovList.length} øvelser</span>}
                        </div>
                      </div>
                      <div className="kal-okt-ctrl">
                        <button className="kal-edit-btn" onClick={e => åpnRediger(okt, e)}>✏️</button>
                        <button className="kal-del-btn" onClick={e=>{e.stopPropagation();slettOkt(okt.id)}}>🗑️</button>
                        <span className="kal-toggle">{aapen?'▲':'▼'}</span>
                      </div>
                    </div>

                    {/* Ekspandert: øvelser + start-knapp */}
                    {aapen && (
                      <div className="kal-okt-detalj">
                        {okt.notater && (
                          <div className="kal-notater">📝 {okt.notater}</div>
                        )}

                        {ovList.length > 0 ? (
                          <div className="kal-ov-liste">
                            <div className="kal-ov-lbl">Planlagte øvelser</div>
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
                        ) : (
                          <div className="kal-ingen-ov">
                            Ingen øvelser lagt til — de genereres automatisk når du starter
                          </div>
                        )}

                        <button className="kal-start-btn" onClick={() => startOktFraKalender(okt)}>
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

      {/* ── MODAL: Ny/Rediger økt ── */}
      {visModal && (
        <div className="kal-modal-bg" onClick={() => setVisModal(false)}>
          <div className="kal-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="kal-modal-header">
              <h3>{editOkt ? 'Rediger økt' : `Ny økt — ${format(valgtDag,'d. MMM', {locale:nb})}`}</h3>
              <button className="kal-modal-x" onClick={() => setVisModal(false)}>✕</button>
            </div>

            <div className="kal-modal-body">
              <label className="kal-lbl">Tittel</label>
              <input className="input" placeholder="f.eks. Bryst & Tricep"
                value={form.tittel} onChange={e => setForm(f=>({...f, tittel:e.target.value}))} />

              <label className="kal-lbl">Type</label>
              <div className="kal-type-rad">
                {(Object.keys(TYPE_META) as OktType[]).map(t => (
                  <button key={t}
                    className={`kal-type-btn${form.type===t?' on':''}`}
                    style={form.type===t ? {borderColor:TYPE_META[t].color, color:TYPE_META[t].color, background:`${TYPE_META[t].color}12`} : {}}
                    onClick={() => setForm(f=>({...f,type:t}))}>
                    {TYPE_META[t].emoji} {TYPE_META[t].label}
                  </button>
                ))}
              </div>

              <label className="kal-lbl">Varighet</label>
              <div className="kal-var-rad">
                {[30,45,60,75,90,120].map(v => (
                  <button key={v}
                    className={`kal-var-btn${form.varighet_min===v?' on':''}`}
                    onClick={() => setForm(f=>({...f,varighet_min:v}))}>
                    {v} min
                  </button>
                ))}
              </div>

              <label className="kal-lbl">Notater (valgfritt)</label>
              <textarea className="input" rows={2} placeholder="Notater til økten..."
                value={form.notater} onChange={e => setForm(f=>({...f,notater:e.target.value}))} />
            </div>

            <div className="kal-modal-footer">
              <button className="btn btn-ghost" onClick={() => setVisModal(false)}>Avbryt</button>
              <button className="btn btn-primary" onClick={lagreOkt} disabled={lagrer || !form.tittel.trim()}>
                {lagrer ? <span className="spinner" style={{width:14,height:14}}/> : editOkt ? '💾 Lagre' : '＋ Opprett'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .kal-page { max-width: 1060px; width: 100%; }

        /* ── Layout ── */
        .kal-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.25rem;
          align-items: start;
        }
        @media(max-width: 820px) {
          .kal-layout { grid-template-columns: 1fr; }
        }

        /* ── Venstre ── */
        .kal-venstre { display: flex; flex-direction: column; gap: 0.75rem; }

        .kal-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1rem;
        }
        .kal-nav-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); width: 32px; height: 32px; border-radius: 8px;
          cursor: pointer; font-size: 1rem; transition: all 0.15s; display:flex; align-items:center; justify-content:center;
        }
        .kal-nav-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .kal-nav-tittel {
          font-family: var(--font-display,sans-serif); font-size: 1rem; font-weight: 700;
          color: #fff; text-transform: capitalize;
        }

        /* Kalender-grid */
        .kal-grid { padding: 0.875rem; }
        .kal-ukedager {
          display: grid; grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
        }
        .kal-ukd {
          text-align: center; font-size: 0.62rem; font-weight: 700;
          color: rgba(255,255,255,0.25); text-transform: uppercase;
          letter-spacing: 0.06em; padding: 4px 0;
        }
        .kal-dager {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
        }
        .kal-dag {
          aspect-ratio: 1; border-radius: 8px; display: flex;
          flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; position: relative; transition: all 0.12s;
          border: 1px solid transparent; gap: 2px;
        }
        .kal-dag:hover { background: rgba(255,255,255,0.06); }
        .kal-tom { cursor: default; }
        .kal-dag-nr { font-size: 0.78rem; color: rgba(255,255,255,0.5); line-height: 1; }
        .kal-idag .kal-dag-nr { color: var(--cyan,#00f5ff); font-weight: 700; }
        .kal-idag {
          background: rgba(0,245,255,0.08);
          border-color: rgba(0,245,255,0.22) !important;
        }
        .kal-valgt {
          background: rgba(0,245,255,0.14) !important;
          border-color: rgba(0,245,255,0.45) !important;
        }
        .kal-valgt .kal-dag-nr { color: var(--cyan,#00f5ff) !important; font-weight: 700; }
        .kal-prikker { display: flex; gap: 2px; justify-content: center; }
        .kal-prikk {
          width: 4px; height: 4px; border-radius: 50%;
          box-shadow: 0 0 4px currentColor;
        }

        /* Fargeforklaring */
        .kal-legend {
          display: flex; justify-content: space-around; padding: 0.6rem 0.875rem; flex-wrap: wrap; gap: 6px;
        }
        .kal-leg-item {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.68rem; color: rgba(255,255,255,0.38);
        }
        .kal-leg-prikk { width: 7px; height: 7px; border-radius: 50%; }

        /* ── Høyre ── */
        .kal-hoeyre { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }

        .kal-dag-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.25rem; gap: 1rem; flex-wrap: wrap;
        }
        .kal-dag-tittel {
          font-family: var(--font-display,sans-serif); font-size: 1.1rem; font-weight: 700;
          color: #fff; margin-bottom: 2px;
        }
        .kal-dag-sub { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
        .kal-legg-btn { font-size: 0.82rem !important; padding: 0.5rem 1rem !important; }

        .kal-spinner { display: flex; justify-content: center; padding: 2rem; }

        .kal-ingen {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 2.5rem 1.5rem;
        }
        .kal-ingen-t { font-family: var(--font-display,sans-serif); font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .kal-ingen-s { font-size: 0.78rem; color: rgba(255,255,255,0.3); }

        /* Økt-kard */
        .kal-okter-liste { display: flex; flex-direction: column; gap: 0.75rem; }
        .kal-okt { overflow: hidden; transition: border-color 0.2s; }

        .kal-okt-topp {
          display: flex; align-items: center; gap: 12px;
          padding: 1rem 1.25rem; cursor: pointer; transition: background 0.12s;
        }
        .kal-okt-topp:hover { background: rgba(255,255,255,0.02); }

        .kal-okt-icon {
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .kal-okt-info { flex: 1; min-width: 0; }
        .kal-okt-navn {
          font-family: var(--font-display,sans-serif); font-size: 0.95rem; font-weight: 700;
          color: #fff; margin-bottom: 5px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .kal-okt-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .kal-badge {
          padding: 2px 8px; border-radius: 999px; font-size: 0.65rem;
          font-weight: 600; border: 1px solid;
        }
        .kal-meta-txt { font-size: 0.7rem; color: rgba(255,255,255,0.3); }

        .kal-okt-ctrl { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .kal-edit-btn, .kal-del-btn {
          background: none; border: none; cursor: pointer;
          font-size: 0.85rem; padding: 4px 6px; border-radius: 6px;
          transition: background 0.12s;
        }
        .kal-edit-btn:hover { background: rgba(255,255,255,0.08); }
        .kal-del-btn:hover  { background: rgba(255,50,50,0.12); }
        .kal-toggle { font-size: 0.6rem; color: rgba(255,255,255,0.22); margin-left: 4px; }

        /* Detaljpanel */
        .kal-okt-detalj {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; flex-direction: column; gap: 0.75rem;
        }

        .kal-notater {
          font-size: 0.78rem; color: rgba(255,255,255,0.4); padding: 8px 10px;
          background: rgba(255,255,255,0.03); border-radius: 8px; margin-top: 0.75rem;
        }

        .kal-ov-liste { display: flex; flex-direction: column; gap: 0; margin-top: 0.5rem; }
        .kal-ov-lbl {
          font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25); font-weight: 700; margin-bottom: 8px;
        }
        .kal-ov-rad {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 10px; border-radius: 8px; transition: background 0.1s;
        }
        .kal-ov-rad:hover { background: rgba(255,255,255,0.03); }
        .kal-ov-em { font-size: 1.1rem; flex-shrink: 0; }
        .kal-ov-info { flex: 1; min-width: 0; }
        .kal-ov-navn { font-size: 0.82rem; color: rgba(255,255,255,0.75); font-weight: 500; }
        .kal-ov-musk { font-size: 0.65rem; color: rgba(255,255,255,0.3); margin-top: 1px; }
        .kal-ov-tall { font-size: 0.7rem; color: rgba(255,255,255,0.3); flex-shrink: 0; white-space: nowrap; }

        .kal-ingen-ov {
          font-size: 0.78rem; color: rgba(255,255,255,0.28); text-align: center;
          padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;
          border: 1px dashed rgba(255,255,255,0.08); margin-top: 0.5rem;
        }

        .kal-start-btn {
          width: 100%; padding: 0.75rem; border-radius: 10px;
          background: rgba(0,245,255,0.07); border: 1px solid rgba(0,245,255,0.25);
          color: var(--cyan,#00f5ff); font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: var(--font-body,sans-serif);
          letter-spacing: 0.02em;
        }
        .kal-start-btn:hover {
          background: rgba(0,245,255,0.14);
          border-color: rgba(0,245,255,0.45);
          box-shadow: 0 0 20px rgba(0,245,255,0.1);
        }

        /* ── Modal ── */
        .kal-modal-bg {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .kal-modal {
          width: 100%; max-width: 480px; max-height: 90vh;
          overflow-y: auto; padding: 0;
        }
        .kal-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .kal-modal-header h3 {
          font-family: var(--font-display,sans-serif); font-size: 1rem; font-weight: 700; color: #fff;
        }
        .kal-modal-x {
          background: none; border: none; color: rgba(255,255,255,0.3);
          cursor: pointer; font-size: 0.85rem; padding: 4px 8px; border-radius: 6px;
          transition: all 0.12s;
        }
        .kal-modal-x:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .kal-modal-body {
          padding: 1.25rem 1.5rem;
          display: flex; flex-direction: column; gap: 0.875rem;
        }
        .kal-lbl {
          font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.3); font-weight: 700; margin-bottom: -6px;
        }

        .kal-type-rad { display: flex; gap: 6px; flex-wrap: wrap; }
        .kal-type-btn {
          padding: 5px 12px; border-radius: 8px; font-size: 0.78rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.12s;
          font-family: var(--font-body,sans-serif);
        }

        .kal-var-rad { display: flex; gap: 6px; flex-wrap: wrap; }
        .kal-var-btn {
          padding: 5px 12px; border-radius: 8px; font-size: 0.78rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.12s;
          font-family: var(--font-body,sans-serif);
        }
        .kal-var-btn.on { background: rgba(0,245,255,0.1); border-color: rgba(0,245,255,0.3); color: var(--cyan,#00f5ff); }

        .kal-modal-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.07);
        }

        /* ── Mobil ── */
        @media(max-width: 600px) {
          .kal-dag-header { flex-direction: column; align-items: flex-start; }
          .kal-legg-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}
