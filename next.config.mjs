/** @type {import('next').NextConfig} */
const nextConfig = {
  // Raskere builds og runtime
  reactStrictMode: true,

  // Komprimering av svar
  compress: true,

  // Optimiser bilder
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },

  // Eksperimentelle ytelsesforbedringer
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['date-fns', 'recharts', 'lucide-react'],
    // Faster server components
    serverComponentsExternalPackages: [],
  },

  // Hindrer unødvendig re-rendering
  poweredByHeader: false,

  // Caching headers for statiske filer
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff'       },
          { key: 'X-Frame-Options',         value: 'DENY'          },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
        ],
      },
      {
        // Cache statiske filer lenge
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|woff2|woff|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig