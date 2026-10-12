// Leser EAN/UPC-strekkoder fra et videobilde. Bruker nettleserens innebygde BarcodeDetector
// der den finnes (Chrome/Edge på Android, Safari 17+ på macOS) og ZXing ellers (bl.a. iPhone).
// ZXing lastes først når skanneren åpnes, så resten av appen ikke blir tyngre.
import { gyldigGtin, normaliserStrekkode } from './naering'

export interface Strekkodeleser {
  type: 'innebygd' | 'zxing'
  les(video: HTMLVideoElement): Promise<string | null>
}

const FORMATER = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

async function innebygd(): Promise<Strekkodeleser | null> {
  const BD = (globalThis as any).BarcodeDetector
  if (!BD) return null
  try {
    const stottet: string[] = await BD.getSupportedFormats()
    const formater = FORMATER.filter(f => stottet.includes(f))
    if (!formater.includes('ean_13')) return null
    const detektor = new BD({ formats: formater })
    return {
      type: 'innebygd',
      async les(video) {
        const funn: { rawValue: string }[] = await detektor.detect(video)
        for (const f of funn) {
          const k = normaliserStrekkode(f.rawValue ?? '')
          if (gyldigGtin(k)) return k
        }
        return null
      },
    }
  } catch {
    return null
  }
}

async function zxing(): Promise<Strekkodeleser> {
  const Z = await import('@zxing/library')
  const hint = new Map<any, any>([
    [Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]],
    [Z.DecodeHintType.TRY_HARDER, true],
  ])
  const leser = new Z.MultiFormatOneDReader(hint)
  const lerret = document.createElement('canvas')
  const ctx = lerret.getContext('2d', { willReadFrequently: true })!
  return {
    type: 'zxing',
    async les(video) {
      const vb = video.videoWidth, vh = video.videoHeight
      if (!vb || !vh) return null
      // Midtre bånd av bildet (der siktet er), nedskalert – raskere og mer treffsikkert
      const kildeH = Math.round(vh * 0.5), kildeY = Math.round((vh - kildeH) / 2)
      const skala = Math.min(1, 1000 / vb)
      const b = Math.round(vb * skala), h = Math.round(kildeH * skala)
      lerret.width = b; lerret.height = h
      ctx.drawImage(video, 0, kildeY, vb, kildeH, 0, 0, b, h)
      const rgba = ctx.getImageData(0, 0, b, h).data
      const lum = new Uint8ClampedArray(b * h)
      for (let i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8
      const bilde = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(lum, b, h)))
      try {
        const r = leser.decode(bilde, hint)
        const k = normaliserStrekkode(r.getText())
        return gyldigGtin(k) ? k : null
      } catch {
        return null // ingen kode i dette bildet
      } finally {
        leser.reset()
      }
    },
  }
}

export async function lagStrekkodeleser(): Promise<Strekkodeleser> {
  return (await innebygd()) ?? zxing()
}
