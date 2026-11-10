'use client'
import { useState, type ChangeEvent } from 'react'
import { ArrowUpRight, ArrowRight, BriefcaseBusiness, CalendarDays, ChevronRight, Download, FileDown, FileSpreadsheet, FileText, GraduationCap, HeartHandshake, LayoutDashboard, MapPin, Menu, ShieldCheck, Sprout, Users, X, CircleHelp, UserRoundCheck, School, ChartNoAxesCombined } from 'lucide-react'
import { demoMetrics } from '@/lib/demo-data'
import { exportReport } from '@/lib/export-report'
import { ImpactCharts } from './impact-charts'
import { byTerritoryMunicipal, distribution, filterMunicipal, formatCount, periodOptionsFor, summarizeMunicipal, type MunicipalMetric } from '@/lib/municipal-analytics'

const sections = [
  {label:'Resumen general',icon:LayoutDashboard},
  {label:'Beneficiarios',icon:Users},
  {label:'Empleabilidad',icon:BriefcaseBusiness},
  {label:'Profesionales',icon:UserRoundCheck},
  {label:'Bolsa de trabajo',icon:ChartNoAxesCombined},
  {label:'Territorios',icon:MapPin},
  {label:'Reportes',icon:FileText},
]

type Props = {authenticatedUser?: string, data?:MunicipalMetric[], organismoNombre?:string, canImport?:boolean}

function Breakdown({title,subtitle,items,total}: {title:string,subtitle:string,items:{label:string,value:number}[],total:number}) {
  return <section className="panel breakdown-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <div className="breakdown-list">{items.length ? items.map(({label,value}) => <div key={label} className="breakdown-row"><div><span>{label}</span><strong>{formatCount(value)}</strong></div><div className="breakdown-track"><span style={{width:`${total ? 100*value/total : 0}%`}}/></div></div>) : <p className="analytics-note">Sin datos para estos filtros.</p>}</div>
  </section>
}
function InlineStat({label,value,detail}: {label:string,value:string,detail:string}) {
  return <div className="inline-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

export function Dashboard({authenticatedUser,data,organismoNombre,canImport=false}:Props={}) {
  const sourceRows = data?.length ? data : demoMetrics
  const territories = [...new Set(sourceRows.map(r=>r.territory))].sort((a,b)=>a.localeCompare(b,'es'))
  const [active,setActive] = useState('Resumen general')
  const [territory,setTerritory] = useState('Todos los territorios')
  const periodOptions=periodOptionsFor(sourceRows)
  const [period,setPeriod] = useState<string>(periodOptions[0].value)
  const [menu,setMenu] = useState(false)
  const [busy,setBusy] = useState('')
  const [notice,setNotice] = useState('')
  const rows=filterMunicipal(sourceRows,period,territory)
  const s=summarizeMunicipal(rows)
  const isDemo=rows.some(r=>r.source==='sintetico') || !data?.length
  const hasMixedOrigins=rows.some(r=>r.source==='sintetico')&&rows.some(r=>r.source==='importado')
  const scopes = periodOptions.find(p=>p.value===period)?.label ?? period
  const periodLabel=`${territory} · ${scopes}`
  const territoryBreakdown=byTerritoryMunicipal(rows)
  const displayedTerritories=territory==='Todos los territorios'?territories:[territory]
  async function download(format:'pdf'|'xlsx') {
    setBusy(format);setNotice('')
    try {await exportReport(format, rows, `${organismoNombre ?? 'Portal municipal'} · ${periodLabel}`);setNotice('Reporte generado correctamente.')}
    catch {setNotice('No se pudo generar el reporte. Intenta nuevamente.')}
    finally {setBusy('')}
  }
  async function uploadCsv(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return
    event.target.value='';setBusy('import');setNotice('')
    try{
      const form=new FormData();form.set('file',file)
      const response=await fetch('/api/municipal/import',{method:'POST',body:form})
      const result=await response.json()
      setNotice(response.ok?`${result.guardadas} indicadores importados. Actualiza la página para verlos.`:(result.error??'No se pudo importar el archivo.'))
    }catch {setNotice('Error de red al importar el archivo.')}
    finally{setBusy('')}
  }
  const changeSection=(label:string)=>{setActive(label);setMenu(false)}
  const mainMetrics=[
    {label:'Personas incorporadas',value:formatCount(s.beneficiaries),icon:Users,foot:'Cohortes del periodo',tag:'Cobertura'},
    {label:'Contrataciones confirmadas',value:formatCount(s.hires),icon:BriefcaseBusiness,foot:'Entre quienes ingresaron sin empleo',tag:'Resultados'},
    {label:'Tasa de inserción laboral',value:`${s.insertionRate.toLocaleString('es-CL')}%`,icon:ArrowUpRight,foot:'Contrataciones / sin empleo inicial',tag:'Indicador'},
    {label:'Ofertas publicadas',value:formatCount(s.offers),icon:FileText,foot:'Bolsa de trabajo, por publicación',tag:'Oportunidades'},
  ]
  const kpiCards=<div className="metric-grid">{mainMetrics.map(({label,value,icon:Icon,foot,tag})=><section className="metric-card" key={label}><div className="metric-label">{label}<span><Icon size={17}/></span></div><strong className="metric-value">{value}</strong><div className="metric-footer"><span>{tag}</span>{foot}</div></section>)}</div>
  const totals=<div className="inline-stat-grid"><InlineStat label="Profesionales incorporados" value={formatCount(s.professionals)} detail="Registros profesionales (sin datos personales)"/><InlineStat label="Sin empleo al ingreso" value={formatCount(s.unemployedAtEntry)} detail="Denominador para la tasa de inserción"/><InlineStat label="Postulaciones" value={formatCount(s.applications)} detail="Eventos registrados, no personas únicas"/><InlineStat label="Entrevistas" value={formatCount(s.interviews)} detail="Entrevistas registradas"/></div>
  const territoryTable=<section className="panel territory-panel"><div className="panel-heading"><div><h2>Resultados por comuna</h2><p>Beneficiarios, inserciones y cobertura institucional</p></div><button className="text-button" onClick={()=>active==='Territorios'?download('xlsx'):changeSection('Territorios')}>{active==='Territorios'?'Exportar Excel':'Ver detalle'}<ArrowRight size={15}/></button></div><div className="table-scroll"><table><thead><tr><th>Comuna</th><th>Incorporados</th><th>Sin empleo inicial</th><th>Inserciones</th><th>Tasa</th><th>Profesionales</th><th>Ofertas</th></tr></thead><tbody>{displayedTerritories.map(t=>{const item=territoryBreakdown.find(r=>r.territory===t);return <tr key={t}><td><span className="territory-icon"><MapPin size={14}/></span>{t}</td><td>{formatCount(item?.beneficiaries??0)}</td><td>{formatCount(item?.unemployedAtEntry??0)}</td><td>{formatCount(item?.hires??0)}</td><td>{item?.insertionRate??0}%</td><td>{item?.professionals??0}</td><td>{item?.offers??0}</td></tr>})}</tbody></table></div></section>
  const profileTotal=s.beneficiaries
  const offersTotal=s.offers
  return <div className="app-shell"><aside className={`sidebar ${menu?'open':''}`}><a className="brand" href="/"><span className="brand-icon"><Sprout size={25}/></span><span>impulso<span className="brand-second">juvenil<span className="brand-period">.</span></span></span></a><div className="workspace"><span className="workspace-icon"><HeartHandshake size={18}/></span><div><strong>Portal municipal</strong><small>Datos que apoyan decisiones</small></div></div><p className="nav-label">INTELIGENCIA SOCIAL Y LABORAL</p><nav aria-label="Navegación principal">{sections.map(({label,icon:Icon})=><button key={label} onClick={()=>changeSection(label)} className={`nav-item ${active===label?'active':''}`} aria-current={active===label?'page':undefined}><Icon size={18}/>{label}{active===label&&<ChevronRight size={15}/>}</button>)}</nav><div className="sidebar-bottom"><div className="purpose"><span className="purpose-icon"><Sprout size={20}/></span><h3>Detrás de cada dato,<br/>una nueva oportunidad.</h3><p>Información útil para programas municipales de inclusión laboral.</p><span className="purpose-line"/></div><button className="help-link" onClick={()=>setNotice('La demostración usa 1.000 perfiles completamente ficticios, 56 profesionales y 220 ofertas. La web recibe agregados por comuna y periodo, no nombres ni datos sensibles. La inserción se calcula entre quienes ingresaron sin empleo.')}><CircleHelp size={17}/>Acerca de los datos<ArrowUpRight size={14}/></button><div className="sidebar-footer">IMPULSO JUVENIL <span>© 2026</span></div></div></aside>{menu&&<button className="mobile-backdrop" aria-label="Cerrar menú" onClick={()=>setMenu(false)}/>}
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu" onClick={()=>setMenu(!menu)} aria-label="Abrir menú"><Menu size={20}/></button><span>Portal municipal</span><ChevronRight size={13}/><strong>{active}</strong></div><div className="topbar-right"><span className="demo-pill"><i/>{isDemo?'Datos de demostración':'Indicadores municipales'}</span><div className="header-divider"/><div className="avatar">{authenticatedUser?authenticatedUser.slice(0,2).toUpperCase():'IM'}</div><div className="visitor"><strong>{authenticatedUser??'Vista municipal'}</strong><span>{authenticatedUser?'Sesión iniciada':'Demostración pública'}</span></div>{authenticatedUser&&<a className="dashboard-account-link" href="/cuenta">Mi cuenta</a>}</div></header>
    <main className="dashboard"><div className="page-heading"><div><div className="eyebrow">DATOS SOCIALES QUE ORIENTAN DECISIONES PÚBLICAS</div><h1>{active}</h1><p>Seguimiento municipal del acompañamiento social y las oportunidades laborales.</p></div><button className="primary-button" onClick={()=>changeSection('Reportes')}><Download size={16}/>Generar reporte</button></div>
    <div className="demo-banner"><span className="banner-icon"><ShieldCheck size={17}/></span><p><strong>{isDemo?'Explora datos sintéticos, no personas reales.':'Datos institucionales agregados.'}</strong> Se muestran estadísticas por comuna y periodo; no se presentan fichas personales. {hasMixedOrigins&&'Atención: la selección mezcla datos de prueba e importados.'}</p><span className="example-badge">{isDemo?'DEMOSTRACIÓN':'AGREGADOS'}</span></div>
    <div className="filter-bar"><div className="filters"><label className="filter"><CalendarDays size={16}/><span className="sr-only">Periodo de ingreso o publicación</span><select value={period} onChange={e=>setPeriod(e.target.value)}>{periodOptions.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label><label className="filter"><MapPin size={16}/><span className="sr-only">Comuna</span><select value={territory} onChange={e=>setTerritory(e.target.value)}><option>Todos los territorios</option>{territories.map(t=><option key={t}>{t}</option>)}</select></label></div><span className="filter-note"><i/>Periodo de incorporación / publicación · 2026</span></div>
    {notice&&<div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {active==='Resumen general'&&<>{kpiCards}{totals}<ImpactCharts rows={rows}/>{territoryTable}<p className="analytics-note">Las cifras reflejan cohortes incorporadas en el periodo; las contrataciones corresponden a resultados confirmados hasta el cierre de la muestra. Una oferta publicada no equivale a una contratación.</p></>}
    {active==='Beneficiarios'&&<><div className="metric-grid"><section className="metric-card"><div className="metric-label">Beneficiarios incorporados<Users size={17}/></div><strong className="metric-value">{formatCount(s.beneficiaries)}</strong></section><section className="metric-card"><div className="metric-label">Sin empleo inicial<BriefcaseBusiness size={17}/></div><strong className="metric-value">{formatCount(s.unemployedAtEntry)}</strong></section><section className="metric-card"><div className="metric-label">En formación ahora<School size={17}/></div><strong className="metric-value">{formatCount(s.inTraining)}</strong></section><section className="metric-card"><div className="metric-label">Participaron en capacitación<GraduationCap size={17}/></div><strong className="metric-value">{formatCount(s.trainingParticipants)}</strong></section></div><div className="detail-grid"><Breakdown title="Distribución etaria" subtitle="Rangos amplios para minimizar la identificación" items={distribution(rows,'edad','beneficiarios')} total={profileTotal}/><Breakdown title="Nivel educativo" subtitle="Nivel declarado por el profesional" items={distribution(rows,'educacion','beneficiarios')} total={profileTotal}/><Breakdown title="Barreras laborales principales" subtitle="Categorías generales, no diagnósticos clínicos" items={distribution(rows,'barrera','beneficiarios')} total={profileTotal}/><Breakdown title="Áreas de interés" subtitle="Sectores laborales preferidos por las personas atendidas" items={distribution(rows,'interes_laboral','beneficiarios')} total={profileTotal}/></div></>}
    {active==='Empleabilidad'&&<>{kpiCards}<div className="inline-stat-grid"><InlineStat label="Postulaciones" value={formatCount(s.applications)} detail="Número de acciones, no personas"/><InlineStat label="Entrevistas" value={formatCount(s.interviews)} detail="Entrevistas registradas"/><InlineStat label="Capacitación" value={formatCount(s.trainingParticipants)} detail="Beneficiarios participantes"/><InlineStat label="En búsqueda actual" value={formatCount(s.searching)} detail="Situación al cierre de la muestra"/></div><ImpactCharts rows={rows}/><p className="analytics-note">Tasa de inserción = contrataciones confirmadas de quienes ingresaron sin empleo ÷ personas sin empleo al ingreso. Los datos de seguimiento son ficticios y no demuestran causalidad.</p></>}
    {active==='Profesionales'&&<><div className="single-stats"><InlineStat label="Profesionales registrados" value={formatCount(s.professionals)} detail="Altas registradas en el periodo, no número de profesionales activos simultáneamente"/><InlineStat label="Beneficiarios incorporados" value={formatCount(s.beneficiaries)} detail="Cobertura acumulada de las cohortes seleccionadas"/></div><div className="detail-grid"><Breakdown title="Composición profesional" subtitle="Trabajo social, psicología, terapia ocupacional y otros" items={distribution(rows,'profesion','profesionales')} total={s.professionals}/></div><p className="analytics-note">No se almacenan nombres, correos ni contraseñas de profesionales en el módulo analítico. Las cuentas operativas de la app móvil se gestionan por separado.</p></>}
    {active==='Bolsa de trabajo'&&<><div className="single-stats"><InlineStat label="Ofertas publicadas" value={formatCount(s.offers)} detail="Publicaciones del periodo seleccionado"/><InlineStat label="Postulaciones registradas" value={formatCount(s.applications)} detail="Total de postulaciones asociadas a beneficiarios"/><InlineStat label="Entrevistas registradas" value={formatCount(s.interviews)} detail="Eventos confirmados en la demostración"/></div><div className="detail-grid"><Breakdown title="Ofertas por sector" subtitle="Dónde se concentran las oportunidades" items={distribution(rows,'sector_oferta','ofertas')} total={offersTotal}/><Breakdown title="Jornadas de trabajo" subtitle="Condiciones generales de las ofertas publicadas" items={distribution(rows,'jornada','ofertas')} total={offersTotal}/><Breakdown title="Experiencia requerida" subtitle="Adecuación a perfiles con poca experiencia" items={distribution(rows,'experiencia_requerida','ofertas')} total={offersTotal}/><Breakdown title="Estado de las ofertas" subtitle="Situación al cierre de la muestra ficticia" items={distribution(rows,'estado_oferta','ofertas')} total={offersTotal}/></div></>}
    {active==='Territorios'&&<>{kpiCards}{territoryTable}<p className="analytics-note">Cada municipio debe consultar solo la información de su territorio autorizado cuando se conecten datos reales. La vista pública muestra todas las comunas de ejemplo.</p></>}
    {active==='Reportes'&&<section className="reports-section"><div className="report-intro"><span className="report-symbol"><FileDown size={30}/></span><h2>Información útil para la gestión municipal.</h2><p>Genera informes basados en los filtros seleccionados.<br/>Los datos individuales no se exportan: solo se incluyen estadísticas agregadas.</p></div><div className="report-grid">{([{type:'pdf',title:'Informe municipal ejecutivo',subtitle:'Indicadores, definición de inserción y resultados por comuna.',icon:FileText},{type:'xlsx',title:'Libro de indicadores agregados',subtitle:'Hojas de resumen, profesiones, ofertas, barreras y comunas; sin fichas personales.',icon:FileSpreadsheet}] as const).map(({type,title,subtitle,icon:Icon})=><section className="panel report-card" key={type}><Icon size={28}/><span className="subtle-tag">{type.toUpperCase()}</span><h2>{title}</h2><p>{subtitle}</p><button className="primary-button" disabled={!!busy} onClick={()=>download(type)}><Download size={16}/>{busy===type?'Generando…':`Descargar ${type==='pdf'?'PDF':'Excel'}`}</button></section>)}</div>{canImport&&<section className="panel import-panel"><h2>Importar indicadores municipales</h2><p>Solo usuarios autorizados. Archivo CSV con filas agregadas, nunca perfiles individuales.</p><input type="file" accept=".csv,text/csv" onChange={uploadCsv} disabled={!!busy} aria-label="Archivo CSV de indicadores municipales"/></section>}</section>}
    <footer className="content-footer"><span><ShieldCheck size={14}/>Datos agregados. Sin información personal en reportes municipales.</span><span>Impulsando oportunidades, transformando vidas.</span></footer>
    </main></div></div>
}
