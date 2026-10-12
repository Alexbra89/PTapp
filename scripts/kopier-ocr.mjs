// Kopierer OCR-motoren (Tesseract) og norsk språkdata fra node_modules til public/ocr,
// slik at alt leveres fra appens eget domene. CSP-en tillater ikke CDN-er, og ingen bilder
// eller tekst skal ut av enheten. Kjøres automatisk før dev og build (predev/prebuild).
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ut = path.join(rot, 'public', 'ocr')
mkdirSync(ut, { recursive: true })

const pakke = navn => path.dirname(require.resolve(`${navn}/package.json`))
const filer = [
  [path.join(pakke('tesseract.js'), 'dist', 'worker.min.js'), 'worker.min.js'],
  // Bare LSTM-variantene (appen bruker LSTM-motoren); arbeideren velger selv etter hva nettleseren støtter
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']
    .map(f => [path.join(pakke('tesseract.js-core'), f), f]),
  // «best_int» er språkdataene for LSTM-motoren
  [path.join(pakke('@tesseract.js-data/nor'), '4.0.0_best_int', 'nor.traineddata.gz'), 'nor.traineddata.gz'],
]

let kopiert = 0
for (const [fra, navn] of filer) {
  const til = path.join(ut, navn)
  if (existsSync(til) && statSync(til).size === statSync(fra).size) continue
  copyFileSync(fra, til)
  kopiert++
}
console.log(`OCR-filer klare i public/ocr (${kopiert} kopiert, ${filer.length - kopiert} uendret)`)
