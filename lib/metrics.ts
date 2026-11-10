import { PROVINCES, isProvince } from '@/lib/geography'
// Resúmenes municipales agregados: datos de personas desidentificados.
export type IndicatorRow = {
  periodo: string
  territorio: string
  acompanados: number
  sinEmpleoInicial: number
  contrataciones: number
  empleoActual: number
  formacion: number
  busqueda: number
  capacitaciones: number
  postulaciones: number
  entrevistas: number
  profesionales: number
  ofertas: number
  origen: string
}
export type Filters = {desde:string;hasta:string;territorio:string}
export type Summary = {
  acompanados:number;sinEmpleoInicial:number;contrataciones:number;empleoActual:number;
  formacion:number;busqueda:number;capacitaciones:number;postulaciones:number;
  entrevistas:number;profesionales:number;ofertas:number;tasa:number|null
}
export type ReportSnapshot={generadoEn:string;organismo:string;filtros:Filters;resumen:Summary;porTerritorio:(Summary&{territorio:string})[];serie:(Summary&{periodo:string})[];sintetico:boolean}
export const ALL_TERRITORIES='todos'
export const monthLabel=(p:string)=>new Date(`${p.slice(0,7)}-01T00:00:00Z`).toLocaleDateString('es-CL',{month:'short',year:'numeric',timeZone:'UTC'})
export function periodsOf(rows:IndicatorRow[]){return [...new Set(rows.map(r=>r.periodo))].sort()}
export function territoriesOf(rows:IndicatorRow[]){return [...new Set(rows.map(r=>r.territorio))].sort()}
export function applyFilters(rows:IndicatorRow[],f:Filters){
  return rows.filter(r=>r.periodo>=f.desde&&r.periodo<=f.hasta&&(
    f.territorio===ALL_TERRITORIES || r.territorio===f.territorio ||
    (f.territorio.startsWith('Provincia: ') && isProvince(f.territorio.slice(11)) &&
      (PROVINCES[f.territorio.slice(11) as keyof typeof PROVINCES] as readonly string[]).includes(r.territorio))
  ))
}
const numeric=['acompanados','sinEmpleoInicial','contrataciones','empleoActual','formacion','busqueda','capacitaciones','postulaciones','entrevistas','profesionales','ofertas'] as const
export function summarize(rows:IndicatorRow[]):Summary{
  const result=Object.fromEntries(numeric.map(k=>[k,rows.reduce((n,r)=>n+r[k],0)])) as Omit<Summary,'tasa'>
  return {...result,tasa:result.sinEmpleoInicial?round(result.contrataciones*100/result.sinEmpleoInicial):null}
}
export const monthlySeries=(rows:IndicatorRow[])=>periodsOf(rows).map(periodo=>({periodo,...summarize(rows.filter(r=>r.periodo===periodo))}))
export const byTerritory=(rows:IndicatorRow[])=>territoriesOf(rows).map(territorio=>({territorio,...summarize(rows.filter(r=>r.territorio===territorio))}))
export function buildSnapshot(rows:IndicatorRow[],filtros:Filters,organismo:string):ReportSnapshot{
  const filtered=applyFilters(rows,filtros)
  return {generadoEn:new Date().toISOString(),organismo,filtros,resumen:summarize(filtered),porTerritorio:byTerritory(filtered),serie:monthlySeries(filtered),sintetico:filtered.some(r=>r.origen==='sintetico')}
}
export type Comparison={metric:keyof Summary;label:string;a:number|null;b:number|null;diff:number|null;pct:number|null}
const labels:Record<keyof Summary,string>={
  acompanados:'Beneficiarios incorporados',sinEmpleoInicial:'Sin empleo al ingresar',contrataciones:'Contrataciones confirmadas',
  empleoActual:'Con empleo actual',formacion:'En formación',busqueda:'En búsqueda',capacitaciones:'Participación en capacitaciones',
  postulaciones:'Postulaciones',entrevistas:'Entrevistas',profesionales:'Profesionales incorporados',ofertas:'Ofertas publicadas',tasa:'Tasa de inserción (%)'
}
export function compareSummaries(a:Summary,b:Summary,coverageA:number,coverageB:number):Comparison[]{
  return (Object.keys(labels) as (keyof Summary)[]).map(metric=>{
    const va=coverageA?a[metric]:null, vb=coverageB?b[metric]:null
    const diff=va===null||vb===null?null:round(vb-va)
    const pct=diff===null||!va||metric==='tasa'?null:round(diff/va*100)
    return {metric,label:labels[metric],a:va,b:vb,diff,pct}
  })
}
export type Forecast={periodo:string;tasa:number;min:number;max:number}
export const MIN_FORECAST_POINTS=6
export function forecastRate(series:{periodo:string;tasa:number|null}[],horizon=3){
 const points=series.filter((v):v is {periodo:string;tasa:number}=>v.tasa!==null)
 if(points.length<MIN_FORECAST_POINTS)return null
 const n=points.length, xs=points.map((_,i)=>i), ys=points.map(p=>p.tasa)
 const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n
 const sxx=xs.reduce((s,x)=>s+(x-mx)**2,0)
 const slope=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/sxx
 const intercept=my-slope*mx
 const rmse=Math.sqrt(ys.reduce((s,y,i)=>s+(y-(intercept+slope*xs[i]))**2,0)/n)
 const clamp=(x:number)=>round(Math.min(100,Math.max(0,x)))
 const forecast:Forecast[]=Array.from({length:horizon},(_,k)=>{
   const value=intercept+slope*(n+k)
   return {periodo:addMonths(points[n-1].periodo,k+1),tasa:clamp(value),min:clamp(value-2*rmse),max:clamp(value+2*rmse)}
 })
 return {forecast,slope:round(slope),rmse:round(rmse),points:n}
}
export const addMonths=(period:string,n:number)=>{const [y,m]=period.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,10)}
export const round=(x:number)=>Math.round(x*10)/10
export const formatNumber=(x:number|null)=>x===null?'Sin datos':x.toLocaleString('es-CL')
