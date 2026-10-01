/** @type {import('next').NextConfig} */

// Robust PWA-import
let withPWA
try {
  withPWA = (await import('@ducanh2912/next-pwa')).default
} catch {
  try {
    withPWA = (await import('next-pwa')).default
  } catch {
    console.warn('⚠️  Ingen PWA-pakke funnet, bygger uten PWA')
    withPWA = (config) => config
  }
}

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Standardreglene til next-pwa beholdes (statiske filer, fonter, sider), men regelen
  // «cross-origin» – som lagret ALLE svar fra andre domener, også Supabase med brukerdata,
  // i en time – byttes ut med «aldri cache». Brukerdata skal ikke ligge igjen på enheten.
  // (De gamle reglene her lå på feil nøkkel og ble ignorert av next-pwa.)
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin }) => !sameOrigin,
        handler: 'NetworkOnly',
        options: { cacheName: 'cross-origin' },
      },
    ],
  },
})

const nextConfig = {
  reactStrictMode: true,
  compress: true,

  // Bildeoptimering er av: appen bruker ikke next/image, og /_next/image var et
  // unødvendig, uautentisert endepunkt med kjente sårbarheter (bl.a. AVIF).
  images: {
    unoptimized: true,
  },

  experimental: {
    optimizePackageImports: ['date-fns', 'recharts', 'lucide-react'],
  },

  // Deaktiver X-Powered-By header
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff'       },
          { key: 'X-Frame-Options',          value: 'DENY'          },
          // X-XSS-Protection er fjernet: utdatert, og kan selv skape sårbarheter. CSP (middleware) erstatter den.
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          // Skrur av nettleserfunksjoner appen ikke bruker. Skjerm-våken (økt/tidtaking) er tillatt.
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), screen-wake-lock=(self)' },
          // Bare HTTPS i to år (Vercel bruker alltid HTTPS)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Forhindrer hvit flash på iOS PWA
          { key: 'X-DNS-Prefetch-Control',   value: 'on'            },
        ],
      },
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|webp|woff2|woff|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Next.js JS chunks – lang cache
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default pwaConfig(nextConfig)
