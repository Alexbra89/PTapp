import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

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
            background: radial-gradient(900px 500px at 50% 0%, rgba(201,169,110,0.10), transparent 60%), #0B0A09;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.5s ease;
            pointer-events: none;
          }
          .splash-ring {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 1px solid rgba(242,236,225,0.12);
            border-top-color: #C9A96E;
            animation: spin 1.4s cubic-bezier(0.6,0.1,0.4,0.9) infinite;
          }
          .splash-title {
            font-family: 'Instrument Serif', Georgia, serif;
            font-style: italic;
            font-size: 2.4rem;
            letter-spacing: -0.02em;
            color: #C9A96E;
            margin-top: 1.6rem;
          }
          .splash-sub {
            font-family: ui-monospace, 'SF Mono', monospace;
            font-size: 0.6rem;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            color: rgba(242,236,225,0.34);
            margin-top: 0.6rem;
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
          <div className="splash-ring" />
          <div className="splash-title">AB-PT</div>
          <div className="splash-sub">Privat treningsklubb</div>
        </div>
        
        {/* Script for å fjerne splash-screen når React er klar */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var splash = document.getElementById('splash-screen');
            if (!splash) return;
            
            var removeSplash = function() {
              if (!splash) return;
              splash.style.opacity = '0';
              setTimeout(function() { 
                if (splash && splash.parentNode) splash.remove(); 
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