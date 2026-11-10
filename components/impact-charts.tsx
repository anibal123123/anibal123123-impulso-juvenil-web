'use client'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { byMonthMunicipal, displayMonth, type MunicipalMetric, summarizeMunicipal } from '@/lib/municipal-analytics'

export function ImpactCharts({ rows }: { rows: MunicipalMetric[] }) {
  const series = byMonthMunicipal(rows)
  let accumulated = 0
  let hires = 0
  const data = series.map(item => {
    accumulated += item.beneficiaries
    hires += item.hires
    return {month:displayMonth(item.period), incorporados:accumulated, inserciones:hires}
  })
  const s = summarizeMunicipal(rows)
  // Los estados actuales son excluyentes. La inserción usa OTRO denominador:
  // solo personas desempleadas al ingresar, nunca todos los beneficiarios.
  const employedPercent = s.beneficiaries ? 100*s.employedNow/s.beneficiaries : 0
  const trainingPercent = s.beneficiaries ? 100*s.inTraining/s.beneficiaries : 0
  return <div className="charts-grid">
    <section className="panel trend-panel">
      <div className="panel-heading"><div><h2>Evolución de las cohortes</h2><p>Incorporaciones y contrataciones confirmadas, acumuladas por mes de ingreso</p></div><span className="subtle-tag">2026</span></div>
      <div className="chart-legend"><span><i className="dot pale"/>Personas incorporadas</span><span><i className="dot"/>Inserciones confirmadas</span></div>
      <div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:10,right:10,left:-22,bottom:0}}>
        <defs><linearGradient id="employmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#398465" stopOpacity={0.22}/><stop offset="100%" stopColor="#398465" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="4 4"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#88918a'}} tickMargin={12}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#88918a'}}/>
        <Tooltip contentStyle={{borderRadius:10,border:'1px solid #e2e7e2',fontSize:12}}/>
        <Area type="monotone" dataKey="incorporados" name="Incorporados" stroke="#b4c8a3" strokeWidth={2} strokeDasharray="5 4" fill="transparent"/>
        <Area type="monotone" dataKey="inserciones" name="Inserciones confirmadas" stroke="#337d5e" strokeWidth={3} fill="url(#employmentFill)"/>
      </AreaChart></ResponsiveContainer></div>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Situación laboral actual</h2><p>Distribución de las personas de las cohortes seleccionadas</p></div></div>
      <div className="donut" style={{background:`conic-gradient(var(--green) 0 ${employedPercent}%, var(--sage) ${employedPercent}% ${employedPercent+trainingPercent}%, #e9eeeb 0 100%)`}} role="img" aria-label={`${s.employedNow} personas actualmente con empleo de ${s.beneficiaries}`}><div><strong>{s.beneficiaries ? Math.round(employedPercent) : 0}%</strong><span>con empleo actual</span></div></div>
      <div className="status-legend">{[['Con empleo',s.employedNow,'green'],['En formación',s.inTraining,'sage'],['En búsqueda',s.searching,'gray']].map(([label,value,color])=><div key={label}><span><i className={`dot ${color}`}/>{label}</span><strong>{Number(value).toLocaleString('es-CL')}</strong></div>)}</div>
      <p className="analytics-note">El % de empleo actual no equivale a la tasa de inserción: esta última se calcula solo entre personas sin empleo al ingresar.</p>
    </section>
  </div>
}
