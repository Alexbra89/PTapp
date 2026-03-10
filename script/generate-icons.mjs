// scripts/generate-icons.mjs
// Generer PWA-ikoner for treningsappen.
//
// Kjør:
//   npm install sharp   (kun første gang)
//   node scripts/generate-icons.mjs

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// Lag public-mappen hvis den ikke finnes
mkdirSync(publicDir, { recursive: true })

// SVG-logo: cyan "T" på mørk bakgrunn
const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0a0a1a"/>
      <stop offset="100%" stop-color="#030308"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Bakgrunn -->
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>

  <!-- Cyan ring -->
  <circle cx="256" cy="256" r="200" fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.2"/>

  <!-- T-ikon (trening) med glow -->
  <g filter="url(#glow)">
    <!-- Vektstang horisontal -->
    <rect x="80" y="220" width="352" height="32" rx="16" fill="#00f5ff" opacity="0.9"/>
    <!-- Vektstang vertikal (grip) -->
    <rect x="224" y="220" width="64" height="140" rx="16" fill="#00f5ff" opacity="0.9"/>
    <!-- Vektskiver venstre -->
    <rect x="72"  y="200" width="40" height="72" rx="8" fill="#b44eff" opacity="0.85"/>
    <rect x="48"  y="210" width="28" height="52" rx="6" fill="#b44eff"/>
    <!-- Vektskiver høyre -->
    <rect x="400" y="200" width="40" height="72" rx="8" fill="#b44eff" opacity="0.85"/>
    <rect x="436" y="210" width="28" height="52" rx="6" fill="#b44eff"/>
  </g>

  <!-- Dot cyan -->
  <circle cx="256" cy="148" r="10" fill="#00f5ff" opacity="0.6"/>
</svg>
`)

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },  // iOS
  { size: 32,  name: 'favicon-32x32.png' },
  { size: 16,  name: 'favicon-16x16.png' },
]

console.log('🎨 Genererer PWA-ikoner...\n')

for (const { size, name } of sizes) {
  const outputPath = join(publicDir, name)
  await sharp(svgBuffer).resize(size, size).png({ quality: 100 }).toFile(outputPath)
  console.log(`  ✅ ${name} (${size}×${size})`)
}

console.log('\n🚀 Ferdig! Ikoner lagret i /public/')
console.log('\nHusk å legge til i app/layout.tsx:')
console.log('  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />')
console.log('  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />')
