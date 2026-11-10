import { PROVINCES } from '@/lib/geography'
import { byTerritoryMunicipal, distribution, formatCount, summarizeMunicipal, type MunicipalMetric } from './municipal-analytics'

const safe = (value: string) => /^[=+@\-\t\r]/.test(value) ? `'${value}` : value

export async function exportReport(format: 'xlsx'|'pdf', rows: MunicipalMetric[], scope: string) {
  const s = summarizeMunicipal(rows)
  const territorial = byTerritoryMunicipal(rows)
  const provincial = Object.keys(PROVINCES).map(province=>{
    const subset = rows.filter(r => (PROVINCES[province as keyof typeof PROVINCES] as readonly string[]).includes(r.territory))
    return {province,...summarizeMunicipal(subset)}
  }).filter(p=>p.beneficiaries>0)
  const basic = [
    ['Personas incorporadas', s.beneficiaries],
    ['Sin empleo al ingreso', s.unemployedAtEntry],
    ['Contrataciones confirmadas', s.hires],
    ['Tasa de inserción (%)', s.insertionRate],
    ['Personas con empleo actual', s.employedNow],
    ['Participantes de capacitación', s.trainingParticipants],
    ['Postulaciones realizadas', s.applications],
    ['Entrevistas registradas', s.interviews],
    ['Profesionales incorporados', s.professionals],
    ['Ofertas laborales publicadas', s.offers],
  ] as const
  if (format==='xlsx') {
    const {Workbook} = await import('exceljs')
    const workbook = new Workbook()
    const overview=workbook.addWorksheet('Resumen')
    overview.addRows([['IMPULSO JUVENIL · DATOS FICTICIOS'],[safe(scope)],...basic.map(([label,value])=>[label,value])])
    overview.getColumn(1).width=43; overview.getColumn(2).width=22
    const provinceSheet=workbook.addWorksheet('Provincias')
    provinceSheet.addRow(['Provincia','Beneficiarios','Inserciones','Tasa (%)','Ofertas'])
    provincial.forEach(p=>provinceSheet.addRow([safe(p.province),p.beneficiaries,p.hires,p.insertionRate,p.offers]))
    provinceSheet.columns.forEach(c=>{c.width=25})
    const territorySheet=workbook.addWorksheet('Comunas')
    territorySheet.addRow(['Comuna','Incorporados','Sin empleo al ingreso','Inserciones','Tasa inserción (%)','Profesionales','Ofertas'])
    territorial.forEach(t=>territorySheet.addRow([safe(t.territory),t.beneficiaries,t.unemployedAtEntry,t.hires,t.insertionRate,t.professionals,t.offers]))
    territorySheet.columns.forEach(c=>{ c.width=24 })
    for(const [sheetName,dimension,metric] of [
      ['Profesiones','profesion','profesionales'],['Sectores de ofertas','sector_oferta','ofertas'],
      ['Barreras laborales','barrera','beneficiarios'],['Rangos de edad','edad','beneficiarios'],
      ['Educación','educacion','beneficiarios'],['Jornadas de ofertas','jornada','ofertas'],
    ]){
      const sheet=workbook.addWorksheet(sheetName)
      sheet.addRow(['Categoría','Total'])
      distribution(rows,dimension,metric).forEach(v=>sheet.addRow([safe(v.label),v.value]))
      sheet.getColumn(1).width=40; sheet.getColumn(2).width=18
    }
    const aggregate=workbook.addWorksheet('Indicadores agregados')
    aggregate.addRow(['Periodo','Comuna','Métrica','Dimensión','Categoría','Valor','Origen'])
    rows.forEach(r=>aggregate.addRow([r.period,safe(r.territory),safe(r.metric),safe(r.dimension),safe(r.category),r.value,r.source]))
    aggregate.columns.forEach(c=>{c.width=23})
    for (const sheet of workbook.worksheets) {
      const header = sheet.getRow(1)
      header.font={bold:true,color:{argb:'FFFFFFFF'}}
      header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF246B52'}}
    }
    const buffer=await workbook.xlsx.writeBuffer()
    const blob=new Blob([buffer as unknown as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='impulso-juvenil-reporte-territorial-DEMO.xlsx';a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  } else {
    const {jsPDF}=await import('jspdf')
    const pdf=new jsPDF()
    pdf.setFillColor(36,107,82);pdf.rect(0,0,210,42,'F')
    pdf.setTextColor(255);pdf.setFontSize(20);pdf.text('Impulso Juvenil',17,21)
    pdf.setFontSize(10);pdf.text('Informe territorial de empleabilidad | DATOS FICTICIOS',17,33)
    pdf.setTextColor(35,48,42);pdf.setFontSize(10)
    pdf.text(pdf.splitTextToSize(scope,170),17,54)
    let y=68
    for(const [label,value] of basic){pdf.text(`${label}: ${typeof value === 'number' ? formatCount(value) : value}`,17,y);y+=10}
    y+=4;pdf.setFontSize(11);pdf.text('Resultados por provincia',17,y);y+=9;pdf.setFontSize(9)
    for(const p of provincial){ if(y>262){pdf.addPage();y=21}pdf.text(`${p.province}: ${formatCount(p.beneficiaries)} personas · ${formatCount(p.hires)} inserciones`,17,y);y+=10 }
    y+=6;pdf.setFontSize(11);pdf.text('Resultados por comuna',17,y);y+=9;pdf.setFontSize(9)
    for(const t of territorial){
      if(y>262){pdf.addPage();y=21}
      pdf.text(pdf.splitTextToSize(`${t.territory}: ${formatCount(t.beneficiaries)} incorporados · ${formatCount(t.hires)} inserciones · ${t.insertionRate}%`,175),17,y)
      y+=11
    }
    if(y>242){pdf.addPage();y=21}
    pdf.setTextColor(95)
    pdf.text(pdf.splitTextToSize('Definición: tasa de inserción = contrataciones confirmadas de personas sin empleo al ingreso / personas sin empleo al ingreso de las cohortes seleccionadas. Datos de prueba, no representan resultados municipales reales.',175),17,y+12)
    pdf.save('impulso-juvenil-informe-territorial-DEMO.pdf')
  }
}
