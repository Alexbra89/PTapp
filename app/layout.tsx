import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Providers } from './providers'
import './globals.css'

// iOS bruker ikke bakgrunnsfargen i manifestet når appen startes fra hjemskjermen – uten egne
// oppstartsbilder vises en hvit skjerm til siden er lastet. Ett bilde per skjermstørrelse (stående),
// mørk bakgrunn med logoen. Laget fra public/icon-512.png. Android lager sin egen fra manifestet.
const OPPSTART: Array<[number, number, number]> = [
  [440, 956, 3], [430, 932, 3], [420, 912, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3],
  [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [768, 1024, 2],
]

export const metadata: Metadata = {
  title: {
    default:  'AB-PT',
    template: '%s · AB-PT',
  },
  description: 'AB-PT – personlig trening: øvelser, treningsøkter og statistikk',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'AB-PT',
  },
  formatDetection: { telephone: false },
  robots: { index: false },
}

export const viewport: Viewport = {
  themeColor:   '#0B0A09',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce fra middleware – uten den blokkerer CSP-en inline-skriptet under
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        {/* PWA – iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trening" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Forhåndslast skriftene som brukes på første skjermbilde */}
        <link rel="preload" href="/fonts/SchibstedGrotesk-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/InstrumentSerif-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/InstrumentSerif-Italic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

        {/* Ikoner */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {OPPSTART.map(([b, h, r]) => (
          <link key={`${b}x${h}@${r}`} rel="apple-touch-startup-image" href={`/splash/${b * r}x${h * r}.png`}
            media={`(device-width: ${b}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`} />
        ))}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* ⭐ KRITISK: Inline style for umiddelbar mørk bakgrunn – kjører FØR alt annet */}
        <style dangerouslySetInnerHTML={{ __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            background-color: #0B0A09 !important;
            background: #0B0A09 !important;
            color: #F2ECE1;
            min-height: 100vh;
          }
          #splash-screen {
            position: fixed;
            inset: 0;
            background: #0B0A09;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.5s ease;
            pointer-events: none;
          }
          /* Samme logo, størrelse og plassering som oppstartsbildene i public/splash: ingen hopp i overgangen */
          .splash-logo {
            width: 46vmin;
            height: 46vmin;
            -webkit-mask-image: radial-gradient(circle closest-side, #000 80%, transparent 92%);
            mask-image: radial-gradient(circle closest-side, #000 80%, transparent 92%);
          }
          @keyframes logoFloat {
            from { transform: translateY(0px); }
            to { transform: translateY(-8px); }
          }
          @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
          }
        `}} />
      </head>
      {/* ⭐ VIKTIG: Inline style direkte på body for umiddelbar effekt */}
      <body style={{ backgroundColor: '#0B0A09', margin: 0, padding: 0, minHeight: '100vh' }}>
        {/* Splash screen – fjernes når React er klar */}
        <div id="splash-screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="splash-logo" src="/icon-512.png" alt="AB-PT" />
        </div>
        
        {/* Script som skjuler splash-screen når siden er klar */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `
          (function() {
            var splash = document.getElementById('splash-screen');
            if (!splash) return;
            
            var removeSplash = function() {
              if (!splash) return;
              splash.style.opacity = '0';
              // Skjules – fjernes ikke. Elementet eies av React; fjernes det utenfor React,
              // feiler React 19 med insertBefore/removeChild når siden oppdateres.
              setTimeout(function() {
                if (splash) { splash.style.display = 'none'; splash.setAttribute('aria-hidden', 'true'); }
              }, 300);
            };
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', removeSplash);
            } else {
              removeSplash();
            }
            
            setTimeout(removeSplash, 2000);
          })();
        `}} />
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}