import type { MunicipalMetric } from './municipal-analytics'

/**
 * Detector explicable de desajustes en la DISTRIBUCIÓN de publicaciones y áreas de interés.
 * Se construye SOLO sobre indicadores agregados previamente filtrados por el servidor.
 * Nunca divide publicaciones por personas para inferir vacantes: compara participaciones porcentuales.
 * No usa perfiles identificables, resultados individuales, modelos externos ni predicciones.
 */
export type GapStatus = 'interes_sin_publicaciones' | 'interes_superior' | 'publicaciones_sin_interes' | 'publicaciones_superiores' | 'similar' | 'muestra_reducida'
export type SectorGap = {
  sector: string
  interested: number
  publications: number
  interestShare: number
  publicationShare: number
  shareDifference: number
  relativeIndex: number | null
  status: GapStatus
  severity: 'alta' | 'media' | 'observacion'
  label: string
  recommendation: string
  showCounts: boolean
}
export type LaborGapAnalysis = {
  ready: boolean
  problem: string | null
  sectors: SectorGap[]
  totals: { interested: number; publications: number; highSignals: number; reviewed: number }
  needsTrainingCount: number | null
  sourceKinds: string[]
}

const k = (row: MunicipalMetric) => `${row.period}|${row.territory}`
const nameKey = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g,' ')
const smallCount = (n: number) => n > 0 && n < 5
const statusGuide: Record<GapStatus, {label: string; severity: SectorGap['severity']; recommendation: string}> = {
  interes_sin_publicaciones: {
    label: 'Interés sin publicaciones', severity: 'alta',
    recommendation: 'Explorar convenios con empleadores de esta área, revisar oportunidades cercanas y orientar sobre opciones alternativas. No se registraron publicaciones de este sector en el territorio y periodo seleccionados.',
  },
  interes_superior: {
    label: 'Interés relativamente alto', severity: 'alta',
    recommendation: 'El sector concentra proporcionalmente más preferencias que publicaciones. Evaluar intermediación laboral y acuerdos con empleadores; verificar requisitos antes de planificar capacitaciones.',
  },
  publicaciones_sin_interes: {
    label: 'Publicaciones sin interés registrado', severity: 'media',
    recommendation: 'Difundir estas oportunidades entre profesionales y beneficiarios, y revisar si sus requisitos, condiciones y desplazamientos explican el bajo interés.',
  },
  publicaciones_superiores: {
    label: 'Oferta relativamente alta', severity: 'media',
    recommendation: 'El sector concentra proporcionalmente más publicaciones que preferencias. Explorar orientación y difusión de estas oportunidades; antes de recomendar postulaciones, verificar requisitos y accesibilidad.',
  },
  similar: {
    label: 'Distribuciones similares', severity: 'observacion',
    recommendation: 'Mantener seguimiento de la proporción de publicaciones y preferencias. Una proporción similar no demuestra compatibilidad laboral individual.',
  },
  muestra_reducida: {
    label: 'Muestra demasiado pequeña', severity: 'observacion',
    recommendation: 'Ampliar el periodo o analizar un ámbito autorizado más amplio antes de sacar conclusiones. Los recuentos pequeños no se presentan en esta sección.',
  },
}

/**
 * Verifica que para cada comuna/mes la suma de intereses y sectores corresponda a
 * los totales observados. Sin ambas distribuciones completas no calcula brechas.
 */
export function analyzeLaborGaps(rows: MunicipalMetric[]): LaborGapAnalysis {
  const empty = (problem: string): LaborGapAnalysis => ({
    ready: false, problem, sectors: [],
    totals: {interested:0, publications:0, highSignals:0, reviewed:0},
    needsTrainingCount: null, sourceKinds: [...new Set(rows.map(r => r.source))],
  })
  const byBucket = new Map<string, {totalPeople: number; totalOffers: number; interests: number; sectors: number; barriers: number}>()
  const interest = new Map<string, {name:string; count:number}>()
  const offer = new Map<string, {name:string; count:number}>()
  let needsTrainingCount = 0
  let trainingCategoryFound = false
  for(const r of rows) {
    if(!Number.isSafeInteger(r.value) || r.value < 0) return empty('Hay indicadores inconsistentes. Revisa los valores importados antes de calcular el detector.')
    const bucket = byBucket.get(k(r)) ?? {totalPeople:0,totalOffers:0,interests:0,sectors:0,barriers:0}
    byBucket.set(k(r),bucket)
    if(r.metric==='beneficiarios' && r.dimension==='resumen' && r.category==='total') bucket.totalPeople+=r.value
    if(r.metric==='ofertas' && r.dimension==='resumen' && r.category==='total') bucket.totalOffers+=r.value
    if(r.metric==='beneficiarios' && r.dimension==='interes_laboral') {
      bucket.interests+=r.value
      const key=nameKey(r.category)
      const item=interest.get(key)??{name:r.category,count:0}
      item.count+=r.value;interest.set(key,item)
    }
    if(r.metric==='ofertas' && r.dimension==='sector_oferta') {
      bucket.sectors+=r.value
      const key=nameKey(r.category)
      const item=offer.get(key)??{name:r.category,count:0}
      item.count+=r.value;offer.set(key,item)
    }
    if(r.metric==='beneficiarios' && r.dimension==='barrera') bucket.barriers+=r.value
    if(r.metric==='beneficiarios' && r.dimension==='barrera' && nameKey(r.category)==='necesita capacitacion') {
      needsTrainingCount+=r.value;trainingCategoryFound=true
    }
  }
  if(!byBucket.size || ![...byBucket.values()].some(v=>v.totalPeople>0 || v.totalOffers>0)) {
    return empty('No hay beneficiarios ni ofertas en el periodo y territorio elegidos.')
  }
  const bad = [...byBucket.values()].some(b=>b.totalPeople!==b.interests || b.totalOffers!==b.sectors)
  if (bad) return empty('Faltan categorías de interés laboral o sectores de ofertas para alguna comuna y mes. Importa los desgloses completos antes de comparar.')
  const totals = [...byBucket.values()].reduce((x,b)=>({people:x.people+b.totalPeople,offers:x.offers+b.totalOffers}),{people:0,offers:0})
  if(!interest.size && !offer.size) return empty('No existen distribuciones laborales para generar el diagnóstico.')
  const keys = [...new Set([...interest.keys(),...offer.keys()])]
  const sectors: SectorGap[] = keys.map(key=>{
    const interested=interest.get(key)?.count??0
    const publications=offer.get(key)?.count??0
    const interestShare = totals.people ? 100*interested/totals.people : 0
    const publicationShare = totals.offers ? 100*publications/totals.offers : 0
    const relativeIndex = interestShare > 0 ? publicationShare/interestShare : null
    const status: GapStatus = smallCount(interested)||smallCount(publications) ? 'muestra_reducida' :
      interested>0 && publications===0 ? 'interes_sin_publicaciones' :
      interested===0 && publications>0 ? 'publicaciones_sin_interes' :
      relativeIndex!==null && relativeIndex<0.8 ? 'interes_superior' :
      relativeIndex!==null && relativeIndex>1.2 ? 'publicaciones_superiores' : 'similar'
    const guide=statusGuide[status]
    return {
      sector:interest.get(key)?.name??offer.get(key)?.name??key,
      interested,publications,interestShare:Math.round(interestShare*10)/10,
      publicationShare:Math.round(publicationShare*10)/10,
      shareDifference:Math.round((publicationShare-interestShare)*10)/10,
      relativeIndex:relativeIndex===null?null:Math.round(relativeIndex*100)/100,
      status,severity:guide.severity,label:guide.label,recommendation:guide.recommendation,
      showCounts:status!=='muestra_reducida',
    }
  }).sort((a,b)=>{
    const priority=(v:SectorGap)=>v.severity==='alta'?0:v.severity==='media'?1:v.severity==='observacion'&&v.showCounts?2:3
    return priority(a)-priority(b)||Math.abs(b.shareDifference)-Math.abs(a.shareDifference)||a.sector.localeCompare(b.sector,'es')
  })
  return {
    ready:true,problem:null,sectors,
    totals:{interested:totals.people,publications:totals.offers,
      highSignals:sectors.filter(s=>s.severity==='alta').length,
      reviewed:sectors.filter(s=>s.showCounts).length},
    needsTrainingCount:trainingCategoryFound && [...byBucket.values()].every(b=>b.totalPeople===b.barriers)?needsTrainingCount:null,
    sourceKinds:[...new Set(rows.map(r=>r.source))],
  }
}
