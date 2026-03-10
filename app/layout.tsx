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
        <meta name="apple-mobile-web-app-capable"          content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"            content="Trening" />
        <meta name="mobile-web-app-capable"                content="yes" />

        {/* Ikoner */}
        <link rel="apple-touch-icon"      href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Hindre hvit flash på iOS */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
