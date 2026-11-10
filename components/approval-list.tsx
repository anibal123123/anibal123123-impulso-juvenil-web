'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_COMMUNES, PROVINCES, REGION_NAME, type AccessPlan } from '@/lib/geography'

type Item = {id:string,name:string,email:string,createdAt:Date, status:string,plan:string|null,territory:string|null}
export function ApprovalList({items}:{items:Item[]}) {
  return <div className="approvals-list">
    {items.length ? items.map(item=><ApprovalRow key={item.id} item={{...item,createdAt:new Date(item.createdAt).toISOString()}}/>) :
      <p className="analytics-note">No hay solicitudes pendientes. Las nuevas cuentas aparecerán aquí automáticamente.</p>}
  </div>
}
function ApprovalRow({item}:{item:Omit<Item,'createdAt'>&{createdAt:string}}) {
  const router=useRouter()
  const [plan,setPlan]=useState<AccessPlan>('municipal')
  const [territory,setTerritory]=useState<string>(ALL_COMMUNES[0])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const options=plan==='municipal'?[...ALL_COMMUNES].sort((a,b)=>a.localeCompare(b,'es')):plan==='provincial'?Object.keys(PROVINCES):[REGION_NAME]
  async function decision(action:'aprobar'|'rechazar') {
    if (busy) return
    if(action==='rechazar' && !window.confirm(`¿Rechazar la solicitud de ${item.email}?`))return
    setBusy(true);setError('')
    try {
      const response=await fetch(`/api/admin/solicitudes/${encodeURIComponent(item.id)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(action==='aprobar'?{decision:action,plan,territory}:{decision:action}),
      })
      const result=await response.json()
      if(!response.ok||!result.ok)throw new Error(result.error??result.reason??'No se pudo procesar')
      router.refresh()
    } catch(e) {setError(e instanceof Error?e.message:'Error de conexión')}
    finally{setBusy(false)}
  }
  return <section className="approval-item">
    <div><strong>{item.name}</strong><span>{item.email}</span><small>Solicitud: {new Date(item.createdAt).toLocaleDateString('es-CL',{timeZone:'America/Santiago'})}</small></div>
    <div className="approval-controls"><label>Plan
      <select value={plan} disabled={busy} onChange={e=>{
        const next=e.target.value as AccessPlan;setPlan(next)
        setTerritory(next==='municipal'?ALL_COMMUNES[0]:next==='provincial'?Object.keys(PROVINCES)[0]:REGION_NAME)
      }}><option value="municipal">Municipal</option><option value="provincial">Provincial</option><option value="regional">Regional</option></select>
    </label><label>Territorio
      <select value={territory} disabled={busy} onChange={e=>setTerritory(e.target.value)}>{options.map(t=><option key={t} value={t}>{t}</option>)}</select>
    </label><button className="primary-button" disabled={busy} onClick={()=>decision('aprobar')}>Aprobar</button><button className="login-back" disabled={busy} onClick={()=>decision('rechazar')}>Rechazar</button></div>
    {error&&<p className="login-status error" role="alert">{error}</p>}
  </section>
}
