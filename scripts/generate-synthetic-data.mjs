/**
 * Datos exclusivamente ficticios del Biobío.
 * Preserva los 1.000 beneficiarios, 56 profesionales y 220 ofertas originales;
 * agrega 9.000 beneficiarios, 164 profesionales y 980 ofertas.
 * Guarda fichas NO identificables SOLO bajo scripts/fixtures/ (NO en /public).
 * Publica únicamente las cifras municipales agregadas en data/ y los seeds SQL.
 */
import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(),fixtures=path.join(root,'scripts/fixtures'),dataDir=path.join(root,'data')
fs.mkdirSync(fixtures,{recursive:true});fs.mkdirSync(dataDir,{recursive:true})
const read=f=>JSON.parse(fs.readFileSync(path.join(fixtures,f),'utf8'))
const oldPeople=read('beneficiarios-1000.json'), oldProfessionals=read('profesionales-56.json'), oldOffers=read('ofertas-220.json')
const provinces={
  'Concepción':['Concepción','Coronel','Chiguayante','Florida','Hualpén','Hualqui','Lota','Penco','San Pedro de la Paz','Santa Juana','Talcahuano','Tomé'],
  'Biobío':['Alto Biobío','Antuco','Cabrero','Laja','Los Ángeles','Mulchén','Nacimiento','Negrete','Quilaco','Quilleco','San Rosendo','Santa Bárbara','Tucapel','Yumbel'],
  'Arauco':['Arauco','Cañete','Contulmo','Curanilahue','Lebu','Los Álamos','Tirúa'],
}
const allCommunes=Object.values(provinces).flat()
const originals=['Concepción','Chiguayante','Talcahuano','Hualpén','San Pedro de la Paz','Hualqui']
const orgId=t=>{
  const old=originals.indexOf(t)
  return old>=0?`demo-muni-${old+1}`:`demo-muni-${String(7+allCommunes.filter(c=>!originals.includes(c)).indexOf(t)).padStart(2,'0')}`
}
const months=Array.from({length:10},(_,i)=>`2026-${String(i+1).padStart(2,'0')}`)
const ageBands=['18–24','25–29','30–44','45 o más']
const schooling=['Básica incompleta','Básica completa','Media incompleta','Media completa','Técnica o superior']
const barriers=['Sin experiencia','Necesita capacitación','Transporte','Responsabilidades de cuidado','Brecha digital','Sin barrera declarada']
const sectors=['Comercio','Servicios generales','Logística y bodega','Alimentación','Áreas verdes','Administración básica']
const professions=['Trabajo social','Psicología','Terapia ocupacional','Otra profesión social']
let seed=20261111
const rand=()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296}
const weighted=(arr,weights)=>{let x=rand()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<arr.length;i++){x-=weights[i];if(x<=0)return arr[i]}return arr.at(-1)}
const pick=a=>a[Math.floor(rand()*a.length)]
// Pesos totalmente ficticios: NO representan poblaciones, censos ni demanda real.
const weights=allCommunes.map(c=>({'Concepción':26,'Los Ángeles':21,'Talcahuano':15,'Coronel':14,'San Pedro de la Paz':13,'Chiguayante':11,'Hualpén':10,'Lota':8,'Cañete':9,'Arauco':9,'Lebu':7,'Tomé':8,'Nacimiento':7,'Cabrero':7,'Curanilahue':7}[c]??4))
const newPeople=Array.from({length:9000},(_,i)=>{
  const territory=weighted(allCommunes,weights)
  const entryMonth=weighted(months,[7,8,9,10,11,12,12,12,10,9])
  const ageBand=weighted(ageBands,[40,33,20,7])
  const education=weighted(schooling,[8,12,19,46,15])
  const primaryBarrier=weighted(barriers,[26,20,17,13,13,11])
  const sectorInterest=weighted(sectors,[28,21,17,15,12,7])
  const withoutJob=rand()<.86
  const hired=withoutJob&&rand()<(primaryBarrier==='Sin barrera declarada'?.4:.26)
  const inTraining=withoutJob&&!hired&&rand()<.28
  const currentStatus=hired||!withoutJob?'Con empleo':inTraining?'En formación':'En búsqueda'
  const applications=withoutJob?(hired?1+Math.floor(rand()*4):Math.floor(rand()*5)):(rand()<.2?1:0)
  const interviews=hired?1+Math.floor(rand()*2):Math.min(applications,rand()<.34?1:0)
  return {simulationId:`SIM-B-${String(1001+i).padStart(5,'0')}`,territory,entryMonth,ageBand,education,primaryBarrier,sectorInterest,
    initialEmployment:withoutJob?'Sin empleo':'Con empleo',currentStatus,confirmedPlacement:hired,
    trainingParticipation:inTraining||(withoutJob&&rand()<.19),applications,interviews}
})
const newProfessionals=Array.from({length:164},(_,i)=>({simulationId:`SIM-P-${String(57+i).padStart(3,'0')}`,
  territory:weighted(allCommunes,weights),registrationMonth:pick(months),profession:weighted(professions,[45,26,20,9])}))
const newOffers=Array.from({length:980},(_,i)=>({simulationId:`SIM-O-${String(221+i).padStart(4,'0')}`,
  territory:weighted(allCommunes,weights),publishedMonth:pick(months),sector:weighted(sectors,[25,24,19,16,10,6]),
  experience:weighted(['Sin experiencia','Experiencia básica','Especializada'],[64,31,5]),
  workday:weighted(['Completa','Parcial','Turnos'],[43,32,25]),status:rand()<.22?'Activa':'Cerrada'}))
const people=[...oldPeople,...newPeople],pros=[...oldProfessionals,...newProfessionals],offers=[...oldOffers,...newOffers]
const write=(p,data)=>fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n')
write(path.join(fixtures,'beneficiarios-9000-adicionales.json'),newPeople)
write(path.join(fixtures,'profesionales-164-adicionales.json'),newProfessionals)
write(path.join(fixtures,'ofertas-980-adicionales.json'),newOffers)
// Métricas con misma definición que la versión anterior.
const aggregates=new Map()
const add=(period,territory,metric,dimension,category,amount=1)=>{
  const key=[period,territory,metric,dimension,category].join('|')
  if(!aggregates.has(key))aggregates.set(key,{period,territory,metric,dimension,category,value:0,source:'sintetico'})
  aggregates.get(key).value+=amount
}
for(const p of people){
  const base=[p.entryMonth,p.territory]
  add(...base,'beneficiarios','resumen','total')
  if(p.initialEmployment==='Sin empleo')add(...base,'sin_empleo_inicial','resumen','total')
  if(p.currentStatus==='Con empleo')add(...base,'con_empleo_actual','resumen','total')
  if(p.confirmedPlacement)add(...base,'contrataciones','resumen','total')
  if(p.currentStatus==='En formación')add(...base,'en_formacion','resumen','total')
  if(p.currentStatus==='En búsqueda')add(...base,'en_busqueda','resumen','total')
  if(p.trainingParticipation)add(...base,'participacion_capacitacion','resumen','total')
  if(p.applications)add(...base,'postulaciones','resumen','total',p.applications)
  if(p.interviews)add(...base,'entrevistas','resumen','total',p.interviews)
  add(...base,'beneficiarios','edad',p.ageBand)
  add(...base,'beneficiarios','educacion',p.education)
  add(...base,'beneficiarios','barrera',p.primaryBarrier)
  add(...base,'beneficiarios','interes_laboral',p.sectorInterest)
}
for(const p of pros){add(p.registrationMonth,p.territory,'profesionales','resumen','total');add(p.registrationMonth,p.territory,'profesionales','profesion',p.profession)}
for(const o of offers){
  add(o.publishedMonth,o.territory,'ofertas','resumen','total')
  add(o.publishedMonth,o.territory,'ofertas','sector_oferta',o.sector)
  add(o.publishedMonth,o.territory,'ofertas','estado_oferta',o.status)
  add(o.publishedMonth,o.territory,'ofertas','jornada',o.workday)
  add(o.publishedMonth,o.territory,'ofertas','experiencia_requerida',o.experience)
}
const rows=[...aggregates.values()].sort((a,b)=>a.period.localeCompare(b.period)||a.territory.localeCompare(b.territory,'es')||a.metric.localeCompare(b.metric)||a.dimension.localeCompare(b.dimension)||a.category.localeCompare(b.category,'es'))
write(path.join(dataDir,'demo-aggregates.json'),{metadata:{project:'Impulso Juvenil',fictitious:true,from:'2026-01',to:'2026-10',beneficiaries:10000,addedBeneficiaries:9000,professionals:220,jobOffers:1200,
  region:'Biobío',provinces:3,communes:33,note:'Cohorte simulada, sin identidades personales. La publicación expone solo agregados.'},rows})
// Los nuevos agregados incluyen la cohorte completa (1000+9000). UPSERT actualiza los conteos antiguos.
// También garantiza que nunca haya municipios de otras regiones.
const q=s=>`'${String(s).replaceAll("'","''")}'`
for(const [prov,communes] of Object.entries(provinces)){
  const statements=[`-- Portal municipal v3 · ${prov} · totales ficticios de 10.000 personas`,
    '-- Ejecutar después de 02-municipal-analytics.sql y 04-accesos-territoriales.sql',
    '-- Idempotente: actualiza los agregados sintéticos de la versión anterior sin alterar cuentas.',
    'BEGIN;',
    ...communes.map(t=>`INSERT INTO "organismo" ("id","nombre","region") VALUES (${q(orgId(t))},${q('Municipalidad de '+t+' · DEMO')},'Biobío') ON CONFLICT ("id") DO NOTHING;`)]
  const subset=rows.filter(r=>communes.includes(r.territory))
  for(let i=0;i<subset.length;i+=200){
    const values=subset.slice(i,i+200).map(r=>`(${q(orgId(r.territory))},${q(r.period+'-01')},${q(r.territory)},${q(r.metric)},${q(r.dimension)},${q(r.category)},${r.value},'sintetico')`).join(',\n')
    statements.push(`INSERT INTO "estadistica_municipal" ("organismoId","periodo","territorio","metrica","dimension","categoria","valor","origen") VALUES\n${values}\nON CONFLICT ("organismoId","periodo","territorio","metrica","dimension","categoria") DO UPDATE SET "valor"=EXCLUDED."valor", "origen"='sintetico', "updatedAt"=now() WHERE "estadistica_municipal"."origen"='sintetico';`)
  }
  statements.push('COMMIT;')
  const file=prov==='Concepción'?'05-demo-concepcion.sql':prov==='Biobío'?'06-demo-biobio.sql':'07-demo-arauco.sql'
  fs.writeFileSync(path.join(root,'scripts',file),statements.join('\n\n')+'\n')
}
console.log(JSON.stringify({beneficiarios:people.length,nuevos:newPeople.length,profesionales:pros.length,ofertas:offers.length,filasAgregadas:rows.length,
  contrataciones:people.filter(x=>x.confirmedPlacement).length,comunas:new Set(rows.map(r=>r.territory)).size},null,2))
