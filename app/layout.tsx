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

        {/* Hindre hvit flash - inline style for umiddelbar bakgrunn */}
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
            background: linear-gradient(135deg, #030308 0%, #0a0a18 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.5s ease;
            pointer-events: none;
          }
          .splash-logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #00f5ff, #b44eff);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            box-shadow: 0 0 40px rgba(0,245,255,0.3);
            animation: logoFloat 1.2s ease-in-out infinite alternate;
          }
          .splash-title {
            font-family: 'Syne', sans-serif;
            font-size: 1.6rem;
            font-weight: 800;
            margin-top: 1rem;
            background: linear-gradient(135deg, #fff, #00f5ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .splash-sub {
            font-family: 'DM Sans', sans-serif;
            font-size: 0.8rem;
            color: rgba(255,255,255,0.4);
            margin-top: 0.25rem;
          }
          .splash-spinner {
            margin-top: 1.5rem;
            width: 32px;
            height: 32px;
            border: 2px solid rgba(0,245,255,0.1);
            border-top: 2px solid #00f5ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
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
      <body>
        {/* Splash screen med logo og velkomstmelding */}
        <div id="splash-screen">
          <div className="splash-logo">
            💪
          </div>
          <div className="splash-title">
            Treningsapp
          </div>
          <div className="splash-sub">
            Din personlige treningspartner
          </div>
          <div className="splash-spinner" />
        </div>
        
        {/* Script for å fjerne splash-screen når React er klar */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.removeSplash = function() {
            const splash = document.getElementById('splash-screen');
            if (splash) {
              splash.style.opacity = '0';
              setTimeout(function() { 
                if (splash && splash.parentNode) splash.remove(); 
              }, 500);
            }
          };
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(window.removeSplash, 200);
            });
          } else {
            setTimeout(window.removeSplash, 200);
          }
          
          setTimeout(window.removeSplash, 3500);
        `}} />
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}