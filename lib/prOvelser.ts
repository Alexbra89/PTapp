// Øvelser med personlige rekorder (tabellen pr_rekorder bruker id-ene under).
// Delt mellom statistikksiden og treningsøkta, som oppdaterer rekorder automatisk.
export const PR_OVELSER = [
  { id:'benkpress',     navn:'Benkpress',            emoji:'🏋️', kategori:'Bryst'    },
  { id:'skraabenkpress',navn:'Skråbenkpress',         emoji:'📐', kategori:'Bryst'    },
  { id:'markloeft',     navn:'Markløft',              emoji:'⚡', kategori:'Rygg'     },
  { id:'kneboey',       navn:'Knebøy',                emoji:'🦵', kategori:'Bein'     },
  { id:'pullups',       navn:'Pull-ups',              emoji:'🤸', kategori:'Rygg'     },
  { id:'militarypress', navn:'Military press',        emoji:'⬆️', kategori:'Skuldre'  },
  { id:'bicepscurl',    navn:'Biceps curl',           emoji:'💪', kategori:'Bicep'    },
  { id:'hammercurl',    navn:'Hammer curl',           emoji:'🔨', kategori:'Bicep'    },
  { id:'triceppushdown',navn:'Triceps pushdown',      emoji:'📉', kategori:'Tricep'   },
  { id:'sidehev',       navn:'Sidehev',               emoji:'🔼', kategori:'Skuldre'  },
  { id:'legpress',      navn:'Legpress',              emoji:'🔧', kategori:'Bein'     },
  { id:'romenmarkloeft',navn:'Rumensk markløft',      emoji:'🍑', kategori:'Bein'     },
  { id:'kabelsittroign',navn:'Sittende kabelroing',   emoji:'🚣', kategori:'Rygg'     },
  { id:'latpulldown',   navn:'Lat pulldown',          emoji:'⬇️', kategori:'Rygg'     },
]

export const finnPrOvelse = (navn: string) => {
  const n = navn.toLowerCase().trim()
  return PR_OVELSER.find(o => o.navn.toLowerCase() === n)
}
