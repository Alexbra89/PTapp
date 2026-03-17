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

        {/* Hindre hvit flash — critical inline CSS lastes synkront FØR JS */}
        <meta name="color-scheme" content="dark" />
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html,body{
            background:#030308 !important;
            color:#fff;
            min-height:100vh;
            -webkit-font-smoothing:antialiased;
          }
          @keyframes _spin { to { transform: rotate(360deg) } }
          #splash {
            position:fixed; inset:0; z-index:9999;
            background:#030308;
            display:flex; align-items:center; justify-content:center;
            transition:opacity 0.3s ease;
          }
          #splash-spinner {
            width:44px; height:44px; border-radius:50%;
            border:2px solid rgba(0,245,255,0.15);
            border-top-color:#00f5ff;
            animation:_spin 0.8s linear infinite;
          }
        ` }} />
        
        {/* Forbedret splash-fjerning */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var removeSplash = function() {
              var s = document.getElementById('splash');
              if (s && s.parentNode) {
                s.style.opacity = '0';
                setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 300);
              }
            };
            
            // Fjern så snart som mulig
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', removeSplash);
            } else {
              removeSplash();
            }
            
            // Sikkerhetsmargin
            setTimeout(removeSplash, 500);
          })();
        `}} />
      </head>
      <body>
        <Providers>
          {/* Splash inne i Providers */}
          <div id="splash">
            <div id="splash-spinner" />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  )
}