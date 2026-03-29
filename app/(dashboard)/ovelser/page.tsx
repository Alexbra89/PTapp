'use client'

import { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'

type AnimType = 'press' | 'pull' | 'squat' | 'hinge' | 'curl' | 'pushdown' | 'raise' | 'crunch' | 'plank' | 'run'
type Sted = 'gym' | 'hjemme' | 'begge'
type Vanskelighetsgrad = 'Nybegynner' | 'Middels' | 'Avansert'

interface Ovelse {
  id: string; navn: string; kategori: string; muskelgruppe: string
  vanskelighet: Vanskelighetsgrad; utstyr: string
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

// ── 250+ ØVELSER (fullstendig bibliotek) ─────────────────────────────────────
const OVELSER: Ovelse[] = [
  // ═══════════ BRYST (15) ═══════════
  { id:'benkpress', navn:'Benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs, triceps, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + flatbenk', emoji:'🏋️', animType:'press', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Klassisk styrkeøvelse og et av de tre store løftene i styrkeløft. Legg deg på benken med stangen over nedre bryst. Ta grep litt bredere enn skuldrene, senk kontrollert og press opp. Hold ryggen lett hvelvet og skulderblad inn og ned hele veien.', tips:['Skulderblad inn og ned FØR du starter','Ryggen lett hvelvet – ikke flat','Senk til brystet berøres lett','Pust inn ned, eksplosivt opp','Grep litt bredere enn skuldrene'] },
  { id:'pushup', navn:'Push-up', kategori:'bryst', sted:'begge', muskelgruppe:'Pecs, triceps, core', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'💪', animType:'press', sett:4, reps:'12-15', hvile:'60s', beskrivelse:'Grunnleggende kroppsvektøvelse. Mer funksjonell enn benkpress da den aktiverer hele kroppen som en enhet. Perfekt for hjemmetrening og oppvarming.', tips:['Kroppen rett som planke fra hode til hæl','Albuer 45° fra kroppen – ikke utover','Press eksplosivt opp','Se ned i gulvet for nøytral nakke'] },
  { id:'hantelflyes', navn:'Hantelflyes', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs (strekk)', vanskelighet:'Middels', utstyr:'Hantler + benk', emoji:'🦅', animType:'raise', sett:3, reps:'12', hvile:'60s', beskrivelse:'Isolasjonsøvelse som stretcher og klemmer brystmusklene i en bue-bevegelse. Perfekt finisher etter benkpress for maksimal brystuttmatting.', tips:['Bue-bevegelse som om du klemmer et tre','Lett bøy i albuen gjennom hele','Klem i toppen for max kontraksjon'] },
  { id:'dips', navn:'Bryst-dips', kategori:'bryst', sted:'begge', muskelgruppe:'Pecs, triceps', vanskelighet:'Middels', utstyr:'Parallellstenger', emoji:'⬇️', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Tung kroppsvektøvelse for bryst og triceps. Lean fremover for mer brystaktivering, hold deg rett for mer triceps.', tips:['Len 30° fremover for bryst-fokus','Kontrollert ned til 90° i albuen','Press opp uten å låse albuene'] },
  { id:'kabelpecfly', navn:'Kabel pec fly', kategori:'bryst', sted:'gym', muskelgruppe:'Indre pecs', vanskelighet:'Middels', utstyr:'Kabelmaskin', emoji:'🔀', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabelen gir konstant motstand gjennom hele bevegelsen. Utmerket for å isolere og pumpe brystmusklene med jevn spenning fra bunn til topp.', tips:['Kabelen på eller over skulderhøyde','Bue ned og frem mot midjen','Klem hender i midten og hold 1 sek'] },
  { id:'inclineBenkpress', navn:'Incline benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Øvre pecs, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + skrå benk', emoji:'📐', animType:'press', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Benken satt til 30-45°. Aktiverer det øvre brystet som er vanskelig å nå med flat benkpress. Et must for et balansert bryst.', tips:['30-45° – ikke mer, da overtar skuldrene','Samme teknikk som flat benkpress','Ikke la stangen sprette i brystet'] },
  { id:'declinePushup', navn:'Decline push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Øvre pecs, skuldre', vanskelighet:'Middels', utstyr:'Stol eller sofa', emoji:'🔼', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Føttene på en stol, hendene i gulvet. Vinkelen aktiverer det øvre brystet på samme måte som incline benkpress – uten utstyr.', tips:['Føtter høyere enn skuldre','Kroppen fortsatt rett','Se ned mot gulvet'] },
  { id:'diamondPushup', navn:'Diamond push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Indre pecs, triceps', vanskelighet:'Middels', utstyr:'Ingen', emoji:'💎', animType:'press', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Hendene formet som en diamant under brystet. Trener indre bryst og triceps intenst. God variasjon for hjemmetrening.', tips:['Hendene tett under brystet – diamantform','Albuer nær kroppen','Full bevegelsesbane'] },
  { id:'pikePushup', navn:'Pike push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Øvre pecs, skuldre, triceps', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🔺', animType:'press', sett:3, reps:'12', hvile:'60s', beskrivelse:'Hoften høyt i luften som en omvendt V. Kombinerer skulderpresse med brystaktivering. God mellomsteg mot håndstående push-up.', tips:['Hoften høyt – V-form','Se bakover mot knærne','Albuer peker ut til siden'] },
  { id:'hantelBenkpress', navn:'Hantel benkpress', kategori:'bryst', sted:'gym', muskelgruppe:'Pecs, triceps (uavhengig)', vanskelighet:'Nybegynner', utstyr:'Hantler + benk', emoji:'🥊', animType:'press', sett:4, reps:'10-12', hvile:'75s', beskrivelse:'Hantler gir friere bevegelse og aktiverer stabilisatorer mer enn stang. Bra for å rette opp styrkeforskjeller mellom sidene.', tips:['La hantlene møtes lett øverst','Roter litt innover øverst for klem','Kontrollert helt ned'] },
  { id:'cableCrossover', navn:'Cable Crossover', kategori:'bryst', sted:'gym', muskelgruppe:'Indre bryst', vanskelighet:'Middels', utstyr:'Kabelmaskin', emoji:'🔀', animType:'raise', sett:4, reps:'10-12', hvile:'60s', beskrivelse:'Stå midt i kabelmaskinen, før hendene sammen foran brystet med lett bøy i albuene.', tips:['Klem i midten, hold spenningen','Bue-bevegelse','Kontrollert tilbake'] },
  { id:'declineBenchPress', navn:'Decline Bench Press', kategori:'bryst', sted:'gym', muskelgruppe:'Nedre bryst', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'📉', animType:'press', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Ligg på nedover skråbenk, senk stangen til nedre bryst, press opp.', tips:['Senk til nedre bryst','Kontrollert nedgang','Press eksplosivt'] },
  { id:'floorPress', navn:'Floor press', kategori:'bryst', sted:'gym', muskelgruppe:'Triceps, bryst', vanskelighet:'Middels', utstyr:'Hantler', emoji:'⬇️', animType:'press', sett:3, reps:'8-10', hvile:'75s', beskrivelse:'Ligg på gulvet, press hantler opp fra brystet. Stopp når albuene treffer gulvet.', tips:['Stopp når albuene treffer gulvet','Kort bevegelse','Fokus på triceps'] },
  { id:'wideGripBench', navn:'Wide grip bench press', kategori:'bryst', sted:'gym', muskelgruppe:'Ytre bryst', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'📏', animType:'press', sett:3, reps:'8-10', hvile:'90s', beskrivelse:'Benkpress med ekstra bredt grep for å fokusere på ytre bryst.', tips:['Bredere grep gir mer bryst','Fokus på ytre bryst','Kontrollert bevegelse'] },
  { id:'sviktendePushup', navn:'Sviktende push-up', kategori:'bryst', sted:'hjemme', muskelgruppe:'Hele bryst', vanskelighet:'Middels', utstyr:'Ingen', emoji:'💪', animType:'press', sett:3, reps:'8-12', hvile:'60s', beskrivelse:'Gjør push-ups til du ikke klarer flere repetisjoner.', tips:['Gjør til du ikke klarer mer','Maksimalt antall reps','Siste rep er den viktigste'] },

  // ═══════════ RYGG (15) ═══════════
  { id:'pullup', navn:'Pull-ups', kategori:'rygg', sted:'begge', muskelgruppe:'Lats, biceps, bakre deltoid', vanskelighet:'Avansert', utstyr:'Pull-up stang', emoji:'🤸', animType:'pull', sett:4, reps:'6-10', hvile:'2min', beskrivelse:'Kongen av ryggøvelser. Bredt overgrep aktiverer latissimus dorsi maksimalt. Trener nesten hele øvre rygg, biceps og core.', tips:['Full strekk i bunn mellom alle reps','Trekk albuer ned og bak – ikke bare armene','Ikke sving – kontrollert ned-fase','Skuldrene ned FØR du begynner'] },
  { id:'markloft', navn:'Markløft', kategori:'rygg', sted:'gym', muskelgruppe:'Hel rygg, glutes, hamstrings', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'⚡', animType:'hinge', sett:4, reps:'5-6', hvile:'3min', beskrivelse:'Den ultimate styrkeøvelsen. Stangen på gulvet, over fotmidten. Bøy og grip med rett rygg, hofter bak. Løft ved å PRESSE GULVET NED.', tips:['RYGGEN RETT – aldri rund rygg','Press gulvet ned med bena','Stangen glir langs bena hele veien','Pust inn dypt og stram core FØR du løfter'] },
  { id:'latpulldown', navn:'Lat pulldown', kategori:'rygg', sted:'gym', muskelgruppe:'Lats, biceps', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'⬇️', animType:'pull', sett:3, reps:'10-13', hvile:'75s', beskrivelse:'God øvelse for å lære og isolere latissimus dorsi. Trekk stangen ned til øvre bryst, aldri bak nakken. Len deg 15° bakover for bedre lat-aktivering.', tips:['Len 15° bakover','Trekk albuer ned mot hoften','Full strekk i toppen mellom reps'] },
  { id:'hantelroing', navn:'Hantelroing', kategori:'rygg', sted:'begge', muskelgruppe:'Øvre midtre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Hantel + benk', emoji:'🚣', animType:'pull', sett:4, reps:'10×2', hvile:'60s', beskrivelse:'Unilateral øvelse som lar deg fokusere på riktig teknikk per side. Støtter én hånd og kne på benk for stabilitet, trekk hantelen opp langs kroppen.', tips:['Albuen opp og bak – ikke ut til siden','Ikke roter overkroppen','Klem skulderblad i toppen og hold 1 sek'] },
  { id:'kabelsittende', navn:'Sittende kabelroing', kategori:'rygg', sted:'gym', muskelgruppe:'Midtre rygg, rhomboids', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🔙', animType:'pull', sett:4, reps:'10-12', hvile:'75s', beskrivelse:'Fantastisk for midtre rygg og rhomboidene. Smalt grep gir mer biceps-aktivering, bredt grep gir mer ryggfokus.', tips:['Klem skulderblad i slutten og hold 1 sek','Rett rygg hele veien','Albuen nær kroppen'] },
  { id:'tBarRoing', navn:'T-bar roing', kategori:'rygg', sted:'gym', muskelgruppe:'Midtre rygg, lats, biceps', vanskelighet:'Middels', utstyr:'T-bar maskin', emoji:'🔤', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Effektiv compound-roing som kombinerer lat-pull og roing. Gir stor volum i midtre rygg.', tips:['Overkroppen 45° fremover','Klem skulderblad på toppen','Kontrollert ned – ikke slipp'] },
  { id:'faceDown', navn:'Ryggekstensjon', kategori:'rygg', sted:'gym', muskelgruppe:'Erector spinae, glutes', vanskelighet:'Nybegynner', utstyr:'Ryggekstensjon benk', emoji:'🌊', animType:'hinge', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer den nedre og midtre ryggen. Start med kroppsvekt, legg hantler foran brystet for progresjon.', tips:['Ikke hyperekstend – stopp i nøytral','Klem glutes i toppen','Kontrollert ned'] },
  { id:'invertedRow', navn:'Invertert roing', kategori:'rygg', sted:'begge', muskelgruppe:'Øvre rygg, rear delts, biceps', vanskelighet:'Nybegynner', utstyr:'Bord/stang lavt', emoji:'🔄', animType:'pull', sett:3, reps:'10-15', hvile:'60s', beskrivelse:'Liggende under en stang eller bord, trekk brystet opp. God for nybegynnere på vei mot pull-ups.', tips:['Kroppen rett fra hode til hæl','Trekk brystet til stangen','Jo mer horisontal, jo vanskeligere'] },
  { id:'sniptrekk', navn:'Face pull', kategori:'rygg', sted:'gym', muskelgruppe:'Øvre bakre rygg, nakke', vanskelighet:'Middels', utstyr:'Kabelmaskin (høyt)', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Styrker bakre deltoid, rotator cuff og øvre rygg. Essensielt for skulder- og rygghelse.', tips:['Albuer høyt – over skuldrene','Trekk til ansiktet og roter utover','Kontrollert tilbake'] },
  { id:'pullover', navn:'Pullover', kategori:'rygg', sted:'gym', muskelgruppe:'Lats, serratus, bryst', vanskelighet:'Middels', utstyr:'Hantel + benk', emoji:'🌙', animType:'pull', sett:3, reps:'12', hvile:'60s', beskrivelse:'Unik øvelse som strekker og aktiverer lats og serratus. Lig tvers over benken med en hantel.', tips:['Rett over hodet til hoften','Lett bøy i albuen','Strekk maksimalt bak hodet'] },
  { id:'kroppsvektRow', navn:'Kroppsvekt roing', kategori:'rygg', sted:'hjemme', muskelgruppe:'Øvre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Bord', emoji:'🪑', animType:'pull', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Bruk kanten av et stabilt bord som treningsutstyr. Legg deg under bordet og trekk brystet opp til bordkanten.', tips:['Bordet er solid nok til å bære vekten','Kroppen rett','Trekk mot nedre bryst'] },
  { id:'stangRoing', navn:'Stang roing', kategori:'rygg', sted:'gym', muskelgruppe:'Øvre og midtre rygg, biceps', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'🏗️', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Klassisk compound-roing. Overkroppen ca 45° fremover, stangen trekkes til nedre mage.', tips:['Nøytral rygg – ikke rund','Trekk til magen, ikke brystet','Albuer nær kroppen'] },
  { id:'chinUps', navn:'Chin-ups', kategori:'rygg', sted:'gym', muskelgruppe:'Lats, biceps', vanskelighet:'Avansert', utstyr:'Pull-up stang', emoji:'🤸', animType:'pull', sett:4, reps:'6-10', hvile:'90s', beskrivelse:'Undergrep, mer fokus på biceps enn bredt grep pull-ups.', tips:['Håndflatene mot deg','Mer biceps-aktivering','Full strekk i bunn'] },
  { id:'straightArmPulldown', navn:'Straight arm pulldown', kategori:'rygg', sted:'gym', muskelgruppe:'Lats', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'⬇️', animType:'pull', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Stå foran kabel, trekk stangen ned med strake armer til lårene.', tips:['Hold armene strake','Fokuser på lats','Kontrollert bevegelse'] },
  { id:'reverseFlyes', navn:'Reverse flyes', kategori:'rygg', sted:'gym', muskelgruppe:'Bakre skulder, øvre rygg', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🦅', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Len 45° fremover, løft armene ut til siden med lett albuebøy.', tips:['Bakre deltoid, klem skulderblad','Lett bøy i albuene','Kontrollert bevegelse'] },

  // ═══════════ BEIN (15) ═══════════
  { id:'knebøy', navn:'Knebøy', kategori:'bein', sted:'gym', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'🦵', animType:'squat', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Kongen av beinøvelser. Fundamental bevegelse som trener hele underkroppen og kjernen. Stangen på trapezius, skulderbredde, tær litt ut.', tips:['Bryst opp gjennom hele løftet','Knærne følger tærne – aldri innad','Ned til parallell eller dypere','Hælene i gulvet alltid'] },
  { id:'legpress', navn:'Legpress', kategori:'bein', sted:'gym', muskelgruppe:'Quads, glutes', vanskelighet:'Nybegynner', utstyr:'Legpress maskin', emoji:'🔧', animType:'squat', sett:4, reps:'10-15', hvile:'90s', beskrivelse:'Maskin-alternativ til knebøy. Tryggere for ryggen. Lar deg håndtere mer vekt uten balansekrav.', tips:['Føtter skulderbredde på plata','ALDRI lås knærne fullt ut','Full bevegelsesbane','Ikke løft rumpa fra setet'] },
  { id:'rumMarkloeft', navn:'Rumensk markløft', kategori:'bein', sted:'begge', muskelgruppe:'Hamstrings, glutes', vanskelighet:'Middels', utstyr:'Hantler/stang', emoji:'🍑', animType:'hinge', sett:3, reps:'10-12', hvile:'90s', beskrivelse:'Eksepsjonell for hamstrings og glutes. Hold ryggen rett og len fremover til du kjenner strekk.', tips:['Rett rygg ALLTID','Hoften går bakover – ikke ned','Stopp ved strekk i hamstrings','Klem glutes øverst'] },
  { id:'bulgarianSplit', navn:'Bulgarian split squat', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Avansert', utstyr:'Benk + hantler', emoji:'🏔️', animType:'squat', sett:3, reps:'10×2', hvile:'90s', beskrivelse:'En av de mest effektive enbeinsøvelsene. Bakfoten på en benk, fremre foten langt nok frem.', tips:['Bakfot på benk – toppen av foten','Fremre fot langt nok frem','Rett overkropp under hele løftet'] },
  { id:'gluteBridge', navn:'Glute bridge', kategori:'bein', sted:'hjemme', muskelgruppe:'Glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🌉', animType:'hinge', sett:4, reps:'15-20', hvile:'45s', beskrivelse:'Enkel men ekstremt effektiv øvelse for setemusklene. Ligg på ryggen og press hoften opp.', tips:['Press gjennom hælen – ikke forfoten','Klem rumpa øverst med full kraft','Hold 1-2 sek øverst','Rett linje fra kne til skulder'] },
  { id:'lunges', navn:'Utfall', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen / hantler', emoji:'🚶', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Funksjonell enbein-øvelse. Steg fremover med langt steg ned mot gulvet.', tips:['Rett overkropp','Fremre kne aldri foran tåen','Dyp nok – bakre kne nær gulvet'] },
  { id:'legCurl', navn:'Leg curl', kategori:'bein', sted:'gym', muskelgruppe:'Hamstrings (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg curl maskin', emoji:'🦿', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for hamstrings. Liggende eller sittende på maskin.', tips:['Kontrollert ned – ikke slipp','Hold 1 sek i toppen','Full bevegelsesbane'] },
  { id:'legExtension', navn:'Leg extension', kategori:'bein', sted:'gym', muskelgruppe:'Quadriceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg extension maskin', emoji:'🦵', animType:'squat', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer quadriceps. Sett deg i maskinen og strekk bena rett ut.', tips:['Ikke bruk for tung vekt – isolasjonsøvelse','Klem quads i toppen','Kontrollert ned – 3 sekunder'] },
  { id:'calfRaise', navn:'Tåhev', kategori:'bein', sted:'begge', muskelgruppe:'Gastrocnemius, soleus', vanskelighet:'Nybegynner', utstyr:'Ingen / trapp', emoji:'🦶', animType:'squat', sett:4, reps:'20-25', hvile:'45s', beskrivelse:'Press opp på tærne, hold øverst, senk kontrollert. Gjør på en trapp for full bevegelsesbane.', tips:['Full strekk ned – hælen under trappen','Hold 2 sek øverst','Langsom ned-fase for best effekt'] },
  { id:'sumoKnebøy', navn:'Sumo knebøy', kategori:'bein', sted:'begge', muskelgruppe:'Indre lår, glutes, quads', vanskelighet:'Middels', utstyr:'Kettlebell/hantel', emoji:'🤼', animType:'squat', sett:3, reps:'12', hvile:'75s', beskrivelse:'Bred stilling med tær pekende ut. Aktiverer indre lår og glutes mer enn vanlig knebøy.', tips:['Bred stilling – tær 45° ut','Knærne følger tærne utover','Rett rygg og bryst opp'] },
  { id:'stepUp', navn:'Step-up', kategori:'bein', sted:'begge', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Nybegynner', utstyr:'Kasse / benk', emoji:'📦', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Steg opp på en kasse eller benk. Bruk det fremre beinet – ikke dytt fra det bakre.', tips:['Press gjennom fremre hæl','Full strekk i toppen','Kontrollert ned'] },
  { id:'nordiskCurl', navn:'Nordisk curl', kategori:'bein', sted:'begge', muskelgruppe:'Hamstrings (eksentrisk)', vanskelighet:'Avansert', utstyr:'Noe å holde ankler', emoji:'🌊', animType:'hinge', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Eksentrisk trening av hamstrings. Holder ankler fast, senk kroppen forover så sakte som mulig.', tips:['Senk veldig sakte – 5+ sekunder','Bruk hendene for å bryte fallet','Kjerneaktivering viktig'] },
  { id:'hackSquat', navn:'Hack squat', kategori:'bein', sted:'gym', muskelgruppe:'Quads', vanskelighet:'Middels', utstyr:'Maskin', emoji:'🦵', animType:'squat', sett:4, reps:'8-12', hvile:'90s', beskrivelse:'Stå i hack squat maskin, senk til parallell.', tips:['Dyp bevegelse','Ryggen mot puten','Kontrollert nedgang'] },
  { id:'adductorMaskin', navn:'Adductor maskin', kategori:'bein', sted:'gym', muskelgruppe:'Lår innside', vanskelighet:'Nybegynner', utstyr:'Maskin', emoji:'🦵', animType:'squat', sett:3, reps:'12-15', hvile:'45s', beskrivelse:'Sitt i maskin, press bena sammen mot motstand.', tips:['Klem inn','Kontrollert bevegelse','Fokuser på innside lår'] },
  { id:'abductorMaskin', navn:'Abductor maskin', kategori:'bein', sted:'gym', muskelgruppe:'Setemuskler', vanskelighet:'Nybegynner', utstyr:'Maskin', emoji:'🦵', animType:'squat', sett:3, reps:'12-15', hvile:'45s', beskrivelse:'Sitt i maskin, press bena ut mot sidene.', tips:['Press ut','Klem setemusklene','Kontrollert tilbake'] },

  // ═══════════ SKULDRE (12) ═══════════
  { id:'militaryPress', navn:'Military press', kategori:'skuldre', sted:'gym', muskelgruppe:'Alle deltoider, triceps', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'⬆️', animType:'press', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Stående skulderpressøvelse med stang. Rekrutterer hele kroppen til stabilisering.', tips:['Stram core – ikke len bakover','Stangen fra haken til over hodet','Ikke lås albuene i toppen','Pust inn ned, ut opp'] },
  { id:'sidehev', navn:'Sidehev', kategori:'skuldre', sted:'begge', muskelgruppe:'Lateral deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🔼', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for de laterale deltoidhodene. Gir bred skulderform.', tips:['Løft MAKS til skulderhøyde','Lett bøy i albuen gjennom hele','Lillefingrene litt høyere enn tomler'] },
  { id:'facePull', navn:'Face pull', kategori:'skuldre', sted:'gym', muskelgruppe:'Bakre deltoid, rotator cuff', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Viktig øvelse for skulderhelsa. Styrker bakre deltoid og rotator cuff.', tips:['Kabelen på øyenivå eller høyere','Albuer HØYT – over skuldrene','Trekk til ansiktet og roter ut'] },
  { id:'hantelSkuldPress', navn:'Hantelpress skuldre', kategori:'skuldre', sted:'begge', muskelgruppe:'Alle deltoider', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'💺', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Sittende eller stående hantelpress gir uavhengig bevegelse for hver arm.', tips:['Pust ut øverst','Albuene 90° i bunn','Kontrollert ned-fase'] },
  { id:'arnoldPress', navn:'Arnold press', kategori:'skuldre', sted:'begge', muskelgruppe:'Alle deltoider (rotasjon)', vanskelighet:'Middels', utstyr:'Hantler', emoji:'💪', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Oppfunnet av Arnold Schwarzenegger. Starter med hantler foran ansiktet og roterer ut.', tips:['Roter sakte og kontrollert','Full rotasjon gjennom hele bevegelsen','God for skuldervolum'] },
  { id:'frontHev', navn:'Fronthev', kategori:'skuldre', sted:'begge', muskelgruppe:'Fremre deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', emoji:'⬆️', animType:'raise', sett:3, reps:'12', hvile:'60s', beskrivelse:'Isolerer fremre deltahodet. Løft rett fremover til skulderbredde.', tips:['Rett arm eller svak bøy','Ikke sving fra kroppen','Stopp ved skulderbredde'] },
  { id:'bakHev', navn:'Omvendt flyes', kategori:'skuldre', sted:'begge', muskelgruppe:'Bakre deltoid, rhomboids', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🦅', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Bend framover ca 45-90°, løft hantlene ut til siden.', tips:['Bøy fremover – ikke stå rett','Løft albuene – ikke hendene','Klem skulderblad i toppen'] },
  { id:'skulderRotasjon', navn:'Ekstern rotasjon', kategori:'skuldre', sted:'begge', muskelgruppe:'Rotator cuff', vanskelighet:'Nybegynner', utstyr:'Lett hantel / band', emoji:'🔄', animType:'curl', sett:3, reps:'15', hvile:'30s', beskrivelse:'Rehabiliteringsøvelse for rotator cuff. Essensiell for langsiktig skulderhelsa.', tips:['Albuen fast ved siden','Bare underarmen beveger seg','Aldri rush – alltid kontrollert'] },
  { id:'uprekkRoing', navn:'Upright roing', kategori:'skuldre', sted:'gym', muskelgruppe:'Lateral deltoid, trapezius', vanskelighet:'Middels', utstyr:'Stang / kabel', emoji:'⬆️', animType:'pull', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Trekk stangen rett opp langs kroppen til haken.', tips:['Bredt grep er snillest for skuldre','Albuer høyere enn hender','Ikke over haken'] },
  { id:'skrapshrug', navn:'Skuldertrekk', kategori:'skuldre', sted:'begge', muskelgruppe:'Trapezius', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', emoji:'🤷', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Trekk skuldrene rett opp mot ørene.', tips:['Trekk rett opp – ikke roter','Hold 1-2 sek øverst','Kontrollert ned'] },
  { id:'lateralRaiseMaskin', navn:'Lateral raise maskin', kategori:'skuldre', sted:'gym', muskelgruppe:'Side skulder', vanskelighet:'Nybegynner', utstyr:'Maskin', emoji:'🔼', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Sitt i maskin, løft armene ut til siden.', tips:['Kontrollert bevegelse','Stabil posisjon','Fokuser på laterale deltoid'] },
  { id:'rearDeltMaskin', navn:'Rear delt maskin', kategori:'skuldre', sted:'gym', muskelgruppe:'Bakre skulder', vanskelighet:'Nybegynner', utstyr:'Maskin', emoji:'🔄', animType:'pull', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Sitt i maskin, press armene bakover.', tips:['Bakre deltoid','Kontrollert bevegelse','Klem skulderblad'] },

  // ═══════════ BICEP (10) ═══════════
  { id:'bicepsCurl', navn:'Biceps curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps brachii', vanskelighet:'Nybegynner', utstyr:'Hantler eller stang', emoji:'💪', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Klassisk bicepsøvelse. Stå rett med hantler (undergrep) og curl opp.', tips:['Albuen fast ved siden – dette er dreiepunktet','Ingen sving – bruk biceps, ikke ryggen','Klem biceps hardt i toppen'] },
  { id:'hammerCurl', navn:'Hammer curl', kategori:'bicep', sted:'begge', muskelgruppe:'Brachialis, underarm', vanskelighet:'Nybegynner', utstyr:'Hantler', emoji:'🔨', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Nøytralt grep-curl som primært trener brachialis – muskelen under biceps.', tips:['Tommel peker opp gjennom hele','Albuen fast ved siden','God for arm-tykkelse'] },
  { id:'preacherCurl', navn:'Preacher curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (kort hode)', vanskelighet:'Middels', utstyr:'EZ-stang + preacher benk', emoji:'🙏', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Preacher benken eliminerer all mulighet for å jukse. Kun biceps kan jobbe.', tips:['Full strekk i bunn – viktig for kort hode','Langsom ned-fase – 3 sek','Ikke hyperekstend i bunn'] },
  { id:'konsentrertCurl', navn:'Konsentrert curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps (topp-isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', emoji:'🎯', animType:'curl', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Sett ned, albuen mot innsiden av låret. Ultimat isolasjonsøvelse for biceps-topp.', tips:['Albuen mot låret – fast','Klem hardt i toppen','Langsom og kontrollert'] },
  { id:'kabelbicep', navn:'Kabel biceps curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (konstant spenning)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'🔁', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabelen gir konstant spenning gjennom hele bevegelsen.', tips:['Albuen fast','Hold spenningen i bunn – kabelen strekker','Superset med hantel curl'] },
  { id:'inclineCurl', navn:'Incline curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps (langt hode – strekk)', vanskelighet:'Middels', utstyr:'Hantler + skrå benk', emoji:'📐', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Liggende på en skrå benk strekker det lange hodet maksimalt.', tips:['La armene henge bak kroppen','Strekk maksimalt i bunn','Curl opp uten å endre benk-kontakt'] },
  { id:'reversCurl', navn:'Revers curl', kategori:'bicep', sted:'begge', muskelgruppe:'Brachioradialis, underarm', vanskelighet:'Nybegynner', utstyr:'Stang / hantler', emoji:'🔃', animType:'curl', sett:3, reps:'12', hvile:'60s', beskrivelse:'Overgrep-curl (håndflaten ned) for underarmer og brachioradialis.', tips:['Litt lettere vekt enn vanlig curl','Albuen fast','Langsom og kontrollert'] },
  { id:'zottmanCurl', navn:'Zottman curl', kategori:'bicep', sted:'begge', muskelgruppe:'Biceps + underarm kombinert', vanskelighet:'Middels', utstyr:'Hantler', emoji:'🌀', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Curl opp med undergrep (biceps), roter til overgrep (underarm) og senk ned.', tips:['Curl opp – roter – senk ned sakte','3 sekunder ned','Lett vekt – teknikk viktigst'] },
  { id:'dragCurl', navn:'Drag curl', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps', vanskelighet:'Nybegynner', utstyr:'Vektstang', emoji:'⬆️', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Hold stangen tett inntil kroppen, curl opp mot brystet.', tips:['Trekk stangen opp langs kroppen','Albuene går bakover','God for biceps-topp'] },
  { id:'twentyOnes', navn:'21s', kategori:'bicep', sted:'gym', muskelgruppe:'Biceps', vanskelighet:'Middels', utstyr:'Vektstang', emoji:'🔢', animType:'curl', sett:3, reps:'21', hvile:'60s', beskrivelse:'7 reps i nedre halvdel, 7 i øvre, 7 full range.', tips:['7-7-7','Ingen hvile mellom','Full utmatting'] },

  // ═══════════ TRICEP (10) ═══════════
  { id:'tricepsPushdown', navn:'Triceps pushdown', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps brachii', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', emoji:'📉', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for triceps med kabel. Hold albuene FAST ved siden.', tips:['Albuer fast og nær kroppen','Klem triceps helt ned','Kontrollert opp – ikke slipp'] },
  { id:'skullCrusher', navn:'Skull crushers', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps (alle hoder)', vanskelighet:'Middels', utstyr:'EZ-stang + benk', emoji:'💀', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Effektiv isolasjon for alle triceps-hoder. Ligg på benk, senk stangen mot pannen.', tips:['KUN albuene bøyer – skuldrene er stille','Senk mot panna/hodet','EZ-stang er kinder mot håndledd'] },
  { id:'overheadExt', navn:'Overhead ext.', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Middels', utstyr:'Hantel', emoji:'⬆️', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Trener det lange triceps-hodet best fordi det strekkes over skulderleddet.', tips:['Albuene nær hodet – pek mot taket','Full strekk opp er nøkkelen','Kontrollert ned-fase bak hodet'] },
  { id:'tricepsDips', navn:'Benk dips', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps', vanskelighet:'Nybegynner', utstyr:'Stol / benk', emoji:'🪑', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hender på kanten av en stol, bena ut foran deg. Senk kroppen ned og press opp.', tips:['Hender skulderbredde','Ryggen nær stolen','Kontrollert ned til 90°'] },
  { id:'closegripPress', navn:'Smalt grep benkpress', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Middels', utstyr:'Vektstang + benk', emoji:'🤝', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Samme som benkpress men med smalt grep (skulderbredde).', tips:['Smalt grep – skulderbredde, ikke smalere','Albuer nær kroppen under presset','Kontrollert ned'] },
  { id:'kabeloverhead', navn:'Kabel overhead ext.', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin (lavt)', emoji:'🔗', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabel bakfra over hodet. Konstant spenning på triceps.', tips:['Albuer fast ved hodet','Tøy godt i bunn','Klem i full strekk'] },
  { id:'pushupSmalt', navn:'Push-up smalt grep', kategori:'tricep', sted:'hjemme', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🙌', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hendene skulderbredde eller smalere. Albuer nær kroppen hele veien.', tips:['Albuer nær kroppen – ikke utover','Hendene rett under skuldrene','Kroppen rett'] },
  { id:'kickback', navn:'Triceps kickback', kategori:'tricep', sted:'begge', muskelgruppe:'Triceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', emoji:'🦵', animType:'pushdown', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Bøy fremover, overarmen parallell med gulvet og strekk armen bak.', tips:['Overarmen parallell med gulvet – stabil','Bare underarmen beveger seg','Klem triceps i full strekk'] },
  { id:'frenchPress', navn:'French press', kategori:'tricep', sted:'gym', muskelgruppe:'Triceps', vanskelighet:'Middels', utstyr:'Hantel', emoji:'🇫🇷', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Ligg på benk, senk hantel mot pannen.', tips:['Kontrollert bevegelse','Kun albuene beveger seg','Stabil overkropp'] },
  { id:'diamondPushupTricep', navn:'Diamond push-up triceps', kategori:'tricep', sted:'hjemme', muskelgruppe:'Triceps', vanskelighet:'Middels', utstyr:'Ingen', emoji:'💎', animType:'press', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Hendene i diamantform under brystet for maks triceps-aktivering.', tips:['Hendene tett sammen','Albuer nær kroppen','Full bevegelse'] },

  // ═══════════ CORE (12) ═══════════
  { id:'planke', navn:'Planke', kategori:'core', sted:'begge', muskelgruppe:'Transversus abdominis, erectors', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🧘', animType:'plank', sett:3, reps:'45-60 sek', hvile:'45s', beskrivelse:'Statisk kjerneøvelse som aktiverer HELE core inkludert dype stabilisatorer.', tips:['Stram ALT – mage, rumpe og lår','Hoften verken opp eller ned','Pust normalt gjennom hele'] },
  { id:'crunches', navn:'Crunches', kategori:'core', sted:'hjemme', muskelgruppe:'Rectus abdominis', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🔄', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Isolasjonsøvelse for rette magemuskler. KRØLL overkroppen opp.', tips:['Krøll – ikke hev hele ryggen','Hender ved tinningene – aldri bak nakken','Fokus på å krølle magen'] },
  { id:'legRaises', navn:'Legheving', kategori:'core', sted:'begge', muskelgruppe:'Nedre mage, hoftefleksorer', vanskelighet:'Middels', utstyr:'Ingen / pull-up stang', emoji:'⬆️', animType:'crunch', sett:3, reps:'15', hvile:'60s', beskrivelse:'Effektiv for nedre mage og hoftebøyere.', tips:['Press korsryggen mot gulvet','Senk bena sakte uten å treffe gulvet','Rette bein er vanskeligere'] },
  { id:'russianTwist', navn:'Russian twist', kategori:'core', sted:'hjemme', muskelgruppe:'Obliques', vanskelighet:'Middels', utstyr:'Medisinball (valgfritt)', emoji:'🔃', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Rotasjonsøvelse for de skrå magemusklene.', tips:['Roter fra midjen – ikke skuldrene','Løft bena for økt vanskelighet','Med vekt/ball gjør det tyngre'] },
  { id:'mountainClimber', navn:'Fjellklatrere', kategori:'core', sted:'hjemme', muskelgruppe:'Core, hoftefleksorer, cardio', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'⛰️', animType:'run', sett:3, reps:'30 sek', hvile:'30s', beskrivelse:'Plankeposisjon, kjør knærne frem og tilbake i høyt tempo.', tips:['Hoften nede – ikke dytt opp','Rask og eksplosiv','Armene rette'] },
  { id:'abWheel', navn:'Ab wheel', kategori:'core', sted:'begge', muskelgruppe:'Hele kjerne, skulder, rygg', vanskelighet:'Avansert', utstyr:'Ab wheel', emoji:'⚙️', animType:'plank', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Ekstremt effektiv kjerneøvelse. Rull ut fra knærne, hold rygg rett.', tips:['Start fra knærne','Rygg ALDRI rund','Ikke rull lenger enn du klarer å komme tilbake kontrollert'] },
  { id:'sideplanke', navn:'Sideplanke', kategori:'core', sted:'hjemme', muskelgruppe:'Obliques, hofteabduktorer', vanskelighet:'Middels', utstyr:'Ingen', emoji:'↔️', animType:'plank', sett:3, reps:'30s×2', hvile:'45s', beskrivelse:'Planke på siden. Stram obliques og hold hoften opp.', tips:['Hoften rett opp – ikke la den falle','Stram obliques aktivt','Legg arm mot gulv for lettere variant'] },
  { id:'dragonFlag', navn:'Dragon flag', kategori:'core', sted:'begge', muskelgruppe:'Hele kjerne (avansert)', vanskelighet:'Avansert', utstyr:'Benk / gulv', emoji:'🐉', animType:'crunch', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Oppfunnet av Bruce Lee. Ekstremt krevende kjerneøvelse.', tips:['Kroppen MÅ holdes rett','Senk ekstremt sakte – 4-6 sek','Bygg med benbøy-variant først'] },
  { id:'toeToBar', navn:'Tå til stang', kategori:'core', sted:'gym', muskelgruppe:'Rectus abdominis, hoftefleksorer', vanskelighet:'Avansert', utstyr:'Pull-up stang', emoji:'🏹', animType:'crunch', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Heng fra en stang og løft tærne opp til stangen.', tips:['Kontroller pendelbevegelsen','Trekk knærne opp først om for vanskelig','Hold spenningen i kjernen'] },
  { id:'pallofPress', navn:'Pallof press', kategori:'core', sted:'gym', muskelgruppe:'Anti-rotasjon, obliques', vanskelighet:'Middels', utstyr:'Kabelmaskin', emoji:'🚫', animType:'press', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Anti-rotasjonsøvelse. Stå siden av kabelen og press fremover.', tips:['Hoftene og skuldrene holdes fremover','Motstå rotasjonen aktivt','Øk vekt når det ikke utfordrer'] },
  { id:'hollowHold', navn:'Hollow hold', kategori:'core', sted:'hjemme', muskelgruppe:'Core stabilitet', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🎯', animType:'crunch', sett:3, reps:'30-45 sek', hvile:'45s', beskrivelse:'Ligg på ryggen, løft armer og ben, hold spenning i magen.', tips:['Korsryggen presset mot gulvet','Hold armer og ben rette','Kontrollert pust'] },
  { id:'flutterKicks', navn:'Flutter kicks', kategori:'core', sted:'hjemme', muskelgruppe:'Nedre mage', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'🦵', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Ligg på ryggen, løft bena 15 cm, veksle mellom å heve og senke.', tips:['Hold bena rette','Korsryggen i gulvet','Rytmisk bevegelse'] },

  // ═══════════ FULLKROPP (8) ═══════════
  { id:'burpees', navn:'Burpees', kategori:'fullkropp', sted:'begge', muskelgruppe:'Full kropp + kardio', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🔥', animType:'squat', sett:4, reps:'10', hvile:'60s', beskrivelse:'Den ultimate høy-intensitets øvelsen. Push-up, squat og hopp i én bevegelse.', tips:['Teknisk korrekt er viktigere enn fart','Land mykt i knærne','Stram core i plankeposisjon'] },
  { id:'thrusters', navn:'Thrusters', kategori:'fullkropp', sted:'begge', muskelgruppe:'Bein + skuldre kombinert', vanskelighet:'Avansert', utstyr:'Hantler', emoji:'🚀', animType:'squat', sett:3, reps:'10', hvile:'90s', beskrivelse:'Kombinerer front squat og skulderpresse i én flytende bevegelse.', tips:['Flytende bevegelse – bein driver pressen','Start med lett vekt og lær teknikken','Pust ut øverst i pressen'] },
  { id:'kettlebellSwing', navn:'Kettlebell swing', kategori:'fullkropp', sted:'begge', muskelgruppe:'Posterior chain, cardio', vanskelighet:'Middels', utstyr:'Kettlebell', emoji:'🔔', animType:'hinge', sett:4, reps:'15', hvile:'60s', beskrivelse:'HIP HINGE – ikke squat! Kraften kommer fra hoften.', tips:['HIP HINGE – ikke bøy knærne mye','Eksplosiv hofteextension er kraften','Klem gluteus hardt i toppen'] },
  { id:'boxJump', navn:'Box jumps', kategori:'fullkropp', sted:'gym', muskelgruppe:'Quads, glutes, plyo', vanskelighet:'Middels', utstyr:'Plyo-kasse', emoji:'📦', animType:'squat', sett:4, reps:'8', hvile:'90s', beskrivelse:'Eksplosivt hopp opp på en kasse.', tips:['Sving armer for momentum','Land mykt – bend knærne','Stig ned kontrollert – ikke hopp ned'] },
  { id:'squatJumps', navn:'Squat jumps', kategori:'fullkropp', sted:'hjemme', muskelgruppe:'Eksplosiv bein', vanskelighet:'Middels', utstyr:'Ingen', emoji:'⬆️', animType:'squat', sett:4, reps:'12', hvile:'60s', beskrivelse:'Squat ned og eksplodér opp i et hopp.', tips:['Eksplodér opp, bløt landing','Dyp squat','Sving armer for momentum'] },
  { id:'cleanAndPress', navn:'Clean and press', kategori:'fullkropp', sted:'gym', muskelgruppe:'Hel kropp', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'🏋️', animType:'hinge', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Trekk stangen fra gulv til skuldre, press over hodet.', tips:['Eksplosivt løft','Teknisk krevende','Start med lett vekt'] },
  { id:'bearCrawl', navn:'Bear crawl', kategori:'fullkropp', sted:'hjemme', muskelgruppe:'Hele kropp', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🐻', animType:'run', sett:3, reps:'20m', hvile:'60s', beskrivelse:'Kravle på hender og tær med rett rygg.', tips:['Hold ryggen rett','Knærne over gulvet','Motsatt arm og ben'] },
  { id:'manMakers', navn:'Man-makers', kategori:'fullkropp', sted:'gym', muskelgruppe:'Hele kropp', vanskelighet:'Avansert', utstyr:'Hantler', emoji:'💪', animType:'squat', sett:3, reps:'6-8', hvile:'90s', beskrivelse:'Push-up, roing, squat, press i én kombinasjon.', tips:['Full kroppsøvelse','Krevende','Start med lette hantler'] },

  // ═══════════ TABATA (6) ═══════════
  { id:'tabataBurpees', navn:'Tabata Burpees', kategori:'tabata', sted:'hjemme', muskelgruppe:'Full kropp', vanskelighet:'Avansert', utstyr:'Ingen', emoji:'🔥', animType:'squat', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'8 runder = 4 minutter. GI ALT i 20 sekunder.', tips:['GI ALT i 20 sek, FULL STOPP i 10 sek','Hold telleren','4 min er lenger enn du tror'] },
  { id:'tabataPushups', navn:'Tabata Push-ups', kategori:'tabata', sted:'hjemme', muskelgruppe:'Bryst + core', vanskelighet:'Avansert', utstyr:'Ingen', emoji:'💪', animType:'press', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'Maks push-ups i 20 sek, full stopp i 10 sek.', tips:['Maks reps i 20 sek, null i 10 sek','Hold formen','Ikke kompromiss'] },
  { id:'tabataSquats', navn:'Tabata Squat jumps', kategori:'tabata', sted:'hjemme', muskelgruppe:'Bein explosivt', vanskelighet:'Avansert', utstyr:'Ingen', emoji:'🦵', animType:'squat', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'Explosiv tabata for bein.', tips:['Maks kraft i 20 sek, land mykt','Eksplosive hopp','Pust hardt'] },
  { id:'tabataMountain', navn:'Tabata Mountain climbers', kategori:'tabata', sted:'hjemme', muskelgruppe:'Core, kondisjon', vanskelighet:'Middels', utstyr:'Ingen', emoji:'⛰️', animType:'run', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'Maks fjellklatrere i 20 sek.', tips:['Hurtige vekslinger','Hold hoften nede','Tempo!'] },
  { id:'tabataPlank', navn:'Tabata Plank', kategori:'tabata', sted:'hjemme', muskelgruppe:'Core', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🧘', animType:'plank', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'Planke i 20 sek, pause i 10 sek.', tips:['Hold planken, stram alt','Kjernen brenner','Ikke slipp hoften'] },
  { id:'tabataJacks', navn:'Tabata Jumping jacks', kategori:'tabata', sted:'hjemme', muskelgruppe:'Kondisjon', vanskelighet:'Nybegynner', utstyr:'Ingen', emoji:'⭐', animType:'run', sett:8, reps:'20s on/10s off', hvile:'1min', beskrivelse:'Maks hoppestjerner i 20 sek.', tips:['Høye hopp','Full fart','Pust rytmisk'] },

  // ═══════════ CARDIO (8) ═══════════
  { id:'romaskin', navn:'Romaskin', kategori:'cardio', sted:'gym', muskelgruppe:'Full kropp (85% av muskler)', vanskelighet:'Middels', utstyr:'Romaskin', emoji:'🚣', animType:'run', sett:1, reps:'20 min', hvile:'–', beskrivelse:'Den beste kardio-maskinen fordi den bruker 85% av kroppens muskler.', tips:['BEIN→HELLING→ARMER – alltid','Push med bena, ikke dra med ryggen','Damper: 4-6 anbefalt'] },
  { id:'sykkelHIIT', navn:'Sykkel HIIT', kategori:'cardio', sted:'gym', muskelgruppe:'Bein + kondisjon', vanskelighet:'Middels', utstyr:'Stasjonær sykkel', emoji:'🚴', animType:'run', sett:8, reps:'30s/90s', hvile:'–', beskrivelse:'8 runder: 30 sek maks watt, 90 sek lett tråkk.', tips:['Maks watt i 30 sek','Rolig tråkk i 90 sek','Juster sadelhøyde'] },
  { id:'tredemolle', navn:'Tredemølle intervall', kategori:'cardio', sted:'gym', muskelgruppe:'Bein + kondisjon', vanskelighet:'Middels', utstyr:'Tredemølle', emoji:'👟', animType:'run', sett:6, reps:'2 min', hvile:'1min', beskrivelse:'6 runder: 2 min rask jogg, 1 min gange.', tips:['Øk hastighet gradvis','IKKE hold i gelenderne','Varm opp 5 min'] },
  { id:'boksesekk', navn:'Boksesekk runder', kategori:'cardio', sted:'gym', muskelgruppe:'Full kropp', vanskelighet:'Middels', utstyr:'Boksesekk', emoji:'🥊', animType:'run', sett:5, reps:'3 min', hvile:'1min', beskrivelse:'5 runder à 3 min, 1 min pause.', tips:['Hofte med hvert slag','Pust rytmisk','Bland kombinasjoner'] },
  { id:'hoppetau', navn:'Hoppetau', kategori:'cardio', sted:'begge', muskelgruppe:'Kondisjon', vanskelighet:'Nybegynner', utstyr:'Tau', emoji:'⬆️', animType:'run', sett:5, reps:'2 min', hvile:'30s', beskrivelse:'5 runder hoppetau, 2 min arbeid, 30 sek pause.', tips:['Hopp lett på tærne','Snu tauet med håndledd','Hold jevnt tempo'] },
  { id:'trappetrening', navn:'Trappetrening', kategori:'cardio', sted:'gym', muskelgruppe:'Bein, kondisjon', vanskelighet:'Middels', utstyr:'Trappemaskin', emoji:'🪜', animType:'run', sett:10, reps:'1 min', hvile:'30s', beskrivelse:'10 min trappetrening.', tips:['Hold tempo','Ikke len deg på gelender','Varier steg'] },
  { id:'sprints', navn:'Sprints', kategori:'cardio', sted:'begge', muskelgruppe:'Eksplosivitet, kondisjon', vanskelighet:'Avansert', utstyr:'Løpebane', emoji:'🏃', animType:'run', sett:8, reps:'100m', hvile:'90s', beskrivelse:'8×100 meter sprint, gå tilbake som hvile.', tips:['Maks fart, rolig tilbake','Varm opp grundig','Land på forfoten'] },
  { id:'burpeesIntervall', navn:'Burpees intervall', kategori:'cardio', sted:'hjemme', muskelgruppe:'Full kropp', vanskelighet:'Middels', utstyr:'Ingen', emoji:'🔥', animType:'squat', sett:5, reps:'45 sek', hvile:'30s', beskrivelse:'5 runder med 45 sek burpees, 30 sek pause.', tips:['Teknisk korrekt hele veien','Pust kontrollert','Ikke kompromiss'] },

  // ═══════════ STYRKELØFT (5) ═══════════
  { id:'konvensjonellMarkloft', navn:'Markløft (konvensjonell)', kategori:'styrkeløft', sted:'gym', muskelgruppe:'Hel kropp', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'⚡', animType:'hinge', sett:4, reps:'5', hvile:'3min', beskrivelse:'Stangen over fotmidten. Rett rygg, hofte bak. PRESS GULVET NED.', tips:['Ryggen rett, press gulvet ned','Hoftene lave i start','Stangen nær kroppen'] },
  { id:'lowBarKnebøy', navn:'Knebøy (low bar)', kategori:'styrkeløft', sted:'gym', muskelgruppe:'Quads, glutes', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'🦵', animType:'squat', sett:4, reps:'5', hvile:'3min', beskrivelse:'Stangen lavt på ryggen, bryst opp.', tips:['Stangen lavt på ryggen','Bryst opp','Ned til parallell'] },
  { id:'konkurranseBenkpress', navn:'Benkpress (konkurranse)', kategori:'styrkeløft', sted:'gym', muskelgruppe:'Pecs, triceps', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'🏋️', animType:'press', sett:4, reps:'5', hvile:'3min', beskrivelse:'Benkpress med konkurranseteknikk, stopp på brystet.', tips:['Føtter i gulvet, skulderblad sammen','Stopp på brystet','Press eksplosivt'] },
  { id:'pausedSquat', navn:'Paused squat', kategori:'styrkeløft', sted:'gym', muskelgruppe:'Quads, glutes', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'⏸️', animType:'squat', sett:3, reps:'3-5', hvile:'2min', beskrivelse:'Knebøy med pause i bunnen.', tips:['Hold 2 sek i bunn','Bryt momentum','Øker styrke ut av hullet'] },
  { id:'pausedBench', navn:'Paused bench', kategori:'styrkeløft', sted:'gym', muskelgruppe:'Pecs, triceps', vanskelighet:'Avansert', utstyr:'Vektstang', emoji:'⏸️', animType:'press', sett:3, reps:'3-5', hvile:'2min', beskrivelse:'Benkpress med stopp på brystet.', tips:['Hold 1 sek på brystet','Bedre kontroll','Bygger eksplosivitet'] }
]

const KATEGORIER = ['alle', 'bryst', 'rygg', 'bein', 'skuldre', 'bicep', 'tricep', 'core', 'cardio', 'fullkropp', 'tabata', 'styrkeløft']
const STEDER = ['alle', 'gym', 'hjemme']
const KAT_COLORS: Record<string, string> = {
  bryst:'#00c8ff', rygg:'#b44eff', bein:'#00ff88', skuldre:'#ff8c00',
  bicep:'#ff4488', tricep:'#ff6600', core:'#ffcc00', cardio:'#00ff88', 
  fullkropp:'#00f5ff', tabata:'#ffaa00', styrkeløft:'#ff4444'
}
const VANSKELIG_COLOR = { Nybegynner:'var(--green)', Middels:'var(--orange)', Avansert:'#ff4444' }
const KAT_EMOJI: Record<string, string> = {
  bryst:'💎', rygg:'🔙', bein:'🦵', skuldre:'🔼', bicep:'💪',
  tricep:'💀', core:'🎯', cardio:'🏃', fullkropp:'⚡', tabata:'⏱️', styrkeløft:'🏆'
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