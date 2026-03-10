/** @type {import('next').NextConfig} */

// Robust PWA-import som fungerer uansett hvilken versjon som er installert
// og uansett Vercel sin cache-situasjon
let withPWA
try {
  // Ny pakke (det vi bruker)
  withPWA = (await import('@ducanh2912/next-pwa')).default
} catch {
  try {
    // Fallback til gammel pakke hvis noen har begge installert
    withPWA = (await import('next-pwa')).default
  } catch {
    // Ingen PWA-pakke funnet – bygg uten PWA (skjer ikke i prod)
    console.warn('⚠️  Ingen PWA-pakke funnet, bygger uten PWA')
    withPWA = (config) => config
  }
}

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-data',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
      },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2|woff|png|jpg|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
})

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: ['date-fns', 'recharts', 'lucide-react'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff'       },
          { key: 'X-Frame-Options',        value: 'DENY'          },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
        ],
      },
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|woff2|woff|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default pwaConfig(nextConfig)
