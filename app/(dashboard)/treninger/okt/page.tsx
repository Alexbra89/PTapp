'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ovelserData from '@/data/ovelser.json'
import { useUser, useLagreOkt, useSlettOkt, QK } from '@/hooks/useSupabaseQuery'
import ProgramMal from '../../kalender/ProgramMal'

console.log('🎯 SJEKKER ØVELSER:')
console.log('Type:', typeof ovelserData)
console.log('Kategorier:', Object.keys(ovelserData))

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
      { navn:'Push-up',               sett:4, reps:'12-15', hvile:'60s', utstyr:'Ingen',              emoji:'💪', muskler:'Pecs, triceps',    beskrivelse:'Grunnleggende brystøvelse. Hender litt bredere enn skuldrene, kroppen rett. Senk brystet til nær gulvet og press opp.', tips:'Kroppen rett som planke' },
      { navn:'Dips (stol)',            sett:3, reps:'12',    hvile:'75s', utstyr:'To stoler',          emoji:'💺', muskler:'Pecs, triceps',    beskrivelse:'Hender på stoler bak deg, bena rett. Senk ned ved å bøye albuene, press opp.', tips:'Len litt fremover for bryst' },
      { navn:'Svært smale push-ups',   sett:3, reps:'10-15', hvile:'60s', utstyr:'Ingen',             emoji:'🤏',  muskler:'Triceps, indre bryst', beskrivelse:'Hendene samlet under brystet, albuer tett inntil kroppen.', tips:'Fokuser på triceps' },
    ],
    gym: [
      { navn:'Benkpress',              sett:4, reps:'8-10',  hvile:'90s', utstyr:'Vektstang',          emoji:'🏋️', muskler:'Pecs, triceps',    beskrivelse:'Klassisk styrkeøvelse. Ligg på benk, bredt grep, press opp og senk kontrollert til brystet.', tips:'Skulderblad inn og ned' },
      { navn:'Skråbenkpress',          sett:3, reps:'10',    hvile:'75s', utstyr:'Hantler',            emoji:'📐',  muskler:'Øvre pecs',        beskrivelse:'30-45° skråbenk. Aktiverer øvre brystmuskler.', tips:'30-45° vinkel' },
      { navn:'Kabel pec fly',          sett:3, reps:'12-15', hvile:'60s', utstyr:'Kabelmaskin',        emoji:'🔀',  muskler:'Indre pecs',       beskrivelse:'Kabelen gir konstant motstand. Bring hender sammen foran brystet.', tips:'Bøy lett i albuen' },
      { navn:'Dips',                   sett:3, reps:'10-12', hvile:'75s', utstyr:'Parallell stang',    emoji:'⬇️',  muskler:'Pecs, triceps',    beskrivelse:'Hold i parallelle stenger, lean fremover for brystaktivering.', tips:'Lean fremover for mer bryst' },
      { navn:'Brystpress maskin',      sett:3, reps:'12',    hvile:'60s', utstyr:'Maskin',             emoji:'🔧',  muskler:'Pecs',             beskrivelse:'God isolasjonsmaskin. Guider bevegelsen for fokusert brystaktivering.', tips:'Full ROM og klem i toppen' },
      { navn:'Cable Crossover',        sett:4, reps:'10-12', hvile:'60s', utstyr:'Kabelmaskin',        emoji:'🔀',  muskler:'Indre bryst',      beskrivelse:'Stå midt i kabelmaskinen, før hendene sammen foran brystet.', tips:'Klem i midten' },
    ],
  },
  rygg: {
    hjemme: [
      { navn:'Hantelroing enarms',     sett:4, reps:'10×2',  hvile:'60s', utstyr:'Hantel + benk',     emoji:'💪', muskler:'Øvre rygg, biceps', beskrivelse:'Støtt hånd og kne på benk. Trekk hantelen opp langs kroppen.', tips:'Albuen opp og bak, klem skulderblad' },
      { navn:'Strikk-roing',           sett:4, reps:'12',    hvile:'60s', utstyr:'Strikk',            emoji:'🔴',  muskler:'Midtre rygg',       beskrivelse:'Fest strikket, sett deg og trekk mot midjen.', tips:'Klem skulderblad i slutten' },
      { navn:'Superman',               sett:3, reps:'15',    hvile:'45s', utstyr:'Ingen',             emoji:'🦸',  muskler:'Erector spinae',   beskrivelse:'Ligg på magen, løft armer, bryst og bein fra gulvet.', tips:'Hold 2 sek øverst' },
    ],
    gym: [
      { navn:'Pull-ups',               sett:4, reps:'6-10',  hvile:'2min', utstyr:'Pull-up stang',   emoji:'🤸',  muskler:'Lats, biceps',     beskrivelse:'Kongen av ryggøvelser. Bredt overgrep, trekk haken over stangen.', tips:'Full strekk ned, haken over stangen' },
      { navn:'Lat pulldown',           sett:3, reps:'10-12', hvile:'75s',  utstyr:'Kabelmaskin',    emoji:'⬇️',  muskler:'Lats',             beskrivelse:'Len 15° bakover, trekk stangen ned mot øvre bryst.', tips:'Len 15° bakover, albuer mot hofter' },
      { navn:'Sittende kabelroing',    sett:4, reps:'10-12', hvile:'75s',  utstyr:'Kabelmaskin',    emoji:'🚣',  muskler:'Midtre rygg',      beskrivelse:'Trekk hender inn mot navlen, klem skulderblad.', tips:'Klem skulderblad i slutten, rett rygg' },
      { navn:'Markløft',               sett:4, reps:'5-6',   hvile:'3min', utstyr:'Vektstang',       emoji:'⚡',   muskler:'Hel rygg, glutes',  beskrivelse:'Stangen over fotmidten. Rett rygg, hofte bak.', tips:'RYGGEN RETT - aldri rund rygg' },
      { navn:'Chin-ups',               sett:4, reps:'6-10',  hvile:'90s',  utstyr:'Pull-up stang',   emoji:'🤸',  muskler:'Lats, biceps',     beskrivelse:'Undergrep, mer fokus på biceps.', tips:'Håndflatene mot deg' },
    ],
  },
  bein: {
    hjemme: [
      { navn:'Hantelknebøy',           sett:4, reps:'12',    hvile:'75s', utstyr:'Hantler',           emoji:'🏋️', muskler:'Quads, glutes',    beskrivelse:'Hantler ved siden, skulderbredde, tær litt ut. Squat ned til lårene er parallelle.', tips:'Knær over tær, bryst opp' },
      { navn:'Utfall',                 sett:3, reps:'12×2',  hvile:'60s', utstyr:'Hantler',           emoji:'🚶',  muskler:'Quads, glutes',    beskrivelse:'Langt skritt fremover. Senk bakkneet mot gulvet, press opp.', tips:'Rett overkropp, bakskinne mot gulvet' },
      { navn:'Glute bridge',           sett:4, reps:'15-20', hvile:'45s', utstyr:'Ingen',             emoji:'🌉',  muskler:'Glutes, hamstrings',beskrivelse:'Ligg på ryggen, knær bøyd. Press hoftene opp, klem rumpa.', tips:'Press i hælen, klem rumpa øverst' },
    ],
    gym: [
      { navn:'Knebøy',                 sett:4, reps:'8-10',  hvile:'2min', utstyr:'Vektstang',        emoji:'🦵',  muskler:'Quads, glutes',    beskrivelse:'Kongen av beinøvelser. Skulderbredde, tær ut. Ned til parallell.', tips:'Bryst opp, ned til parallell eller dypere' },
      { navn:'Legpress',               sett:4, reps:'10-12', hvile:'90s',  utstyr:'Legpress maskin', emoji:'🔧',  muskler:'Quads, glutes',    beskrivelse:'Skulderbredde på plata. Senk til 90° i knær, press opp.', tips:'Aldri lås knærne, full bevegelsesbane' },
      { navn:'Rumenske markløft',      sett:3, reps:'10-12', hvile:'90s',  utstyr:'Hantler',         emoji:'🍑',  muskler:'Hamstrings',       beskrivelse:'Rett rygg, lean fremover med hoften bak.', tips:'Rett rygg alltid' },
      { navn:'Leg extension',          sett:3, reps:'12-15', hvile:'60s',  utstyr:'Maskin',          emoji:'⬆️',  muskler:'Quads isolert',    beskrivelse:'Sitt i maskin, strekk bena rett ut.', tips:'Klem quads i toppen, sakte ned' },
      { navn:'Leg curl',               sett:3, reps:'12-15', hvile:'60s',  utstyr:'Maskin',          emoji:'🦵',  muskler:'Hamstrings',       beskrivelse:'Ligg i maskin, curl bena mot baken.', tips:'Klem hamstrings, kontrollert ned' },
    ],
  },
  skuldre: {
    hjemme: [
      { navn:'Sidehev',                sett:3, reps:'12-15', hvile:'60s', utstyr:'Hantler',           emoji:'🔼',  muskler:'Lateral deltoid',  beskrivelse:'Løft armene ut til siden til skulderbredde.', tips:'Løft til skulderhøyde, pinkies litt opp' },
      { navn:'Skulderpresse (hantel)', sett:3, reps:'10-12', hvile:'75s', utstyr:'Hantler',           emoji:'⬆️',  muskler:'Alle deltoider',   beskrivelse:'Press opp over hodet, bring hantlene inn mot hverandre.', tips:'Pust ut øverst, ikke lås albuene' },
    ],
    gym: [
      { navn:'Military press',         sett:4, reps:'8-10',  hvile:'2min', utstyr:'Vektstang',        emoji:'⬆️',  muskler:'Alle deltoider',   beskrivelse:'Stående press fra bryst til over hodet.', tips:'Stram core, ikke lean bakover' },
      { navn:'Sidehev kabel',          sett:3, reps:'12-15', hvile:'60s',  utstyr:'Kabelmaskin',     emoji:'🔼',  muskler:'Lateral deltoid',  beskrivelse:'Kabelen gir konstant motstand. Løft armen ut til siden.', tips:'Lavt kabel-feste, konstant spenning' },
      { navn:'Face pull',              sett:3, reps:'15-20', hvile:'45s',  utstyr:'Kabelmaskin',     emoji:'🎯',  muskler:'Bakre deltoid',    beskrivelse:'Kabelen på øyenivå. Trekk tauet mot ansiktet.', tips:'Albuer høye, trekk til ansiktet' },
      { navn:'Arnold press',           sett:3, reps:'10',    hvile:'90s',  utstyr:'Hantler',         emoji:'🔃',  muskler:'Full skulder',     beskrivelse:'Start med hantler foran ansiktet (undergrep), roter ut og press opp.', tips:'Roter håndflatene mens du presser' },
    ],
  },
  bicep: {
    hjemme: [
      { navn:'Biceps curl',            sett:3, reps:'10-12', hvile:'60s', utstyr:'Hantler',           emoji:'💪',  muskler:'Biceps brachii',   beskrivelse:'Curl hantlene opp mot skuldrene. Albuen forblir fast ved siden.', tips:'Albuen fast ved siden, ingen sving' },
      { navn:'Hammer curl',            sett:3, reps:'10-12', hvile:'60s', utstyr:'Hantler',           emoji:'🔨',  muskler:'Brachialis',       beskrivelse:'Nøytralt grep (tommel peker opp) curl.', tips:'Tommel peker opp hele veien' },
    ],
    gym: [
      { navn:'Biceps curl stang',      sett:3, reps:'10-12', hvile:'60s', utstyr:'EZ-stang',         emoji:'💪',  muskler:'Biceps brachii',   beskrivelse:'Undergrep på stang, skulderbredde. Curl opp.', tips:'Ingen sving, albuer faste' },
      { navn:'Preacher curl',          sett:3, reps:'10-12', hvile:'60s', utstyr:'EZ-stang + benk',  emoji:'🙏',  muskler:'Biceps (kort hode)',beskrivelse:'Preacher benken isolerer biceps. Full strekk i bunn.', tips:'Full strekk i bunn, langsom ned-fase' },
      { navn:'Kabel curl',             sett:3, reps:'12-15', hvile:'45s', utstyr:'Kabelmaskin',      emoji:'🔄',  muskler:'Biceps',           beskrivelse:'Konstant motstand gjennom hele bevegelsen.', tips:'Konstant spenning gjennom hele banen' },
    ],
  },
  tricep: {
    hjemme: [
      { navn:'Trang push-up',          sett:3, reps:'12-15', hvile:'60s', utstyr:'Ingen',             emoji:'💪',  muskler:'Triceps',          beskrivelse:'Hendene smalere enn skuldrene. Albuer nær kroppen.', tips:'Hendene smalere enn skuldrene, albuer nær' },
      { navn:'Triceps kickback',       sett:3, reps:'12×2',  hvile:'60s', utstyr:'Hantler',           emoji:'⬅️',  muskler:'Triceps',          beskrivelse:'Len 45°, albue ved siden. Push underarmen bak.', tips:'Albuen fast og høy, klem bakerst' },
    ],
    gym: [
      { navn:'Triceps pushdown',       sett:3, reps:'12-15', hvile:'60s', utstyr:'Kabelmaskin',      emoji:'📉',  muskler:'Triceps',          beskrivelse:'Albuer fast ved siden, press ned.', tips:'Albuer fast, klem ned helt' },
      { navn:'Skull crushers',         sett:3, reps:'10-12', hvile:'75s', utstyr:'EZ-stang',         emoji:'💀',  muskler:'Triceps alle hoder',beskrivelse:'Ligg på benk. Bøy KUN albuene og senk mot pannen.', tips:'KUN albuene bøyer, stabil øverkropp' },
      { navn:'Close grip bench press', sett:3, reps:'8-10',  hvile:'90s', utstyr:'Vektstang',        emoji:'🤏',  muskler:'Triceps',          beskrivelse:'Benkpress med smalt grep.', tips:'Hendene skulderbredde, albuer inn' },
    ],
  },
  core: {
    hjemme: [
      { navn:'Planke',                 sett:3, reps:'45-60 sek', hvile:'45s', utstyr:'Ingen',         emoji:'🧘',  muskler:'Hele core',        beskrivelse:'På underarm, kroppen rett. Stram mage, rumpe og lår.', tips:'Stram ALT, hofte verken ned eller opp' },
      { navn:'Crunches',               sett:3, reps:'20',     hvile:'45s', utstyr:'Ingen',             emoji:'🔄',  muskler:'Rectus abdominis', beskrivelse:'Krøll kun overkroppen opp ved å kontrahere magen.', tips:'Krøll, ikke hev. Hender ved tinning' },
      { navn:'Russian twist',          sett:3, reps:'20',     hvile:'45s', utstyr:'Ingen',             emoji:'🔃',  muskler:'Obliques',         beskrivelse:'Sett deg med lår 45°, roter overkroppen.', tips:'Roter fra midjen, ikke skuldrene' },
    ],
    gym: [
      { navn:'Cable crunch',           sett:3, reps:'12-15', hvile:'60s', utstyr:'Kabelmaskin',       emoji:'🎯',  muskler:'Rectus abdominis', beskrivelse:'Kne ned foran kabel. Krøll magen ned mot knærne.', tips:'Hoften beveger seg ikke, kun magen' },
      { navn:'Hanging knee raise',     sett:3, reps:'12-15', hvile:'60s', utstyr:'Pull-up stang',     emoji:'⬆️',  muskler:'Hip flexors, mage',beskrivelse:'Heng i stang. Løft knærne mot brystet.', tips:'Ikke sving, kontrollert ned' },
      { navn:'Ab wheel rollout',       sett:3, reps:'8-12',  hvile:'60s', utstyr:'Ab wheel',          emoji:'⚙️',  muskler:'Hele core',        beskrivelse:'Kne på kne, rull hjulet ut og tilbake.', tips:'Stram mage, ikke svai' },
    ],
  },
  fullkropp: {
    hjemme: [
      { navn:'Burpees',                sett:4, reps:'10',    hvile:'60s', utstyr:'Ingen',             emoji:'🔥',  muskler:'Full kropp',       beskrivelse:'Push-up → hopp inn → hopp opp. Én sammenhengende bevegelse.', tips:'Teknisk korrekt er viktigere enn fart' },
      { navn:'Squat jumps',            sett:4, reps:'12',    hvile:'60s', utstyr:'Ingen',             emoji:'⬆️',  muskler:'Explosiv bein',    beskrivelse:'Squat ned og eksplodér opp i et hopp.', tips:'Eksplodér opp, bløt landing' },
    ],
    gym: [
      { navn:'Thrusters',              sett:3, reps:'10',    hvile:'90s', utstyr:'Hantler',           emoji:'🚀',  muskler:'Bein + skuldre',   beskrivelse:'Kombiner squat og skulderpresse i én flytende bevegelse.', tips:'Flytende bevegelse, bruk bein til pressen' },
      { navn:'Kettlebell swing',       sett:4, reps:'15',    hvile:'60s', utstyr:'Kettlebell',        emoji:'🔔',  muskler:'Posterior chain',  beskrivelse:'HIP HINGE – kraften fra hoften.', tips:'HIP HINGE, snap hoften frem, klem glutes' },
      { navn:'Clean and press',        sett:3, reps:'5-8',   hvile:'2min', utstyr:'Vektstang',        emoji:'🏋️',  muskler:'Hel kropp',        beskrivelse:'Trekk stangen fra gulv til skuldre, press over hodet.', tips:'Eksplosivt løft' },
    ],
  },
  tabata: {
    hjemme: [
      { navn:'Tabata Burpees',         sett:8, reps:'20s on/10s off', hvile:'1min', utstyr:'Ingen',   emoji:'🔥',  muskler:'Full kropp',       beskrivelse:'8 runder = 4 minutter. GI ALT i 20 sekunder.', tips:'GI ALT i 20 sek, FULL STOPP i 10 sek' },
      { navn:'Tabata Push-ups',        sett:8, reps:'20s on/10s off', hvile:'1min', utstyr:'Ingen',   emoji:'💪',  muskler:'Bryst + core',     beskrivelse:'Maks push-ups i 20 sek, full stopp i 10 sek.', tips:'Maks reps i 20 sek' },
    ],
    gym: [
      { navn:'Tabata Romaskin',        sett:8, reps:'20s on/10s off', hvile:'1min', utstyr:'Romaskin', emoji:'🚣',  muskler:'Full kropp',       beskrivelse:'Full kraft på romaskin i 20 sek.', tips:'BEIN→HELLING→ARMER, full kraft 20 sek' },
    ],
  },
  cardio: {
    hjemme: [
      { navn:'Boksesekk runder',       sett:5, reps:'3 min', hvile:'1min', utstyr:'Boksesekk',       emoji:'🥊',  muskler:'Full kropp',       beskrivelse:'5 runder à 3 min, 1 min pause.', tips:'Hofte med hvert slag' },
      { navn:'Burpees intervall',      sett:5, reps:'45 sek', hvile:'30s', utstyr:'Ingen',           emoji:'🔥',  muskler:'Full kropp',       beskrivelse:'5 runder med 45 sek burpees, 30 sek pause.', tips:'Teknisk korrekt' },
    ],
    gym: [
      { navn:'Romaskin intervall',     sett:6, reps:'500m',   hvile:'90s', utstyr:'Romaskin',        emoji:'🚣',  muskler:'Full kropp',       beskrivelse:'6×500m med 90 sek pause.', tips:'BEIN→HELLING→ARMER, jevn kraft' },
      { navn:'Sykkel HIIT',            sett:8, reps:'30s/90s', hvile:'–', utstyr:'Sykkel',           emoji:'🚴',  muskler:'Bein + kondisjon', beskrivelse:'8 runder: 30 sek maks watt, 90 sek lett.', tips:'Maks watt i 30 sek' },
    ],
  },
  styrkeløft: {
    hjemme: [],
    gym: [
      { navn:'Markløft (konvensjonell)',sett:4, reps:'5',     hvile:'3min', utstyr:'Vektstang',       emoji:'⚡',   muskler:'Hel kropp',        beskrivelse:'Stangen over fotmidten. Rett rygg, hofte bak. PRESS GULVET NED.', tips:'Ryggen rett, press gulvet ned' },
      { navn:'Knebøy (low bar)',       sett:4, reps:'5',     hvile:'3min', utstyr:'Vektstang',       emoji:'🦵',  muskler:'Quads, glutes',    beskrivelse:'Stangen lavt på ryggen, bryst opp.', tips:'Stangen lavt på ryggen' },
      { navn:'Benkpress (konkurranse)',sett:4, reps:'5',     hvile:'3min', utstyr:'Vektstang',       emoji:'🏋️',  muskler:'Pecs, triceps',    beskrivelse:'Benkpress med konkurranseteknikk, stopp på brystet.', tips:'Føtter i gulvet, skulderblad sammen' },
    ],
  },
  mobilitet: {
    hjemme: [
      { navn:'Cat-Cow',                sett:3, reps:'10',    hvile:'30s', utstyr:'Ingen',             emoji:'🐱🐮',muskler:'Rygg',             beskrivelse:'På alle fire, veksle mellom å krumme og senke ryggen.', tips:'Sakte, føl bevegelsen' },
      { navn:'Thoracic rotation',      sett:3, reps:'8×2',   hvile:'30s', utstyr:'Ingen',             emoji:'🔄',  muskler:'Øvre rygg',        beskrivelse:'Ligg på siden, åpne arm opp og rotér.', tips:'Rotér fra brystryggen' },
      { navn:'World\'s greatest stretch',sett:3,reps:'6×2', hvile:'30s', utstyr:'Ingen',             emoji:'🌍',  muskler:'Hele kropp',       beskrivelse:'Utfall med albue i gulvet, rotér opp.', tips:'Dyp rotasjon' },
    ],
    gym: [],
  },
  eksplosivitet: {
    hjemme: [
      { navn:'Box jumps',              sett:4, reps:'5',     hvile:'60s', utstyr:'Box',               emoji:'📦',  muskler:'Eksplosiv bein',   beskrivelse:'Hopp opp på en boks.', tips:'Land mykt' },
      { navn:'Broad jumps',            sett:4, reps:'5',     hvile:'60s', utstyr:'Ingen',             emoji:'⬆️',  muskler:'Eksplosiv bein',   beskrivelse:'Stående lengdehopp.', tips:'Hopp lengst mulig' },
    ],
    gym: [
      { navn:'Power clean',            sett:4, reps:'3-5',   hvile:'2min', utstyr:'Vektstang',        emoji:'⚡',   muskler:'Hel kropp',        beskrivelse:'Trekk stangen fra gulv til skuldre i én bevegelse.', tips:'Eksplosivt hofte-støt' },
      { navn:'Medicine ball slam',     sett:4, reps:'8-10',  hvile:'45s', utstyr:'Medisinball',       emoji:'💥',  muskler:'Hel kropp',        beskrivelse:'Løft ballen over hodet, slå den ned i gulvet.', tips:'Slam med full kraft' },
    ],
  },
  isolasjon: {
    hjemme: [],
    gym: [
      { navn:'Pec deck',               sett:3, reps:'10-12', hvile:'60s', utstyr:'Maskin',            emoji:'🔀',  muskler:'Bryst',            beskrivelse:'Sitt i maskin, press albuene sammen foran brystet.', tips:'Klem i midten' },
      { navn:'Lateral raise maskin',   sett:3, reps:'12-15', hvile:'60s', utstyr:'Maskin',            emoji:'🔼',  muskler:'Side skulder',     beskrivelse:'Sitt i maskin, løft armene ut til siden.', tips:'Kontrollert bevegelse' },
      { navn:'Leg curl sittende',      sett:3, reps:'12-15', hvile:'60s', utstyr:'Maskin',            emoji:'🦵',  muskler:'Hamstrings',       beskrivelse:'Sitt i maskin, curl bena ned mot setet.', tips:'Klem hamstrings' },
      { navn:'Leg extension sittende', sett:3, reps:'12-15', hvile:'60s', utstyr:'Maskin',            emoji:'⬆️',  muskler:'Quads',             beskrivelse:'Sitt i maskin, strekk bena rett ut.', tips:'Klem quads i toppen' },
    ],
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

  const { data: user } = useUser()

  // ── Stoppeklokke ───────────────────────────────────────────────────────────
  const [klokkeMode, setKlokkeMode] = useState<'stopp'|'ned'>('stopp')
  const [sekunder,   setSekunder]   = useState(0)
  const [kjoerer,    setKjoerer]    = useState(false)
  const [nedMal,     setNedMal]     = useState(3)
  const [alarm,      setAlarm]      = useState(false)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)

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

  useEffect(() => { bygg() }, [])

  useEffect(() => {
    const dato = new Date().toISOString().split('T')[0]
    setDagensDato(dato)
    const lagret = localStorage.getItem(`notat_${dato}`)
    if (lagret) setOktNotat(lagret)
  }, [])

  const nullstillKlokke = () => { setKjoerer(false); setSekunder(0); setAlarm(false) }
  const startKlokke     = () => { setAlarm(false); if (klokkeMode === 'ned') setSekunder(nedMal * 60); setKjoerer(true) }
  const formatTid       = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const byttOvelse = async (index: number, nyOvelse: any) => {
    console.log('🔄 Bytter øvelse:', index, nyOvelse)
    
    const ny = {
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
      sett_logg: Array.from({length: nyOvelse.sett}, () => ({
        reps: parseInt(nyOvelse.reps.split('-')[0]) || 10,
        kg: 0,
        fullfort: false
      }))
    }
    
    setOkter(prev => prev.map((o, i) => i === index ? ny : o))
    setVisFavorittModal(false)
    setBytteIndex(null)
  }

  const bygg = async () => {
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
        const alle = Object.values(DB).flatMap(d => [...d.hjemme, ...d.gym])
        const norm = (n: string) => n.toLowerCase().trim().replace(/\s+/g, ' ')
        let oveler = customOvelser.map((o: any) => {
          const match = alle.find(e => norm(e.navn) === norm(o.navn || ''))
          const sett = o.sett || 3; const reps = o.reps || '10'
          if (match) return { ...match, sett, reps, expanded: true, sett_logg: Array.from({length: sett}, () => ({ reps: parseInt(reps.split('-')[0])||10, kg: 0, fullfort: false })) }
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
        const alle = Object.values(DB).flatMap(d => [...d.hjemme, ...d.gym])
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
      const pool = DB[g]?.[sted] ?? []
      alle = alle.concat(shuffle(pool).slice(0, antall).map(o => ({
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

  const oppdaterSett = (oIdx: number, sIdx: number, felt: string, val: any) =>
    setOkter(prev => prev.map((o,i) => i!==oIdx ? o : {
      ...o, sett_logg: o.sett_logg.map((s,j) => j!==sIdx ? s : {...s,[felt]:val})
    }))

  const lagreOkt = async () => {
    setLagrer(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) { setLagrer(false); return }
    const dato = new Date().toISOString().split('T')[0]
    await supabase.from('okter').insert([{
      bruker_id: currentUser.id, dato, tittel, type: 'styrke', varighet_min: 60, fullfort: false,
      ovelser: okter.map(o => ({ navn: o.navn, sett: o.sett, reps: o.sett_logg.map(s=>s.reps).join('/'), kg: o.sett_logg.find(s=>s.kg>0)?.kg ?? 0 })),
    }])
    for (const o of okter) {
      if (!o.sett_logg.some(s => s.kg > 0)) continue
      await supabase.from('treningslogger').insert({
        bruker_id: currentUser.id, dato, ovelse_navn: o.navn, muskelgruppe: o.muskler,
        sett: o.sett_logg.map(s => ({ reps: s.reps, vekt: s.kg, fullfort: s.fullfort }))
      })
    }
    setLagretMsg('Økt lagret! ✓')
    setTimeout(() => setLagretMsg(''), 3000)
    setLagrer(false)
  }

  if (laster) return (
    <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="spinner-lg"/></div>
  )

  const fullfort = okter.flatMap(o=>o.sett_logg).filter(s=>s.fullfort).length
  const totalt   = okter.flatMap(o=>o.sett_logg).length

  // Funksjon for å legge til favoritt direkte
  const leggTilFavoritt = async (ovelse: any) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    
    const { error } = await supabase.from('favoritt_ovelser').upsert({
      bruker_id: currentUser.id,
      ovelse_navn: ovelse.navn,
      ovelse_id: ovelse.navn.toLowerCase().replace(/\s+/g, '-'),
      emoji: ovelse.emoji,
      sett: ovelse.sett,
      reps: ovelse.reps,
      hvile: ovelse.hvile
    }, { onConflict: 'bruker_id, ovelse_navn' })
    
    if (error) {
      console.error('Feil ved lagring av favoritt:', error)
      alert('❌ Kunne ikke lagre favoritt')
    } else {
      alert(`⭐ ${ovelse.navn} lagt til i favoritter!`)
    }
  }

  return (
    <div className="okt-page anim-fade-up">
      <div className="okt-header">
        <button className="okt-tilbake" onClick={() => router.back()}>← Tilbake</button>
        <div className="okt-header-info">
          <h1 className="okt-tittel">{tittel}</h1>
          <div className="okt-badges">
            <span className="okt-badge-cyan">{okter.length} øvelser</span>
            <span className="okt-badge-green">{fullfort}/{totalt} sett ✓</span>
          </div>
        </div>
        <button className="btn btn-primary okt-lagre-btn" onClick={lagreOkt} disabled={lagrer}>
          {lagrer ? <span className="spinner" style={{width:14,height:14}}/> : '💾 Lagre økt'}
        </button>
      </div>

      {lagretMsg && <div className="okt-lagret-msg">{lagretMsg}</div>}

      <div className={`okt-klokke glass-card${alarm ? ' okt-alarm' : ''}`}>
        <div className="okt-klokke-rad1">
          <div className="okt-klokke-venstre">
            <div className="okt-tid" style={{color: alarm ? '#ff4444' : kjoerer ? 'var(--cyan)' : 'rgba(255,255,255,0.4)'}}>
              {formatTid(sekunder)}
            </div>
            <div className="okt-klokke-info">{alarm ? '⚠️ TID ER UTE!' : kjoerer ? '⏱ Pågår...' : klokkeMode === 'ned' ? `Nedtelling: ${nedMal} min` : 'Stoppeklokke'}</div>
          </div>
          <div className="okt-klokke-hoeyre">
            {!kjoerer
              ? <button className="btn btn-primary okt-k-btn" onClick={startKlokke}>▶ Start</button>
              : <button className="btn btn-ghost  okt-k-btn" onClick={() => setKjoerer(false)}>⏸ Pause</button>
            }
            <button className="okt-reset" onClick={nullstillKlokke} title="Nullstill">↺</button>
          </div>
        </div>
        <div className="okt-klokke-rad2">
          <div className="okt-modus-rad">
            <button className={`okt-modus${klokkeMode==='stopp'?' on':''}`} onClick={() => { setKlokkeMode('stopp'); nullstillKlokke() }}>⏱ Stopp</button>
            <button className={`okt-modus${klokkeMode==='ned'?' on':''}`}  onClick={() => { setKlokkeMode('ned');  nullstillKlokke() }}>⏳ Ned</button>
          </div>
          {klokkeMode === 'ned' && !kjoerer && (
            <div className="okt-ned-rad">
              <button className="okt-ned-btn" onClick={() => setNedMal(m=>Math.max(1,m-1))}>−</button>
              <span className="okt-ned-v">{nedMal}m</span>
              <button className="okt-ned-btn" onClick={() => setNedMal(m=>Math.min(120,m+1))}>+</button>
              <div className="okt-quick-rad">
                {[1,2,3,5,10,15,20,30].map(m=>(
                  <button key={m} className={`okt-quick${nedMal===m?' on':''}`} onClick={()=>setNedMal(m)}>{m}m</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {oppvar.length > 0 && (
        <div className="okt-opp glass-card">
          <div className="okt-opp-title">🔥 Oppvarming</div>
          {oppvar.map(o => (
            <div key={o.id} className="okt-opp-item">
              <span className="okt-opp-em">{o.emoji}</span>
              <div>
                <div className="okt-opp-navn">{o.navn} — {o.varighet}</div>
                <div className="okt-opp-besk">{o.beskrivelse}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="okt-liste">
        {okter.map((o, oIdx) => {
          const done = o.sett_logg.every(s => s.fullfort)
          return (
            <div key={oIdx} className={`okt-kort glass-card${done ? ' okt-kort-done' : ''}`}>
              <div className="okt-ov-header"
                onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{...x,expanded:!x.expanded}))}>
                <div className="okt-ov-num">{oIdx+1}</div>
                <span className="okt-ov-em">{o.emoji}</span>
                <div className="okt-ov-info">
                  <div className="okt-ov-navn">{o.navn}</div>
                  <div className="okt-ov-musk">{o.muskler}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button 
                      className="okt-fav-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        leggTilFavoritt(o)
                      }}
                      title="Legg til i favoritter"
                    >
                      ⭐
                    </button>
                    <button 
                      className="okt-bytte-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setBytteIndex(oIdx)
                        setVisFavorittModal(true)
                      }}
                      title="Bytt ut øvelse"
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <div className="okt-ov-tags">
                  <span className="okt-tag">{o.sett}×</span>
                  <span className="okt-tag">{o.reps}</span>
                  <span className="okt-tag">{o.hvile}</span>
                  {done && <span className="okt-tag-done">✓ Ferdig</span>}
                </div>
                <span className="okt-toggle">{o.expanded?'▲':'▼'}</span>
              </div>
              {o.expanded && (
                <div className="okt-ov-body">
                  {o.beskrivelse && (
                    <div className="okt-besk">
                      <div className="okt-besk-lbl">📖 Hva er dette?</div>
                      <p className="okt-besk-txt">{o.beskrivelse}</p>
                    </div>
                  )}
                  {o.tips && <div className="okt-tips">💡 {o.tips}</div>}
                  <div className="okt-sett-header">
                    <span>Sett</span><span>Reps</span><span>Kg</span><span>✓</span><span></span>
                  </div>
                  {o.sett_logg.map((s, sIdx) => (
                    <div key={sIdx} className={`okt-sett-row${s.fullfort ? ' okt-sett-done' : ''}`}>
                      <span className="okt-sett-nr">#{sIdx+1}</span>
                      <input className="input okt-input" type="number" min={1} value={s.reps}
                        onChange={e => oppdaterSett(oIdx,sIdx,'reps',parseInt(e.target.value)||0)} />
                      <input className="input okt-input" type="number" min={0} step={0.5}
                        value={s.kg||''} placeholder="0"
                        onChange={e => oppdaterSett(oIdx,sIdx,'kg',parseFloat(e.target.value)||0)} />
                      <button className={`okt-check${s.fullfort?' done':''}`}
                        onClick={() => oppdaterSett(oIdx,sIdx,'fullfort',!s.fullfort)}>
                        {s.fullfort ? '✓' : '○'}
                      </button>
                      <button className="okt-fjern"
                        onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{
                          ...x, sett: x.sett-1, sett_logg: x.sett_logg.filter((_,j) => j!==sIdx)
                        }))}>✕</button>
                    </div>
                  ))}
                  <button className="okt-add-sett"
                    onClick={() => setOkter(p => p.map((x,i) => i!==oIdx?x:{
                      ...x, sett: x.sett+1,
                      sett_logg: [...x.sett_logg, {reps:parseInt(o.reps.split('-')[0])||10,kg:0,fullfort:false}]
                    }))}>
                    ＋ Legg til sett
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button className="okt-lagre-bunn btn btn-primary" onClick={lagreOkt} disabled={lagrer}>
        {lagrer ? <span className="spinner" style={{width:16,height:16}}/> : '💾 Lagre økt i kalender'}
      </button>

      <div style={{ display:'flex', justifyContent:'center', marginTop:'1rem', marginBottom:'1rem' }}>
        <button
          className="btn btn-primary"
          style={{ padding:'1rem 3rem', fontSize:'1.2rem', background:'linear-gradient(135deg, var(--cyan), var(--purple))', border:'none', width:'100%', maxWidth:'400px' }}
          onClick={async () => {
            const alleFullfort = okter.every(o => o.sett_logg.every(s => s.fullfort))
            if (!alleFullfort) { 
              alert('❌ Du må fullføre ALLE sett først!')
              return 
            }
            if (!confirm('Er du klar for å fullføre treningen?')) return
            
            setLagrer(true)
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) { setLagrer(false); return }
            
            const dato = new Date().toISOString().split('T')[0]
            const { error } = await supabase.from('okter').insert([{
              bruker_id: currentUser.id, 
              dato, 
              tittel, 
              type:'styrke', 
              varighet_min:60, 
              fullfort: true,
              ovelser: okter.map(o => ({ 
                navn: o.navn, 
                sett: o.sett, 
                reps: o.sett_logg.map(s=>s.reps).join('/'), 
                kg: o.sett_logg.find(s=>s.kg>0)?.kg ?? 0 
              })),
            }])
            
            if (error) { 
              console.error('Feil ved lagring:', error)
              alert('❌ Noe gikk galt ved lagring: ' + error.message)
            } else {
              for (const o of okter) {
                if (!o.sett_logg.some(s => s.kg > 0)) continue
                await supabase.from('treningslogger').insert({
                  bruker_id: currentUser.id, 
                  dato, 
                  ovelse_navn: o.navn, 
                  muskelgruppe: o.muskler,
                  sett: o.sett_logg.map(s => ({ reps: s.reps, vekt: s.kg, fullfort: s.fullfort }))
                })
              }
              alert('🎉 GRATULERER! Trening fullført!')
              router.push('/kalender')
            }
            setLagrer(false)
          }}
        >
          {lagrer ? <span className="spinner" style={{width:20,height:20}}/> : '✅ FULLFØR TRENING'}
        </button>
      </div>

      <div className="okt-notat-seksjon glass-card">
        <div className="okt-notat-tittel">📝 Notat om økten</div>
        <textarea
          className="input okt-notat-textarea"
          placeholder="Hvordan gikk det? Energi? Søvn? Noe å huske til neste gang?"
          value={oktNotat}
          onChange={e => setOktNotat(e.target.value)}
          rows={3}
        />
        <button
          className="btn btn-ghost okt-notat-lagre"
          onClick={() => {
            if (!dagensDato || !oktNotat.trim()) return
            localStorage.setItem(`notat_${dagensDato}`, oktNotat)
            setLagretMsg('Notat lagret! ✓')
            setTimeout(() => setLagretMsg(''), 2000)
          }}
        >
          💾 Lagre notat
        </button>
      </div>

      {visFavorittModal && user?.id && bytteIndex !== null && (
        <ProgramMal 
          userId={user.id}
          onClose={() => {
            setVisFavorittModal(false)
            setBytteIndex(null)
          }}
          onSelectFavoritt={(fav) => byttOvelse(bytteIndex, fav)}
          mode="bytte"
        />
      )}

      <style>{`
        .okt-page { max-width: 860px; width: 100%; }
        .okt-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .okt-tilbake { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border-radius: 10px; padding: 0.5rem 1rem; font-size: 0.82rem; cursor: pointer; font-family: var(--font-body,sans-serif); transition: all 0.15s; flex-shrink: 0; }
        .okt-tilbake:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .okt-header-info { flex: 1; min-width: 0; }
        .okt-tittel { font-family: var(--font-display,sans-serif); font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .okt-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .okt-badge-cyan { padding:3px 10px; border-radius:999px; font-size:0.72rem; background:rgba(0,245,255,0.12); border:1px solid rgba(0,245,255,0.25); color:var(--cyan,#00f5ff); }
        .okt-badge-green { padding:3px 10px; border-radius:999px; font-size:0.72rem; background:rgba(0,255,136,0.12); border:1px solid rgba(0,255,136,0.25); color:var(--green,#00ff88); }
        .okt-lagre-btn { flex-shrink: 0; font-size:0.82rem !important; padding:0.5rem 1.1rem !important; }
        .okt-lagret-msg { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); color: var(--green,#00ff88); border-radius: 10px; padding: 0.6rem 1rem; font-size: 0.82rem; text-align: center; margin-bottom: 1rem; }
        .okt-opp { padding: 1.125rem 1.25rem; margin-bottom: 1rem; border-color: rgba(255,140,0,0.2) !important; }
        .okt-opp-title { font-family: var(--font-display,sans-serif); font-size: 0.85rem; font-weight: 700; color: var(--orange,#ff8c00); margin-bottom: 0.75rem; }
        .okt-opp-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .okt-opp-em { font-size: 1.2rem; flex-shrink: 0; }
        .okt-opp-navn { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 2px; }
        .okt-opp-besk { font-size: 0.75rem; color: rgba(255,255,255,0.4); line-height: 1.4; }
        .okt-liste { display: flex; flex-direction: column; gap: 0.75rem; }
        .okt-kort { overflow: hidden; transition: border-color 0.3s; }
        .okt-kort-done { border-color: rgba(0,255,136,0.2) !important; }
        .okt-ov-header { display: flex; align-items: center; gap: 10px; padding: 1rem 1.25rem; cursor: pointer; transition: background 0.15s; }
        .okt-ov-header:hover { background: rgba(255,255,255,0.02); }
        .okt-ov-num { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; background: rgba(0,245,255,0.12); border: 1px solid rgba(0,245,255,0.25); color: var(--cyan,#00f5ff); font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .okt-ov-em { font-size: 1.2rem; flex-shrink: 0; }
        .okt-ov-info { flex: 1; min-width: 0; }
        .okt-ov-navn { font-family: var(--font-display,sans-serif); font-size: 0.92rem; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .okt-ov-musk { font-size: 0.67rem; color: rgba(255,255,255,0.3); margin-top: 2px; }
        .okt-fav-btn, .okt-bytte-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border-radius: 6px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer; transition: all 0.15s; font-family: var(--font-body,sans-serif); }
        .okt-fav-btn:hover, .okt-bytte-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .okt-ov-tags { display: flex; gap: 5px; flex-wrap: wrap; flex-shrink: 0; }
        .okt-tag { padding:2px 7px; border-radius:999px; font-size:0.62rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.38); white-space:nowrap; }
        .okt-tag-done { padding:2px 8px; border-radius:999px; font-size:0.62rem; background:rgba(0,255,136,0.12); border:1px solid rgba(0,255,136,0.25); color:var(--green,#00ff88); white-space:nowrap; }
        .okt-toggle { color:rgba(255,255,255,0.25); font-size:0.65rem; flex-shrink:0; }
        .okt-ov-body { padding: 0 1.25rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); }
        .okt-besk { margin: 0.75rem 0 0; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .okt-besk-lbl { font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.28); font-weight:700; margin-bottom:4px; }
        .okt-besk-txt { font-size:0.82rem; color:rgba(255,255,255,0.58); line-height:1.6; margin:0; }
        .okt-tips { font-size: 0.78rem; color: rgba(255,200,0,0.75); margin: 0.5rem 0 0.75rem; padding: 6px 10px; background: rgba(255,200,0,0.06); border-radius: 8px; border-left: 2px solid rgba(255,200,0,0.3); }
        .okt-sett-header { display: grid; grid-template-columns: 32px 1fr 1fr 36px 26px; gap: 8px; margin: 0.75rem 0 5px; padding: 0 4px; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.22); }
        .okt-sett-row { display: grid; grid-template-columns: 32px 1fr 1fr 36px 26px; gap: 8px; align-items: center; margin-bottom: 5px; transition: background 0.15s; border-radius: 8px; padding: 0 4px; }
        .okt-sett-done { background: rgba(0,255,136,0.04); }
        .okt-sett-nr { font-size:0.7rem; color:rgba(255,255,255,0.28); text-align:center; }
        .okt-input { text-align:center; padding:0.35rem 0.4rem !important; font-size:0.88rem !important; }
        .okt-check { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.38); cursor: pointer; font-size:0.88rem; transition: all 0.15s; display:flex; align-items:center; justify-content:center; }
        .okt-check.done { background:rgba(0,255,136,0.14); border-color:rgba(0,255,136,0.4); color:var(--green,#00ff88); }
        .okt-fjern { background:none; border:none; color:rgba(255,255,255,0.18); cursor:pointer; font-size:0.72rem; transition:color 0.15s; }
        .okt-fjern:hover { color:#ff5555; }
        .okt-add-sett { margin-top: 8px; background: none; border: 1px dashed rgba(255,255,255,0.13); color: rgba(255,255,255,0.3); border-radius: 8px; padding: 5px 12px; font-size: 0.75rem; cursor: pointer; font-family: var(--font-body,sans-serif); width: 100%; transition: all 0.15s; }
        .okt-add-sett:hover { border-color:var(--cyan,#00f5ff); color:var(--cyan,#00f5ff); }
        .okt-lagre-bunn { width: 100%; margin-top: 1.5rem; padding: 0.875rem !important; font-size: 0.95rem !important; }
        .okt-klokke { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 1rem; }
        @keyframes alarmP { from{box-shadow:0 0 0 rgba(255,68,68,0);} to{box-shadow:0 0 18px rgba(255,68,68,0.3);} }
        .okt-alarm { border-color: rgba(255,68,68,0.4) !important; animation: alarmP 0.5s ease-in-out infinite alternate; }
        .okt-klokke-rad1 { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .okt-klokke-venstre { flex-shrink:0; }
        .okt-tid { font-family:var(--font-display,monospace); font-size:2rem; font-weight:800; letter-spacing:0.04em; font-variant-numeric:tabular-nums; line-height:1; }
        .okt-klokke-info { font-size:0.62rem; color:rgba(255,255,255,0.28); margin-top:2px; }
        .okt-klokke-hoeyre { display:flex; gap:6px; align-items:center; flex-shrink:0; }
        .okt-k-btn { font-size:0.82rem !important; padding:0.5rem 1.25rem !important; min-width: 90px; }
        .okt-klokke-rad2 { display:flex; flex-direction: column; gap: 6px; }
        .okt-modus-rad { display:flex; gap:5px; }
        .okt-modus { padding:3px 10px; border-radius:999px; font-size:0.68rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.38); cursor:pointer; font-family:var(--font-body,sans-serif); transition:all 0.12s; }
        .okt-modus.on { background:rgba(0,245,255,0.1); border-color:rgba(0,245,255,0.3); color:var(--cyan); }
        .okt-ned-rad { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .okt-ned-btn { width:22px; height:22px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#fff; cursor:pointer; font-size:0.85rem; font-family:var(--font-body,sans-serif); display:flex; align-items:center; justify-content:center; }
        .okt-ned-v { font-family:var(--font-display,monospace); font-size:1rem; font-weight:700; color:var(--cyan); min-width:28px; text-align:center; }
        .okt-quick-rad { display:flex; gap:2px; flex-wrap:wrap; }
        .okt-quick { padding:2px 5px; border-radius:5px; font-size:0.6rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.3); cursor:pointer; font-family:var(--font-body,sans-serif); transition:all 0.1s; }
        .okt-quick.on { background:rgba(0,245,255,0.1); border-color:rgba(0,245,255,0.25); color:var(--cyan); }
        .okt-reset { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.35); width:32px; height:32px; border-radius:7px; cursor:pointer; font-size:0.9rem; transition:all 0.12s; display:flex; align-items:center; justify-content:center; }
        .okt-reset:hover { background:rgba(255,255,255,0.1); color:#fff; }
        .okt-notat-seksjon { padding:1.25rem; margin-top:1rem; display:flex; flex-direction:column; gap:.75rem; }
        .okt-notat-tittel { font-family:var(--font-display,sans-serif); font-size:.88rem; font-weight:700; color:#fff; }
        .okt-notat-textarea { width:100%; resize:vertical; min-height:80px; }
        .okt-notat-lagre { font-size:.82rem !important; align-self:flex-end; }
        .spinner-lg { width:32px; height:32px; border:3px solid rgba(255,255,255,0.1); border-top-color:var(--cyan); border-radius:50%; animation:spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
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