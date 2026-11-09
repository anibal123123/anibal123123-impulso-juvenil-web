import { type DemoRecord, summarize } from './demo-data';
export async function exportReport(format: 'xlsx' | 'pdf', rows: DemoRecord[], scope: string) {
 const summary = summarize(rows);
 if (format === 'xlsx') {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const overview = workbook.addWorksheet('Resumen');
  overview.addRows([['Impulso Juvenil — DATOS FICTICIOS'], [scope], ['Personas acompañadas', summary.total], ['Con empleo', summary.employed], ['En formación', summary.training], ['Tasa de inserción (%)', summary.rate]]);
  overview.getColumn(1).width = 44;
  const sheet = workbook.addWorksheet('Datos de ejemplo');
  sheet.columns = [{header:'Código anónimo',key:'id',width:22},{header:'Territorio',key:'territory',width:22},{header:'Mes (2026)',key:'month',width:16},{header:'Situación laboral',key:'status',width:24},{header:'Edad',key:'age',width:12},{header:'Equipo',key:'professional',width:18}];
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true, color: {argb:'FFFFFFFF'} };
  sheet.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF246B52'}};
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a = document.createElement('a'); a.href=url; a.download='impulso-juvenil-demo.xlsx'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
 } else {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  pdf.setFillColor(36,107,82); pdf.rect(0,0,210,44,'F'); pdf.setTextColor(255); pdf.setFontSize(23); pdf.text('Impulso Juvenil',18,23); pdf.setFontSize(11); pdf.text('Reporte de impacto social | DEMOSTRACIÓN',18,34);
  pdf.setTextColor(35,48,42); pdf.setFontSize(12); pdf.text(scope,18,60);
  const lines = [`Personas acompañadas: ${summary.total}`,`Personas con empleo: ${summary.employed}`,`Personas en formación: ${summary.training}`,`Tasa de inserción laboral: ${summary.rate}%`];
  lines.forEach((line,i)=>pdf.text(line,18,82+i*14));
  pdf.text('Resultados por territorio',18,152);
  [...new Set(rows.map(r=>r.territory))].forEach((territory,i)=>{ const s=summarize(rows.filter(r=>r.territory===territory)); pdf.text(`${territory}: ${s.total} participantes | ${s.employed} con empleo | ${s.rate}%`,18,168+i*12); });
  pdf.setFontSize(9); pdf.setTextColor(100); pdf.text('Datos ficticios para demostración. No representan resultados reales.',18,266); pdf.text('Inserción = personas con empleo / personas seleccionadas. Cohortes enero-junio 2026.',18,274); pdf.save('impulso-juvenil-demo.pdf');
 }
}
