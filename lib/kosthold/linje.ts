// Lager dagbokslinjer fra en matvare og en mengde. Ren logikk – brukes ved registrering,
// ved «én-trykks» gjenbruk og når en hel måltidsmal registreres.

import { GRENSER, tilBasisMengde, type Enhet, type Logglinje, type Maltid, type Matvare, type Mengdedata, type Mengderesultat } from './naering'

/** UUID laget i appen. Samme id sendes ved nye forsøk, så en registrering aldri lagres to ganger. */
export function nyId(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  const b = new Uint8Array(16)
  c.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export type Linjeresultat = { ok: true; linje: Logglinje } | { ok: false; feil: string }

export function lagLinje(
  m: Matvare, mengde: number, enhet: Enhet,
  sted: { brukerId: string; dato: string; maltid: Maltid; id?: string },
): Linjeresultat {
  const r = tilBasisMengde(mengde, enhet, m)
  if (!r.ok) return r
  const tall = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    ok: true,
    linje: {
      id: sted.id ?? nyId(),
      bruker_id: sted.brukerId,
      dato: sted.dato,
      maltid: sted.maltid,
      matvare_id: m.id,
      navn: m.navn,
      merke: m.merke,
      basis: m.basis,
      mengde,
      enhet,
      basis_mengde: r.basisMengde,
      kcal_100: Number(m.kcal),
      protein_100: tall(m.protein),
      karbohydrater_100: tall(m.karbohydrater),
      fett_100: tall(m.fett),
      sukker_100: tall(m.sukker),
      mettet_fett_100: tall(m.mettet_fett),
      fiber_100: tall(m.fiber),
      salt_100: tall(m.salt),
    },
  }
}

/**
 * Gram/ml i basis for en ny mengde på en eksisterende linje.
 *
 * Linjen er et historisk øyeblikksbilde – også omregningen. Er enheten den samme som før, skaleres
 * den lagrede basis-mengden (40 g per porsjon da den ble registrert, forblir 40 g per porsjon), selv
 * om porsjonsstørrelse, vekt per stykk eller tetthet på matvaren er endret senere. Bare et villet
 * bytte av enhet (f.eks. fra gram til porsjon) bruker dagens matvare.
 */
export function basisForEndring(l: Logglinje, mengde: number, enhet: Enhet, m?: Matvare | null): Mengderesultat {
  const iBasis: Mengdedata = { basis: l.basis, porsjon_mengde: null, porsjon_enhet: null, stk_vekt: null, tetthet: null }
  if (enhet === l.enhet && Number(l.mengde) > 0) {
    // Valider mengden som vanlig (positiv, øvre grense), og skaler den historiske omregningen
    const sjekk = tilBasisMengde(mengde, l.basis === '100ml' ? 'ml' : 'g', iBasis)
    if (!sjekk.ok) return sjekk
    const basisMengde = (Number(l.basis_mengde) * mengde) / Number(l.mengde)
    if (!Number.isFinite(basisMengde) || basisMengde <= 0 || basisMengde > GRENSER.mengde) return { ok: false, feil: 'Mengden blir for stor.' }
    return { ok: true, basisMengde }
  }
  // Gram/ml i samme basis kan regnes om uten matvaren. Porsjon/stk og g↔ml krever matvarens data.
  if (enhet === 'porsjon' || enhet === 'stk' || (enhet === 'g' && l.basis === '100ml') || (enhet === 'ml' && l.basis === '100g')) {
    if (!m) return { ok: false, feil: 'Matvaren finnes ikke lenger. Bruk gram eller milliliter.' }
    return tilBasisMengde(mengde, enhet, { ...m, basis: l.basis })
  }
  return tilBasisMengde(mengde, enhet, iBasis)
}

/** Ny mengde på en eksisterende linje: regnes fra øyeblikksbildet, ikke fra dagens matvare. */
export function endreMengde(l: Logglinje, mengde: number, enhet: Enhet, m?: Matvare | null): Linjeresultat {
  const r = basisForEndring(l, mengde, enhet, m)
  if (!r.ok) return r
  return { ok: true, linje: { ...l, mengde, enhet, basis_mengde: r.basisMengde } }
}

export interface Mallinje { matvare_id: string; mengde: number; enhet: Enhet }
export interface Maltidsmal {
  id: string
  bruker_id: string
  navn: string
  maltid: Maltid | null
  linjer: Mallinje[]
  sist_brukt: string | null
  opprettet?: string
}

/**
 * Alle linjer for en måltidsmal. Matvarer som er slettet, hoppes over og rapporteres –
 * resten registreres. Ugyldige mengder stopper hele malen (ingenting halvveis).
 */
export function linjerFraMal(
  mal: Maltidsmal, matvarer: Matvare[], sted: { brukerId: string; dato: string; maltid: Maltid },
): { linjer: Logglinje[]; mangler: number; feil: string | null } {
  const linjer: Logglinje[] = []
  let mangler = 0
  for (const ml of mal.linjer) {
    const m = matvarer.find(x => x.id === ml.matvare_id)
    if (!m) { mangler++; continue }
    const r = lagLinje(m, Number(ml.mengde), ml.enhet, sted)
    if (!r.ok) return { linjer: [], mangler, feil: `${m.navn}: ${r.feil}` }
    linjer.push(r.linje)
  }
  return { linjer, mangler, feil: linjer.length === 0 ? 'Ingen av matvarene i malen finnes lenger.' : null }
}
