import fs from 'node:fs'
const read=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8'))
const old=read('./fixtures/beneficiarios-1000.json'), extra=read('./fixtures/beneficiarios-9000-adicionales.json')
const pros=[...read('./fixtures/profesionales-56.json'),...read('./fixtures/profesionales-164-adicionales.json')]
const offers=[...read('./fixtures/ofertas-220.json'),...read('./fixtures/ofertas-980-adicionales.json')]
const people=[...old,...extra],rows=read('../data/demo-aggregates.json').rows
const sum=(metric,dimension='resumen')=>rows.filter(x=>x.metric===metric&&x.dimension===dimension&&x.category==='total').reduce((n,x)=>n+x.value,0)
const check=(name,cond)=>{if(!cond)throw new Error('Fallo: '+name);console.log('✓ '+name)}
const provinces={
'Concepción':['Concepción','Coronel','Chiguayante','Florida','Hualpén','Hualqui','Lota','Penco','San Pedro de la Paz','Santa Juana','Talcahuano','Tomé'],
'Biobío':['Alto Biobío','Antuco','Cabrero','Laja','Los Ángeles','Mulchén','Nacimiento','Negrete','Quilaco','Quilleco','San Rosendo','Santa Bárbara','Tucapel','Yumbel'],
'Arauco':['Arauco','Cañete','Contulmo','Curanilahue','Lebu','Los Álamos','Tirúa']}
const geo=Object.values(provinces).flat()
check('9000 beneficiarios adicionales exactos',extra.length===9000)
check('1000 previos conservados',old.length===1000)
check('10000 beneficiarios sin duplicaciones',people.length===10000&&new Set(people.map(x=>x.simulationId)).size===10000)
check('220 profesionales y 1200 ofertas',pros.length===220&&offers.length===1200)
check('33 comunas oficiales en 3 provincias',Object.keys(provinces).length===3&&geo.length===33&&new Set(geo).size===33)
check('sin comunas fuera del Biobío',rows.every(x=>geo.includes(x.territory)))
check('las 33 comunas tienen muestra',new Set(rows.filter(x=>x.metric==='beneficiarios').map(x=>x.territory)).size===33)
check('beneficiarios agregados coinciden',sum('beneficiarios')===10000)
check('edad, nivel, barrera e interés tienen 10000 registros cada uno',['edad','educacion','barrera','interes_laboral'].every(dim=>rows.filter(x=>x.metric==='beneficiarios'&&x.dimension===dim).reduce((n,x)=>n+x.value,0)===10000))
check('220 profesionales en agregados',sum('profesionales')===220)
check('1200 ofertas en agregados',sum('ofertas')===1200)
check('contrataciones confirmadas coherentes',sum('contrataciones')===people.filter(x=>x.confirmedPlacement).length)
check('ninguna contratación de persona empleada al ingreso',people.every(x=>!x.confirmedPlacement||x.initialEmployment==='Sin empleo'))
check('estatus laborales cubren 10000',sum('en_busqueda')+sum('con_empleo_actual')+sum('en_formacion')===10000)
check('sin campos personales en agregados',rows.every(x=>!('email'in x)&&!('rut'in x)&&!('name'in x)&&!('simulationId'in x)))
check('ningún agregado negativo',rows.every(x=>Number.isSafeInteger(x.value)&&x.value>=0))
console.log('\nTotal filas agregadas:',rows.length)
