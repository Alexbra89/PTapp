'use client'

import { useState } from 'react'
import type { BrukerProfil } from '@/types'
import { TelleTall } from '@/components/atelier/TelleTall'

interface Props { profil: BrukerProfil }

export default function AnbefaltOpplegg({ profil }: Props) {
  const [uker, setUker] = useState(4)
  const mal = profil.mal as string

  const protein = Math.round(profil.vekt * (mal === 'ned_i_vekt' ? 2.2 : mal === 'bygge_muskler' ? 2 : 1.6))
  const kalorier = (() => {
    const alder = new Date().getFullYear() - (profil.fodselsar || 1990)
    const bmr = 10 * profil.vekt + 6.25 * profil.hoyde - 5 * alder + 5
    return Math.round(bmr * 1.2 + (mal === 'ned_i_vekt' ? -500 : mal === 'bygge_muskler' ? 300 : 0))
  })()
  const vann = Math.round(profil.vekt * 0.033 * 10) / 10

  const styrke = [
    ['Økter per uke', mal === 'bygge_muskler' ? '4–5' : '3–4'],
    ['Reps per sett', mal === 'bygge_muskler' ? '8–12' : mal === 'ned_i_vekt' ? '12–15' : '8–15'],
    ['Sett per øvelse', '3–4'],
    ['Ukentlig volum', mal === 'bygge_muskler' ? '10–20 sett per muskel' : mal === 'ned_i_vekt' ? '15–25 sett per muskel' : '8–15 sett per muskel'],
    ['Hvile', mal === 'ned_i_vekt' ? '30–60 sek' : '60–90 sek'],
  ]
  const kondisjon = [
    ['Kondisjonsøkter', mal === 'ned_i_vekt' || mal === 'kondisjon' ? '3–4' : '2–3'],
    ['Intensitet', mal === 'ned_i_vekt' ? 'Moderat til høy' : mal === 'kondisjon' ? 'Mest sone 2' : 'Moderat'],
    ['Oppvarming', '10–15 min'],
    ['Nedtrapping', '5–10 min'],
    ['Tid per uke', '4–6 timer'],
  ]
  const faser = [['Uke 1', 'Base', 'Finn riktig vekt'], ['Uke 2', 'Flere reps', '+2 reps per sett'], ['Uke 3', 'Mer vekt', '+2,5–5 kg'], ['Uke 4', 'Toppuke', 'Test ny maks']]
  const forventetVekt = mal === 'ned_i_vekt' ? profil.vekt - uker * 0.5 : mal === 'bygge_muskler' ? profil.vekt + uker * 0.2 : profil.vekt

  return (
    <>
      <section className="hq-figures prg-tall">
        <div className="hq-figure"><span className="eyebrow">Kalorier</span><div className="hq-figure-val num-monument"><TelleTall verdi={kalorier} /><small>kcal</small></div><div className="hq-figure-sub">per dag</div></div>
        <div className="hq-figure"><span className="eyebrow">Protein</span><div className="hq-figure-val num-monument"><TelleTall verdi={protein} forsinkelse={0.1} /><small>g</small></div><div className="hq-figure-sub">per dag</div></div>
        <div className="hq-figure"><span className="eyebrow">Vann</span><div className="hq-figure-val num-monument"><TelleTall verdi={vann} desimaler={1} forsinkelse={0.2} /><small>l</small></div><div className="hq-figure-sub">per dag</div></div>
        <div className="hq-figure"><span className="eyebrow">Søvn</span><div className="hq-figure-val num-monument">7–9<small>t</small></div><div className="hq-figure-sub">per natt</div></div>
      </section>

      <section className="pf-to">
        {([['Styrke', styrke], ['Kondisjon og oppvarming', kondisjon]] as const).map(([tittel, rader]) => (
          <div key={tittel} className="pf-seksjon glass-card">
            <span className="eyebrow">{tittel}</span>
            <dl className="pf-ledger">{rader.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
        ))}
      </section>

      <section className="pf-seksjon glass-card">
        <span className="eyebrow">Progresjon · neste fire uker</span>
        <ol className="prg-faser">
          {faser.map(([u, n, t], i) => (
            <li key={u}><span className="prg-fase-nr">{String(i + 1).padStart(2, '0')}</span><span className="eyebrow">{u}</span><strong>{n}</strong><span className="pf-dempet">{t}</span></li>
          ))}
        </ol>
      </section>

      <section className="pf-seksjon glass-card">
        <div className="pf-seksjon-hode">
          <div>
            <span className="eyebrow">Anslag · ikke en garanti</span>
            <h3 className="hq-section-title" style={{ marginTop: 8 }}>Om <em>{uker} {uker === 1 ? 'uke' : 'uker'}</em></h3>
          </div>
          <div className="pf-prosent num-monument">{forventetVekt.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span> kg</span></div>
        </div>
        <input type="range" className="utf-slider" style={{ width: '100%' }} min={1} max={12} value={uker} onChange={e => setUker(parseInt(e.target.value))} aria-label="Antall uker" />
        <p className="pf-dempet" style={{ marginTop: 12 }}>
          {mal === 'ned_i_vekt' ? 'Rundt 0,5 kg per uke er et bærekraftig tempo.' : mal === 'bygge_muskler' ? 'Rundt 0,2 kg per uke holder fettøkningen lav.' : 'Målet er stabil vekt og jevn fremgang i løftene.'}
        </p>
      </section>

      <section className="pf-seksjon glass-card">
        <span className="eyebrow">Forslag til ukemeny</span>
        <div className="prg-meny">
          {([['Frokost', ['Havregrøt med bær', 'Proteinpannekaker', 'Eggerøre og kalkun']], ['Lunsj', ['Kyllingsalat', 'Tunfiskwraps', 'Kalkunbrød']], ['Middag', ['Laks og grønnsaker', 'Kylling og ris', 'Magert kjøttdeig']]] as const).map(([m, retter]) => (
            <div key={m}><h4 className="prg-meny-tittel">{m}</h4>{retter.map(r => <p key={r}>{r}</p>)}</div>
          ))}
        </div>
      </section>
    </>
  )
}
