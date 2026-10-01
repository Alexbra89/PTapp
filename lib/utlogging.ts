// Rydder personlige data fra enheten når brukeren logger ut, slik at neste person
// på en delt telefon/PC ikke ser rester (pågående økt, vektlogg, bufrede sider).
// Innstillinger for selve enheten (lyd, vibrasjon, nivå) og «introduksjon sett» beholdes.

const BEHOLD = new Set(['abpt_innstillinger', 'abpt_intro_ferdig'])
const PERSONLIGE = ['okt_', 'vektlogg_', 'sb-']

// Cacher med statiske filer (JS, CSS, fonter, ikoner) beholdes – de inneholder ingen brukerdata
const STATISKE_CACHER = ['workbox-precache', 'next-static', 'static-', 'google-fonts']

export async function ryddVedUtlogging() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (!BEHOLD.has(k) && PERSONLIGE.some(p => k.startsWith(p))) localStorage.removeItem(k)
    }
    sessionStorage.clear()
  } catch {}
  try {
    if (typeof caches !== 'undefined') {
      for (const navn of await caches.keys()) {
        if (!STATISKE_CACHER.some(p => navn.startsWith(p))) await caches.delete(navn)
      }
    }
  } catch {}
}
