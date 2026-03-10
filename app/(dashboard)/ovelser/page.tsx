'use client'

import { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'

type AnimType = 'press' | 'pull' | 'squat' | 'hinge' | 'curl' | 'pushdown' | 'raise' | 'crunch' | 'plank' | 'run'
type Sted = 'gym' | 'hjemme' | 'begge'

interface Ovelse {
  id: string; navn: string; kategori: string; muskelgruppe: string
  vanskelighet: 'Nybegynner' | 'Middels' | 'Avansert'; utstyr: string
  sted: Sted; emoji: string; beskrivelse: string; tips: string[]
  sett: number; reps: string; hvile: string; animType: AnimType
}

// ── Lazy SVG: animerer KUN når synlig i viewport ─────────────────────────────
function AnimasjonSVG({ type, color = '#00f5ff', size = 80 }: { type: AnimType; color?: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { rootMargin: '80px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const s = size, c = color

  const svgContent = useMemo(() => {
    if (!visible) return <circle cx={s/2} cy={s/2} r={s/2 - 4} fill={c} opacity=".06" />
    switch (type) {
      case 'press': return (<>
        <style>{`.press-arms{animation:pressMove 1.4s ease-in-out infinite alternate;transform-origin:40px 55px}@keyframes pressMove{from{transform:translateY(8px)}to{transform:translateY(-8px)}}`}</style>
        <rect x="32" y="38" width="16" height="18" rx="4" fill={c} opacity=".5"/>
        <circle cx="40" cy="30" r="9" fill={c} opacity=".7"/>
        <rect x="33" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
        <g className="press-arms">
          <rect x="12" y="30" width="56" height="5" rx="2.5" fill={c} opacity=".9"/>
          <rect x="8" y="28" width="8" height="8" rx="4" fill={c}/>
          <rect x="64" y="28" width="8" height="8" rx="4" fill={c}/>
          <rect x="22" y="26" width="4" height="14" rx="2" fill={c} opacity=".6"/>
          <rect x="54" y="26" width="4" height="14" rx="2" fill={c} opacity=".6"/>
        </g>
      </>)
      case 'pull': return (<>
        <style>{`.pull-body{animation:pullMove 1.4s ease-in-out infinite alternate;transform-origin:40px 20px}@keyframes pullMove{from{transform:translateY(16px)}to{transform:translateY(0px)}}`}</style>
        <rect x="10" y="10" width="60" height="6" rx="3" fill={c} opacity=".6"/>
        <g className="pull-body">
          <circle cx="40" cy="30" r="9" fill={c} opacity=".7"/>
          <rect x="32" y="38" width="16" height="18" rx="4" fill={c} opacity=".5"/>
          <rect x="20" y="22" width="5" height="20" rx="2.5" fill={c} opacity=".6"/>
          <rect x="55" y="22" width="5" height="20" rx="2.5" fill={c} opacity=".6"/>
          <rect x="33" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
          <rect x="41" y="55" width="6" height="14" rx="3" fill={c} opacity=".4"/>
        </g>
      </>)
      case 'squat': return (<>
        <style>{`.sq-body{animation:sqMove 1.4s ease-in-out infinite alternate;transform-origin:40px 40px}@keyframes sqMove{from{transform:translateY(-6px)}to{transform:translateY(6px)}}@keyframes sqLeg{from{transform:rotate(-15deg)}to{transform:rotate(15deg)}}`}</style>
        <g className="sq-body">
          <circle cx="40" cy="14" r="9" fill={c} opacity=".7"/>
          <rect x="32" y="22" width="16" height="16" rx="4" fill={c} opacity=".5"/>
        </g>
        <rect x="30" y="36" width="7" height="20" rx="3" fill={c} opacity=".5" style={{transformOrigin:'30px 36px', animation:'sqLeg 1.4s ease-in-out infinite alternate'}}/>
        <rect x="43" y="36" width="7" height="20" rx="3" fill={c} opacity=".5" style={{transformOrigin:'50px 36px', animation:'sqLeg 1.4s ease-in-out infinite alternate'}}/>
      </>)
      case 'hinge': return (<>
        <style>{`.hinge-upper{animation:hingeMove 1.4s ease-in-out infinite alternate;transform-origin:40px 48px}@keyframes hingeMove{from{transform:rotate(-30deg)}to{transform:rotate(5deg)}}`}</style>
        <rect x="33" y="52" width="6" height="18" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="52" width="6" height="18" rx="3" fill={c} opacity=".4"/>
        <g className="hinge-upper">
          <circle cx="40" cy="28" r="9" fill={c} opacity=".7"/>
          <rect x="32" y="36" width="16" height="16" rx="4" fill={c} opacity=".5"/>
          <rect x="15" y="42" width="22" height="5" rx="2.5" fill={c} opacity=".8"/>
          <rect x="43" y="42" width="22" height="5" rx="2.5" fill={c} opacity=".8"/>
        </g>
      </>)
      case 'curl': return (<>
        <style>{`.curl-arm{animation:curlMove 1.2s ease-in-out infinite alternate;transform-origin:28px 42px}.curl-arm2{animation:curlMove 1.2s ease-in-out infinite alternate;transform-origin:52px 42px}@keyframes curlMove{from{transform:rotate(20deg)}to{transform:rotate(-40deg)}}`}</style>
        <circle cx="40" cy="18" r="9" fill={c} opacity=".7"/>
        <rect x="32" y="26" width="16" height="18" rx="4" fill={c} opacity=".5"/>
        <g className="curl-arm"><rect x="24" y="40" width="5" height="20" rx="2.5" fill={c} opacity=".7"/><circle cx="26" cy="62" r="5" fill={c} opacity=".9"/></g>
        <g className="curl-arm2"><rect x="51" y="40" width="5" height="20" rx="2.5" fill={c} opacity=".7"/><circle cx="54" cy="62" r="5" fill={c} opacity=".9"/></g>
        <rect x="33" y="44" width="5" height="16" rx="2.5" fill={c} opacity=".3"/>
        <rect x="42" y="44" width="5" height="16" rx="2.5" fill={c} opacity=".3"/>
      </>)
      case 'pushdown': return (<>
        <style>{`.pd-arm{animation:pdMove 1.2s ease-in-out infinite alternate;transform-origin:28px 38px}.pd-arm2{animation:pdMove 1.2s ease-in-out infinite alternate;transform-origin:52px 38px}@keyframes pdMove{from{transform:rotate(-30deg)}to{transform:rotate(10deg)}}`}</style>
        <circle cx="40" cy="16" r="9" fill={c} opacity=".7"/>
        <rect x="32" y="24" width="16" height="16" rx="4" fill={c} opacity=".5"/>
        <g className="pd-arm"><rect x="24" y="36" width="5" height="22" rx="2.5" fill={c} opacity=".7"/></g>
        <g className="pd-arm2"><rect x="51" y="36" width="5" height="22" rx="2.5" fill={c} opacity=".7"/></g>
        <rect x="25" y="56" width="30" height="5" rx="2.5" fill={c} opacity=".8"/>
        <rect x="33" y="40" width="5" height="16" rx="2.5" fill={c} opacity=".3"/>
        <rect x="42" y="40" width="5" height="16" rx="2.5" fill={c} opacity=".3"/>
      </>)
      case 'raise': return (<>
        <style>{`.raise-l{animation:raiseLft 1.4s ease-in-out infinite alternate;transform-origin:28px 38px}.raise-r{animation:raiseRgt 1.4s ease-in-out infinite alternate;transform-origin:52px 38px}@keyframes raiseLft{from{transform:rotate(20deg)}to{transform:rotate(-20deg)}}@keyframes raiseRgt{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}`}</style>
        <circle cx="40" cy="18" r="9" fill={c} opacity=".7"/>
        <rect x="32" y="26" width="16" height="18" rx="4" fill={c} opacity=".5"/>
        <rect x="33" y="44" width="6" height="18" rx="3" fill={c} opacity=".4"/>
        <rect x="41" y="44" width="6" height="18" rx="3" fill={c} opacity=".4"/>
        <g className="raise-l"><rect x="10" y="34" width="20" height="5" rx="2.5" fill={c} opacity=".8"/><circle cx="10" cy="36" r="4" fill={c}/></g>
        <g className="raise-r"><rect x="50" y="34" width="20" height="5" rx="2.5" fill={c} opacity=".8"/><circle cx="70" cy="36" r="4" fill={c}/></g>
      </>)
      case 'crunch': return (<>
        <style>{`.cr-upper{animation:crMove 1.2s ease-in-out infinite alternate;transform-origin:40px 52px}@keyframes crMove{from{transform:rotate(-15deg)}to{transform:rotate(10deg)}}`}</style>
        <rect x="20" y="50" width="40" height="8" rx="4" fill={c} opacity=".3"/>
        <rect x="28" y="56" width="10" height="16" rx="4" fill={c} opacity=".4" style={{transformOrigin:'33px 56px', transform:'rotate(30deg)'}}/>
        <rect x="42" y="56" width="10" height="16" rx="4" fill={c} opacity=".4" style={{transformOrigin:'47px 56px', transform:'rotate(-30deg)'}}/>
        <g className="cr-upper">
          <circle cx="40" cy="34" r="9" fill={c} opacity=".7"/>
          <rect x="32" y="42" width="16" height="12" rx="4" fill={c} opacity=".5"/>
          <rect x="18" y="38" width="15" height="5" rx="2.5" fill={c} opacity=".5"/>
          <rect x="47" y="38" width="15" height="5" rx="2.5" fill={c} opacity=".5"/>
        </g>
      </>)
      case 'plank': return (<>
        <style>{`.plank-body{animation:plankPulse 2s ease-in-out infinite alternate}@keyframes plankPulse{from{opacity:.7}to{opacity:1}}`}</style>
        <g className="plank-body">
          <circle cx="65" cy="32" r="8" fill={c} opacity=".7"/>
          <rect x="18" y="36" width="46" height="12" rx="5" fill={c} opacity=".5"/>
          <rect x="14" y="46" width="8" height="16" rx="4" fill={c} opacity=".4" style={{transform:'rotate(-10deg)', transformOrigin:'18px 46px'}}/>
          <rect x="56" y="46" width="8" height="16" rx="4" fill={c} opacity=".4" style={{transform:'rotate(10deg)', transformOrigin:'60px 46px'}}/>
          <rect x="10" y="42" width="10" height="5" rx="2.5" fill={c} opacity=".6"/>
        </g>
      </>)
      case 'run': return (<>
        <style>{`.run-l{animation:runL 0.6s ease-in-out infinite alternate;transform-origin:38px 42px}.run-r{animation:runR 0.6s ease-in-out infinite alternate;transform-origin:42px 42px}@keyframes runL{from{transform:rotate(-30deg)}to{transform:rotate(30deg)}}@keyframes runR{from{transform:rotate(30deg)}to{transform:rotate(-30deg)}}`}</style>
        <circle cx="40" cy="14" r="9" fill={c} opacity=".7"/>
        <rect x="32" y="22" width="16" height="20" rx="4" fill={c} opacity=".5"/>
        <g className="run-l"><rect x="27" y="24" width="5" height="18" rx="2.5" fill={c} opacity=".6"/><rect x="24" y="40" width="5" height="18" rx="2.5" fill={c} opacity=".5"/></g>
        <g className="run-r"><rect x="48" y="24" width="5" height="18" rx="2.5" fill={c} opacity=".6"/><rect x="50" y="40" width="5" height="18" rx="2.5" fill={c} opacity=".5"/></g>
      </>)
      default: return <circle cx="40" cy="40" r="30" fill={c} opacity=".3"/>
    }
  }, [visible, type, c, s])

  return (
    <div ref={ref} style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={s} height={s} viewBox="0 0 80 80">{svgContent}</svg>
    </div>
  )
}

// ── 100 ØVELSER ──────────────────────────────────────────────────────────────
const OVELSER: Ovelse[] = [
  { id:'benkpress', navn:'Benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs, triceps, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + flatbenk', emoji:'🏋️', animType:'press', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Klassisk styrkeøvelse for brystmusklene. Legg deg på benken, grip litt bredere enn skulderbredde og press stangen vertikalt opp og ned med kontroll.', tips:['Skulderblad inn og ned mot benken','Ryggen lett hvelvet, ikke flat','Full kontroll i ned-fasen – 2 sekunder ned'] },
  { id:'pushup', navn:'Push-up', kategori:'bryst', sted:'begge', muskelgruppe:'Pecs, triceps, core', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'💪', animType:'press', sett:4, reps:'12-15', hvile:'60s', beskrivelse:'Grunnleggende kroppsvektøvelse. Kroppen holdes rett som en planke fra hode til hæl. Press eksplosivt opp og senk kontrollert ned.', tips:['Kroppen helt rett fra hode til hæl','Albuer 45° fra kroppen – ikke utover','Pust ut på vei opp'] },
  { id:'hantelflyes', navn:'Hantelflyes', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs (strekk og isolasjon)', vanskelighet:'Middels', utstyr:'Hantler + benk', emoji:'🦅', animType:'raise', sett:3, reps:'12', hvile:'60s', beskrivelse:'Isolasjonsøvelse som stretcher brystmusklene gjennom full bevegelsesbane. Perfekt finisherøvelse etter benkpress.', tips:['Bue-bevegelse som en klem rundt et tre','Lett bøy i albuen gjennom hele bevegelsen','Klem brystet i toppen'] },
  { id:'dips', navn:'Bryst-dips', kategori:'bryst', sted:'begge', muskelgruppe:'Pecs, triceps', vanskelighet:'Middels', utstyr:'Parallellstenger / stol', emoji:'⬇️', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Tung kroppsvektøvelse. Len kroppen 30° fremover for å aktivere brystet mer enn triceps. Kontrollert ned til 90° i albuen.', tips:['Len 30° fremover for brystaktivering','Kontrollert ned – stopp ved 90° i albuen','Press opp uten å låse albuene helt'] },
  { id:'kabelpecfly', navn:'Kabel pec fly', kategori:'bryst', sted:'gym', muskelgruppe:'Indre pecs', vanskelighet:'Middels', utstyr:'Kabelmaskin', emoji:'🔀', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabelen gir konstant motstand gjennom hele bevegelsen – noe frivekter ikke gjør. Fantastisk for å pumpe opp brystet.', tips:['Kabelen på skulderbredde eller litt høyere','Bue ned og frem som en klem','Klem hendene i midten og hold 1 sek'] },
  { id:'inclineBenkpress', navn:'Incline benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Øvre pecs, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + skrå benk', emoji:'📐', animType:'press', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Benken satt til 30-45°. Aktiverer det øvre brystet som ellers er vanskelig å nå med flat benkpress.', tips:['30-45° – ikke mer, da tar skuldrene over','Samme teknikk som flat benkpress','Ikke la stangen sprette i brystet'] },
  { id:'declinePushup', navn:'Decline push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Øvre pecs, skuldre', vanskelighet:'Middels', utstyr:'Stol eller sofa', emoji:'🔼', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Føttene på en stol, hendene i gulvet. Vinkelen aktiverer det øvre brystet på samme måte som incline benkpress.', tips:['Føtter høyere enn skuldre','Kroppen fortsatt rett','Se ned mot gulvet'] },
  { id:'diamondPushup', navn:'Diamond push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Indre pecs, triceps', vanskelighet:'Middels', utstyr:'Ingen', emoji:'💎', animType:'press', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Hendene formet som en diamant under brystet. Trener indre bryst og triceps intenst.', tips:['Hendene tett under brystet','Albuer nær kroppen','Full bevegelsesbane'] },
  { id:'pikePushup', navn:'Pike push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Øvre pecs, skuldre, triceps', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🔺', animType:'press', sett:3, reps:'12', hvile:'60s', beskrivelse:'Hoften høyt i luften som en omvendt V. Kombinerer skulderpresse med brystaktivering.', tips:['Hoften høyt – V-form','Se bakover mot knærne','Albuer peker ut til siden'] },
  { id:'hantelBenkpress', navn:'Hantel benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs, triceps (uavhengig)', vanskelighet:'Nybegynner', utstyr:'Hantler + benk', emoji:'🥊', animType:'press', sett:4, reps:'10-12', hvile:'75s', beskrivelse:'Hantler gir friere bevegelse og aktiverer stabilisatorer mer enn stang. Bra for å rette opp ubalanser.', tips:['La hantlene møtes øverst','Roter litt innover øverst for klem','Kontrollert helt ned'] },
  { id:'pullup', navn:'Pull-up', kategori:'rygg', sted:'begge', muskelgruppe:'Lats, biceps, bakre deltoid', vanskelighet:'Avansert', utstyr:'Pull-up stang', emoji:'🤸', animType:'pull', sett:4, reps:'6-10', hvile:'2min', beskrivelse:'Kongen av ryggøvelser. Bredt grep aktiverer lats, smalt grep aktiverer biceps mer. Heng i full strekk mellom hvert rep.', tips:['Full strekk i bunn – ikke halvveis','Trekk albuer ned og bak mot hoften','Ikke sving – kontrollert'] },
  { id:'markloft', navn:'Markløft', kategori:'rygg', sted:'gym', muskelgruppe:'Hel rygg, glutes, hamstrings', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'⚡', animType:'hinge', sett:4, reps:'5-6', hvile:'3min', beskrivelse:'Den ultimate styrkeøvelsen. Trener nesten alle muskelgrupper med stangen i hendene. Teknikk er avgjørende.', tips:['Ryggen MÅ være nøytral – aldri rund','Press gulvet ned med bena','Stangen nær kroppen hele veien opp'] },
  { id:'latpulldown', navn:'Lat pulldown', kategori:'rygg', sted:'gym', muskelgruppe:'Lats, biceps', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'⬇️', animType:'pull', sett:3, reps:'10-13', hvile:'75s', beskrivelse:'God øvelse for å lære pull-up-mønsteret. Trekk stangen ned til øvre bryst med bredt grep.', tips:['Len 15° bakover for bedre lat-aktivering','Trekk albuen ned mot hoften','Full strekk i toppen'] },
  { id:'hantelroing', navn:'Hantelroing', kategori:'rygg', sted:'begge', muskelgruppe:'Øvre midtre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Hantel + benk', emoji:'🚣', animType:'pull', sett:4, reps:'10×2', hvile:'60s', beskrivelse:'Unilateral øvelse som lar deg fokusere på én side av gangen. Stabiler med hånd og kne på benk.', tips:['Albuen opp og bak – ikke utover','Ikke roter overkroppen','Klem skulderblad i toppen – hold 1 sek'] },
  { id:'kabelsittende', navn:'Sittende kabelroing', kategori:'rygg', sted:'gym', muskelgruppe:'Midtre rygg, rhomboids', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🔙', animType:'pull', sett:4, reps:'10-12', hvile:'75s', beskrivelse:'Fantastisk for midtre rygg og rhomboidene. Smalt grep gir mer biceps, bredt grep gir mer rygg.', tips:['Klem skulderblad i slutten','Rett rygg – ikke rund','Albuer nær kroppen'] },
  { id:'tBarRoing', navn:'T-bar roing', kategori:'rygg', sted:'gym', muskelgruppe:'Midtre rygg, lats, biceps', vanskelighet:'Middels', utstyr:'T-bar maskin / stang', emoji:'🔤', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Effektiv compound-øvelse som kombinerer lat-pull og roing. Gir stor volum i midtre rygg.', tips:['Overkroppen 45° fremover','Klem skulderblad på toppen','Kontrollert ned – ikke slipp'] },
  { id:'faceDown', navn:'Ryggekstensjon', kategori:'rygg', sted:'gym', muskelgruppe:'Erector spinae, glutes', vanskelighet:'Nybegynner', utstyr:'Ryggekstensjon benk', emoji:'🌊', animType:'hinge', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer den nedre og midtre ryggen. Start med kroppsvekt, legg hantler foran brystet for progresjon.', tips:['Ikke hyperekstend – stopp i nøytral','Klem glutes i toppen','Kontrollert ned'] },
  { id:'invertedRow', navn:'Invertert roing', kategori:'rygg', sted:'begge', muskelgruppe:'Øvre rygg, rear delts, biceps', vanskelighet:'Nybegynner', utstyr:'Bord/stang lavt', emoji:'🔄', animType:'pull', sett:3, reps:'10-15', hvile:'60s', beskrivelse:'Liggende under en stang eller bord, trekk brystet opp. God for nybegynnere på vei mot pull-ups.', tips:['Kroppen rett fra hode til hæl','Trekk brystet til stangen','Jo mer horisontal, jo vanskeligere'] },
  { id:'sniptrekk', navn:'Snupptrekk', kategori:'rygg', sted:'gym', muskelgruppe:'Øvre bakre rygg, nakke', vanskelighet:'Middels', utstyr:'Kabelmaskin (høyt)', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Face pull variasjon. Styrker bakre deltoid, rotator cuff og øvre rygg – essensielt for skulderhelse.', tips:['Albuer høyt – skulderbredde eller høyere','Trekk til ansiktet, eksterne rotasjon','Kontrollert tilbake'] },
  { id:'pullover', navn:'Pullover', kategori:'rygg', sted:'gym', muskelgruppe:'Lats, serratus, bryst', vanskelighet:'Middels', utstyr:'Hantel + benk', emoji:'🌙', animType:'pull', sett:3, reps:'12', hvile:'60s', beskrivelse:'Unik øvelse som strekker og aktiverer lats og serratus. Lig tvers over benken med en hantel.', tips:['Rett over hodet til hoften','Let bøy i albuen','Strekk maksimalt bak hodet'] },
  { id:'kroppsvektRow', navn:'Kroppsvekt roing', kategori:'rygg', sted:'hjemme', muskelgruppe:'Øvre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Bord', emoji:'🪑', animType:'pull', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Bruk kanten av et bord som treningsutstyr. Legg deg under bordet og trekk brystet opp til bordkanten.', tips:['Bordet stabilt og solid nok','Kroppen rett','Trekk mot nedre bryst'] },
  { id:'stangRoing', navn:'Stang roing', kategori:'rygg', sted:'gym', muskelgruppe:'Øvre og midtre rygg, biceps', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'🏗️', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Klassisk compound-roing. Overkroppen ca 45° fremover, stangen trekkes til nedre mage.', tips:['Nøytral rygg – ikke rund','Trekk til magen, ikke brystet','Albuer nær kroppen'] },
  { id:'knebøy', navn:'Knebøy', kategori:'bein', sted:'gym', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'🦵', animType:'squat', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Kongen av beinøvelser. Fundamental bevegelse som trener hele underkroppen og kjernen. Stangen på trapezius.', tips:['Bryst opp, ryggen nøytral','Knærne følger tærne – ikke inn','Ned til parallell eller dypere'] },
  { id:'legpress', navn:'Legpress', kategori:'bein', sted:'gym', muskelgruppe:'Quads, glutes', vanskelighet:'Nybegynner', utstyr:'Legpress maskin', emoji:'🔧', animType:'squat', sett:4, reps:'10-15', hvile:'90s', beskrivelse:'Maskin-alternativ til knebøy. Tryggere for ryggen og lar deg bruke mer vekt uten balansekrav.', tips:['Føtter skulderbredde fra hverandre','Aldri lås knærne helt opp','Full bevegelsesbane – ikke halvveis'] },
  { id:'rumMarkloeft', navn:'Rumensk markløft', kategori:'bein', sted:'begge', muskelgruppe:'Hamstrings, glutes', vanskelighet:'Middels', utstyr:'Hantler/stang', emoji:'🍑', animType:'hinge', sett:3, reps:'10-12', hvile:'90s', beskrivelse:'Eksepsjonell øvelse for hamstrings. Knærne lett bøyd, heng fremover til du kjenner strekk.', tips:['Rett rygg alltid – ikke rund','Heng fremover til strekk i hamstrings','Klem glutes øverst'] },
  { id:'bulgarianSplit', navn:'Bulgarian split squat', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Avansert', utstyr:'Benk + hantler/stang', emoji:'🏔️', animType:'squat', sett:3, reps:'10×2', hvile:'90s', beskrivelse:'Svært effektiv enbeinsøvelse. Bakfoten på benk, fremre foten langt nok frem til 90° i kneet.', tips:['Bakfot på benk, tå ned','Fremre kne ikke utenfor tå','Rett overkropp'] },
  { id:'gluteBridge', navn:'Glute bridge', kategori:'bein', sted:'hjemme', muskelgruppe:'Glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🌉', animType:'hinge', sett:4, reps:'15-20', hvile:'45s', beskrivelse:'Enkel men effektiv øvelse for rumpa. Legg deg på rygg, bøy knærne og press hoften opp mot taket.', tips:['Press gjennom hælen','Klem rumpa maksimalt øverst','Hold 1-2 sek øverst per rep'] },
  { id:'lunges', navn:'Utfall', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen / hantler', emoji:'🚶', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Steg fremover med langt steg ned mot gulvet. Fremre kne over ankelen, bakre kne nesten i gulvet.', tips:['Rett overkropp','Fremre kne aldri foran tå','Dyp nok – bakre kne nær gulvet'] },
  { id:'legCurl', navn:'Leg curl', kategori:'bein', sted:'gym', muskelgruppe:'Hamstrings (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg curl maskin', emoji:'🦿', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for hamstrings. Liggende eller sittende på maskin. Trekk hælen mot rumpa.', tips:['Kontrollert ned – ikke slipp','Hold 1 sek i toppen','Full bevegelsesbane'] },
  { id:'legExtension', navn:'Leg extension', kategori:'bein', sted:'gym', muskelgruppe:'Quadriceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg extension maskin', emoji:'🦵', animType:'squat', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer quadriceps. Sett deg i maskinen og strekk bena rett ut. Bra finisher etter knebøy.', tips:['Ikke bruk for tung vekt','Klem quads i toppen','Kontrollert ned – 3 sekunder'] },
  { id:'calfRaise', navn:'Tåhev', kategori:'bein', sted:'begge', muskelgruppe:'Gastrocnemius, soleus', vanskelighet:'Nybegynner', utstyr:'Ingen / trapp', emoji:'🦶', animType:'squat', sett:4, reps:'20-25', hvile:'45s', beskrivelse:'Press opp på tærne, hold øverst, senk kontrollert. Gjør på en trapp for full bevegelsesbane.', tips:['Full strekk ned – hælen under trappen','Hold 2 sek øverst','Langsom ned-fase for best effekt'] },
  { id:'sumoKnebøy', navn:'Sumo knebøy', kategori:'bein', sted:'begge', muskelgruppe:'Indre lår, glutes, quads', vanskelighet:'Middels', utstyr:'Kettlebell/hantel', emoji:'🤼', animType:'squat', sett:3, reps:'12', hvile:'75s', beskrivelse:'Bred stilling med tær pekende ut. Aktiverer indre lår og glutes mer enn vanlig knebøy.', tips:['Bred stilling – tær 45° ut','Knærne følger tærne utover','Rett rygg og bryst opp'] },
  { id:'stepUp', navn:'Step-up', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Nybegynner', utstyr:'Kasse / benk', emoji:'📦', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Steg opp på en kasse eller benk. Bruk det fremre beinet – ikke dytt fra det bakre.', tips:['Press gjennom fremre hæl','Full strekk i toppen','Kontrollert ned'] },
  { id:'nordiskCurl', navn:'Nordisk curl', kategori:'bein', sted:'begge', muskelgruppe:'Hamstrings (eksentrislt)', vanskelighet:'Avansert', utstyr:'Noe å holde ankler', emoji:'🌊', animType:'hinge', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Eksentrislt trening av hamstrings. Holder ankler fast, senk kroppen forover så sakte som mulig.', tips:['Senk veldig sakte – 5+ sekunder','Bruk hendene for å bryte fallet','Kjerneaktivering viktig'] },
  { id:'militaryPress', navn:'Military press', kategori:'skuldre', sted:'gym', muskelgruppe:'Alle deltaider, triceps', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'⬆️', animType:'press', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Stående skulderpressøvelse med stang. Rekrutterer core og hele kroppen for stabilisering. Stangen starter fra kragebeinnivå.', tips:['Stram core – ikke len bakover','Stangen til haken i ned-posisjon','Pust ut på vei opp'] },
  { id:'hantelSkuldPress', navn:'Hantelpress', kategori:'skuldre', sted:'begge', muskelgruppe:'Alle deltaider', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'💺', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Sittende eller stående hantelpress gir uavhengig bevegelse for hver arm, bra for å utjevne ubalanser.', tips:['Pust ut øverst','Albuer 90° i bunn','Kontrollert ned-fase – 2 sek'] },
  { id:'sidehev', navn:'Sidehev', kategori:'skuldre', sted:'begge', muskelgruppe:'Lateral deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🔼', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for de laterale (ytre) deltoidehodene. Gir bred skulderform. Bruk lettere vekt enn du tror.', tips:['Lett bøy i albuen – ikke løft rett arm','Løft til skulderhøyde – ikke over','Lillefingrene litt høyere enn tomler'] },
  { id:'facePull', navn:'Face pull', kategori:'skuldre', sted:'gym', muskelgruppe:'Bakre deltoid, rotator cuff', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Undervurdert øvelse for skulderhelsa. Styrker bakre deltoid og rotator cuff. Gjør denne ofte!', tips:['Kabelen på øyenivå','Albuer høyt – over skuldrene','Trekk til ansiktet og roter utover'] },
  { id:'frontHev', navn:'Fronthev', kategori:'skuldre', sted:'begge', muskelgruppe:'Fremre deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', emoji:'⬆️', animType:'raise', sett:3, reps:'12', hvile:'60s', beskrivelse:'Isolerer fremre deltahodet. Løft rett fremover til skulderbredde. Ikke hev over skuldrene.', tips:['Rett arm eller svak bøy','Ikke sving fra kroppen','Stopp ved skulderbredde'] },
  { id:'bakHev', navn:'Omvendt flyes', kategori:'skuldre', sted:'begge', muskelgruppe:'Bakre deltoid, rhomboids', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🦅', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Bend framover ca 45-90°, løft hantlene ut til siden. Aktiverer bakre deltoid og øvre rygg.', tips:['Bøy fremover – ikke stå rett','Løft albene – ikke handlende','Klem skulderblad i toppen'] },
  { id:'skulderRotasjon', navn:'Intern/ekstern rot.', kategori:'skuldre', sted:'begge', muskelgruppe:'Rotator cuff (rehabilitering)', vanskelighet:'Nybegynner', utstyr:'Lett hantel / band', emoji:'🔄', animType:'curl', sett:3, reps:'15', hvile:'30s', beskrivelse:'Rehabiliteringsøvelse for rotator cuff. Essensiell for langsiktig skulderhelsa. Bruk VELDIG lett vekt.', tips:['Albuen fast ved siden','Bare underarmen beveger seg','Aldri rush – alltid kontrollert'] },
  { id:'arnoldPress', navn:'Arnold press', kategori:'skuldre', sted:'begge', muskelgruppe:'Alle deltaider (rotasjon)', vanskelighet:'Middels', utstyr:'Hantler', emoji:'💪', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Oppfunnet av Arnold Schwarzenegger. Starter med hantler foran ansiktet og roterer ut mens du presser opp.', tips:['Roter sakte og kontrollert','Full rotasjon gjennom hele bevegelsen','God for skuldervolum'] },
  { id:'uprekkRoing', navn:'Upright roing', kategori:'skuldre', sted:'gym', muskelgruppe:'Lateral deltoid, trapezius', vanskelighet:'Middels', utstyr:'Stang / kabel', emoji:'⬆️', animType:'pull', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Trekk stangen rett opp langs kroppen til haken. Aktiverer lateral deltoid og trapezius.', tips:['Bredt grep (skulderbredde) er snillest for skuldre','Albuer høyere enn hender','Ikke over haken'] },
  { id:'skrapshrug', navn:'Skuldertrekk', kategori:'skuldre', sted:'begge', muskelgruppe:'Trapezius', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', emoji:'🤷', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Trekk skuldrene rett opp mot ørene. Isolerer trapezius. Hold øverst for best aktivering.', tips:['Trekk rett opp – ikke roter','Hold 1-2 sek øverst','Kontrollert ned'] },
  { id:'bicepsCurl', navn:'Biceps curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps brachii', vanskelighet:'Nybegynner', utstyr:'Hantler eller stang', emoji:'💪', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Klassisk bicepsøvelse. Stå rett med hantler i hendene og curl opp mens albuen holdes fast.', tips:['Albuen fast ved siden','Ingen sving i kroppen – isoler','Klem biceps i toppen'] },
  { id:'hammerCurl', navn:'Hammer curl', kategori:'bicep', sted:'begge', muskelgruppe:'Brachialis, underarm', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🔨', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Nøytral grep-curl som trener brachialis og underarmsmusklene i tillegg til biceps. Gir tykkere overarm.', tips:['Tommel peker opp gjennom hele bevegelsen','Albuen fast','Alternér armene for mer fokus'] },
  { id:'preacherCurl', navn:'Preacher curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (kort hode)', vanskelighet:'Middels', utstyr:'EZ-stang + preacher benk', emoji:'🙏', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Preacher benken isolerer biceps perfekt ved å fjerne muligheten til å jukse med kroppen.', tips:['Full strekk i bunn – ikke lås albuen','Langsom ned-fase – 3 sek','Ikke slå opp – curl'] },
  { id:'konsentrertCurl', navn:'Konsentrert curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps (topp-isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', emoji:'🎯', animType:'curl', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Sit ned, albuen mot innsiden av låret. Ultimat isolasjonsøvelse for biceps-topp.', tips:['Albuen mot låret – fast','Klem hardt i toppen','Langsom og kontrollert'] },
  { id:'kabelbicep', navn:'Kabel biceps curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (konstant spenning)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🔁', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabelen gir konstant spenning gjennom hele bevegelsen, noe frivekter ikke gjør.', tips:['Albuen fast','Hold spenningen i bunn','Superset med hantel curl'] },
  { id:'inclineCurl', navn:'Incline curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (langt hode – strekk)', vanskelighet:'Middels', utstyr:'Hantler + skrå benk', emoji:'📐', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Liggende på en skrå benk stretcher det lange hodet maximalt. Gir ekstra dybde i biceps.', tips:['La armene henge bak kroppen','Strekk maksimalt i bunn','Curl opp uten å endre benk-kontakt'] },
  { id:'reversCurl', navn:'Revers curl', kategori:'bicep', sted:'begge', muskelgruppe:'Brachioradialis, underarm', vanskelighet:'Nybegynner', utstyr:'Stang / hantler', emoji:'🔃', animType:'curl', sett:3, reps:'12', hvile:'60s', beskrivelse:'Overgrep-curl (håndflaten ned) for underarmer og brachioradialis. Bra for å balansere armene.', tips:['Litt lettere vekt enn vanlig curl','Albuen fast','Langsom og kontrollert'] },
  { id:'zottmanCurl', navn:'Zottman curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps + underarm kombinert', vanskelighet:'Middels', utstyr:'Hantler', emoji:'🌀', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Curl opp med undergrep (biceps), roter til overgrep (underarm) og senk ned. Trener alt i én bevegelse.', tips:['Curl opp – roter – senk ned sakte','3 sekunder ned','Lett vekt – teknikk viktigst'] },
  { id:'tricepsPushdown', navn:'Triceps pushdown', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps (lateral hode)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'📉', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Grunnleggende tricepsøvelse på kabel. Hold albuen fast ved siden og press ned til full strekk.', tips:['Albuen fast ved siden','Press helt ned – full strekk','Kontrollert opp – ikke slipp'] },
  { id:'skullCrusher', navn:'Skull crushers', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps (alle hoder)', vanskelighet:'Middels', utstyr:'EZ-stang + benk', emoji:'💀', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Effektiv tricepsøvelse liggende. Bare albuene bøyer, resten er stabilt. Senk mot pannen eller litt bak hodet.', tips:['Bare albuene bøyer – stabil overarm','Sikt mot pannen eller akkurat bak','Kontrollert og sakte ned'] },
  { id:'overheadExt', navn:'Overhead ext.', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Middels', utstyr:'Hantel', emoji:'⬆️', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Det lange hodets funksjon er å strekke arm bak hodet. Sittende med én hantel over hodet.', tips:['Albuer nær hodet – ikke utover','Full strekk øverst','Kontrollert ned bak hodet'] },
  { id:'tricepsDips', navn:'Benk dips', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps', vanskelighet:'Nybegynner', utstyr:'Stol / benk', emoji:'🪑', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hender på kanten av en stol, bena ut foran deg. Senk kroppen ned og press opp.', tips:['Hender skulderbredde','Rett ryggen nær stolen','Kontrollert ned til 90°'] },
  { id:'closegripPress', navn:'Smalt grep benkpress', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Middels', utstyr:'Vektstang + benk', emoji:'🤝', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Samme som benkpress men med smalt grep (skulderbredde). Primært triceps, sekundært bryst.', tips:['Smalt grep – skulderbredde, ikke smalere','Albuer nær kroppen under presset','Kontrollert ned'] },
  { id:'kabeloverhead', navn:'Kabel overhead ext.', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin (lavt)', emoji:'🔗', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabel bakfra over hodet. Konstant spenning på triceps gjennom hele bevegelsen.', tips:['Albuer fast ved hodet','Tøy godt i bunn','Klem i full strekk'] },
  { id:'pushupSmalt', navn:'Push-up smalt grep', kategori:'tricep', sted:'hjemme', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🙌', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hendene skulderbredde eller smalere. Albuer nær kroppen hele veien. Primært triceps.', tips:['Albuer nær kroppen – ikke utover','Hendene rett under skuldrene','Kroppen rett'] },
  { id:'kickback', navn:'Triceps kickback', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', emoji:'🦵', animType:'pushdown', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Bøy fremover, overarmen parallell med gulvet og strekk armen bak. Perfekt isolasjon.', tips:['Overarmen parallell med gulvet – stabil','Bare underarmen beveger seg','Klem triceps i full strekk'] },
  { id:'planke', navn:'Planke', kategori:'core', sted:'begge', muskelgruppe:'Transversus abdominis, erectors', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🧘', animType:'plank', sett:3, reps:'45 sek', hvile:'45s', beskrivelse:'Statisk kjerneøvelse. Tren kroppsspenning – ikke bevegelse. Fokus på å aktivere hele kroppen.', tips:['Hoften nede – ikke dytt opp','Stram alt – lår, mage, rygg','Pust normalt – ikke hold pusten'] },
  { id:'crunches', navn:'Crunches', kategori:'core', sted:'hjemme', muskelgruppe:'Rectus abdominis', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🔄', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Klassisk mageøvelse. Fokuser på å krølle overkroppen, ikke heve hele ryggen. Pust ut på vei opp.', tips:['Hender ved tinningen – ikke bak nakken','Pust ut i toppen','Se mot taket – ikke mot knærne'] },
  { id:'legRaises', navn:'Legheving', kategori:'core', sted:'begge', muskelgruppe:'Nedre rectus, hoftefleksorer', vanskelighet:'Middels', utstyr:'Ingen / pull-up stang', emoji:'⬆️', animType:'crunch', sett:3, reps:'15', hvile:'60s', beskrivelse:'Trener nedre mage effektivt. Kan gjøres liggende eller hengende. Hold bena så rette som mulig.', tips:['Rett bena – eller svak bøy','Press ryggen mot gulvet','Kontrollert ned – ikke slipp'] },
  { id:'russianTwist', navn:'Russian twist', kategori:'core', sted:'hjemme', muskelgruppe:'Obliques', vanskelighet:'Middels', utstyr:'Medisinball (valgfritt)', emoji:'🔃', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Roteringsøvelse for de skrå magemusklene. Løft føttene for mer utfordring.', tips:['Løft føttene for mer utfordring','Roter fra midjen – ikke skuldrene','Kontrollert tempo'] },
  { id:'mountainClimber', navn:'Fjellklatrere', kategori:'core', sted:'hjemme', muskelgruppe:'Core, hoftefleksorer, cardio', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'⛰️', animType:'run', sett:3, reps:'30 sek', hvile:'30s', beskrivelse:'Plankeposisjon, kjør knærne frem og tilbake i høyt tempo. Cardio og core kombinert.', tips:['Hoften nede – ikke dytt opp','Rask og eksplosiv','Armene rette'] },
  { id:'abWheel', navn:'Ab wheel', kategori:'core', sted:'begge', muskelgruppe:'Hele kjerne, skulder, rygg', vanskelighet:'Avansert', utstyr:'Ab wheel', emoji:'⚙️', animType:'plank', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Ekstremt effektiv kjerneøvelse. Rull ut fra knærne, hold rygg rett, rull tilbake med magen.', tips:['Start fra knærne','Rygg ALDRI rund – nøytral ryggrad','Ikke rull lenger enn du klarer å komme tilbake kontrollert'] },
  { id:'sidefplanke', navn:'Sideplanke', kategori:'core', sted:'hjemme', muskelgruppe:'Obliques, hofteabduktorer', vanskelighet:'Middels', utstyr:'Ingen', emoji:'↔️', animType:'plank', sett:3, reps:'30s×2', hvile:'45s', beskrivelse:'Planke på siden. Stram obliques og hold hoften opp. Roter ned og opp for bevegelsesvariant.', tips:['Hoften rett opp – ikke la den falle','Stram obliques aktivt','Legg arm evt. mot gulv for lettere variant'] },
  { id:'dragonFlag', navn:'Dragon flag', kategori:'core', sted:'begge', muskelgruppe:'Hele kjerne (avansert)', vanskelighet:'Avansert', utstyr:'Benk / gulv', emoji:'🐉', animType:'crunch', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Oppfunnet av Bruce Lee. Lig på rygg, hold fast bak hodet, løft kroppen som en rett linje.', tips:['Kroppen MÅ holdes rett','Senk ekstremt sakte – 4-6 sek','Bygg med benbøy først'] },
  { id:'toeToBar', navn:'Tå til stang', kategori:'core', sted:'gym', muskelgruppe:'Rectus abdominis, hoftefleksorer', vanskelighet:'Avansert', utstyr:'Pull-up stang', emoji:'🏹', animType:'crunch', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Heng fra en stang og løft tærne opp til stangen. Krever både styrke og fleksibilitet.', tips:['Kontrollert pendelbevegelse','Trekk knærne opp først om for vanskelig','Hold spenningen i kjernen'] },
  { id:'pallofPress', navn:'Pallof press', kategori:'core', sted:'gym', muskelgruppe:'Anti-rotasjon, obliques', vanskelighet:'Middels', utstyr:'Kabelmaskin', emoji:'🚫', animType:'press', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Anti-rotasjonsøvelse. Stå siden av kabelen, hold kabler ved brystet og press fremover – motstå rotasjon.', tips:['Hoftene og skuldrene holdes fremover','Motstå rotasjonen aktivt','Øk vekt når det ikke utfordrer'] },
  { id:'burpees', navn:'Burpees', kategori:'fullkropp', sted:'begge', muskelgruppe:'Full kropp + kardio', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🔥', animType:'squat', sett:4, reps:'10', hvile:'60s', beskrivelse:'Den ultimate høy-intensitets øvelsen. Push-up, squat og hopp i én bevegelse. Dropp hopp for lettere variant.', tips:['Push-up nede, hopp inn – squat opp','Eksplosivt hopp med armene opp','Kjernen stram gjennom hele'] },
  { id:'kettlebellSwing', navn:'Kettlebell swing', kategori:'fullkropp', sted:'begge', muskelgruppe:'Posterior chain + cardio', vanskelighet:'Middels', utstyr:'Kettlebell', emoji:'🔔', animType:'hinge', sett:4, reps:'15', hvile:'60s', beskrivelse:'Eksplosiv hip-hinge bevegelse. Kraften kommer fra hoften, ikke armene. Kettlebellen svinger, du driver.', tips:['HIP HINGE – ikke knebøy','Nakken i forlengelse av rygg','Klem glutes øverst – eksplosivt'] },
  { id:'thrusters', navn:'Thrusters', kategori:'fullkropp', sted:'begge', muskelgruppe:'Bein + skuldre kombinert', vanskelighet:'Avansert', utstyr:'Hantler', emoji:'🚀', animType:'squat', sett:3, reps:'10', hvile:'90s', beskrivelse:'Knebøy ned, press opp i én flytende bevegelse. Ekstremt effektivt for kondisjon og full-kropp styrke.', tips:['Flytende bevegelse – en operasjon','Bruk benets kraft til skulderpresset','Lett vekt, høy intensitet'] },
  { id:'manMaker', navn:'Man maker', kategori:'fullkropp', sted:'begge', muskelgruppe:'Hele kroppen', vanskelighet:'Avansert', utstyr:'Hantler', emoji:'🦾', animType:'squat', sett:3, reps:'6-8', hvile:'2min', beskrivelse:'Hantelroing, push-up, clean og press i én bevegelse. En av de mest krevende øvelsene som finnes.', tips:['Ta det rolig – teknikk er kritisk','Roing → push-up → clean → press','Bruk lett vekt de første gangene'] },
  { id:'turkishGetup', navn:'Turkish get-up', kategori:'fullkropp', sted:'begge', muskelgruppe:'Full kropp, skulder stabilitet', vanskelighet:'Avansert', utstyr:'Kettlebell / hantel', emoji:'🧗', animType:'press', sett:2, reps:'5×2', hvile:'2min', beskrivelse:'Fra liggende til stående med en kettlebell strakt over hodet. Trener mobilitet, stabilitet og styrke.', tips:['Blikket alltid på kettlebellen','7 trinn – lær hver enkelt','Lett vekt for å lære teknikk'] },
  { id:'boxJump', navn:'Box jump', kategori:'fullkropp', sted:'gym', muskelgruppe:'Quads, glutes, cardio (plyo)', vanskelighet:'Middels', utstyr:'Plyo-kasse', emoji:'📦', animType:'squat', sett:4, reps:'8', hvile:'90s', beskrivelse:'Eksplosivt hopp opp på en kasse. Trener eksplosiv kraft og kondisjon. Land mykt med bøyde knær.', tips:['Svinge armer for momentum','Land mykt – bend knærne','Stig ned kontrollert – ikke hopp ned'] },
  { id:'battleRopes', navn:'Battle ropes', kategori:'fullkropp', sted:'gym', muskelgruppe:'Skuldre, armer, core, cardio', vanskelighet:'Middels', utstyr:'Battle ropes', emoji:'🌊', animType:'run', sett:4, reps:'30 sek', hvile:'30s', beskrivelse:'Alternerende eller dobble bølger med kraftige tau. Fantastisk for kondisjon og øvre kropp styrke-utholdenhet.', tips:['Knærne litt bøyd – stabil base','Variér: alternering, dobbel, lateral','Hold intensiteten oppe'] },
  { id:'wallball', navn:'Wall ball', kategori:'fullkropp', sted:'gym', muskelgruppe:'Quads, skuldre, core', vanskelighet:'Middels', utstyr:'Medisinball + vegg', emoji:'🎱', animType:'squat', sett:4, reps:'15', hvile:'60s', beskrivelse:'Squat og kast medisinballen mot veggen i én bevegelse. Utbredt i CrossFit, ekstremt effektivt.', tips:['Squat dypt – parallell eller under','Kast på vei opp fra squaten','Fang lavt og gå rett i neste squat'] },
  { id:'sandbagCarry', navn:'Farmers walk', kategori:'fullkropp', sted:'begge', muskelgruppe:'Core, grepstyrkr, ben, rygg', vanskelighet:'Nybegynner', utstyr:'Hantler / kettlebells', emoji:'🚶', animType:'run', sett:3, reps:'40 m', hvile:'90s', beskrivelse:'Gå med tunge hantler i hendene. Enkelt men ekstremt effektivt for full-kropp og grepstyrkr.', tips:['Rett rygg, skuldrene tilbake','Stram core hele veien','Korte raske steg'] },
  { id:'kettlebellClean', navn:'Kettlebell clean', kategori:'fullkropp', sted:'begge', muskelgruppe:'Hofter, skuldre, core', vanskelighet:'Middels', utstyr:'Kettlebell', emoji:'🔔', animType:'hinge', sett:3, reps:'8×2', hvile:'90s', beskrivelse:'Løft kettlebellen fra hengeposisjon til rack-posisjon (ved skulderen) med en eksplosiv hip-drive.', tips:['Kraften fra hoften – ikke armen','La kettlebellen gli langs kroppen','Myk landing i rack-posisjon'] },
  { id:'romaskin', navn:'Romaskin', kategori:'cardio', sted:'gym', muskelgruppe:'Full kropp (85% av muskler)', vanskelighet:'Middels', utstyr:'Romaskin', emoji:'🚣', animType:'pull', sett:1, reps:'20 min', hvile:'–', beskrivelse:'Den beste kardio-maskinen. Trener både overkropp og underkropp. Teknikk: bein → helling → armer.', tips:['Bein → helling → armer (rekkefølge!)','Ikke avrund ryggen','Damper: 4-6 anbefalt'] },
  { id:'sykkel', navn:'Stasjonær sykkel HIIT', kategori:'cardio', sted:'gym', muskelgruppe:'Quadriceps, calves, cardio', vanskelighet:'Nybegynner', utstyr:'Stasjonær sykkel', emoji:'🚴', animType:'run', sett:8, reps:'30s/90s', hvile:'–', beskrivelse:'HIIT på sykkel er svært effektivt for fettforbrenning. 8 runder à 30 sek maks og 90 sek rolig.', tips:['Maks watt i 30 sek','Rolig tråkk i 90 sek','Juster sadelhøyde slik at kneet er lett bøyd øverst'] },
  { id:'elipsemaskin', navn:'Elipsemaskin', kategori:'cardio', sted:'gym', muskelgruppe:'Full kropp, ledd-vennlig', vanskelighet:'Nybegynner', utstyr:'Elipsemaskin', emoji:'🏃', animType:'run', sett:1, reps:'25 min', hvile:'–', beskrivelse:'Skånsom kardio som er bra for knær og hofter. Variert motstand holder pulsen oppe.', tips:['Bruk armene aktivt','Varier motstand hvert 5. minutt','Rett rygg og bryst opp'] },
  { id:'tredemill', navn:'Tredemølle intervall', kategori:'cardio', sted:'gym', muskelgruppe:'Bein, hjerte-kar', vanskelighet:'Middels', utstyr:'Tredemølle', emoji:'👟', animType:'run', sett:6, reps:'2m/1m', hvile:'–', beskrivelse:'Effektiv kondisjonstrening på tredemølle. Varier mellom rolig jogg og hard løping.', tips:['Ikke hold i gelenderet','Øk hastighet gradvis','Inkluder 5 min oppvarming og nedkjøling'] },
  { id:'hoppingTau', navn:'Hoppetau', kategori:'cardio', sted:'begge', muskelgruppe:'Bein, koordinasjon, cardio', vanskelighet:'Nybegynner', utstyr:'Hoppetau', emoji:'🪢', animType:'run', sett:5, reps:'1 min', hvile:'30s', beskrivelse:'Klassisk kondisjonstrening. 100 kalorier per 10 minutter. Variasjoner: enkelt, dobbelt, kryss.', tips:['Tuppene lander – ikke hele foten','Snu tauet fra håndledd – ikke skulder','Lav hopp – hold under 5 cm'] },
  { id:'sprintIntervall', navn:'Sprint intervall', kategori:'cardio', sted:'begge', muskelgruppe:'Bein, hjerte-kar (HIIT)', vanskelighet:'Middels', utstyr:'Ingen', emoji:'⚡', animType:'run', sett:8, reps:'20s/40s', hvile:'–', beskrivelse:'20 sekunder maks sprint, 40 sekunder gange eller jogg. Tabata-protokoll. Ekstremt tidseffektivt.', tips:['Varm opp godt – 10 min','Full innsats i 20 sek – ingenting igjen','Avkjøl godt etterpå'] },
  { id:'stairClimber', navn:'Trappemaskin', kategori:'cardio', sted:'gym', muskelgruppe:'Quads, glutes, cardio', vanskelighet:'Nybegynner', utstyr:'Stair climber', emoji:'🏔️', animType:'squat', sett:1, reps:'20 min', hvile:'–', beskrivelse:'Klatre trapper på maskin. Lavere belastning på knærne enn løping, høyere glutes-aktivering.', tips:['Ikke hold i gelenderet – bruk som balanse kun','Rett rygg','Varier med sidesteg'] },
  { id:'airdyne', navn:'Airdyne sykkel', kategori:'cardio', sted:'gym', muskelgruppe:'Full kropp cardio', vanskelighet:'Middels', utstyr:'Airdyne / assault bike', emoji:'💨', animType:'run', sett:5, reps:'30s/60s', hvile:'–', beskrivelse:'Armer og bein driver en luftfanmotstands-sykkel. Jo hardere du tråkker, jo mer motstand.', tips:['Bruk armene like mye som bena','30 sek alt du har – 60 sek rolig','Motstanden er selv-regulerende'] },
  { id:'plyoJacks', navn:'Jumping jacks', kategori:'cardio', sted:'hjemme', muskelgruppe:'Full kropp, koordinasjon', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'⭐', animType:'run', sett:3, reps:'45 sek', hvile:'15s', beskrivelse:'Klassisk oppvarmings- og kondisasjonsøvelse. God for å øke pulsen raskt. Bruk som superset eller oppvarming.', tips:['Armene fullt ut til siden','Land mykt på tuppene','Hold jevnt tempo'] },
  { id:'boxing', navn:'Skyggaboksing', kategori:'cardio', sted:'hjemme', muskelgruppe:'Skuldre, armer, core, cardio', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🥊', animType:'run', sett:5, reps:'2 min', hvile:'1 min', beskrivelse:'Boks mot luften. Kombinasjon av jab, kryss, krokkslag og huk. Fantastisk kardio som også er gøy.', tips:['Føttene skulderbredde – beveg deg','Knyttnevene opp og beskytt ansiktet','Hold god teknikk – ikke bare sleng'] },
  { id:'pistolSquat', navn:'Pistol squat', kategori:'bein', sted:'hjemme', muskelgruppe:'Quads, glutes (enbeins)', vanskelighet:'Avansert', utstyr:'Ingen', emoji:'🎯', animType:'squat', sett:3, reps:'5×2', hvile:'2min', beskrivelse:'Enbeins knebøy til gulvet. Ultimat beinstyrke-test uten utstyr. Bygg med assistert variant først.', tips:['Start assister med TRX eller stol','Hælen ned – ikke opp','Kneet holder seg over tå'] },
  { id:'archerPushup', navn:'Archer push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Pecs, triceps (unilateral)', vanskelighet:'Avansert', utstyr:'Ingen', emoji:'🏹', animType:'press', sett:3, reps:'6×2', hvile:'90s', beskrivelse:'En arm utover, senk mot den aktive siden. Mellomsteg mot enarms push-up.', tips:['Den inaktive armen er rett – støtte','Senk sakte til siden','Kontrollert opp med aktiv arm'] },
  { id:'handstandPushup', navn:'Håndstånde push-up', kategori:'skuldre', sted:'hjemme', muskelgruppe:'Skuldre, triceps (avansert)', vanskelighet:'Avansert', utstyr:'Vegg', emoji:'🤸', animType:'press', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Mot veggen, press kroppen ned og opp. Ekstremt effektiv skulderøvelse uten utstyr.', tips:['Start med veggen','Albuer peker fremover – ikke ut','Kontrollert ned'] },
  { id:'dipsStol', navn:'Stoldips', kategori:'tricep', sted:'hjemme', muskelgruppe:'Triceps, bryst', vanskelighet:'Nybegynner', utstyr:'Stol', emoji:'🪑', animType:'press', sett:3, reps:'15', hvile:'60s', beskrivelse:'To stoler side om side, dips mellom dem. Enda bedre enn benk-dips da du kan gå dypere.', tips:['Rett rygg nær stolene','Kontrollert ned til 90°','Press uten å låse albuene'] },
  { id:'jumpSquat', navn:'Hopp knebøy', kategori:'bein', sted:'hjemme', muskelgruppe:'Quads, glutes, plyo', vanskelighet:'Middels', utstyr:'Ingen', emoji:'⬆️', animType:'squat', sett:4, reps:'12', hvile:'60s', beskrivelse:'Knebøy ned og eksploder opp i et hopp. Plyo-trening som bygger eksplosiv kraft.', tips:['Dyp squat – parallell','Eksploder fra bunn','Land mykt med bøyde knær'] },
  { id:'crabWalk', navn:'Krabbegange', kategori:'core', sted:'hjemme', muskelgruppe:'Triceps, glutes, core', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🦀', animType:'crunch', sett:3, reps:'30 sek', hvile:'30s', beskrivelse:'Sitt i omvendt bord-posisjon og beveg deg sideveis. Morsom og effektiv full-kropp øvelse.', tips:['Hoften opp – ikke la den synke','Beveg motsatt arm og ben','Hold tempo oppe'] },
  { id:'inchworm', navn:'Inchworm', kategori:'fullkropp', sted:'hjemme', muskelgruppe:'Hamstrings, skuldre, core', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🐛', animType:'plank', sett:3, reps:'10', hvile:'45s', beskrivelse:'Bøy ned, gå på hendene ut til plankeposisjon, gå tilbake, reis deg. Mobilitet og styrke.', tips:['Bena rett ved nedbøying','Hold planken et sekund','Kontrollert og langsom'] },
  { id:'nordicWalking', navn:'Bear crawl', kategori:'fullkropp', sted:'hjemme', muskelgruppe:'Skuldre, quads, core', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🐻', animType:'run', sett:3, reps:'20 m', hvile:'60s', beskrivelse:'Krabbing på alle fire med knærne 10 cm over gulvet. Ekstremt krevende for core og skuldre.', tips:['Knærne rett over gulvet – ikke synke','Motsatt arm og ben','Hoften nede og jevn'] },
  { id:'wallSit', navn:'Vegghold', kategori:'bein', sted:'hjemme', muskelgruppe:'Quads (isometrisk)', vanskelighet:'Nybegynner', utstyr:'Vegg', emoji:'🧱', animType:'squat', sett:3, reps:'45 sek', hvile:'45s', beskrivelse:'Rygg mot veggen, 90° i kneet. Isometrisk hold som brenner ut quadriceps effektivt.', tips:['90° i kneet – ikke mer','Rygg flat mot veggen','Pust rolig og jevnt'] },
  { id:'scapularPushup', navn:'Skulderblad push-up', kategori:'rygg', sted:'hjemme', muskelgruppe:'Serratus anterior, skulderblad', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🦋', animType:'press', sett:3, reps:'15', hvile:'45s', beskrivelse:'Plankeposisjon, press skulderblad fra hverandre og dra dem sammen. Liten bevegelse, stor effekt.', tips:['Armene rette – bare skulderblad beveger seg','Protrasjon og retrasjon','Viktig for rotator cuff helse'] },
]

const KATEGORIER = ['alle', 'bryst', 'rygg', 'bein', 'skuldre', 'bicep', 'tricep', 'core', 'cardio', 'fullkropp']
const STEDER = ['alle', 'gym', 'hjemme']
const KAT_COLORS: Record<string, string> = {
  bryst:'#00c8ff', rygg:'#b44eff', bein:'#00ff88', skuldre:'#ff8c00',
  bicep:'#ff4488', tricep:'#ff6600', core:'#ffcc00', cardio:'#00ff88', fullkropp:'#00f5ff',
}
const VANSKELIG_COLOR = { Nybegynner:'var(--green)', Middels:'var(--orange)', Avansert:'#ff4444' }
const KAT_EMOJI: Record<string, string> = {
  bryst:'💎', rygg:'🔙', bein:'🦵', skuldre:'🔼', bicep:'💪',
  tricep:'💀', core:'🎯', cardio:'🏃', fullkropp:'⚡'
}

// ── Virtualisert gruppe: render kun X kort om gangen ─────────────────────────
const BATCH = 20

function OvGruppe({ kat, ovelser, valgt, setValgt }: {
  kat: string; ovelser: Ovelse[]
  valgt: Ovelse | null; setValgt: (o: Ovelse | null) => void
}) {
  const [antall, setAntall] = useState(BATCH)
  const synlige = ovelser.slice(0, antall)
  const harMer = antall < ovelser.length

  return (
    <div className="ov-gruppe">
      <div className="ov-gruppe-header">
        <span className="ov-gruppe-ikon">{KAT_EMOJI[kat]}</span>
        <span className="ov-gruppe-tittel" style={{ color: KAT_COLORS[kat] ?? 'var(--cyan)' }}>
          {kat.charAt(0).toUpperCase() + kat.slice(1)}
        </span>
        <span className="ov-gruppe-count">{ovelser.length}</span>
      </div>
      <div className="ov-grid">
        {synlige.map(o => {
          const color = KAT_COLORS[o.kategori] ?? 'var(--cyan)'
          const isValgt = valgt?.id === o.id
          return (
            <button
              key={o.id}
              className={`ov-card glass-card${isValgt ? ' ov-card-valgt' : ''}`}
              style={isValgt ? { borderColor:`${color}50`, background:`${color}08` } : {}}
              onClick={() => setValgt(isValgt ? null : o)}
            >
              <div className="ov-card-anim">
                <AnimasjonSVG type={o.animType} color={color} size={60} />
              </div>
              <div className="ov-card-body">
                <div className="ov-card-navn">{o.navn}</div>
                <div className="ov-card-kat" style={{ color }}>{o.kategori}</div>
                <div className="ov-card-muskler">{o.muskelgruppe.split(',')[0]}</div>
                <div className="ov-card-tags">
                  <span className="ov-card-tag">{o.sett}×{o.reps}</span>
                  <span className="ov-card-tag" style={{ color: VANSKELIG_COLOR[o.vanskelighet] }}>{o.vanskelighet}</span>
                  <span className="ov-card-tag" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {o.sted === 'begge' ? '🌍' : o.sted === 'gym' ? '🏋️' : '🏠'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {harMer && (
        <button className="ov-vis-mer" onClick={() => setAntall(a => a + BATCH)}>
          Vis {Math.min(BATCH, ovelser.length - antall)} til ↓
        </button>
      )}
    </div>
  )
}

export default function OvelsesPage() {
  const [kategori, setKategori] = useState('alle')
  const [sted, setSted]         = useState('alle')
  const [sokRaw, setSokRaw]     = useState('')
  const [valgt, setValgt]       = useState<Ovelse | null>(null)

  // Utsett søk 150ms – ikke blokker input-typing
  const sok = useDeferredValue(sokRaw)

  const filtrert = useMemo(() => {
    let res = OVELSER
    if (kategori !== 'alle') res = res.filter(o => o.kategori === kategori)
    if (sted !== 'alle')     res = res.filter(o => o.sted === sted || o.sted === 'begge')
    if (sok.trim()) {
      const q = sok.toLowerCase()
      res = res.filter(o =>
        o.navn.toLowerCase().includes(q) ||
        o.muskelgruppe.toLowerCase().includes(q) ||
        o.utstyr.toLowerCase().includes(q)
      )
    }
    return res
  }, [kategori, sted, sok])

  const gruppert = useMemo(() => {
    if (kategori !== 'alle') return { [kategori]: filtrert }
    const g: Record<string, Ovelse[]> = {}
    for (const o of filtrert) {
      if (!g[o.kategori]) g[o.kategori] = []
      g[o.kategori].push(o)
    }
    return g
  }, [filtrert, kategori])

  // Lukk detalj-panel ved filterskifte
  const handleKategori = useCallback((k: string) => { setKategori(k); setValgt(null) }, [])
  const handleSted     = useCallback((s: string) => { setSted(s); setValgt(null) }, [])

  return (
    <div className="ov-page anim-fade-up">
      <div className="page-header">
        <h1 className="page-title">Øvelsesbibliotek</h1>
        <p className="page-subtitle">{OVELSER.length} øvelser · gym & hjemme · med animasjoner</p>
      </div>

      {/* Søk */}
      <div className="ov-search-wrap">
        <span className="ov-search-icon">🔍</span>
        <input
          className="input ov-search"
          placeholder="Søk øvelse, muskelgruppe, utstyr…"
          value={sokRaw}
          onChange={e => setSokRaw(e.target.value)}
        />
      </div>

      {/* Sted */}
      <div className="ov-sted-row">
        {STEDER.map(s => (
          <button key={s} className={`ov-sted-btn${sted === s ? ' active' : ''}`} onClick={() => handleSted(s)}>
            {s === 'alle' ? '🌍 Alle' : s === 'gym' ? '🏋️ Gym' : '🏠 Hjemme'}
          </button>
        ))}
      </div>

      {/* Kategori */}
      <div className="ov-filter">
        {KATEGORIER.map(k => (
          <button
            key={k}
            className={`ov-filter-btn${kategori === k ? ' active' : ''}`}
            style={kategori === k && k !== 'alle' ? {
              background: `${KAT_COLORS[k]}18`,
              borderColor: `${KAT_COLORS[k]}40`,
              color: KAT_COLORS[k],
            } : {}}
            onClick={() => handleKategori(k)}
          >
            {k === 'alle' ? '⚡ Alle' : `${KAT_EMOJI[k]} ${k.charAt(0).toUpperCase() + k.slice(1)}`}
          </button>
        ))}
      </div>

      <div className="ov-count">{filtrert.length} øvelser</div>

      {/* Detalj-panel */}
      {valgt && (
        <div className="ov-detail glass-card anim-fade-up">
          <div className="ov-detail-header">
            <div className="ov-detail-anim">
              <AnimasjonSVG type={valgt.animType} color={KAT_COLORS[valgt.kategori] ?? 'var(--cyan)'} size={100} />
            </div>
            <div className="ov-detail-info">
              <div className="ov-detail-badges">
                <span className="ov-detail-badge" style={{ background:`${KAT_COLORS[valgt.kategori]}18`, borderColor:`${KAT_COLORS[valgt.kategori]}35`, color:KAT_COLORS[valgt.kategori] }}>{valgt.kategori}</span>
                <span className="ov-detail-badge" style={{ color:VANSKELIG_COLOR[valgt.vanskelighet], background:`${VANSKELIG_COLOR[valgt.vanskelighet]}12`, borderColor:`${VANSKELIG_COLOR[valgt.vanskelighet]}25` }}>{valgt.vanskelighet}</span>
                <span className="ov-detail-badge" style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
                  {valgt.sted === 'begge' ? '🌍 Gym & Hjemme' : valgt.sted === 'gym' ? '🏋️ Gym' : '🏠 Hjemme'}
                </span>
              </div>
              <h2 className="ov-detail-navn">{valgt.emoji} {valgt.navn}</h2>
              <p className="ov-detail-muskler">{valgt.muskelgruppe}</p>
              <div className="ov-detail-stats">
                <div className="ov-ds"><span className="ov-ds-lbl">Sett</span><span className="ov-ds-val">{valgt.sett}</span></div>
                <div className="ov-ds"><span className="ov-ds-lbl">Reps</span><span className="ov-ds-val">{valgt.reps}</span></div>
                <div className="ov-ds"><span className="ov-ds-lbl">Hvile</span><span className="ov-ds-val">{valgt.hvile}</span></div>
                <div className="ov-ds"><span className="ov-ds-lbl">Utstyr</span><span className="ov-ds-val">{valgt.utstyr}</span></div>
              </div>
            </div>
            <button className="ov-detail-close" onClick={() => setValgt(null)}>✕</button>
          </div>
          <div className="ov-detail-body">
            <div>
              <div className="ov-detail-section-title">📖 Beskrivelse</div>
              <p className="ov-detail-desc">{valgt.beskrivelse}</p>
            </div>
            <div>
              <div className="ov-detail-section-title">💡 Tips</div>
              <div className="ov-tips-list">
                {valgt.tips.map((t, i) => (
                  <div key={i} className="ov-tip-row">
                    <span className="ov-tip-dot" style={{ background: KAT_COLORS[valgt.kategori] ?? 'var(--cyan)' }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ov-detail-footer">
            <Link href={`/ovelser/${valgt.id}`} className="btn btn-primary">📋 Full instruksjon →</Link>
          </div>
        </div>
      )}

      {/* Gruppert visning */}
      {filtrert.length === 0 ? (
        <div className="ov-empty">
          <div style={{ fontSize:'2rem' }}>🔍</div>
          <div>Ingen øvelser funnet</div>
        </div>
      ) : (
        <div className="ov-grupper">
          {Object.entries(gruppert).map(([kat, ovs]) => (
            <OvGruppe key={kat} kat={kat} ovelser={ovs} valgt={valgt} setValgt={setValgt} />
          ))}
        </div>
      )}
    </div>
  )
}
