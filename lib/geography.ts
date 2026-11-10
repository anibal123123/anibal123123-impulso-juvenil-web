/** División territorial oficial de la Región del Biobío (33 comunas, 3 provincias). */
export const PROVINCES = {
  Concepción: ['Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualpén', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé'],
  Biobío: ['Alto Biobío', 'Antuco', 'Cabrero', 'Laja', 'Los Ángeles', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel'],
  Arauco: ['Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Lebu', 'Los Álamos', 'Tirúa'],
} as const
export type Province = keyof typeof PROVINCES
export const ALL_COMMUNES: string[] = Object.values(PROVINCES).flat()
// Mantener los IDs de los seis municipios de prueba de la versión anterior.
export const LEGACY_COMMUNES = ['Concepción','Chiguayante','Talcahuano','Hualpén','San Pedro de la Paz','Hualqui'] as const
export const REGION_NAME = 'Región del Biobío'
export type AccessPlan = 'municipal' | 'provincial' | 'regional'
export type AccessStatus = 'pendiente' | 'aprobado' | 'rechazado'

export function provinceOfCommune(commune: string): Province | null {
  return (Object.keys(PROVINCES) as Province[]).find(p => (PROVINCES[p] as readonly string[]).includes(commune)) ?? null
}
export function isProvince(name: string): name is Province {
  return Object.prototype.hasOwnProperty.call(PROVINCES, name)
}
export function validAssignment(plan: AccessPlan, territory: string) {
  if (plan === 'municipal') return ALL_COMMUNES.includes(territory)
  if (plan === 'provincial') return isProvince(territory)
  return territory === REGION_NAME
}
export function communesFor(plan: AccessPlan | 'admin', territory: string): string[] {
  if (plan === 'admin' || plan === 'regional') return [...ALL_COMMUNES]
  if (plan === 'provincial') return isProvince(territory) ? [...PROVINCES[territory]] : []
  return ALL_COMMUNES.includes(territory) ? [territory] : []
}
export function accessLabel(plan: AccessPlan | 'admin', territory: string) {
  return plan === 'admin' ? 'Administración general · Región del Biobío' :
    `${plan === 'municipal' ? 'Plan municipal' : plan === 'provincial' ? 'Plan provincial' : 'Plan regional'} · ${territory}`
}
/** Referencia determinista a los 33 organismos de muestra; la BD también valida el territorio. */
export function demoOrganismId(territory: string) {
  if (!ALL_COMMUNES.includes(territory)) throw new Error('Comuna fuera de Biobío')
  const legacyIndex = LEGACY_COMMUNES.indexOf(territory as typeof LEGACY_COMMUNES[number])
  if (legacyIndex >= 0) return `demo-muni-${legacyIndex + 1}`
  const remaining = ALL_COMMUNES.filter(t => !(LEGACY_COMMUNES as readonly string[]).includes(t))
  return `demo-muni-${String(7 + remaining.indexOf(territory)).padStart(2, '0')}`
}
