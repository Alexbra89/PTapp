'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// LIM INN ALLE DINE 100+ ØVELSER HER
const OVELSER = [
  { id:'benkpress', navn:'Benkpress', kategori:'bryst', muskelgruppe:'Pecs, triceps, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + flatbenk', sted:'gym', emoji:'🏋️', beskrivelse:'Klassisk styrkeøvelse og et av de tre store løftene i styrkeløft. Legg deg på benken med stangen over nedre bryst. Ta grep litt bredere enn skuldrene, senk kontrollert og press opp. Hold ryggen lett hvelvet og skulderblad inn og ned hele veien.', tips:['Skulderblad inn og ned FØR du starter','Ryggen lett hvelvet – ikke flat','Senk til brystet berøres lett','Pust inn ned, eksplosivt opp','Grep litt bredere enn skuldrene'], sett:4, reps:'8-10', hvile:'90s', animType:'press', utforing:['Legg deg på benken med øynene under stangen','Grip stangen litt bredere enn skulderbredde med overgrep','Trekk skulderblad sammen og ned – dette er nøkkelen','Ta stangen av sikringen med rette armer','Senk stangen kontrollert mot nedre bryst (3 sek ned)','Stangen berører lett brystet – ikke bounce','Press opp eksplosivt til armene er nesten strake','Gjenta for ønsket antall reps'] },
  { id:'pushup', navn:'Push-up', kategori:'bryst', muskelgruppe:'Pecs, triceps, core', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'begge', emoji:'💪', beskrivelse:'Grunnleggende kroppsvektøvelse. Mer funksjonell enn benkpress da den aktiverer hele kroppen som en enhet. Perfekt for hjemmetrening og oppvarming.', tips:['Kroppen rett som planke fra hode til hæl','Albuer 45° fra kroppen – ikke utover','Press eksplosivt opp','Se ned i gulvet for nøytral nakke'], sett:4, reps:'12-15', hvile:'60s', animType:'press', utforing:['Start i plankeposisjon, hender litt bredere enn skuldrene','Kroppen rett – stram mage og rumpe','Senk brystet mot gulvet ved å bøye albuene til 45°','Stopp 2-3 cm fra gulvet','Press opp eksplosivt til armene er nesten strake','Gjenta uten å miste kroppslinja'] },
  { id:'hantelflyes', navn:'Hantelflyes', kategori:'bryst', muskelgruppe:'Pecs (strekk)', vanskelighet:'Middels', utstyr:'Hantler + benk', sted:'gym', emoji:'🦅', beskrivelse:'Isolasjonsøvelse som stretcher og klemmer brystmusklene i en bue-bevegelse. Perfekt finisher etter benkpress for maksimal brystuttmatting.', tips:['Bue-bevegelse som om du klemmer et tre','Lett bøy i albuen gjennom hele','Klem i toppen for max kontraksjon'], sett:3, reps:'12', hvile:'60s', animType:'raise', utforing:['Ligg på flatbenk med hantler over brystet, tomler mot hverandre','Hold en lett bøy i albuene gjennom hele bevegelsen','Senk armene ut til siden i en kontrollert bue','Stopp når du kjenner godt strekk i brystet','Bring armene tilbake i samme bue','Klem brystmusklene hardt øverst og hold 1 sek'] },
  { id:'dips', navn:'Bryst-dips', kategori:'bryst', muskelgruppe:'Pecs, triceps', vanskelighet:'Middels', utstyr:'Parallellstenger', sted:'begge', emoji:'⬇️', beskrivelse:'Tung kroppsvektøvelse for bryst og triceps. Lean fremover for mer brystaktivering, hold deg rett for mer triceps.', tips:['Len 30° fremover for bryst-fokus','Kontrollert ned til 90° i albuen','Press opp uten å låse albuene'], sett:3, reps:'10-12', hvile:'75s', animType:'press', utforing:['Grip stengene og hold deg opp med rette armer','Len overkroppen 15-30° fremover','Senk kroppen kontrollert ned','Stopp når albuen er ca 90°','Press opp til rette armer','Gjenta med kontrollert tempo'] },
  { id:'kabelpecfly', navn:'Kabel pec fly', kategori:'bryst', muskelgruppe:'Indre pecs', vanskelighet:'Middels', utstyr:'Kabelmaskin', sted:'gym', emoji:'🔀', beskrivelse:'Kabelen gir konstant motstand gjennom hele bevegelsen. Utmerket for å isolere og pumpe brystmusklene med jevn spenning fra bunn til topp.', tips:['Kabelen på eller litt over skulderhøyde','Bue ned og frem mot midjen','Klem hender i midten og hold 1 sek'], sett:3, reps:'12-15', hvile:'60s', animType:'raise', utforing:['Still kablene litt over skulderhøyde','Stå mellom maskinene med ett skritt frem','Grip håndtakene med undergrep eller nøytralt grep','Ta skuldrene bakover og brystet frem','Bring hendene ned og inn i en bue','Klem brystmusklene og hold 1 sekund','Kontroller rolig tilbake'] },
  { id:'inclineBenkpress', navn:'Incline benkpress', kategori:'bryst', muskelgruppe:'Øvre pecs, fremre deltoid', vanskelighet:'Middels', utstyr:'Vektstang + skrå benk', sted:'gym', emoji:'📐', beskrivelse:'Benken satt til 30-45°. Aktiverer det øvre brystet som er vanskelig å nå med flat benkpress. Et must for et balansert bryst.', tips:['30-45° – ikke mer, da overtar skuldrene','Samme teknikk som flat benkpress','Ikke la stangen sprette i brystet'], sett:4, reps:'8-10', hvile:'90s', animType:'press', utforing:['Still benken til 30-45°','Legg deg med øynene under stangen','Grip litt bredere enn skuldrene','Skulderblad inn og ned – lås dem','Senk stangen kontrollert mot øvre bryst','Berør lett og press opp eksplosivt','Gjenta uten å miste skulderblad-posisjonen'] },
  { id:'declinePushup', navn:'Decline push-up', kategori:'bryst', muskelgruppe:'Øvre pecs, skuldre', vanskelighet:'Middels', utstyr:'Stol eller sofa', sted:'hjemme', emoji:'🔼', beskrivelse:'Føttene på en stol, hendene i gulvet. Vinkelen aktiverer det øvre brystet på samme måte som incline benkpress – uten utstyr.', tips:['Føtter høyere enn skuldre','Kroppen fortsatt rett','Se ned mot gulvet'], sett:3, reps:'12-15', hvile:'60s', animType:'press', utforing:['Plasser hendene i gulvet, skulderbredde','Legg føttene opp på en stol eller sofa','Kroppen i rett linje fra hode til hæl','Senk brystet mot gulvet kontrollert','Stopp 2-3 cm fra gulvet','Press opp til nesten rette armer','Gjenta'] },
  { id:'diamondPushup', navn:'Diamond push-up', kategori:'bryst', muskelgruppe:'Indre pecs, triceps', vanskelighet:'Middels', utstyr:'Ingen', sted:'hjemme', emoji:'💎', beskrivelse:'Hendene formet som en diamant under brystet. Trener indre bryst og triceps intenst. God variasjon for hjemmetrening.', tips:['Hendene tett under brystet – diamantform','Albuer nær kroppen','Full bevegelsesbane'], sett:3, reps:'10-12', hvile:'60s', animType:'press', utforing:['Start i plankeposisjon','Plasser hendene tett sammen under brystet – tomler og pekefingre danner en diamant','Kroppen rett','Senk brystet ned mot hendene','Albuer peker litt ut til siden','Press opp til nesten rette armer','Gjenta'] },
  { id:'pikePushup', navn:'Pike push-up', kategori:'bryst', muskelgruppe:'Øvre pecs, skuldre, triceps', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🔺', beskrivelse:'Hoften høyt i luften som en omvendt V. Kombinerer skulderpresse med brystaktivering. God mellomsteg mot håndstående push-up.', tips:['Hoften høyt – V-form','Se bakover mot knærne','Albuer peker ut til siden'], sett:3, reps:'12', hvile:'60s', animType:'press', utforing:['Start i plankeposisjon','Gå med hendene litt bakover og løft hoften opp – V-form','Vekten er på skuldre og armer','Senk hodet mot gulvet mellom hendene','Albuer peker ut til siden','Press opp igjen','Gjenta'] },
  { id:'hantelBenkpress', navn:'Hantel benkpress', kategori:'bryst', muskelgruppe:'Pecs, triceps (uavhengig)', vanskelighet:'Nybegynner', utstyr:'Hantler + benk', sted:'gym', emoji:'🥊', beskrivelse:'Hantler gir friere bevegelse og aktiverer stabilisatorer mer enn stang. Bra for å rette opp styrkeforskjeller mellom sidene.', tips:['La hantlene møtes lett øverst','Roter litt innover øverst for klem','Kontrollert helt ned'], sett:4, reps:'10-12', hvile:'75s', animType:'press', utforing:['Ligg på flatbenk med hantler i hendene','Start med hantlene ved skuldrene, albuene ut til siden','Skulderblad inn og ned','Press hantlene opp og litt inn mot hverandre','La dem nesten møtes øverst','Senk kontrollert tilbake til skuldrene','Gjenta'] },
  { id:'pullup', navn:'Pull-up', kategori:'rygg', muskelgruppe:'Lats, biceps, bakre deltoid', vanskelighet:'Avansert', utstyr:'Pull-up stang', sted:'begge', emoji:'🤸', animType:'pull', sett:4, reps:'6-10', hvile:'2min', beskrivelse:'Kongen av ryggøvelser. Bredt overgrep aktiverer latissimus dorsi maksimalt. Trener nesten hele øvre rygg, biceps og core. Den beste øvelsen for å bygge en bred, V-formet rygg.', tips:['Full strekk i bunn mellom alle reps','Trekk albuer ned og bak – ikke bare armene','Ikke sving – kontrollert ned-fase','Skuldrene ned FØR du begynner'], utforing:['Grip stangen med bredt overgrep, litt bredere enn skuldrene','Heng med rette armer og avslappede skuldre','Trekk skuldrene ned og bakover som forberedelse','Trekk deg opp ved å fokusere på albuer ned mot hoftene','Haken over stangen i toppen','Senk kontrollert til full strekk','Gjenta uten momentum'] },
  { id:'markloft', navn:'Markløft', kategori:'rygg', muskelgruppe:'Hel rygg, glutes, hamstrings', vanskelighet:'Avansert', utstyr:'Vektstang', sted:'gym', emoji:'⚡', animType:'hinge', sett:4, reps:'5-6', hvile:'3min', beskrivelse:'Den ultimate styrkeøvelsen. Stangen på gulvet, over fotmidten. Bøy og grip med rett rygg, hofter bak. Løft ved å PRESSE GULVET NED – ikke trekk med ryggen. Ryggen MÅ holdes rett.', tips:['RYGGEN RETT – aldri rund rygg','Press gulvet ned med bena','Stangen glir langs bena hele veien','Pust inn dypt og stram core FØR du løfter'], utforing:['Stå med føttene hoftebredde, stangen over fotmidten','Bøy i hoften og knærne og grip stangen','Ryggen rett, hofter bak, bryst opp','Pust inn dypt og stram core hardt','Press gulvet ned med bena mens ryggen holder seg rett','Stangen glir langs leggen og låret opp','Lås hoften fullstendig øverst','Senk kontrollert tilbake langs samme bane'] },
  { id:'latpulldown', navn:'Lat pulldown', kategori:'rygg', muskelgruppe:'Lats, biceps', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', sted:'gym', emoji:'⬇️', animType:'pull', sett:3, reps:'10-13', hvile:'75s', beskrivelse:'God øvelse for å lære og isolere latissimus dorsi. Trekk stangen ned til øvre bryst, aldri bak nakken. Len deg 15° bakover for bedre lat-aktivering.', tips:['Len 15° bakover','Trekk albuer ned mot hoften','Full strekk i toppen mellom reps'], utforing:['Sett deg med lårene under puten','Grip stangen med bredt overgrep','Len 15° bakover med rett rygg','Trekk stangen ned mot øvre bryst','Fokus på å trekke albuene ned og bak','Klem lats i bunnen og hold 1 sek','Kontroller sakte tilbake til full strekk'] },
  { id:'hantelroing', navn:'Hantelroing', kategori:'rygg', muskelgruppe:'Øvre midtre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Hantel + benk', sted:'begge', emoji:'🚣', animType:'pull', sett:4, reps:'10×2', hvile:'60s', beskrivelse:'Unilateral øvelse som lar deg fokusere på riktig teknikk per side. Støtter én hånd og kne på benk for stabilitet, trekk hantelen opp langs kroppen.', tips:['Albuen opp og bak – ikke ut til siden','Ikke roter overkroppen','Klem skulderblad i toppen og hold 1 sek'], utforing:['Plasser én hånd og kne på benken','Grep hantelen med nøytralt grep (tommel opp)','La armen henge rett ned i startposisjon','Trekk hantelen opp ved å dra albuen opp og bak','Klem skulderblad i toppen','Senk langsomt tilbake til full strekk','Gjenta, bytt side'] },
  { id:'kabelsittende', navn:'Sittende kabelroing', kategori:'rygg', muskelgruppe:'Midtre rygg, rhomboids', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', sted:'gym', emoji:'🔙', animType:'pull', sett:4, reps:'10-12', hvile:'75s', beskrivelse:'Fantastisk for midtre rygg og rhomboidene. Smalt grep gir mer biceps-aktivering, bredt grep gir mer ryggfokus. Trekk inn mot navlen.', tips:['Klem skulderblad i slutten og hold 1 sek','Rett rygg hele veien','Albuen nær kroppen'], utforing:['Sett deg foran kabelmaskinen med bøyde knær','Grip håndtaket med nøytralt grep','Len lett fremover med rett rygg i startposisjon','Trekk håndtaket inn mot navlen','Klem skulderblad maksimalt','Hold 1 sekund','Kontroller rolig tilbake'] },
  { id:'tBarRoing', navn:'T-bar roing', kategori:'rygg', muskelgruppe:'Midtre rygg, lats, biceps', vanskelighet:'Middels', utstyr:'T-bar maskin', sted:'gym', emoji:'🔤', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Effektiv compound-roing som kombinerer lat-pull og roing. Gir stor volum i midtre rygg. Overkroppen ca 45° fremover.', tips:['Overkroppen 45° fremover','Klem skulderblad på toppen','Kontrollert ned – ikke slipp'], utforing:['Stå over t-bar stangen med bøyde knær','Overkroppen 45° fremover med rett rygg','Grip med smalt grep','Trekk stangen opp mot nedre bryst/magen','Klem skulderblad hardt i toppen','Senk kontrollert ned til nesten full strekk','Gjenta'] },
  { id:'faceDown', navn:'Ryggekstensjon', kategori:'rygg', muskelgruppe:'Erector spinae, glutes', vanskelighet:'Nybegynner', utstyr:'Ryggekstensjon benk', sted:'gym', emoji:'🌊', animType:'hinge', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer den nedre og midtre ryggen. Start med kroppsvekt, legg hantler foran brystet for progresjon. Svært viktig for rygghelse.', tips:['Ikke hyperekstend – stopp i nøytral','Klem glutes i toppen','Kontrollert ned'], utforing:['Legg deg i ryggekstensjonsmaskinen med hoften på puten','Armene krysset foran brystet eller bak nakken','Senk overkroppen ned kontrollert','Kom opp til nøytral rygg – ikke over','Klem glutes og erectors i toppen','Senk langsomt ned igjen','Gjenta'] },
  { id:'invertedRow', navn:'Invertert roing', kategori:'rygg', muskelgruppe:'Øvre rygg, rear delts, biceps', vanskelighet:'Nybegynner', utstyr:'Bord/stang lavt', sted:'begge', emoji:'🔄', animType:'pull', sett:3, reps:'10-15', hvile:'60s', beskrivelse:'Liggende under en stang eller bord, trekk brystet opp. God for nybegynnere på vei mot pull-ups. Lett tilgjengelig hjemme.', tips:['Kroppen rett fra hode til hæl','Trekk brystet til stangen','Jo mer horisontal kropp, jo vanskeligere'], utforing:['Legg deg under en stang eller et stabilt bord','Grip med skulderbredde overgrep','Kroppen rett – stram core og glutes','Trekk brystet opp mot stangen','Klem skulderblad i toppen','Senk kontrollert ned','Gjenta'] },
  { id:'sniptrekk', navn:'Face pull', kategori:'rygg', muskelgruppe:'Øvre bakre rygg, nakke', vanskelighet:'Middels', utstyr:'Kabelmaskin (høyt)', sted:'gym', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Styrker bakre deltoid, rotator cuff og øvre rygg. Essensielt for skulder- og rygghelse. Gjør dette konsekvent i hvert treningsprogram.', tips:['Albuer høyt – over skuldrene','Trekk til ansiktet og roter utover','Kontrollert tilbake'], utforing:['Still kabelen på øye- eller panne-nivå','Grip tauet med begge hender overgrep','Ta et skritt bakover for å skape spenning','Hold albuene høye gjennom hele','Trekk tauet mot panne/ansikt','Roter skuldrene utover i toppen','Kontroller rolig tilbake','Gjenta'] },
  { id:'pullover', navn:'Pullover', kategori:'rygg', muskelgruppe:'Lats, serratus, bryst', vanskelighet:'Middels', utstyr:'Hantel + benk', sted:'gym', emoji:'🌙', animType:'pull', sett:3, reps:'12', hvile:'60s', beskrivelse:'Unik øvelse som strekker og aktiverer lats og serratus. Lig tvers over benken med en hantel. Gir ekstrem strekk i lats.', tips:['Rett over hodet til hoften','Lett bøy i albuen','Strekk maksimalt bak hodet'], utforing:['Ligg tvers over en benk med øvre rygg på benken','Hold én hantel med begge hender over brystet','Lett bøy i albuene – hold den','Senk hantelen bakover og ned bak hodet i en bue','Strekk maksimalt – kjenner strekk i lats','Bring tilbake opp i en bue','Gjenta'] },
  { id:'kroppsvektRow', navn:'Kroppsvekt roing', kategori:'rygg', muskelgruppe:'Øvre rygg, biceps', vanskelighet:'Nybegynner', utstyr:'Bord', sted:'hjemme', emoji:'🪑', animType:'pull', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Bruk kanten av et stabilt bord som treningsutstyr. Legg deg under bordet og trekk brystet opp til bordkanten. Perfekt hjemmetrening.', tips:['Bordet er solid nok til å bære vekten','Kroppen rett','Trekk mot nedre bryst'], utforing:['Finn et stabilt bord','Legg deg under med ansiktet opp','Grep tak i bordkanten med skulderbredde','Kroppen rett fra hode til hæl','Trekk brystet opp mot bordkanten','Klem skulderblad i toppen','Senk kontrollert ned','Gjenta'] },
  { id:'stangRoing', navn:'Stang roing', kategori:'rygg', muskelgruppe:'Øvre og midtre rygg, biceps', vanskelighet:'Middels', utstyr:'Vektstang', sted:'gym', emoji:'🏗️', animType:'pull', sett:4, reps:'8-10', hvile:'90s', beskrivelse:'Klassisk compound-roing. Overkroppen ca 45° fremover, stangen trekkes til nedre mage. En av de beste øvelsene for ryggtykkelse.', tips:['Nøytral rygg – ikke rund','Trekk til magen, ikke brystet','Albuer nær kroppen'], utforing:['Stå med bøyde knær, overkroppen ca 45° fremover','Grip stangen med skulderbredde overgrep','Rett rygg – nøytral ryggrad','Trekk stangen opp mot nedre mage','Klem skulderblad i toppen','Senk kontrollert til nesten full strekk','Gjenta'] },
  { id:'knebøy', navn:'Knebøy', kategori:'bein', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Middels', utstyr:'Vektstang', sted:'gym', emoji:'🦵', animType:'squat', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Kongen av beinøvelser. Fundamental bevegelse som trener hele underkroppen og kjernen. Stangen på trapezius, skulderbredde, tær litt ut.', tips:['Bryst opp gjennom hele løftet','Knærne følger tærne – aldri innad','Ned til parallell eller dypere','Hælene i gulvet alltid'], utforing:['Plasser stangen på øvre trapezius, ikke nakken','Stå med skulderbredde, tær 30° ut','Pust inn dypt og stram core','Bøy i hofte og kne samtidig','Knærne følger tærne utover','Ned til låret er parallelt med gulvet eller dypere','Press gulvet ned og opp med hælene','Hoftene og skuldrene stiger i samme tempo'] },
  { id:'legpress', navn:'Legpress', kategori:'bein', muskelgruppe:'Quads, glutes', vanskelighet:'Nybegynner', utstyr:'Legpress maskin', sted:'gym', emoji:'🔧', animType:'squat', sett:4, reps:'10-15', hvile:'90s', beskrivelse:'Maskin-alternativ til knebøy. Tryggere for ryggen. Lar deg håndtere mer vekt uten balansekrav. God for å isolere quads og glutes.', tips:['Føtter skulderbredde på plata','ALDRI lås knærne fullt ut','Full bevegelsesbane','Ikke løft rumpa fra setet'], utforing:['Sett deg i maskinen med rett rygg mot puten','Plasser føttene skulderbredde midt på plata','Slipp sikringen og hold platen','Senk kontrollert til 90° i knærne','Press opp uten å låse knærne','Sett inn sikringen etter siste rep','Gjenta'] },
  { id:'rumMarkloeft', navn:'Rumensk markløft', kategori:'bein', muskelgruppe:'Hamstrings, glutes', vanskelighet:'Middels', utstyr:'Hantler/stang', sted:'begge', emoji:'🍑', animType:'hinge', sett:3, reps:'10-12', hvile:'90s', beskrivelse:'Eksepsjonell for hamstrings og glutes. Hold ryggen rett og len fremover til du kjenner strekk. Kom opp ved å klemme setemusklene. Hips bakover, ikke ned.', tips:['Rett rygg ALLTID','Hoften går bakover – ikke ned','Stopp ved strekk i hamstrings','Klem glutes øverst'], utforing:['Stå med hantler/stang foran lårene','Hoftene bakover – bøy lett i knærne','Len overkroppen fremover med RETT rygg','La vektene gli langs bena ned mot midten av leggen','Stopp når du kjenner tydelig strekk i hamstrings','Klem glutes og strekk hoften frem','Gjenta med kontrollert tempo'] },
  { id:'bulgarianSplit', navn:'Bulgarian split squat', kategori:'bein', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Avansert', utstyr:'Benk + hantler', sted:'begge', emoji:'🏔️', animType:'squat', sett:3, reps:'10×2', hvile:'90s', beskrivelse:'En av de mest effektive enbeinsøvelsene. Bakfoten på en benk, fremre foten langt nok frem til at fremre kne ikke går langt forbi tåen.', tips:['Bakfot på benk – toppen av foten','Fremre fot langt nok frem','Rett overkropp under hele løftet'], utforing:['Stå foran en benk med ryggen til','Plasser bakfoten på benken, toppen av foten ned','Fremre foten langt nok frem','Hold hantler ved siden','Senk bakkneet mot gulvet','Fremre lår parallelt med gulvet','Press opp gjennom fremre hæl','Gjenta, bytt ben'] },
  { id:'gluteBridge', navn:'Glute bridge', kategori:'bein', muskelgruppe:'Glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🌉', animType:'hinge', sett:4, reps:'15-20', hvile:'45s', beskrivelse:'Enkel men ekstremt effektiv øvelse for setemusklene. Ligg på ryggen og press hoften opp. Klem rumpa maksimalt i toppen og hold et øyeblikk.', tips:['Press gjennom hælen – ikke forfoten','Klem rumpa øverst med full kraft','Hold 1-2 sek øverst','Rett linje fra kne til skulder'], utforing:['Ligg på ryggen med bøyde knær, føtter flat i gulvet','Armer langs siden for stabilitet','Press hoftene opp ved å klemme glutes','Rett linje fra kne til skulder i toppen','Klem rumpa hardt og hold 1-2 sek','Senk langsomt ned igjen','Gjenta uten å la rumpa hvile i bunnen'] },
  { id:'lunges', navn:'Utfall', kategori:'bein', muskelgruppe:'Quads, glutes, hamstrings', vanskelighet:'Nybegynner', utstyr:'Ingen / hantler', sted:'begge', emoji:'🚶', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Funksjonell enbein-øvelse. Steg fremover med langt steg ned mot gulvet. Fremre kne over ankelen, bakre kne nesten i gulvet.', tips:['Rett overkropp','Fremre kne aldri foran tåen','Dyp nok – bakre kne nær gulvet'], utforing:['Stå oppreist med hantler ved siden','Ta et langt skritt fremover','Senk kroppen ned rett','Fremre kne over ankelen – ikke foran tåen','Bakre kne nesten i gulvet','Press opp gjennom fremre hæl tilbake til start','Bytt ben – gjenta'] },
  { id:'legCurl', navn:'Leg curl', kategori:'bein', muskelgruppe:'Hamstrings (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg curl maskin', sted:'gym', emoji:'🦿', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for hamstrings. Liggende eller sittende på maskin. Trekk hælen mot rumpa mot motstand.', tips:['Kontrollert ned – ikke slipp','Hold 1 sek i toppen','Full bevegelsesbane'], utforing:['Legg deg i maskinen med anklene under puten','Hoften mot puten – ikke løft den','Trekk hælene mot rumpa kontrollert','Klem hamstrings i toppen og hold 1 sek','Senk langsomt ned til nesten full strekk','Gjenta'] },
  { id:'legExtension', navn:'Leg extension', kategori:'bein', muskelgruppe:'Quadriceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Leg extension maskin', sted:'gym', emoji:'🦵', animType:'squat', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolerer quadriceps. Sett deg i maskinen og strekk bena rett ut. Bra finisher etter knebøy.', tips:['Ikke bruk for tung vekt – isolasjonsøvelse','Klem quads i toppen','Kontrollert ned – 3 sekunder'], utforing:['Sett deg i maskinen med ryggen mot puten','Anklene under den nedre puten','Legg deg bakover med rett rygg','Strekk bena ut til nesten rette','Klem quads hardt i toppen og hold 1 sek','Senk kontrollert ned på 3 sekunder','Gjenta'] },
  { id:'calfRaise', navn:'Tåhev', kategori:'bein', muskelgruppe:'Gastrocnemius, soleus', vanskelighet:'Nybegynner', utstyr:'Ingen / trapp', sted:'begge', emoji:'🦶', animType:'squat', sett:4, reps:'20-25', hvile:'45s', beskrivelse:'Press opp på tærne, hold øverst, senk kontrollert. Gjør på en trapp for full bevegelsesbane inkl. strekk i bunnen.', tips:['Full strekk ned – hælen under trappen','Hold 2 sek øverst','Langsom ned-fase for best effekt'], utforing:['Stå med forfoten på en trapp, hælen i luften','Hold i gelender for balanse','Senk hælen ned under trappen for full strekk','Press opp på tærne så høyt som mulig','Hold 2 sek øverst','Senk langsomt ned','Gjenta'] },
  { id:'sumoKnebøy', navn:'Sumo knebøy', kategori:'bein', muskelgruppe:'Indre lår, glutes, quads', vanskelighet:'Middels', utstyr:'Kettlebell/hantel', sted:'begge', emoji:'🤼', animType:'squat', sett:3, reps:'12', hvile:'75s', beskrivelse:'Bred stilling med tær pekende ut. Aktiverer indre lår og glutes mer enn vanlig knebøy. Hold en kettlebell eller hantel foran kroppen.', tips:['Bred stilling – tær 45° ut','Knærne følger tærne utover','Rett rygg og bryst opp'], utforing:['Stå med bred stilling, tær 45° ut','Hold kettlebell/hantel med begge hender foran kroppen','Bryst opp og rett rygg','Bøy knærne og hoften – knærne utover','Ned til lårene er parallelle','Press opp gjennom hæler','Gjenta'] },
  { id:'stepUp', navn:'Step-up', kategori:'bein', muskelgruppe:'Quads, glutes (unilateral)', vanskelighet:'Nybegynner', utstyr:'Kasse / benk', sted:'begge', emoji:'📦', animType:'squat', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Steg opp på en kasse eller benk. Bruk det fremre beinet – ikke dytt fra det bakre. Kontrollert ned.', tips:['Press gjennom fremre hæl','Full strekk i toppen','Kontrollert ned'], utforing:['Stå foran en kasse eller benk','Plasser fremre fot midt på kassen','Press deg opp gjennom fremre hæl','Stå rett opp i toppen','Senk bakfoten kontrollert ned','Gjenta, bytt ben'] },
  { id:'nordiskCurl', navn:'Nordisk curl', kategori:'bein', muskelgruppe:'Hamstrings (eksentrisk)', vanskelighet:'Avansert', utstyr:'Noe å holde ankler', sted:'begge', emoji:'🌊', animType:'hinge', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Eksentrisk trening av hamstrings. Holder ankler fast, senk kroppen forover så sakte som mulig. En av de mest effektive hamstring-øvelsene.', tips:['Senk veldig sakte – 5+ sekunder','Bruk hendene for å bryte fallet','Kjerneaktivering viktig'], utforing:['Kne i gulvet, ankler holdt fast av partner eller under noe tungt','Kroppen oppreist i startposisjon','Senk kroppen forover så sakte som mulig – 5-8 sekunder','Bruk hendene til å ta imot på gulvet','Push tilbake med hendene til startposisjon','Gjenta – ekstremt krevende'] },
  { id:'militaryPress', navn:'Military press', kategori:'skuldre', muskelgruppe:'Alle deltaider, triceps', vanskelighet:'Middels', utstyr:'Vektstang', sted:'gym', emoji:'⬆️', animType:'press', sett:4, reps:'8-10', hvile:'2min', beskrivelse:'Stående skulderpressøvelse med stang. Rekrutterer hele kroppen til stabilisering. Stam core og ikke len bakover.', tips:['Stram core – ikke len bakover','Stangen fra haken til over hodet','Ikke lås albuene i toppen','Pust inn ned, ut opp'], utforing:['Stå med skulderbredde og stram core hardt','Grip stangen litt bredere enn skuldrene','Stangen på øvre bryst ved haken','Pust inn og press opp over hodet','Trekk hodet litt bakover mens stangen passerer ansiktet','Lås ikke albuene i toppen','Senk kontrollert til haken','Gjenta'] },
  { id:'hantelSkuldPress', navn:'Hantelpress', kategori:'skuldre', muskelgruppe:'Alle deltaider', vanskelighet:'Nybegynner', utstyr:'Hantler', sted:'begge', emoji:'💺', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Sittende eller stående hantelpress gir uavhengig bevegelse for hver arm. Avslører og korrigerer styrkeforskjeller. Mer skuldervennlig enn stangpress.', tips:['Pust ut øverst','Albuene 90° i bunn','Kontrollert ned-fase'], utforing:['Sett deg på en benk med ryggstøtte','Hantler på skulderbredde ved ørene','Albuene 90° og parallelt med skuldrene','Press hantlene opp over hodet','Bring dem lett inn mot hverandre øverst','Senk kontrollert tilbake','Gjenta'] },
  { id:'sidehev', navn:'Sidehev', kategori:'skuldre', muskelgruppe:'Lateral deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler', sted:'begge', emoji:'🔼', animType:'raise', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for de laterale deltoidhodene. Gir bred skulderform. Løft til skulderbredde – høyere er unødvendig.', tips:['Løft MAKS til skulderhøyde','Lett bøy i albuen gjennom hele','Lillefingrene litt høyere enn tomler'], utforing:['Stå rett med hantler ved siden','Lett bøy i albuene – hold den','Løft armene ut til siden i en bue','Stopp ved skulderhøyde','Lillefingrene litt høyere enn tomler','Senk kontrollert ned','Gjenta – lav vekt, høy kvalitet'] },
  { id:'facePull', navn:'Face pull', kategori:'skuldre', muskelgruppe:'Bakre deltoid, rotator cuff', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', sted:'gym', emoji:'🎯', animType:'pull', sett:3, reps:'15-20', hvile:'45s', beskrivelse:'Viktig øvelse for skulderhelsa. Styrker bakre deltoid og rotator cuff. Bør inkluderes i alle treningsprogrammer.', tips:['Kabelen på øyenivå eller høyere','Albuer HØYT – over skuldrene','Trekk til ansiktet og roter ut'], utforing:['Still kabelen på øyenivå','Grip tauet med begge hender','Ta et skritt bakover for spenning','Hold albuene høye gjennom hele','Trekk tauet mot ansiktet/ørene','Roter skuldrene ut i toppen','Kontroller rolig tilbake','Gjenta'] },
  { id:'frontHev', navn:'Fronthev', kategori:'skuldre', muskelgruppe:'Fremre deltoid', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', sted:'begge', emoji:'⬆️', animType:'raise', sett:3, reps:'12', hvile:'60s', beskrivelse:'Isolerer fremre deltahodet. Løft rett fremover til skulderbredde. Enkel men effektiv.', tips:['Rett arm eller svak bøy','Ikke sving fra kroppen','Stopp ved skulderbredde'], utforing:['Stå rett med hantler foran lårene','Lett bøy i albuene','Løft én arm rett fremover','Stopp ved skulderhøyde','Senk kontrollert','Bytt arm eller gjør begge samtidig'] },
  { id:'bakHev', navn:'Omvendt flyes', kategori:'skuldre', muskelgruppe:'Bakre deltoid, rhomboids', vanskelighet:'Nybegynner', utstyr:'Hantler', sted:'begge', emoji:'🦅', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Bend framover ca 45-90°, løft hantlene ut til siden. Aktiverer bakre deltoid og øvre rygg. Viktig for holdning.', tips:['Bøy fremover – ikke stå rett','Løft albuene – ikke hendene','Klem skulderblad i toppen'], utforing:['Stå med bøyde knær, overkroppen 45-90° fremover','Hantler henger ned foran kroppen','Lett bøy i albuene','Løft armene ut til siden i en bue','Stopp når overarmene er parallelt med gulvet','Klem skulderblad i toppen','Senk kontrollert ned'] },
  { id:'skulderRotasjon', navn:'Ekstern rotasjon', kategori:'skuldre', muskelgruppe:'Rotator cuff', vanskelighet:'Nybegynner', utstyr:'Lett hantel / band', sted:'begge', emoji:'🔄', animType:'curl', sett:3, reps:'15', hvile:'30s', beskrivelse:'Rehabiliteringsøvelse for rotator cuff. Essensiell for langsiktig skulderhelsa. Bruk VELDIG lett vekt – dette er ikke en styrkeøvelse.', tips:['Albuen fast ved siden','Bare underarmen beveger seg','Aldri rush – alltid kontrollert'], utforing:['Stå eller sitt med albuen 90° mot siden','Underarmen peker fremover (intern rotasjon posisjon)','Hold lett hantel','Roter underarmen utover (ekstern rotasjon)','Stopp når underarmen er ca parallelt med gulvet','Roter tilbake kontrollert','Gjenta'] },
  { id:'arnoldPress', navn:'Arnold press', kategori:'skuldre', muskelgruppe:'Alle deltaider (rotasjon)', vanskelighet:'Middels', utstyr:'Hantler', sted:'begge', emoji:'💪', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Oppfunnet av Arnold Schwarzenegger. Starter med hantler foran ansiktet og roterer ut mens du presser opp. Trener alle deltoidhoder.', tips:['Roter sakte og kontrollert','Full rotasjon gjennom hele bevegelsen','God for skuldervolum'], utforing:['Sett deg med hantler foran ansiktet, håndflatene mot deg','Press opp mens du roterer hantlene utover','I toppen er håndflatene fremover som vanlig skulderpresse','Senk ned og roter tilbake til startposisjon','Gjenta sakte og kontrollert'] },
  { id:'uprekkRoing', navn:'Upright roing', kategori:'skuldre', muskelgruppe:'Lateral deltoid, trapezius', vanskelighet:'Middels', utstyr:'Stang / kabel', sted:'gym', emoji:'⬆️', animType:'pull', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Trekk stangen rett opp langs kroppen til haken. Aktiverer lateral deltoid og trapezius.', tips:['Bredt grep er snillest for skuldre','Albuer høyere enn hender','Ikke over haken'], utforing:['Grip stangen med skulderbredde overgrep','Stå oppreist med stangen foran lårene','Trekk stangen rett opp langs kroppen','Albuene leder – er alltid høyere enn hendene','Stopp ved haken','Senk kontrollert ned','Gjenta'] },
  { id:'skrapshrug', navn:'Skuldertrekk', kategori:'skuldre', muskelgruppe:'Trapezius', vanskelighet:'Nybegynner', utstyr:'Hantler / stang', sted:'begge', emoji:'🤷', animType:'raise', sett:3, reps:'15', hvile:'45s', beskrivelse:'Trekk skuldrene rett opp mot ørene. Isolerer trapezius. Hold øverst for best aktivering.', tips:['Trekk rett opp – ikke roter','Hold 1-2 sek øverst','Kontrollert ned'], utforing:['Stå med hantler/stang ved siden eller foran','Rette armer, avslappede skuldre i start','Trekk skuldrene rett opp mot ørene','Ikke roter – rett bevegelse','Hold øverst 1-2 sek','Senk kontrollert ned','Gjenta'] },
  { id:'bicepsCurl', navn:'Biceps curl', kategori:'bicep', muskelgruppe:'Biceps brachii', vanskelighet:'Nybegynner', utstyr:'Hantler eller stang', sted:'begge', emoji:'💪', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Klassisk bicepsøvelse. Stå rett med hantler (undergrep) og curl opp. Albuen forblir FAST ved siden. Ingen sving med overkroppen.', tips:['Albuen fast ved siden – dette er dreiepunktet','Ingen sving – bruk biceps, ikke ryggen','Klem biceps hardt i toppen'], utforing:['Stå rett med hantler i hendene, undergrep','Albuene fast ved siden av kroppen','Curl hantlene opp mot skuldrene','Klem biceps hardt i toppen og hold 1 sek','Senk kontrollert ned til full strekk','Gjenta uten momentum'] },
  { id:'hammerCurl', navn:'Hammer curl', kategori:'bicep', muskelgruppe:'Brachialis, underarm', vanskelighet:'Nybegynner', utstyr:'Hantler', sted:'begge', emoji:'🔨', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Nøytralt grep-curl som primært trener brachialis – muskelen under biceps. Bygger tykkere arm-profil.', tips:['Tommel peker opp gjennom hele','Albuen fast ved siden','God for arm-tykkelse'], utforing:['Stå rett med hantler, nøytralt grep (tommel opp)','Albuene fast ved siden','Curl hantlene opp – tommel peker mot skulderen','Klem i toppen og hold 1 sek','Senk kontrollert til full strekk','Gjenta'] },
  { id:'preacherCurl', navn:'Preacher curl', kategori:'bicep', muskelgruppe:'Biceps (kort hode)', vanskelighet:'Middels', utstyr:'EZ-stang + preacher benk', sted:'gym', emoji:'🙏', animType:'curl', sett:3, reps:'10-12', hvile:'60s', beskrivelse:'Preacher benken eliminerer all mulighet for å jukse. Armene er fastlåst – kun biceps kan jobbe. Utmerket for isolasjon og biceps-topp.', tips:['Full strekk i bunn – viktig for kort hode','Langsom ned-fase – 3 sek','Ikke hyperekstend i bunn'], utforing:['Sett ved preacher benken med armene på puten','Grip EZ-stangen med undergrep','La armene henge med lett bøy i bunnen','Curl opp til full kontraksjon','Klem biceps i toppen','Senk VELDIG langsomt tilbake – 3 sek','Full strekk i bunn mellom reps'] },
  { id:'konsentrertCurl', navn:'Konsentrert curl', kategori:'bicep', muskelgruppe:'Biceps (topp-isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', sted:'begge', emoji:'🎯', animType:'curl', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Sett ned, albuen mot innsiden av låret. Ultimat isolasjonsøvelse for biceps-topp. Ingen mulighet for å jukse.', tips:['Albuen mot låret – fast','Klem hardt i toppen','Langsom og kontrollert'], utforing:['Sett deg på en benk','Grip hantelen og plasser albuen mot innsiden av låret','La armen henge med full strekk i start','Curl opp mot skulderen','Klem biceps hardt i toppen','Senk langsomt tilbake','Gjenta, bytt arm'] },
  { id:'kabelbicep', navn:'Kabel biceps curl', kategori:'bicep', muskelgruppe:'Biceps (konstant spenning)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', sted:'gym', emoji:'🔁', animType:'curl', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabelen gir konstant spenning gjennom hele bevegelsen, noe frivekter ikke gjør. Spesielt effektivt i topp og bunn.', tips:['Albuen fast','Hold spenningen i bunn – kabelen strekker','Superset med hantel curl'], utforing:['Still kabelen lavt','Grip med undergrep','Stå litt unna for å skape spenning','Albuene fast ved siden','Curl opp mot skuldrene','Klem i toppen','Senk kontrollert mot full strekk'] },
  { id:'inclineCurl', navn:'Incline curl', kategori:'bicep', muskelgruppe:'Biceps (langt hode – strekk)', vanskelighet:'Middels', utstyr:'Hantler + skrå benk', sted:'gym', emoji:'📐', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Liggende på en skrå benk strekker det lange hodet maksimalt. Gir ekstra dybde og topp i biceps.', tips:['La armene henge bak kroppen','Strekk maksimalt i bunn','Curl opp uten å endre benk-kontakt'], utforing:['Still benken til 45-60°','Ligg med ryggen mot benken, hantler i hendene','La armene henge rett ned og bak','Full strekk i biceps i startposisjon','Curl opp mot skuldrene','Klem i toppen','Senk langsomt tilbake til full strekk'] },
  { id:'reversCurl', navn:'Revers curl', kategori:'bicep', muskelgruppe:'Brachioradialis, underarm', vanskelighet:'Nybegynner', utstyr:'Stang / hantler', sted:'begge', emoji:'🔃', animType:'curl', sett:3, reps:'12', hvile:'60s', beskrivelse:'Overgrep-curl (håndflaten ned) for underarmer og brachioradialis. Bra for å balansere armene og styrke håndledd.', tips:['Litt lettere vekt enn vanlig curl','Albuen fast','Langsom og kontrollert'], utforing:['Grip stangen/hantlene med overgrep (håndflaten ned)','Albuene fast ved siden','Curl opp mot skuldrene','Klem i toppen','Senk langsomt til full strekk','Gjenta'] },
  { id:'zottmanCurl', navn:'Zottman curl', kategori:'bicep', muskelgruppe:'Biceps + underarm kombinert', vanskelighet:'Middels', utstyr:'Hantler', sted:'begge', emoji:'🌀', animType:'curl', sett:3, reps:'10', hvile:'60s', beskrivelse:'Curl opp med undergrep (biceps), roter til overgrep (underarm) og senk ned. Trener alt i én bevegelse.', tips:['Curl opp – roter – senk ned sakte','3 sekunder ned','Lett vekt – teknikk viktigst'], utforing:['Start med hantler, undergrep','Curl opp til toppen som vanlig curl','Roter hantlene til overgrep i toppen','Senk ned langsomt med overgrep – 3 sek','Roter tilbake til undergrep i bunnen','Gjenta'] },
  { id:'tricepsPushdown', navn:'Triceps pushdown', kategori:'tricep', muskelgruppe:'Triceps brachii', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin', sted:'gym', emoji:'📉', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Isolasjonsøvelse for triceps med kabel. Hold albuene FAST ved siden. Press ned til armene er rette og klem triceps.', tips:['Albuer fast og nær kroppen','Klem triceps helt ned','Kontrollert opp – ikke slipp'], utforing:['Still kabelen øverst','Grip tauet/stangen med overgrep','Albuene fast ved siden, 90° start','Press ned til armene er helt rette','Klem triceps hardt i bunnen','Kontroller sakte opp til 90°','Gjenta'] },
  { id:'skullCrusher', navn:'Skull crushers', kategori:'tricep', muskelgruppe:'Triceps (alle hoder)', vanskelighet:'Middels', utstyr:'EZ-stang + benk', sted:'gym', emoji:'💀', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Effektiv isolasjon for alle triceps-hoder. Ligg på benk, senk stangen mot pannen med kun albuene bøyet.', tips:['KUN albuene bøyer – skuldrene er stille','Senk mot panna/hodet','EZ-stang er kinder mot håndledd'], utforing:['Ligg flat på benk med stang over brystet, smalt grep','Albuene peker mot taket','Bøy KUN albuene og senk stangen mot pannen','Stopp like over pannen','Press opp til rette armer','Skuldrene beveger seg ikke – bare albuene','Gjenta'] },
  { id:'overheadExt', navn:'Overhead ext.', kategori:'tricep', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Middels', utstyr:'Hantel', sted:'begge', emoji:'⬆️', animType:'pushdown', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Trener det lange triceps-hodet best fordi det strekkes over skulderleddet. Hold én hantel med begge hender over hodet og senk bak hodet.', tips:['Albuene nær hodet – pek mot taket','Full strekk opp er nøkkelen','Kontrollert ned-fase bak hodet'], utforing:['Hold én hantel med begge hender over hodet','Albuene peker mot taket','Bøy albuene og senk hantelen bak hodet','Stopp ved ca 90° i albuene','Press opp til rette armer','Albuene beveger seg ikke – kun underarmene','Gjenta'] },
  { id:'tricepsDips', navn:'Benk dips', kategori:'tricep', muskelgruppe:'Triceps', vanskelighet:'Nybegynner', utstyr:'Stol / benk', sted:'begge', emoji:'🪑', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hender på kanten av en stol, bena ut foran deg. Senk kroppen ned og press opp. Enkel og effektiv hjemmeøvelse.', tips:['Hender skulderbredde','Ryggen nær stolen','Kontrollert ned til 90°'], utforing:['Sett hendene på kanten av en stol/benk, skulderbredde','Bena strake foran deg, hæler i gulvet','Senk kroppen ned ved å bøye albuene','Stopp ved 90°','Press opp til nesten rette armer','Gjenta'] },
  { id:'closegripPress', navn:'Smalt grep benkpress', kategori:'tricep', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Middels', utstyr:'Vektstang + benk', sted:'gym', emoji:'🤝', animType:'press', sett:3, reps:'10-12', hvile:'75s', beskrivelse:'Samme som benkpress men med smalt grep (skulderbredde). Primært triceps, sekundært bryst.', tips:['Smalt grep – skulderbredde, ikke smalere','Albuer nær kroppen under presset','Kontrollert ned'], utforing:['Ligg på flatbenk','Grip stangen med skulderbredde grep (smalt)','Skulderblad inn og ned','Senk stangen kontrollert til nedre bryst','Albuer nær kroppen hele veien','Press opp – triceps jobber primært','Gjenta'] },
  { id:'kabeloverhead', navn:'Kabel overhead ext.', kategori:'tricep', muskelgruppe:'Triceps (langt hode)', vanskelighet:'Nybegynner', utstyr:'Kabelmaskin (lavt)', sted:'gym', emoji:'🔗', animType:'pushdown', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Kabel bakfra over hodet. Konstant spenning på triceps, spesielt det lange hodet gjennom hele bevegelsen.', tips:['Albuer fast ved hodet','Tøy godt i bunn','Klem i full strekk'], utforing:['Still kabelen lavt, grip tauet','Vend ryggen til maskinen','Hold tauet over hodet med bøyde albuer','Albuene peker mot taket og er faste','Press opp til full strekk','Senk kontrollert ned og tøy godt','Gjenta'] },
  { id:'pushupSmalt', navn:'Push-up smalt grep', kategori:'tricep', muskelgruppe:'Triceps, indre bryst', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🙌', animType:'press', sett:3, reps:'12-15', hvile:'60s', beskrivelse:'Hendene skulderbredde eller smalere. Albuer nær kroppen hele veien. Primært triceps, sekundært bryst.', tips:['Albuer nær kroppen – ikke utover','Hendene rett under skuldrene','Kroppen rett'], utforing:['Start i plankeposisjon','Hendene skull derbredde eller smalere','Senk brystet ned med albuer nær kroppen','Albuer peker bakover, ikke utover','Stopp 2-3 cm fra gulvet','Press opp','Gjenta'] },
  { id:'kickback', navn:'Triceps kickback', kategori:'tricep', muskelgruppe:'Triceps (isolasjon)', vanskelighet:'Nybegynner', utstyr:'Hantel', sted:'begge', emoji:'🦵', animType:'pushdown', sett:3, reps:'12×2', hvile:'45s', beskrivelse:'Bøy fremover, overarmen parallell med gulvet og strekk armen bak. Perfekt isolasjon av triceps uten kabelmaskin.', tips:['Overarmen parallell med gulvet – stabil','Bare underarmen beveger seg','Klem triceps i full strekk'], utforing:['Bøy overkroppen fremover ca 45°','Grip hantelen, albuen bøyd 90°','Overarmen parallell med gulvet','Strekk armen rett bak til full strekk','Klem triceps hardt i toppen','Senk kontrollert tilbake','Gjenta, bytt arm'] },
  { id:'planke', navn:'Planke', kategori:'core', muskelgruppe:'Transversus abdominis, erectors', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'begge', emoji:'🧘', animType:'plank', sett:3, reps:'45 sek', hvile:'45s', beskrivelse:'Statisk kjerneøvelse som aktiverer HELE core inkludert dype stabilisatorer. Kroppen rett som planke fra hode til hæl.', tips:['Stram ALT – mage, rumpe og lår','Hoften verken opp eller ned','Pust normalt gjennom hele'], utforing:['Start på underarmene med albuene under skuldrene','Tærne i gulvet','Press kroppen opp til rett linje fra hode til hæl','Stram magen, rumpen og lårene maksimalt','Hoften verken opp eller ned','Hold posisjonen og pust normalt','Øk tid gradvis'] },
  { id:'crunches', navn:'Crunches', kategori:'core', muskelgruppe:'Rectus abdominis', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🔄', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Isolasjonsøvelse for rette magemuskler. KRØLL overkroppen opp – ikke løft hele ryggen. Hendene ved tinningene, ikke bak nakken.', tips:['Krøll – ikke hev hele ryggen','Hender ved tinningene – aldri bak nakken','Fokus på å krølle magen, ikke nakken'], utforing:['Ligg på ryggen, knær bøyd, føtter flat','Hender lett ved tinningene','Krøll kun overkroppen opp ved å kontrahere magen','Skulderblad forlater gulvet – ikke korsryggen','Hold 1 sek øverst','Senk langsomt tilbake','Gjenta'] },
  { id:'legRaises', navn:'Legheving', kategori:'core', muskelgruppe:'Nedre mage, hoftefleksorer', vanskelighet:'Middels', utstyr:'Ingen / pull-up stang', sted:'begge', emoji:'⬆️', animType:'crunch', sett:3, reps:'15', hvile:'60s', beskrivelse:'Effektiv for nedre mage og hoftebøyere. Ligg på ryggen, press korsryggen mot gulvet og løft bena opp.', tips:['Press korsryggen mot gulvet','Senk bena sakte uten å treffe gulvet','Rette bein er vanskeligere – bøy lett hvis nødvendig'], utforing:['Ligg på ryggen, armer langs siden','Press korsryggen mot gulvet og hold','Løft bena rett opp til 90°','Senk kontrollert ned','Stopp 2-3 cm fra gulvet','Gjenta uten å slippe ryggen opp fra gulvet'] },
  { id:'russianTwist', navn:'Russian twist', kategori:'core', muskelgruppe:'Obliques', vanskelighet:'Middels', utstyr:'Medisinball (valgfritt)', sted:'hjemme', emoji:'🔃', animType:'crunch', sett:3, reps:'20', hvile:'45s', beskrivelse:'Rotasjonsøvelse for de skrå magemusklene. Løft føttene for mer utfordring. Roter fra midjen, ikke skuldrene.', tips:['Roter fra midjen – ikke skuldrene','Løft bena for økt vanskelighet','Med vekt/ball gjør det tyngre'], utforing:['Sett deg med bøyde knær, lår 45° fra gulvet','Løft føttene fra gulvet (hardere) eller hold dem nede','Lean lett bakover med rett rygg','Roter overkroppen til høyre, berør gulvet','Roter til venstre','Gjenta raskt men kontrollert'] },
  { id:'mountainClimber', navn:'Fjellklatrere', kategori:'core', muskelgruppe:'Core, hoftefleksorer, cardio', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'⛰️', animType:'run', sett:3, reps:'30 sek', hvile:'30s', beskrivelse:'Plankeposisjon, kjør knærne frem og tilbake i høyt tempo. Cardio og core kombinert i én øvelse.', tips:['Hoften nede – ikke dytt opp','Rask og eksplosiv','Armene rette'], utforing:['Start i plankeposisjon med rette armer','Hoftene nede – ikke i luften','Trekk høyre kne mot brystet raskt','Bytt til venstre kne i samme bevegelse','Veksle raskt som løping','Gjenta i ønsket tid'] },
  { id:'abWheel', navn:'Ab wheel', kategori:'core', muskelgruppe:'Hele kjerne, skulder, rygg', vanskelighet:'Avansert', utstyr:'Ab wheel', sted:'begge', emoji:'⚙️', animType:'plank', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Ekstremt effektiv kjerneøvelse. Rull ut fra knærne, hold rygg rett, rull tilbake med magen.', tips:['Start fra knærne','Rygg ALDRI rund','Ikke rull lenger enn du klarer å komme tilbake kontrollert'], utforing:['Kne i gulvet med ab-wheel foran','Rull hjulet fremover sakte','Hoften synker ned – kroppen nesten parallelt med gulvet','Rygg nøytral – ikke rund','Bruk core til å rulle tilbake','Gjenta – krevende'] },
  { id:'sidefplanke', navn:'Sideplanke', kategori:'core', muskelgruppe:'Obliques, hofteabduktorer', vanskelighet:'Middels', utstyr:'Ingen', sted:'hjemme', emoji:'↔️', animType:'plank', sett:3, reps:'30s×2', hvile:'45s', beskrivelse:'Planke på siden. Stram obliques og hold hoften opp. Roter ned og opp for bevegelsesvariant.', tips:['Hoften rett opp – ikke la den falle','Stram obliques aktivt','Legg arm mot gulv for lettere variant'], utforing:['Ligg på siden med underarmen i gulvet','Albuen under skulderen','Løft hoften opp til rett linje','Stram obliques aktivt','Hold posisjonen stabilt','Senk hoften nesten til gulvet for bevegelsesvariant','Gjenta, bytt side'] },
  { id:'dragonFlag', navn:'Dragon flag', kategori:'core', muskelgruppe:'Hele kjerne (avansert)', vanskelighet:'Avansert', utstyr:'Benk / gulv', sted:'begge', emoji:'🐉', animType:'crunch', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Oppfunnet av Bruce Lee. Lig på rygg, hold fast bak hodet, løft kroppen som en rett linje. Ekstremt krevende.', tips:['Kroppen MÅ holdes rett','Senk ekstremt sakte – 4-6 sek','Bygg med benbøy-variant først'], utforing:['Ligg på en benk, hold tak i benkens kant bak hodet','Løft kroppen opp til vertikal posisjon (eller til du klarer)','Kroppen i rett linje – nøytral rygg','Senk sakte ned – ta 4-6 sekunder','Stopp rett over benken','Løft tilbake opp','Gjenta – bygg fra benbøy-variant'] },
  { id:'toeToBar', navn:'Tå til stang', kategori:'core', muskelgruppe:'Rectus abdominis, hoftefleksorer', vanskelighet:'Avansert', utstyr:'Pull-up stang', sted:'gym', emoji:'🏹', animType:'crunch', sett:3, reps:'8-12', hvile:'90s', beskrivelse:'Heng fra en stang og løft tærne opp til stangen. Krever både styrke og fleksibilitet.', tips:['Kontroller pendelbevegelsen','Trekk knærne opp først om for vanskelig','Hold spenningen i kjernen'], utforing:['Heng fra pull-up stang med overgrep','Rette armer, avslappede skuldre','Stram core og trekk knærne opp mot brystet','Videreføre til tærne rør stangen','Senk kontrollert ned','Gjenta'] },
  { id:'pallofPress', navn:'Pallof press', kategori:'core', muskelgruppe:'Anti-rotasjon, obliques', vanskelighet:'Middels', utstyr:'Kabelmaskin', sted:'gym', emoji:'🚫', animType:'press', sett:3, reps:'12×2', hvile:'60s', beskrivelse:'Anti-rotasjonsøvelse. Stå siden av kabelen, hold ved brystet og press fremover – motstå rotasjon. Trener core funksjonelt.', tips:['Hoftene og skuldrene holdes fremover','Motstå rotasjonen aktivt','Øk vekt når det ikke utfordrer'], utforing:['Stå siden av kabelmaskinen, kabel på brysthøyde','Grip håndtaket med begge hender mot brystet','Stram core hardt','Press hendene rett fremover','Hold posisjonen – motstå kabelen som vil rotere deg','Bring tilbake til brystet','Gjenta, bytt side'] },
  { id:'burpees', navn:'Burpees', kategori:'fullkropp', muskelgruppe:'Full kropp, kardio', vanskelighet:'Middels', utstyr:'Ingen', sted:'begge', emoji:'🔥', animType:'squat', sett:4, reps:'10', hvile:'60s', beskrivelse:'Full-kropp kondisjoneringsøvelse som kombinerer push-up, squat og hopp. Ekstremt effektiv. Teknisk korrekthet viktigere enn fart.', tips:['Teknisk korrekt > fart','Land mykt i knærne','Stram core i plankeposisjon'], utforing:['Start stående','Squat ned og plasser hender i gulvet','Hopp ut til plankeposisjon','Gjør én push-up','Hopp inn igjen med bena','Eksplodér opp og hopp med hendene over hodet','Land mykt – gjenta'] },
  { id:'kettlebellSwing', navn:'Kettlebell swing', kategori:'fullkropp', muskelgruppe:'Posterior chain, cardio', vanskelighet:'Middels', utstyr:'Kettlebell', sted:'begge', emoji:'🔔', animType:'hinge', sett:4, reps:'15', hvile:'60s', beskrivelse:'HIP HINGE – ikke squat! Kraften kommer fra hoften. Stå med brede bein. Kettlebell svinger mellom bena og frem til skulderhøyde.', tips:['HIP HINGE – ikke bøy knærne mye','Eksplosiv hofteextension er kraften','Klem gluteus hardt i toppen'], utforing:['Stå med brede bein, kettlebell mellom bena','Hofteheng – bøy hoften bakover (ikke ned)','La kettlebellen svinge mellom bena','Eksplosivt snap hoften frem og stå rett','Armene svinger opp til skulderhøyde av momentum','Bøy hoften og la den svinge tilbake','Gjenta med rytmisk kraft'] },
  { id:'thrusters', navn:'Thrusters', kategori:'fullkropp', muskelgruppe:'Bein + skuldre kombinert', vanskelighet:'Avansert', utstyr:'Hantler', sted:'begge', emoji:'🚀', animType:'squat', sett:3, reps:'10', hvile:'90s', beskrivelse:'Kombinerer front squat og skulderpresse i én flytende bevegelse. Ekstremt effektivt og krevende for kondisjon og full-kropp styrke.', tips:['Flytende bevegelse – bein driver pressen','Start med lett vekt og lær teknikken','Pust ut øverst i pressen'], utforing:['Hold hantler ved skuldrene','Squat ned med rett rygg','Eksplodér opp fra squaten','Bruk momentumet til å presse hantlene overhead','Full press i toppen','Senk hantlene tilbake til skuldrene','Squat ned igjen – gjenta som én bevegelse'] },
  { id:'manMaker', navn:'Man maker', kategori:'fullkropp', muskelgruppe:'Hele kroppen', vanskelighet:'Avansert', utstyr:'Hantler', sted:'begge', emoji:'🦾', animType:'squat', sett:3, reps:'6-8', hvile:'2min', beskrivelse:'Hantelroing, push-up, clean og press i én bevegelse. En av de mest krevende øvelsene som finnes. Teknisk korrekthet er avgjørende.', tips:['Ta det rolig – teknikk er kritisk','Roing → push-up → clean → press','Bruk lett vekt de første gangene'], utforing:['Stå med hantler i hendene','Bøy ned til plankeposisjon med hantlene i gulvet','Utfør én hantelroing med høyre arm','Utfør én hantelroing med venstre arm','Gjør én push-up','Hopp inn med bena (clean-posisjon)','Clean hantlene til skuldrene','Press overhead – ett rep fullført'] },
  { id:'turkishGetup', navn:'Turkish get-up', kategori:'fullkropp', muskelgruppe:'Full kropp, skulder stabilitet', vanskelighet:'Avansert', utstyr:'Kettlebell / hantel', sted:'begge', emoji:'🧗', animType:'press', sett:2, reps:'5×2', hvile:'2min', beskrivelse:'Fra liggende til stående med en kettlebell strakt over hodet. Trener mobilitet, stabilitet og styrke. Blikket alltid på kettlebellen.', tips:['Blikket alltid på kettlebellen','7 trinn – lær hvert steg','Lett vekt for å lære teknikk'], utforing:['Ligg på ryggen med kettlebell strakt over deg','Bøy kneet på samme side som kettlebellen','Press deg opp på fri albue','Kom opp på fri hånd (strak arm)','Løft hoften og sving bakbenet under','Kom i halvknelende posisjon','Reis deg til stående','Reverser alle steg tilbake til gulvet'] },
  { id:'boxJump', navn:'Box jump', kategori:'fullkropp', muskelgruppe:'Quads, glutes, plyo', vanskelighet:'Middels', utstyr:'Plyo-kasse', sted:'gym', emoji:'📦', animType:'squat', sett:4, reps:'8', hvile:'90s', beskrivelse:'Eksplosivt hopp opp på en kasse. Trener eksplosiv kraft og kondisjon. Land mykt med bøyde knær.', tips:['Sving armer for momentum','Land mykt – bend knærne','Stig ned kontrollert – ikke hopp ned'], utforing:['Stå foran kassen, skulderbredde','Squat lett og sving armene bak','Eksplodér opp – sving armene fremover og opp','Land mykt på kassen med bøyde knær','Stå oppreist i toppen','Stig ned kontrollert (ikke hopp ned)','Gjenta'] },
  { id:'battleRopes', navn:'Battle ropes', kategori:'fullkropp', muskelgruppe:'Skuldre, armer, core, cardio', vanskelighet:'Middels', utstyr:'Battle ropes', sted:'gym', emoji:'🌊', animType:'run', sett:4, reps:'30 sek', hvile:'30s', beskrivelse:'Alternerende eller dobble bølger med kraftige tau. Fantastisk for kondisjon og øvre kropp styrke-utholdenhet.', tips:['Knærne litt bøyd – stabil base','Variér: alternering, dobbel, lateral','Hold intensiteten oppe'], utforing:['Stå med bøyde knær og tauet i hvert hånd','Sett i gang vekselvis bevegelse opp og ned','Armene jobber aktivt – store bølger','Alternér med dobble bølger (begge armer samtidig)','Hold tempo oppe gjennom hele settet','Hvil, gjenta'] },
  { id:'wallball', navn:'Wall ball', kategori:'fullkropp', muskelgruppe:'Quads, skuldre, core', vanskelighet:'Middels', utstyr:'Medisinball + vegg', sted:'gym', emoji:'🎱', animType:'squat', sett:4, reps:'15', hvile:'60s', beskrivelse:'Squat og kast medisinballen mot veggen i én bevegelse. Utbredt i CrossFit, ekstremt effektivt.', tips:['Squat dypt – parallell eller under','Kast på vei opp fra squaten','Fang lavt og gå rett i neste squat'], utforing:['Stå foran veggen med ballen ved brystet','Squat dypt ned','Eksplodér opp og kast ballen mot merket på veggen','Fang ballen og gå direkte ned i neste squat','Gjenta uten pause'] },
  { id:'sandbagCarry', navn:'Farmers walk', kategori:'fullkropp', muskelgruppe:'Core, grepstyrkr, bein, rygg', vanskelighet:'Nybegynner', utstyr:'Hantler / kettlebells', sted:'begge', emoji:'🚶', animType:'run', sett:3, reps:'40 m', hvile:'90s', beskrivelse:'Gå med tunge hantler i hendene. Enkelt men ekstremt effektivt for full-kropp og grepstyrkr.', tips:['Rett rygg, skuldrene tilbake','Stram core hele veien','Korte raske steg'], utforing:['Velg tunge hantler/kettlebells','Grip dem ved siden av kroppen','Stram core og hold skuldrene tilbake','Gå med korte raske steg i ønsket distanse','Ikke la skuldrene henge fremover','Legg ned kontrollert','Hvil og gjenta'] },
  { id:'kettlebellClean', navn:'Kettlebell clean', kategori:'fullkropp', muskelgruppe:'Hofter, skuldre, core', vanskelighet:'Middels', utstyr:'Kettlebell', sted:'begge', emoji:'🔔', animType:'hinge', sett:3, reps:'8×2', hvile:'90s', beskrivelse:'Løft kettlebellen fra hengeposisjon til rack-posisjon ved skulderen med en eksplosiv hip-drive.', tips:['Kraften fra hoften – ikke armen','La kettlebellen gli langs kroppen','Myk landing i rack-posisjon'], utforing:['Stå med kettlebell mellom bena','Hinge hoften og grip kettlebellen','Eksplosiv hip-drive – stå rett opp','La kettlebellen gli langs underarmen opp','Fang den mykt i rack-posisjon ved skulderen','Senk ned kontrollert til start','Gjenta, bytt arm'] },
  { id:'romaskin', navn:'Romaskin', kategori:'cardio', muskelgruppe:'Full kropp (85% av muskler)', vanskelighet:'Middels', utstyr:'Romaskin', sted:'gym', emoji:'🚣', animType:'run', sett:1, reps:'20 min', hvile:'–', beskrivelse:'Den beste kardio-maskinen fordi den bruker 85% av kroppens muskler. Teknikk-rekkefølge: BEIN → HELLING → ARMER.', tips:['BEIN→HELLING→ARMER – alltid','Push med bena, ikke dra med ryggen','Damper: 4-6 anbefalt'], utforing:['Sett deg i maskinen med hælene i fotpedaler','Grip årehandtakene','Start: knærne bøyd, armer strake','Fase 1: Push med bena til de er nesten rette','Fase 2: Len bakover ca 30°','Fase 3: Trekk armene til øvre mage','Returner: armer ut, len frem, bøy knær'] },
  { id:'sykkel', navn:'Stasjonær sykkel HIIT', kategori:'cardio', muskelgruppe:'Quadriceps, calves, cardio', vanskelighet:'Nybegynner', utstyr:'Stasjonær sykkel', sted:'gym', emoji:'🚴', animType:'run', sett:8, reps:'30s/90s', hvile:'–', beskrivelse:'HIIT på sykkel er svært effektivt for fettforbrenning. 8 runder à 30 sek maks og 90 sek rolig.', tips:['Maks watt i 30 sek','Rolig tråkk i 90 sek','Juster sadelhøyde riktig'], utforing:['Juster sadelhøyde så kneet er lett bøyd i bunn','Varm opp 5 min rolig','30 sek: absolutt maks – alt du har','90 sek: rolig tråkk – pust ned','Gjenta 8 ganger','Avkjøl 3-5 min'] },
  { id:'elipsemaskin', navn:'Elipsemaskin', kategori:'cardio', muskelgruppe:'Full kropp, ledd-vennlig', vanskelighet:'Nybegynner', utstyr:'Elipsemaskin', sted:'gym', emoji:'🏃', animType:'run', sett:1, reps:'25 min', hvile:'–', beskrivelse:'Leddvennlig full-kropp kardio. Skånsom for knær og hofter. Bruk armene aktivt for å aktivere øvre kropp også.', tips:['Bruk armene AKTIVT','Prøv baklengs – aktiverer hamstrings','Varier motstand hvert 5. min'], utforing:['Start med lav motstand','Stå oppreist – ikke len mot håndtakene','Bruk armene aktivt med kroppen','Varier motstand for intervall-effekt','Prøv 5 min baklengs for mer hamstrings','Rolig nedkjøling siste 3 min'] },
  { id:'tredemill', navn:'Tredemølle intervall', kategori:'cardio', muskelgruppe:'Bein, hjerte-kar', vanskelighet:'Middels', utstyr:'Tredemølle', sted:'gym', emoji:'👟', animType:'run', sett:6, reps:'2m/1m', hvile:'–', beskrivelse:'Effektiv kondisjonstrening. 2 min jogg/løp, 1 min rolig. Ikke hold i gelenderne.', tips:['IKKE hold i gelenderne','Varm opp 5 min med gange','Naturlig løpesteg'], utforing:['Start med 5 min gange for oppvarming','Sett til jogg-hastighet','2 min: jogg/løp på innsatsnivå 7-8/10','1 min: rolig gange eller lett jogg','Gjenta 6 ganger','Avkjøl 5 min med gange'] },
  { id:'hoppingTau', navn:'Hoppetau', kategori:'cardio', muskelgruppe:'Bein, koordinasjon, cardio', vanskelighet:'Nybegynner', utstyr:'Hoppetau', sted:'begge', emoji:'🪢', animType:'run', sett:5, reps:'1 min', hvile:'30s', beskrivelse:'Klassisk kondisjonstrening. 100 kalorier per 10 min. Variér: enkelt, dobbelt, kryss.', tips:['Tuppene lander – ikke hele foten','Snu tauet fra håndledd – ikke skulder','Lavt hopp – under 5 cm'], utforing:['Hold tauet i hvert hånd','Start med enkelt hopp','Tuppene lander mykt','Tauet snurres fra håndleddene','Hold jevnt tempo i 1 min','Prøv dobbelt-hopp for mer intensitet','Hvil 30 sek, gjenta'] },
  { id:'sprintIntervall', navn:'Sprint intervall', kategori:'cardio', muskelgruppe:'Bein, hjerte-kar (HIIT)', vanskelighet:'Middels', utstyr:'Ingen', sted:'begge', emoji:'⚡', animType:'run', sett:8, reps:'20s/40s', hvile:'–', beskrivelse:'20 sek maks sprint, 40 sek gange/jogg. Tabata-protokoll. Ekstremt tidseffektivt for kondisjon og fettforbrenning.', tips:['Varm opp godt – 10 min','Full innsats i 20 sek','Avkjøl godt etterpå'], utforing:['Varm opp grundig i 10 min','20 sek: absolut maks sprint','40 sek: rolig gange – pust ned','Gjenta 8 ganger (4 min arbeid)','Avkjøl grundig i 10 min'] },
  { id:'stairClimber', navn:'Trappemaskin', kategori:'cardio', muskelgruppe:'Quads, glutes, cardio', vanskelighet:'Nybegynner', utstyr:'Stair climber', sted:'gym', emoji:'🏔️', animType:'squat', sett:1, reps:'20 min', hvile:'–', beskrivelse:'Klatre trapper på maskin. Lavere belastning på knærne enn løping, høyere glutes-aktivering.', tips:['Ikke hold i gelenderne','Rett rygg','Variér med sidesteg'], utforing:['Still maskinen til moderat motstand','Stå oppreist – ikke len mot gelenderne','Klatr jevnt og kontrollert','Varier: sidesteg, dobbelt steg','Hold intensitet høy nok til å svette','Avkjøl siste 3-5 min'] },
  { id:'airdyne', navn:'Airdyne sykkel', kategori:'cardio', muskelgruppe:'Full kropp cardio', vanskelighet:'Middels', utstyr:'Airdyne / assault bike', sted:'gym', emoji:'💨', animType:'run', sett:5, reps:'30s/60s', hvile:'–', beskrivelse:'Armer og bein driver en luftfanmotstandssykkel. Jo hardere du tråkker, jo mer motstand. Full-kropp HIIT.', tips:['Bruk armene like mye som bena','30 sek alt du har – 60 sek rolig','Motstanden er selv-regulerende'], utforing:['Sett deg på sykkelen','Sett i gang begge armer og bein','30 sek: absolutt maks – armer og bein','60 sek: veldig rolig – restitutt','Gjenta 5-10 ganger','Avkjøl'] },
  { id:'plyoJacks', navn:'Jumping jacks', kategori:'cardio', muskelgruppe:'Full kropp, koordinasjon', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'⭐', animType:'run', sett:3, reps:'45 sek', hvile:'15s', beskrivelse:'Klassisk oppvarmings- og kondisasjonsøvelse. God for å øke pulsen raskt. Bruk som superset eller oppvarming.', tips:['Armene fullt ut til siden','Land mykt på tuppene','Hold jevnt tempo'], utforing:['Start med bena samlet og armer ved siden','Hopp ut med bena og armene opp over hodet','Land mykt med bena skulderbredde','Hopp tilbake til startposisjon','Gjenta raskt i 45 sek'] },
  { id:'boxing', navn:'Skyggaboksing', kategori:'cardio', muskelgruppe:'Skuldre, armer, core, cardio', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🥊', animType:'run', sett:5, reps:'2 min', hvile:'1 min', beskrivelse:'Boks mot luften. Kombinasjon av jab, kryss, krokkslag og huk. Fantastisk kardio som også er morsomt.', tips:['Føttene skulderbredde – beveg deg','Knyttnevene opp og beskytt ansiktet','Hold god teknikk – ikke bare sleng'], utforing:['Stå med dominant fot bak (ortodoks eller søthende)','Hendene opp til ansiktet','Jab: rett frem med fremre hånd','Kryss: rett frem med bakre hånd (roter hoften)','Venstre krokkslag, høyre krokkslag','Kombiner med fotbevegelse','Hold 2 min høy intensitet'] },
  { id:'pistolSquat', navn:'Pistol squat', kategori:'bein', muskelgruppe:'Quads, glutes (enbeins)', vanskelighet:'Avansert', utstyr:'Ingen', sted:'hjemme', emoji:'🎯', animType:'squat', sett:3, reps:'5×2', hvile:'2min', beskrivelse:'Enbeins knebøy til gulvet. Ultimat beinstyrke-test uten utstyr. Bygg med assistert variant først.', tips:['Start assistert med TRX eller stol','Hælen ned – ikke opp','Kneet holder seg over tå'], utforing:['Stå på ett ben, det andre beinet strakt fremover','Hold armene fremover for balanse','Bøy kneet og hofte – den strake foten går opp','Senk så dypt som mulig – hele veien til gulvet ideelt','Press opp gjennom hælen','Gjenta, bytt ben'] },
  { id:'archerPushup', navn:'Archer push-up', kategori:'bryst', muskelgruppe:'Pecs, triceps (unilateral)', vanskelighet:'Avansert', utstyr:'Ingen', sted:'hjemme', emoji:'🏹', animType:'press', sett:3, reps:'6×2', hvile:'90s', beskrivelse:'En arm utover, senk mot den aktive siden. Mellomsteg mot enarms push-up. Krevende og effektiv.', tips:['Den inaktive armen er rett – støtte','Senk sakte til siden','Kontrollert opp med aktiv arm'], utforing:['Start i bred plankeposisjon – hender bredere enn skuldrene','Shift vekten til én side','Senk brystet mot den aktive hånden','Den andre armen er nesten rett – passiv støtte','Press opp med aktiv arm','Gjenta, bytt side'] },
  { id:'handstandPushup', navn:'Håndstående push-up', kategori:'skuldre', muskelgruppe:'Skuldre, triceps (avansert)', vanskelighet:'Avansert', utstyr:'Vegg', sted:'hjemme', emoji:'🤸', animType:'press', sett:3, reps:'5-8', hvile:'2min', beskrivelse:'Mot veggen, press kroppen ned og opp. Ekstremt effektiv skulderøvelse uten utstyr.', tips:['Start med veggen','Albuer peker fremover – ikke ut','Kontrollert ned'], utforing:['Stå med ryggen til veggen','Plasser hendene ca 30 cm fra veggen','Spark opp til håndstående mot veggen','Hender skulderbredde','Senk hodet mot gulvet kontrollert','Press opp til rette armer','Gjenta'] },
  { id:'dipsStol', navn:'Stoldips', kategori:'tricep', muskelgruppe:'Triceps, bryst', vanskelighet:'Nybegynner', utstyr:'Stol', sted:'hjemme', emoji:'🪑', animType:'press', sett:3, reps:'15', hvile:'60s', beskrivelse:'To stoler side om side, dips mellom dem. Dypere enn benk-dips og dermed mer effektivt.', tips:['Rett rygg nær stolene','Kontrollert ned til 90°','Press uten å låse albuene'], utforing:['Plasser to stoler skulderbredde fra hverandre','Grip kanten av begge stolene','Hold deg opp med rette armer','Senk kroppen ned mellom stolene','Stopp ved 90° i albuene','Press opp til nesten rette armer','Gjenta'] },
  { id:'jumpSquat', navn:'Hopp knebøy', kategori:'bein', muskelgruppe:'Quads, glutes, plyo', vanskelighet:'Middels', utstyr:'Ingen', sted:'hjemme', emoji:'⬆️', animType:'squat', sett:4, reps:'12', hvile:'60s', beskrivelse:'Knebøy ned og eksploder opp i et hopp. Plyo-trening som bygger eksplosiv kraft og kondisjon.', tips:['Dyp squat – parallell','Eksploder fra bunn','Land mykt med bøyde knær'], utforing:['Stå med skulderbredde, armer ved siden','Squat ned til parallell','Eksplodér opp – sving armene','Hopp av gulvet','Land mykt med bøyde knær','Gå rett ned i neste squat','Gjenta'] },
  { id:'crabWalk', navn:'Krabbegange', kategori:'core', muskelgruppe:'Triceps, glutes, core', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🦀', animType:'crunch', sett:3, reps:'30 sek', hvile:'30s', beskrivelse:'Sitt i omvendt bord-posisjon og beveg deg sideveis eller fremover. Morsom og effektiv full-kropp øvelse.', tips:['Hoften opp – ikke la den synke','Beveg motsatt arm og ben','Hold tempo oppe'], utforing:['Sett deg på gulvet med hendene bak og bena foran','Press hoften opp – omvendt bord-posisjon','Beveg høyre hånd og venstre fot fremover','Deretter venstre hånd og høyre fot','Fortsett i ønsket retning','Hoften holder seg oppe hele veien'] },
  { id:'inchworm', navn:'Inchworm', kategori:'fullkropp', muskelgruppe:'Hamstrings, skuldre, core', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🐛', animType:'plank', sett:3, reps:'10', hvile:'45s', beskrivelse:'Bøy ned, gå på hendene ut til plankeposisjon, gå tilbake, reis deg. Kombinerer mobilitet og styrke.', tips:['Bena rett ved nedbøying – hamstrings strekk','Hold planken et sekund','Kontrollert og langsom'], utforing:['Stå oppreist','Bøy ned og plasser hendene i gulvet – bena rette for strekk','Gå med hendene fremover til plankeposisjon','Hold planken 1 sek','Gå hendene tilbake mot bena','Reis deg opp til stående','Gjenta'] },
  { id:'nordicWalking', navn:'Bear crawl', kategori:'fullkropp', muskelgruppe:'Skuldre, quads, core', vanskelighet:'Middels', utstyr:'Ingen', sted:'hjemme', emoji:'🐻', animType:'run', sett:3, reps:'20 m', hvile:'60s', beskrivelse:'Krabbing på alle fire med knærne 10 cm over gulvet. Ekstremt krevende for core og skuldre.', tips:['Knærne rett over gulvet – ikke synke','Motsatt arm og ben','Hoften nede og jevn'], utforing:['Start på alle fire med rette armer','Løft knærne 10 cm over gulvet','Flytt høyre hånd og venstre fot fremover','Deretter venstre hånd og høyre fot','Hoften holder seg nede og jevn','Krabber i ønsket distanse'] },
  { id:'wallSit', navn:'Vegghold', kategori:'bein', muskelgruppe:'Quadriceps (isometrisk)', vanskelighet:'Nybegynner', utstyr:'Vegg', sted:'hjemme', emoji:'🧱', animType:'squat', sett:3, reps:'45 sek', hvile:'45s', beskrivelse:'Rygg mot veggen, 90° i kneet. Isometrisk hold som brenner ut quadriceps effektivt. Enkel men krevende.', tips:['90° i kneet – ikke mer','Rygg flat mot veggen','Pust rolig og jevnt'], utforing:['Stå med ryggen mot veggen','Skli ned til lårene er parallelle med gulvet – 90°','Rygg flat mot veggen','Armer kan hvile på lårene eller holdes fremover','Hold posisjonen stabilt','Pust rolig – ikke hold pusten','Reis deg opp, hvil, gjenta'] },
  { id:'scapularPushup', navn:'Skulderblad push-up', kategori:'rygg', muskelgruppe:'Serratus anterior, skulderblad', vanskelighet:'Nybegynner', utstyr:'Ingen', sted:'hjemme', emoji:'🦋', animType:'press', sett:3, reps:'15', hvile:'45s', beskrivelse:'Plankeposisjon, press skulderblad fra hverandre og dra dem sammen. Liten bevegelse, stor effekt for serratus og rotator cuff.', tips:['Armene rette – bare skulderblad beveger seg','Protrasjon og retrasjon','Viktig for rotator cuff helse'], utforing:['Start i plankeposisjon med rette armer','Armene rette gjennom hele','Press skulderblad fra hverandre (protrasjon) – thorax løfter seg','Trekk skulderblad mot hverandre (retrasjon) – thorax synker','Liten men presis bevegelse','Gjenta langsomt og kontrollert'] },
]

interface ValgtOvelse {
  id: string
  navn: string
  emoji: string
  muskelgruppe: string
  kategori: string
  utstyr: string
  vanskelighetsgrad: string
  beskrivelse: string
  sett: number
  reps: string
}

interface Props {
  onSelect: (ovelser: ValgtOvelse[]) => void
  valgteOvelser?: ValgtOvelse[]
}

export default function OvelsesVelger({ onSelect, valgteOvelser = [] }: Props) {
  const [sok, setSok] = useState('')
  const [valgtKategori, setValgtKategori] = useState<string>('alle')
  const [midlertidigValgte, setMidlertidigValgte] = useState<ValgtOvelse[]>(valgteOvelser)
  
  // 🔥 NYE STATES FOR EGNE ØVELSER
  const [visNyOvelseModal, setVisNyOvelseModal] = useState(false)
  const [egneOvelser, setEgneOvelser] = useState<any[]>([])
  const [lasterEgne, setLasterEgne] = useState(true)
  const supabase = createClient()
  
  // Hent brukerens egne øvelser
  useEffect(() => {
    const hentEgneOvelser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLasterEgne(false)
        return
      }
      
      const { data } = await supabase
        .from('bruker_ovelser')
        .select('*')
        .eq('bruker_id', user.id)
      
      setEgneOvelser(data || [])
      setLasterEgne(false)
    }
    
    hentEgneOvelser()
  }, [])
  
  // Slå sammen standard øvelser + egne øvelser
  const alleOvelser = [...OVELSER, ...egneOvelser]
  
  // Hent unike kategorier (inkludert fra egne øvelser)
  const kategoriArray = alleOvelser.map(o => o.kategori)
  const unikeKategorier = ['alle', ...new Set(kategoriArray)]
  
  // Filtrer øvelser basert på søk og kategori
  const filtrerteOvelser = alleOvelser.filter((o) => {
    const matchSok = sok === '' || 
      o.navn.toLowerCase().includes(sok.toLowerCase()) ||
      o.muskelgruppe.toLowerCase().includes(sok.toLowerCase())
    
    const matchKategori = valgtKategori === 'alle' || o.kategori === valgtKategori
    
    return matchSok && matchKategori
  })
  
  const toggleOvelse = (ovelse: typeof alleOvelser[0]) => {
    const finnes = midlertidigValgte.find(o => o.id === ovelse.id)
    if (finnes) {
      setMidlertidigValgte(midlertidigValgte.filter(o => o.id !== ovelse.id))
    } else {
      setMidlertidigValgte([...midlertidigValgte, {
        id: ovelse.id,
        navn: ovelse.navn,
        emoji: ovelse.emoji,
        muskelgruppe: ovelse.muskelgruppe,
        kategori: ovelse.kategori,
        utstyr: ovelse.utstyr,
        vanskelighetsgrad: ovelse.vanskelighet,
        beskrivelse: ovelse.beskrivelse,
        sett: ovelse.sett,
        reps: ovelse.reps
      }])
    }
  }
  
  const fjernOvelse = (id: string) => {
    setMidlertidigValgte(midlertidigValgte.filter(o => o.id !== id))
  }
  
  const oppdaterSett = (id: string, sett: number) => {
    setMidlertidigValgte(midlertidigValgte.map(o => 
      o.id === id ? { ...o, sett } : o
    ))
  }
  
  const oppdaterReps = (id: string, reps: string) => {
    setMidlertidigValgte(midlertidigValgte.map(o => 
      o.id === id ? { ...o, reps } : o
    ))
  }
  
  return (
    <div className="ov-velger">
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1rem',
        }} 
        className="ov-velger-grid"
      >
        {/* Venstre: Bibliotek */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              className="input"
              placeholder="Søk etter øvelse..."
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              style={{ flex: 1 }}
            />
            <button 
              className="btn btn-secondary" 
              onClick={() => setVisNyOvelseModal(true)}
              style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
            >
              ➕ Ny
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {unikeKategorier.map((kategori) => (
              <button
                key={kategori}
                onClick={() => setValgtKategori(kategori)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: valgtKategori === kategori ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
                  color: valgtKategori === kategori ? '#000' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {kategori === 'alle' ? 'Alle' : kategori}
              </button>
            ))}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filtrerteOvelser.map((ovelse) => {
              const erValgt = midlertidigValgte.find(o => o.id === ovelse.id)
              return (
                <div
                  key={ovelse.id}
                  onClick={() => toggleOvelse(ovelse)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: erValgt ? 'rgba(0,245,255,0.1)' : 'transparent',
                    border: erValgt ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{ovelse.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ovelse.navn}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {ovelse.muskelgruppe} • {ovelse.vanskelighet} • {ovelse.utstyr}
                    </div>
                  </div>
                  <span>{erValgt ? '✅' : '➕'}</span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Høyre: Valgte øvelser */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📋 Din økt ({midlertidigValgte.length})</h3>
          
          {midlertidigValgte.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
              Velg øvelser fra venstre
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {midlertidigValgte.map((ovelse) => (
                <div
                  key={ovelse.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>{ovelse.emoji}</span>
                    <span style={{ fontWeight: 600, flex: 1 }}>{ovelse.navn}</span>
                    <button
                      onClick={() => fjernOvelse(ovelse.id)}
                      style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Sett</label>
                      <input
                        type="number"
                        min="1"
                        value={ovelse.sett}
                        onChange={(e) => oppdaterSett(ovelse.id, parseInt(e.target.value) || 1)}
                        style={{ width: '60px', padding: '0.25rem' }}
                        className="input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Reps</label>
                      <input
                        type="text"
                        value={ovelse.reps}
                        onChange={(e) => oppdaterReps(ovelse.id, e.target.value)}
                        style={{ width: '80px', padding: '0.25rem' }}
                        className="input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => onSelect(midlertidigValgte)}
          >
            ✅ Bruk disse øvelsene
          </button>
        </div>
      </div>

      {/* NY STYLE FOR MOBIL */}
      <style>{`
        @media (max-width: 640px) {
          .ov-velger-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Modal for ny øvelse */}
      {visNyOvelseModal && (
        <NyOvelseModal 
          onClose={() => setVisNyOvelseModal(false)}
          onSave={(nyOvelse) => {
            setEgneOvelser([...egneOvelser, nyOvelse])
            setVisNyOvelseModal(false)
          }}
        />
      )}
    </div>
  )
}

// Modal-komponent for å opprette ny øvelse
function NyOvelseModal({ onClose, onSave }: { onClose: () => void; onSave: (ovelse: any) => void }) {
  const [navn, setNavn] = useState('')
  const [kategori, setKategori] = useState('')
  const [muskelgruppe, setMuskelgruppe] = useState('')
  const [beskrivelse, setBeskrivelse] = useState('')
  const [utstyr, setUtstyr] = useState('')
  const [sett, setSett] = useState(3)
  const [reps, setReps] = useState('10')
  const [lagrer, setLagrer] = useState(false)
  const supabase = createClient()
  
  const lagre = async () => {
    if (!navn || !kategori) return
    
    setLagrer(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLagrer(false)
      return
    }
    
    const nyOvelse = {
      id: `egen-${Date.now()}`,
      navn,
      kategori,
      muskelgruppe: muskelgruppe || kategori,
      vanskelighet: 'Middels',
      utstyr: utstyr || '–',
      sted: 'begge',
      emoji: '💪',
      beskrivelse: beskrivelse || 'Ingen beskrivelse',
      tips: [],
      sett,
      reps,
      hvile: '60s',
      animType: 'press',
      utforing: []
    }
    
    // Lagre til Supabase
    const { error } = await supabase.from('bruker_ovelser').insert({
      bruker_id: user.id,
      ...nyOvelse
    })
    
    setLagrer(false)
    if (!error) {
      onSave(nyOvelse)
    }
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>➕ Opprett ny øvelse</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Navn *</label>
          <input
            className="input"
            placeholder="f.eks. Kabel face pull med rotering"
            value={navn}
            onChange={(e) => setNavn(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Kategori *</label>
          <input
            className="input"
            placeholder="f.eks. skuldre, rygg, bryst"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Muskelgruppe</label>
          <input
            className="input"
            placeholder="f.eks. Bakre deltoid, rotator cuff"
            value={muskelgruppe}
            onChange={(e) => setMuskelgruppe(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Beskrivelse</label>
          <textarea
            className="input"
            placeholder="Kort beskrivelse av øvelsen..."
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            style={{ width: '100%', minHeight: '80px' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Utstyr</label>
          <input
            className="input"
            placeholder="f.eks. Kabelmaskin, hantler"
            value={utstyr}
            onChange={(e) => setUtstyr(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Sett</label>
            <input
              type="number"
              min="1"
              className="input"
              value={sett}
              onChange={(e) => setSett(parseInt(e.target.value) || 1)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.25rem' }}>Reps</label>
            <input
              className="input"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={lagrer}>
            Avbryt
          </button>
          <button 
            className="btn btn-primary" 
            onClick={lagre} 
            disabled={lagrer || !navn || !kategori}
          >
            {lagrer ? 'Lagrer...' : 'Lagre øvelse'}
          </button>
        </div>
      </div>
    </div>
  )
}