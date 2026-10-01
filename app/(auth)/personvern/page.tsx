import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'

export const metadata: Metadata = { title: 'Personvern' }

// Beskriver det appen faktisk gjør. Oppdater ved endringer i hva som lagres eller deles.
const SIST_OPPDATERT = '1. oktober 2026'

export default function Personvern() {
  const kontakt = BRAND.kontaktEpost
  return (
    <main className="pv-page">
      <Link href="/login" className="del-tilbake">← {BRAND.navn}</Link>
      <h1>Personvern<em>.</em></h1>
      <p className="eyebrow">Sist oppdatert {SIST_OPPDATERT}</p>

      <h2>Kort fortalt</h2>
      <p>{BRAND.navn} lagrer treningen din slik at du kan følge med på fremgangen. Vi selger ikke data, viser ikke reklame og bruker ikke sporing. Du kan når som helst laste ned alt du har lagret, eller slette kontoen og alle dataene for godt.</p>

      <h2>Hva vi lagrer</h2>
      <ul>
        <li><strong>Konto:</strong> navn, e-postadresse og passord (passordet lagres kryptert og kan ikke leses av noen).</li>
        <li><strong>Profil (valgfritt):</strong> vekt, høyde, fødselsår, treningsmål og ønsket vekt.</li>
        <li><strong>Trening:</strong> økter, sett, repetisjoner, vekt per sett, personlige rekorder, favorittøvelser, programmer og egne øvelser.</li>
        <li><strong>Vektlogg:</strong> vektmålingene du legger inn.</li>
        <li><strong>Deling:</strong> hvem du har valgt å dele treningen din med.</li>
      </ul>
      <p>Vekt og helserelaterte opplysninger regnes som særlig beskyttede. De brukes bare til å vise deg din egen fremgang og anbefalinger i appen.</p>

      <h2>Hvorfor</h2>
      <p>Opplysningene brukes bare til å drive appen for deg: vise øktene og statistikken din, foreslå vekt og øvelser, og – hvis du velger det – vise treningen din til personer du deler med. Grunnlaget er avtalen du inngår når du oppretter konto, og samtykket ditt når du legger inn helseopplysninger som vekt.</p>

      <h2>Hvem som ser dataene</h2>
      <ul>
        <li><strong>Bare du</strong> ser profilen, vekten og vektloggen din.</li>
        <li><strong>Personer du deler med</strong> kan se øktene, settene og rekordene dine – ikke vekt eller profil. Du kan slå delingen av når som helst, og da forsvinner tilgangen med en gang.</li>
        <li>Andre brukere kan ikke søke opp eller se hvem som har konto.</li>
      </ul>

      <h2>Hvor dataene lagres</h2>
      <ul>
        <li><strong>Supabase</strong> – database og innlogging.</li>
        <li><strong>Vercel</strong> – drift av nettsiden.</li>
        <li><strong>Google Fonts</strong> – skrifttypene lastes fra Google, som da ser IP-adressen din.</li>
        <li><strong>På enheten din</strong> lagres en pågående økt og innstillinger (lyd, vibrasjon, nivå), slik at de overlever at appen lukkes. Økt-utkastet slettes når du logger ut.</li>
      </ul>

      <h2>Hvor lenge</h2>
      <p>Så lenge du har konto. Sletter du kontoen, slettes alle dataene dine med en gang.</p>

      <h2>Dine rettigheter</h2>
      <ul>
        <li><strong>Innsyn og kopi:</strong> «Last ned dataene mine» på profilsiden gir deg alt som én fil.</li>
        <li><strong>Retting:</strong> endre profilen din i appen.</li>
        <li><strong>Sletting:</strong> «Slett kontoen» på profilsiden sletter alt for godt.</li>
        <li><strong>Trekke samtykke:</strong> fjern vekt og profilopplysninger, eller slett kontoen.</li>
        <li><strong>Klage:</strong> du kan klage til <a href="https://www.datatilsynet.no" rel="noopener noreferrer" target="_blank">Datatilsynet</a>.</li>
      </ul>

      <h2>Kontakt</h2>
      <p>{kontakt
        ? <>Spørsmål om personvern: <a href={`mailto:${kontakt}`}>{kontakt}</a>.</>
        : <>Spørsmål om personvern kan sendes til den som driver {BRAND.navn}.</>}</p>
    </main>
  )
}
