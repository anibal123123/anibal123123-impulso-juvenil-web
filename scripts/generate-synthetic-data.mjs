/**
 * Datos TOTALMENTE SINTÉTICOS de demostración.
 * No contiene personas reales, RUT, direcciones, emails ni nombres.
 * Ejecutar: node scripts/generate-synthetic-data.mjs
 * Solo se publica el agregado municipal; las fichas ficticias permanecen en scripts/fixtures.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const out = path.join(root, 'data')
const fixtures = path.join(root, 'scripts', 'fixtures')
fs.mkdirSync(out, { recursive: true })
fs.mkdirSync(fixtures, { recursive: true })

let seed = 20261110
const rand = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const pick = (items) => items[Math.floor(rand() * items.length)]
const weighted = (names, weights) => { const n = rand() * weights.reduce((a,b)=>a+b,0); let s=0; return names[weights.findIndex(x => (s+=x) >= n)] }
const communes = ['Concepción', 'Chiguayante', 'Talcahuano', 'Hualpén', 'San Pedro de la Paz', 'Hualqui']
const communeWeights = [32, 16, 21, 12, 15, 4]
const months = Array.from({ length: 10 }, (_, i) => `2026-${String(i+1).padStart(2,'0')}`)
const ageBands = ['18–24', '25–29', '30–44', '45 o más']
const education = ['Básica incompleta', 'Básica completa', 'Media incompleta', 'Media completa', 'Técnica o superior']
const barriers = ['Sin experiencia', 'Necesita capacitación', 'Transporte', 'Responsabilidades de cuidado', 'Brecha digital', 'Sin barrera declarada']
const sectors = ['Comercio', 'Servicios generales', 'Logística y bodega', 'Alimentación', 'Áreas verdes', 'Administración básica']
const professions = ['Trabajo social', 'Psicología', 'Terapia ocupacional', 'Otra profesión social']

const people = Array.from({ length: 1000 }, (_, i) => {
  const territory = weighted(communes, communeWeights)
  const month = weighted(months, [7,8,9,10,11,12,12,12,10,9])
  const ageBand = weighted(ageBands, [40,33,20,7])
  const schooling = weighted(education, [8,12,19,46,15])
  const barrier = weighted(barriers, [26,20,17,13,13,11])
  const sectorInterest = weighted(sectors, [28,21,17,15,12,7])
  const initiallyUnemployed = rand() < 0.86
  const hired = initiallyUnemployed && rand() < (barrier === 'Sin barrera declarada' ? .40 : .26)
  const inTraining = initiallyUnemployed && !hired && rand() < .28
  const currentStatus = hired || !initiallyUnemployed ? 'Con empleo' : inTraining ? 'En formación' : 'En búsqueda'
  const applications = initiallyUnemployed ? (hired ? 1 + Math.floor(rand()*4) : Math.floor(rand()*5)) : (rand() < .2 ? 1 : 0)
  const interviews = hired ? 1 + Math.floor(rand()*2) : Math.min(applications, rand() < .34 ? 1 : 0)
  const trainingParticipation = inTraining || (initiallyUnemployed && rand() < .19)
  return {
    simulationId: `SIM-B-${String(i+1).padStart(4,'0')}`, territory, entryMonth: month, ageBand,
    education: schooling, primaryBarrier: barrier, sectorInterest,
    initialEmployment: initiallyUnemployed ? 'Sin empleo' : 'Con empleo', currentStatus,
    confirmedPlacement: hired, trainingParticipation, applications, interviews,
  }
})
const professionals = Array.from({ length: 56 }, (_, i) => ({
  simulationId: `SIM-P-${String(i+1).padStart(3,'0')}`,
  territory: weighted(communes, communeWeights), registrationMonth: pick(months),
  profession: weighted(professions, [45,26,20,9]),
}))
const offers = Array.from({ length: 220 }, (_, i) => ({
  simulationId: `SIM-O-${String(i+1).padStart(3,'0')}`,
  territory: weighted(communes, communeWeights), publishedMonth: pick(months),
  sector: weighted(sectors, [25,24,19,16,10,6]),
  experience: weighted(['Sin experiencia', 'Experiencia básica', 'Especializada'], [64,31,5]),
  workday: weighted(['Completa', 'Parcial', 'Turnos'], [43,32,25]),
  status: rand() < .22 ? 'Activa' : 'Cerrada',
}))

const rows = new Map()
const add = (period, territory, metric, dimension, category, increment=1) => {
  const key = [period,territory,metric,dimension,category].join('|')
  if (!rows.has(key)) rows.set(key, {period,territory,metric,dimension,category,value:0,source:'sintetico'})
  rows.get(key).value += increment
}
for (const p of people) {
  const base = [p.entryMonth,p.territory]
  add(...base,'beneficiarios','resumen','total')
  if (p.initialEmployment === 'Sin empleo') add(...base,'sin_empleo_inicial','resumen','total')
  if (p.currentStatus === 'Con empleo') add(...base,'con_empleo_actual','resumen','total')
  if (p.confirmedPlacement) add(...base,'contrataciones','resumen','total')
  if (p.currentStatus === 'En formación') add(...base,'en_formacion','resumen','total')
  if (p.currentStatus === 'En búsqueda') add(...base,'en_busqueda','resumen','total')
  if (p.trainingParticipation) add(...base,'participacion_capacitacion','resumen','total')
  if (p.applications) add(...base,'postulaciones','resumen','total',p.applications)
  if (p.interviews) add(...base,'entrevistas','resumen','total',p.interviews)
  add(...base,'beneficiarios','edad',p.ageBand)
  add(...base,'beneficiarios','educacion',p.education)
  add(...base,'beneficiarios','barrera',p.primaryBarrier)
  add(...base,'beneficiarios','interes_laboral',p.sectorInterest)
}
for (const p of professionals) {
  add(p.registrationMonth,p.territory,'profesionales','resumen','total')
  add(p.registrationMonth,p.territory,'profesionales','profesion',p.profession)
}
for (const o of offers) {
  add(o.publishedMonth,o.territory,'ofertas','resumen','total')
  add(o.publishedMonth,o.territory,'ofertas','sector_oferta',o.sector)
  add(o.publishedMonth,o.territory,'ofertas','estado_oferta',o.status)
  add(o.publishedMonth,o.territory,'ofertas','jornada',o.workday)
  add(o.publishedMonth,o.territory,'ofertas','experiencia_requerida',o.experience)
}
const aggregate = [...rows.values()].sort((a,b)=> a.period.localeCompare(b.period) || a.territory.localeCompare(b.territory,'es') || a.metric.localeCompare(b.metric) || a.dimension.localeCompare(b.dimension) || a.category.localeCompare(b.category,'es'))
const write = (filename, json) => fs.writeFileSync(filename, JSON.stringify(json,null,2) + '\n')
write(path.join(fixtures,'beneficiarios-1000.json'),people)
write(path.join(fixtures,'profesionales-56.json'),professionals)
write(path.join(fixtures,'ofertas-220.json'),offers)
write(path.join(out,'demo-aggregates.json'),{ metadata:{ project:'Impulso Juvenil', fictitious:true, from:'2026-01', to:'2026-10', beneficiaries:people.length, professionals:professionals.length, jobOffers:offers.length, note:'Datos sintéticos. En la interfaz se transfieren únicamente recuentos agregados, nunca fichas individuales.'}, rows:aggregate })

// El seed SQL crea SOLO agregados. No inserta beneficiarios identificables ni usuarios reales.
const q = (v) => `'${String(v).replaceAll("'","''")}'`
const statements = [
  '-- Impulso Juvenil · 1.000 perfiles TOTALMENTE FICTICIOS (agregados anonimizados).',
  '-- Antes de ejecutar: scripts/02-municipal-analytics.sql',
  '-- No altera user, account, session ni tablas previas de autenticación.',
  '-- Repetible (UPSERT); el panel municipal siempre consulta su organismo.',
  'BEGIN;',
  ...communes.map((name,i) => `INSERT INTO "organismo" ("id","nombre","region") VALUES ('demo-muni-${i+1}', ${q('Municipalidad de '+name+' · DEMO')}, 'Biobío') ON CONFLICT ("id") DO NOTHING;`),
]
// Paquetes pequeños para facilitar la ejecución en SQL Editor.
for(let i=0;i<aggregate.length;i+=250){
 const chunk=aggregate.slice(i,i+250)
 const values=chunk.map(r=>{
   const org=`demo-muni-${communes.indexOf(r.territory)+1}`
   return `(${q(org)}, ${q(r.period+'-01')}, ${q(r.territory)}, ${q(r.metric)}, ${q(r.dimension)}, ${q(r.category)}, ${r.value}, 'sintetico')`
 }).join(',\n')
 statements.push(`INSERT INTO "estadistica_municipal" ("organismoId","periodo","territorio","metrica","dimension","categoria","valor","origen") VALUES\n${values}\nON CONFLICT ("organismoId","periodo","territorio","metrica","dimension","categoria") DO UPDATE SET "valor" = EXCLUDED."valor", "origen" = 'sintetico', "updatedAt" = now();`)
}
statements.push('COMMIT;', '-- Total de fichas fuente simuladas: 1000. En la BD se almacenan únicamente indicadores agregados.')
fs.writeFileSync(path.join(root,'scripts','03-seed-demo-1000.sql'),statements.join('\n\n')+'\n')
console.log(JSON.stringify({beneficiarios:people.length,profesionales:professionals.length,ofertas:offers.length,filasAgregadas:aggregate.length,contrataciones:people.filter(p=>p.confirmedPlacement).length,sinEmpleoInicial:people.filter(p=>p.initialEmployment==='Sin empleo').length},null,2))
