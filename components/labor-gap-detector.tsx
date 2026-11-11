'use client'

import { useState } from 'react'
import { ArrowDownUp, AlertCircle, Download, Lightbulb, Radar, ShieldCheck, TrendingUp } from 'lucide-react'
import { analyzeLaborGaps, type SectorGap } from '@/lib/labor-gaps'
import { formatCount, type MunicipalMetric } from '@/lib/municipal-analytics'

type Props = {rows: MunicipalMetric[]; scope: string}
type Filter = 'todas' | 'alta' | 'media' | 'observacion'
const labels: Record<Filter,string> = { todas:'Todos los sectores', alta:'Atención prioritaria', media:'Oportunidades a explorar', observacion:'Seguimiento' }

function safeCsvCell(value:string|number) {
  const txt=String(value)
  const safe=/^[=+@\-\t\r]/.test(txt)?`'${txt}`:txt
  return `"${safe.replaceAll('"','""')}"`
}
function downloadDiagnosis(rows: SectorGap[], scope:string) {
  const headers=['Sector','Personas interesadas','% de personas interesadas','Publicaciones laborales','% de publicaciones','Diferencia en puntos porcentuales','Señal','Orientación']
  const visible=rows.filter(row=>row.showCounts)
  const csv='\uFEFF'+[
    ['IMPULSO JUVENIL — DIAGNÓSTICO DESCRIPTIVO DE BRECHAS LABORALES'].map(safeCsvCell).join(';'),
    ['Ámbito y periodo',scope].map(safeCsvCell).join(';'),
    ['Nota','Se comparan porcentajes relativos de cada sector, no personas contra publicaciones en valores absolutos. No mide compatibilidad ni vacantes confirmadas.'].map(safeCsvCell).join(';'),
    headers.map(safeCsvCell).join(';'),
    ...visible.map(r=>[r.sector,r.interested,r.interestShare,r.publications,r.publicationShare,r.shareDifference,r.label,r.recommendation].map(safeCsvCell).join(';')),
  ].join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a')
  a.href=url;a.download='impulso-juvenil-brechas-laborales.csv';document.body.appendChild(a);a.click();a.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

export function LaborGapDetector({rows,scope}:Props){
  const analysis=analyzeLaborGaps(rows)
  const [filter,setFilter]=useState<Filter>('todas')
  const [selected,setSelected]=useState<string|null>(null)
  if(!analysis.ready){
    return <section className="panel labor-empty"><AlertCircle size={24}/><h2>Diagnóstico no disponible</h2><p>{analysis.problem}</p><p>El detector requiere indicadores agregados por comuna, mes, área de interés y sector de las ofertas. No inventa datos faltantes.</p></section>
  }
  const visible=analysis.sectors.filter(s=>filter==='todas'||s.severity===filter)
  const active=visible.find(s=>s.sector===selected)??visible[0]??null
  const maxShare=Math.max(1,...analysis.sectors.map(s=>Math.max(s.interestShare,s.publicationShare)))
  const trainingShare=analysis.needsTrainingCount===null||!analysis.totals.interested?null:Math.round(1000*analysis.needsTrainingCount/analysis.totals.interested)/10
  return <div className="labor-detector">
    <div className="labor-heading"><div><div className="labor-eyebrow"><Radar size={15}/> INTELIGENCIA LABORAL EXPLICABLE</div><h2>Detector inteligente de brechas laborales</h2><p>Compara la participación porcentual de cada sector en los intereses laborales y en las ofertas publicadas, dentro del ámbito autorizado.</p></div><button className="secondary-action" onClick={()=>downloadDiagnosis(analysis.sectors,scope)} disabled={!analysis.totals.reviewed}><Download size={16}/> Descargar diagnóstico CSV</button></div>
    <div className="labor-kpis">
      <div><span>Personas con interés registrado</span><strong>{formatCount(analysis.totals.interested)}</strong><small>Personas, no postulaciones</small></div>
      <div><span>Ofertas publicadas</span><strong>{formatCount(analysis.totals.publications)}</strong><small>Publicaciones, no vacantes confirmadas</small></div>
      <div><span>Sectores comparados</span><strong>{formatCount(analysis.totals.reviewed)}</strong><small>Con muestra suficiente</small></div>
      <div><span>Señales prioritarias</span><strong>{formatCount(analysis.totals.highSignals)}</strong><small>Sectores con interés relativo elevado</small></div>
    </div>
    <div className="labor-layout">
      <section className="panel labor-chart-panel">
        <div className="panel-heading"><div><h2>Comparación por sector</h2><p>Selecciona un sector para revisar su orientación sugerida</p></div><ArrowDownUp size={17}/></div>
        <div className="labor-filter-buttons" role="group" aria-label="Filtrar señales de brecha">{(Object.keys(labels) as Filter[]).map(v=><button key={v} type="button" className={filter===v?'chosen':''} onClick={()=>{setFilter(v);setSelected(null)}} aria-pressed={filter===v}>{labels[v]}</button>)}</div>
        <div className="labor-legend"><span><i className="labor-dot interested"/> % de intereses</span><span><i className="labor-dot postings"/> % de publicaciones</span></div>
        <div className="labor-sector-list">{visible.length?visible.map(sector=><button type="button" key={sector.sector} onClick={()=>setSelected(sector.sector)} className={`labor-sector ${active?.sector===sector.sector?'selected':''}`} aria-pressed={active?.sector===sector.sector}>
          <div className="labor-sector-title"><strong>{sector.sector}</strong><span className={`labor-pill ${sector.severity}`}>{sector.label}</span></div>
          {sector.showCounts ? <>
            <div className="labor-pair"><span>Interés</span><div className="labor-bar-track"><i className="labor-bar interested" style={{width:`${100*sector.interestShare/maxShare}%`}}/></div><b>{sector.interestShare.toLocaleString('es-CL')} %</b></div>
            <div className="labor-pair"><span>Ofertas</span><div className="labor-bar-track"><i className="labor-bar postings" style={{width:`${100*sector.publicationShare/maxShare}%`}}/></div><b>{sector.publicationShare.toLocaleString('es-CL')} %</b></div>
            <p className="labor-sector-counts">{formatCount(sector.interested)} personas interesadas · {formatCount(sector.publications)} publicaciones</p>
          </>:<p className="labor-small-note">Valores pequeños omitidos para reducir el riesgo de identificación indirecta.</p>}
        </button>):<p className="analytics-note">No hay sectores para este filtro. Selecciona otra categoría.</p>}</div>
      </section>
      <aside className="panel labor-recommendations" aria-live="polite">
        <div className="panel-heading"><div><h2>Lectura y acción sugerida</h2><p>Reglas verificables, no predicciones</p></div><Lightbulb size={20}/></div>
        {active?<><div className="labor-active-sector"><span>SECTOR SELECCIONADO</span><h3>{active.sector}</h3><div className={`labor-pill ${active.severity}`}>{active.label}</div></div>
          {active.showCounts&&<div className="labor-balance"><span>Diferencia entre participaciones</span><strong>{active.shareDifference>0?'+':''}{active.shareDifference.toLocaleString('es-CL')} pp</strong><small>Porcentaje de ofertas del sector menos porcentaje de personas interesadas en él.</small></div>}
          <p className="labor-recommendation-text">{active.recommendation}</p>
          <div className="labor-rule"><ShieldCheck size={17}/><span>{active.status==='muestra_reducida'?'Se omiten sectores con recuentos entre 1 y 4.':active.status==='interes_sin_publicaciones'||active.status==='publicaciones_sin_interes'?'En uno de los dos grupos no se observaron registros.':'Señal al superar una desviación relativa del 20 % entre las participaciones sectoriales.'}</span></div>
        </>:<p className="analytics-note">Selecciona otro filtro para revisar orientaciones.</p>}
        {trainingShare!==null&&analysis.needsTrainingCount!==null&&<div className="labor-training"><TrendingUp size={18}/><div><strong>Capacitación a escala territorial</strong><p>{formatCount(analysis.needsTrainingCount)} personas ({trainingShare.toLocaleString('es-CL')} %) registraron «Necesita capacitación» como barrera principal. Este dato no está cruzado por sector: no permite atribuirles una brecha específica.</p></div></div>}
      </aside>
    </div>
    <section className="labor-method panel"><div><ShieldCheck size={19}/><strong>Metodología y límites</strong></div><p>Se compara el porcentaje de personas interesadas en cada sector con el porcentaje de publicaciones del mismo sector. Se destacan desviaciones relativas superiores al 20 %; no se comparan recuentos absolutos como si fueran unidades equivalentes. No mide puestos vacantes, competencias verificadas, compatibilidad individual ni contrataciones atribuibles. El periodo de ingreso de beneficiarios y el periodo de publicación de ofertas pueden diferir. Las sugerencias son reglas exploratorias para planificación, no decisiones automáticas.</p>{analysis.sourceKinds.includes('sintetico')&&<p><strong>Datos de demostración:</strong> las señales se basan total o parcialmente en información ficticia de la Región del Biobío.</p>}</section>
  </div>
}
