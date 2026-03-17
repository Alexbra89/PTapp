import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default:  'Treningsapp',
    template: '%s · Treningsapp',
  },
  description: 'Din personlige treningsapp – øvelser, treningsøkter og statistikk',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'Trening',
  },
  formatDetection: { telephone: false },
  robots: { index: false },
}

export const viewport: Viewport = {
  themeColor:   '#030308',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        {/* PWA – iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trening" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Ikoner */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Hindre hvit flash */}
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            background: #030308 !important;
            color: #fff;
            min-height: 100vh;
          }
          #splash-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #030308;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.5s ease;
            pointer-events: none;
          }
          #splash-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(0,245,255,0.1);
            border-top: 3px solid #00f5ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </head>
      <body>
        <div id="splash-screen">
          <div id="splash-spinner" />
        </div>
        
        <script dangerouslySetInnerHTML={{ __html: `
          // Fjern splash-screen NÅR React er klart (ikke før)
          window.removeSplash = function() {
            const splash = document.getElementById('splash-screen');
            if (splash) {
              splash.style.opacity = '0';
              setTimeout(() => splash.remove(), 500);
            }
          };
          
          // Vent til React er ferdig lastet
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              // Gi React litt tid til å starte
              setTimeout(window.removeSplash, 100);
            });
          } else {
            setTimeout(window.removeSplash, 100);
          }
          
          // Sikkerhetsmargin - fjern uansett etter 3 sekunder
          setTimeout(window.removeSplash, 3000);
        `}} />
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}