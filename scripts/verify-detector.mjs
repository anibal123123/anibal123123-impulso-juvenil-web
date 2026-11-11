import fs from 'node:fs'
import assert from 'node:assert/strict'
import { analyzeLaborGaps } from '../lib/labor-gaps.ts'
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'))
const all=read('../data/demo-aggregates.json').rows
const test=(label,cond)=>{assert.ok(cond,label);console.log(`✓ ${label}`)}
const region=analyzeLaborGaps(all)
test('Región: detector preparado',region.ready)
test('Región: 10.000 personas',region.totals.interested===10000)
test('Región: 1.200 publicaciones',region.totals.publications===1200)
test('Región: seis sectores',region.sectors.length===6)
test('Región: orientación vinculada a datos',region.sectors.every(s=>s.recommendation.length>30 && !!s.label))
const concepcion=all.filter(x=>x.territory==='Concepción')
const municipal=analyzeLaborGaps(concepcion)
test('Municipal: totales limitados a una comuna',municipal.ready && municipal.totals.interested>0 && municipal.totals.interested<10000)
const arauco=['Arauco','Cañete','Contulmo','Curanilahue','Lebu','Los Álamos','Tirúa']
const province=analyzeLaborGaps(all.filter(x=>arauco.includes(x.territory)))
test('Provincial: solo siete comunas',province.ready && province.totals.interested>municipal.totals.interested && province.totals.interested<10000)
const incomplete=all.filter(r=>!(r.territory==='Concepción' && r.dimension==='sector_oferta'))
test('Distribución incompleta no genera brechas falsas',!analyzeLaborGaps(incomplete).ready)
test('Sin indicadores no genera brechas',!analyzeLaborGaps([]).ready)
const tiny=[
{period:'2026-01',territory:'Concepción',metric:'beneficiarios',dimension:'resumen',category:'total',value:3,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'beneficiarios',dimension:'interes_laboral',category:'Comercio',value:3,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'ofertas',dimension:'resumen',category:'total',value:2,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'ofertas',dimension:'sector_oferta',category:'Comercio',value:2,source:'sintetico'},
]
const suppressed=analyzeLaborGaps(tiny)
test('Grupos pequeños se marcan sin desglose',suppressed.ready && suppressed.sectors[0].showCounts===false)
console.log('\n✓ Todas las verificaciones del detector fueron satisfactorias.')
const distinct=[
{period:'2026-01',territory:'Concepción',metric:'beneficiarios',dimension:'resumen',category:'total',value:100,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'beneficiarios',dimension:'interes_laboral',category:'Comercio',value:80,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'beneficiarios',dimension:'interes_laboral',category:'Alimentación',value:20,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'ofertas',dimension:'resumen',category:'total',value:20,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'ofertas',dimension:'sector_oferta',category:'Comercio',value:5,source:'sintetico'},
{period:'2026-01',territory:'Concepción',metric:'ofertas',dimension:'sector_oferta',category:'Alimentación',value:15,source:'sintetico'},
]
const relative=analyzeLaborGaps(distinct)
test('Comparación proporcional: interés por encima de publicaciones',relative.sectors.find(s=>s.sector==='Comercio')?.status==='interes_superior')
test('Comparación proporcional: publicaciones por encima del interés',relative.sectors.find(s=>s.sector==='Alimentación')?.status==='publicaciones_superiores')
