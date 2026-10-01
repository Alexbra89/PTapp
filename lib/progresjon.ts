// Dobbel progresjon: gjør flere reps på samme vekt til du når toppen av rep-spennet
// på alle sett – da går vekten opp. Det er slik en PT faktisk legger opp progresjon.

export interface Sett { reps: number; kg: number }

export interface Forslag {
  kg: number
  type: 'opp' | 'samme' | 'ned'
  tekst: string   // kort, f.eks. «Prøv 62,5 kg»
  grunn: string   // hvorfor, f.eks. «Du klarte 10 reps på alle sett sist»
}

// «8-10» → [8, 10], «12» → [12, 12], «45 sek» / «maks» → null
export function repSpenn(reps: string): [number, number] | null {
  const t = reps.toLowerCase()
  if (/sek|min|maks|max|m\b|km|runde|on|off/.test(t)) return null
  const tall = t.split(/[×x*]/)[0].match(/\d+/g)?.map(Number) ?? []
  if (!tall.length) return null
  return [Math.min(...tall.slice(0, 2)), Math.max(...tall.slice(0, 2))]
}

// Steg som passer vekten: små steg for manualer og isolasjon, større for tunge løft
export function vektsteg(kg: number): number {
  if (kg < 20) return 1
  if (kg < 100) return 2.5
  return 5
}

const rund = (kg: number, steg: number) => Math.round(kg / steg) * steg
export const fmtKg = (kg: number) => kg.toLocaleString('nb-NO', { maximumFractionDigits: 1 })

export function foreslaVekt(forrige: Sett[] | undefined, malReps: string): Forslag | null {
  if (!forrige?.length) return null
  const spenn = repSpenn(malReps)
  if (!spenn) return null
  const arbeid = Math.max(...forrige.map(s => s.kg))
  if (!(arbeid > 0)) return null
  const [bunn, topp] = spenn
  const arbeidssett = forrige.filter(s => s.kg === arbeid)

  if (arbeidssett.every(s => s.reps >= topp)) {
    const steg = vektsteg(arbeid)
    const kg = rund(arbeid + steg, steg)
    return { kg, type: 'opp', tekst: `Prøv ${fmtKg(kg)} kg`, grunn: `Du klarte ${topp} reps på alle sett sist` }
  }
  // Langt under spennet på de fleste settene: litt lettere gir bedre teknikk og flere reps
  const forTungt = arbeidssett.filter(s => s.reps < bunn - 1).length > arbeidssett.length / 2
  if (forTungt) {
    const steg = vektsteg(arbeid)
    const kg = Math.max(steg, rund(arbeid * 0.9, steg))
    return { kg, type: 'ned', tekst: `Prøv ${fmtKg(kg)} kg`, grunn: `Sist ble det under ${bunn} reps – litt lettere gir bedre kvalitet` }
  }
  return { kg: arbeid, type: 'samme', tekst: `Bli på ${fmtKg(arbeid)} kg`, grunn: `Sikt mot ${topp} reps på alle sett, så går vekten opp` }
}
