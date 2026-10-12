'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser, useProfil } from '@/hooks/useSupabaseQuery'
import { useErnaeringsmal, useLagreErnaeringsmal, feilTekst, type Ernaeringsmal } from '@/hooks/useKosthold'
import {
  AKTIVITET, RETNING, KONFIG, alderFraFodselsar, beregnMal, fordelMakro, makroKcal, retningFraProfil, validerInput,
  type Aktivitetsniva, type Grunnlag, type Retning,
} from '@/lib/kosthold/mal'
import { lesTall, visKcal } from '@/lib/kosthold/naering'
import { tallTekst } from '@/lib/kosthold/visning'
import KostHode, { Datafeil } from '@/components/kosthold/KostHode'
import Melding from '@/components/kosthold/Melding'
import { TelleTall } from '@/components/atelier/TelleTall'

const ar = new Date().getFullYear()

export default function MalSide() {
  const { data: user } = useUser()
  const uid = user?.id
  const { data: profil, isFetched: profilHentet } = useProfil(uid)
  const malQ = useErnaeringsmal(uid)
  const lagre = useLagreErnaeringsmal()

  const [vekt, setVekt] = useState('')
  const [hoyde, setHoyde] = useState('')
  const [fodselsar, setFodselsar] = useState('')
  const [onsketVekt, setOnsketVekt] = useState('')
  const [grunnlag, setGrunnlag] = useState<Grunnlag | null>(null)
  const [aktivitet, setAktivitet] = useState<Aktivitetsniva | null>(null)
  const [retning, setRetning] = useState<Retning>('vedlikehold')
  const [tempo, setTempo] = useState<number | null>(null)
  const [fylt, setFylt] = useState(false)
  const [melding, setMelding] = useState('')

  const [egne, setEgne] = useState<{ protein: string; karbohydrater: string; fett: string } | null>(null)

  // Fyll inn fra profilen og lagrede mål én gang
  useEffect(() => {
    if (fylt || !uid || !profilHentet || !malQ.isFetched) return
    const m = malQ.data
    setVekt(profil?.vekt ? tallTekst(Number(profil.vekt)) : '')
    setHoyde(profil?.hoyde ? String(profil.hoyde) : '')
    setFodselsar(profil?.fodselsar ? String(profil.fodselsar) : '')
    setOnsketVekt(profil?.onsket_vekt ? tallTekst(Number(profil.onsket_vekt)) : '')
    setGrunnlag(m?.beregningsgrunnlag ?? null)
    setAktivitet(m?.aktivitetsniva ?? null)
    setRetning(m?.retning ?? retningFraProfil(profil?.mal))
    setTempo(m?.tempo ?? null)
    if (m?.overstyrt) setEgne({ protein: String(m.protein), karbohydrater: String(m.karbohydrater), fett: String(m.fett) })
    setFylt(true)
  }, [fylt, uid, profil, profilHentet, malQ.isFetched, malQ.data])

  const input = {
    vekt: lesTall(vekt) ?? NaN, hoyde: lesTall(hoyde) ?? NaN,
    alder: fodselsar ? alderFraFodselsar(Number(fodselsar)) : NaN,
    grunnlag: grunnlag ?? undefined, aktivitet: aktivitet ?? undefined, retning,
    tempo: retning === 'vedlikehold' ? 0 : (tempo ?? KONFIG.standardTempo[retning]),
  }
  const inputFeil = validerInput(input)
  const resultat = useMemo(() => inputFeil.length ? null : beregnMal(input as Parameters<typeof beregnMal>[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(input), inputFeil.length])

  // Egne mål: kcal er alltid summen av makroene, så de henger sammen
  const egneTall = egne ? { protein: lesTall(egne.protein), karbohydrater: lesTall(egne.karbohydrater), fett: lesTall(egne.fett) } : null
  const egneGyldige = !!egneTall && [egneTall.protein, egneTall.karbohydrater, egneTall.fett].every(v => v !== null && Number.isInteger(v) && v >= 0)
  const egneKcal = egneGyldige ? makroKcal(egneTall as { protein: number; karbohydrater: number; fett: number }) : null
  const egneFeil = egne && !egneGyldige ? 'Skriv hele gram (0 eller mer) for alle tre.' : egneKcal !== null && (egneKcal < 800 || egneKcal > 8000) ? 'Energien blir utenfor 800–8000 kcal.' : null

  const profilEndring = () => {
    const p: { vekt?: number; hoyde?: number; fodselsar?: number; onsket_vekt?: number | null } = {}
    const v = lesTall(vekt), h = lesTall(hoyde), f = Number(fodselsar), o = lesTall(onsketVekt)
    if (v && v !== Number(profil?.vekt)) p.vekt = v
    if (h && h !== Number(profil?.hoyde)) p.hoyde = Math.round(h)
    if (f && f !== Number(profil?.fodselsar)) p.fodselsar = f
    if (o !== null && !Number.isNaN(o) && o !== Number(profil?.onsket_vekt ?? NaN)) p.onsket_vekt = o || null
    return p
  }

  const lagreMal = async (overstyrt: boolean) => {
    if (!uid) return
    setMelding('')
    let mal: Omit<Ernaeringsmal, 'bruker_id' | 'oppdatert'>
    const felles = {
      beregningsgrunnlag: grunnlag, aktivitetsniva: aktivitet, retning,
      tempo: retning === 'vedlikehold' ? 0 : (tempo ?? KONFIG.standardTempo[retning]),
      vedlikehold_kcal: resultat?.vedlikehold ?? null,
    }
    if (overstyrt) {
      if (!egneGyldige || egneFeil || egneKcal === null) return
      mal = { ...felles, kcal: egneKcal, protein: egneTall!.protein!, karbohydrater: egneTall!.karbohydrater!, fett: egneTall!.fett!, overstyrt: true }
    } else {
      if (!resultat) return
      mal = { ...felles, kcal: resultat.kcal, protein: resultat.protein, karbohydrater: resultat.karbohydrater, fett: resultat.fett, overstyrt: false }
    }
    try {
      await lagre.mutateAsync({ userId: uid, mal, profil: profilEndring() })
      setMelding(overstyrt ? 'Dine egne mål er lagret.' : 'Målene er lagret.')
      if (!overstyrt) setEgne(null)
    } catch { /* vises under */ }
  }

  const lagret = malQ.data

  return (
    <div className="ko-page">
      <KostHode tittel={<>Mål<em className="gold">.</em></>} undertittel="Energi og makroer per dag" />

      {malQ.isError && <Datafeil feil={malQ.error} onPrøvIgjen={() => malQ.refetch()} />}

      {lagret && (
        <section className="hq-figures ko-resultat" aria-label="Lagrede mål">
          <div className="hq-figure"><span className="eyebrow">Energi</span><div className="hq-figure-val num-monument"><TelleTall verdi={lagret.kcal} /><small>kcal</small></div><div className="hq-figure-sub">{lagret.overstyrt ? 'satt av deg' : 'beregnet'}</div></div>
          <div className="hq-figure"><span className="eyebrow">Protein</span><div className="hq-figure-val num-monument"><TelleTall verdi={lagret.protein} /><small>g</small></div></div>
          <div className="hq-figure"><span className="eyebrow">Karbo</span><div className="hq-figure-val num-monument"><TelleTall verdi={lagret.karbohydrater} /><small>g</small></div></div>
          <div className="hq-figure"><span className="eyebrow">Fett</span><div className="hq-figure-val num-monument"><TelleTall verdi={lagret.fett} /><small>g</small></div></div>
        </section>
      )}

      <section className="pf-seksjon glass-card">
        <span className="eyebrow eyebrow-gold">Grunnlag</span>
        <h2 className="hq-section-title" style={{ margin: '0.6rem 0 1.25rem' }}>Om <em>deg</em></h2>
        <p className="pf-dempet" style={{ marginBottom: '1rem' }}>Vekt, høyde og fødselsår hentes fra profilen din. Endrer du dem her, oppdateres profilen.</p>
        <div className="ko-skjema">
          <label className="ko-felt"><span className="eyebrow">Vekt (kg)</span><input className="input" inputMode="decimal" value={vekt} onChange={e => setVekt(e.target.value)} data-testid="mal-vekt" /></label>
          <label className="ko-felt"><span className="eyebrow">Høyde (cm)</span><input className="input" inputMode="numeric" value={hoyde} onChange={e => setHoyde(e.target.value)} data-testid="mal-hoyde" /></label>
          <label className="ko-felt"><span className="eyebrow">Fødselsår</span><input className="input" inputMode="numeric" value={fodselsar} onChange={e => setFodselsar(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder={String(ar - 30)} data-testid="mal-fodselsar" /></label>
          <label className="ko-felt"><span className="eyebrow">Ønsket vekt (kg)</span><input className="input" inputMode="decimal" value={onsketVekt} onChange={e => setOnsketVekt(e.target.value)} placeholder="Valgfritt" /></label>
          <div className="ko-felt pf-full">
            <span className="eyebrow">Beregningsgrunnlag</span>
            <div className="ko-valg-grid">
              {([['mann', 'Mann', '+5 kcal i formelen'], ['kvinne', 'Kvinne', '−161 kcal i formelen']] as const).map(([k, n, t]) => (
                <button key={k} className={`ko-valg${grunnlag === k ? ' on' : ''}`} onClick={() => setGrunnlag(k)} aria-pressed={grunnlag === k} data-testid={`grunnlag-${k}`}>
                  <span className="ko-valg-navn">{n}</span><span className="ko-valg-tekst">{t}</span>
                </button>
              ))}
            </div>
            <span className="ko-felt-hint">Formelen har ulike konstanter for kropp med mannlig og kvinnelig fysiologi. Velg den som passer best for deg.</span>
          </div>
          <div className="ko-felt pf-full">
            <span className="eyebrow">Aktivitetsnivå – inkludert treningen</span>
            <div className="ko-valg-grid">
              {(Object.entries(AKTIVITET) as [Aktivitetsniva, typeof AKTIVITET[Aktivitetsniva]][]).map(([k, a]) => (
                <button key={k} className={`ko-valg${aktivitet === k ? ' on' : ''}`} onClick={() => setAktivitet(k)} aria-pressed={aktivitet === k} data-testid={`aktivitet-${k}`}>
                  <span className="ko-valg-navn">{a.navn}</span><span className="ko-valg-tekst">{a.tekst} · ×{String(a.faktor).replace('.', ',')}</span>
                </button>
              ))}
            </div>
            <span className="ko-felt-hint">Aktivitetsfaktoren dekker all bevegelse, også treningsøktene. Treningen legges derfor ikke til en gang til.</span>
          </div>
          <div className="ko-felt pf-full">
            <span className="eyebrow">Mål</span>
            <div className="ko-valg-grid">
              {(Object.entries(RETNING) as [Retning, typeof RETNING[Retning]][]).map(([k, r]) => (
                <button key={k} className={`ko-valg${retning === k ? ' on' : ''}`} onClick={() => { setRetning(k); setTempo(null) }} aria-pressed={retning === k}>
                  <span className="ko-valg-navn">{r.navn}</span><span className="ko-valg-tekst">{r.tekst}</span>
                </button>
              ))}
            </div>
          </div>
          {retning !== 'vedlikehold' && (
            <div className="ko-felt pf-full">
              <span className="eyebrow">Tempo: {tallTekst(tempo ?? KONFIG.standardTempo[retning])} kg per uke</span>
              <input type="range" className="utf-slider" style={{ width: '100%' }} min={0.1} max={KONFIG.maksTempo[retning]} step={0.05}
                value={tempo ?? KONFIG.standardTempo[retning]} onChange={e => setTempo(Number(e.target.value))} aria-label="Tempo i kg per uke" />
              <span className="ko-felt-hint">{retning === 'ned' ? 'Rundt 0,5 kg per uke (eller 0,5–1 % av kroppsvekten) er et vanlig, bærekraftig tempo.' : 'Rundt 0,25 kg per uke holder fettøkningen lav for de fleste.'}</span>
            </div>
          )}
        </div>
      </section>

      {inputFeil.length > 0 && fylt && (
        <Melding type="info"><strong>Fyll inn for å få et forslag:</strong><ul>{inputFeil.map(f => <li key={f}>{f}</li>)}</ul></Melding>
      )}

      {resultat && (
        <section className="pf-seksjon glass-card crop" aria-live="polite">
          <span className="eyebrow eyebrow-gold">Forslag</span>
          <div className="hq-figures ko-resultat" style={{ margin: '1rem 0' }}>
            <div className="hq-figure"><span className="eyebrow">Energi</span><div className="hq-figure-val num-monument" data-testid="forslag-kcal">{visKcal(resultat.kcal)}<small>kcal</small></div><div className="hq-figure-sub">vedlikehold ≈ {visKcal(resultat.vedlikehold)}</div></div>
            <div className="hq-figure"><span className="eyebrow">Protein</span><div className="hq-figure-val num-monument">{resultat.protein}<small>g</small></div><div className="hq-figure-sub">{tallTekst(KONFIG.proteinPerKg[retning])} g/kg</div></div>
            <div className="hq-figure"><span className="eyebrow">Karbo</span><div className="hq-figure-val num-monument">{resultat.karbohydrater}<small>g</small></div><div className="hq-figure-sub">resten av energien</div></div>
            <div className="hq-figure"><span className="eyebrow">Fett</span><div className="hq-figure-val num-monument">{resultat.fett}<small>g</small></div><div className="hq-figure-sub">{Math.round((resultat.fett * 9 / resultat.kcal) * 100)} % av energien</div></div>
          </div>
          <dl className="pf-ledger">
            <div><dt>Hvileforbrenning (Mifflin–St Jeor)</dt><dd>{visKcal(resultat.bmr)} kcal</dd></div>
            <div><dt>× aktivitetsfaktor {String(AKTIVITET[aktivitet!].faktor).replace('.', ',')}</dt><dd>{visKcal(resultat.vedlikehold)} kcal</dd></div>
            <div><dt>{retning === 'ned' ? 'Underskudd' : retning === 'opp' ? 'Overskudd' : 'Justering'}</dt><dd>{resultat.kcal - resultat.vedlikehold > 0 ? '+' : ''}{visKcal(resultat.kcal - resultat.vedlikehold)} kcal</dd></div>
            <div><dt>Kontroll: P×4 + K×4 + F×9</dt><dd>{visKcal(makroKcal(resultat))} kcal</dd></div>
          </dl>
          {resultat.merknader.length > 0 && <div style={{ marginTop: '1rem' }}><Melding type="advarsel"><ul style={{ margin: 0, paddingLeft: '1rem' }}>{resultat.merknader.map(m => <li key={m}>{m}</li>)}</ul></Melding></div>}
          <p className="ko-felt-hint" style={{ marginTop: '1rem' }}>
            Dette er et estimat for friske voksne, ikke medisinske råd. Det faktiske behovet varierer – følg vekttrenden over 2–3 uker og juster.
            Gravide, ammende og personer med sykdom eller spiseforstyrrelser bør få mål fra helsepersonell.
          </p>
          <div className="pf-knapper">
            <button className="btn btn-primary" onClick={() => lagreMal(false)} disabled={lagre.isPending} data-testid="bruk-forslag">{lagre.isPending ? <span className="spinner" /> : 'Bruk disse målene'}</button>
          </div>
        </section>
      )}

      <section className="pf-seksjon glass-card">
        <div className="pf-seksjon-hode" style={{ marginBottom: egne ? '1.25rem' : 0 }}>
          <div>
            <span className="eyebrow">Overstyr</span>
            <h3 className="hq-section-title" style={{ marginTop: 8 }}>Egne <em>mål</em></h3>
          </div>
          {!egne && <button className="btn btn-ghost" onClick={() => {
            const k = lagret ?? resultat ?? fordelMakro(2000, 120, 0.3)
            setEgne({ protein: String(k.protein), karbohydrater: String(k.karbohydrater), fett: String(k.fett) })
          }} data-testid="egne-mal">Sett selv</button>}
        </div>
        {egne && (
          <>
            <p className="pf-dempet" style={{ marginBottom: '1rem' }}>Skriv inn gram per dag. Energien regnes ut fra makroene (P×4 + K×4 + F×9), så tallene alltid henger sammen.</p>
            <div className="ko-skjema" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {(['protein', 'karbohydrater', 'fett'] as const).map(k => (
                <label key={k} className="ko-felt"><span className="eyebrow">{k === 'karbohydrater' ? 'Karbo' : k === 'protein' ? 'Protein' : 'Fett'} (g)</span>
                  <input className="input" inputMode="numeric" value={egne[k]} onChange={e => setEgne({ ...egne, [k]: e.target.value.replace(/[^\d]/g, '') })} data-testid={`egen-${k}`} /></label>
              ))}
            </div>
            <div className="prg-forhandsvis"><span className="eyebrow">Energi</span><span className="num-monument" data-testid="egne-kcal">{egneKcal !== null ? visKcal(egneKcal) : '–'}<small> kcal</small></span></div>
            {egneFeil && <Melding type="advarsel">{egneFeil}</Melding>}
            <div className="pf-knapper">
              <button className="btn btn-ghost" onClick={() => setEgne(null)}>Avbryt</button>
              <button className="btn btn-primary" onClick={() => lagreMal(true)} disabled={!!egneFeil || !egneGyldige || lagre.isPending} data-testid="lagre-egne">Lagre egne mål</button>
            </div>
          </>
        )}
      </section>

      {melding && <Melding type="ok">{melding} <Link href="/kosthold" style={{ color: 'var(--gold-hi)' }}>Til dagboken</Link></Melding>}
      {lagre.isError && <Melding type="feil">{feilTekst(lagre.error)}</Melding>}

      <section className="pf-seksjon glass-card">
        <span className="eyebrow">Slik regnes det</span>
        <ul className="pf-dempet" style={{ marginTop: '0.75rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Hvileforbrenning:</strong> Mifflin–St Jeor (1990): 10 × vekt + 6,25 × høyde − 5 × alder, +5 (mann) eller −161 (kvinne).</li>
          <li><strong>Vedlikehold:</strong> hvileforbrenning × aktivitetsfaktor (1,2–1,9). Faktoren inkluderer treningen.</li>
          <li><strong>Vektendring:</strong> ca. 7 700 kcal per kg. Underskudd maks 25 % av vedlikehold, overskudd maks {KONFIG.maksOverskudd} kcal.</li>
          <li><strong>Protein:</strong> 2,0 g/kg ved nedgang, 1,6 ved vedlikehold, 1,8 ved muskelvekst (ISSN 2017, Morton mfl. 2018). Ved KMI ≥ 30 brukes vekten ved KMI 25.</li>
          <li><strong>Fett:</strong> 27–30 % av energien (NNR 2023: 25–40 %), minst {tallTekst(KONFIG.minFettPerKg)} g/kg. <strong>Karbohydrater:</strong> resten.</li>
        </ul>
      </section>
    </div>
  )
}
