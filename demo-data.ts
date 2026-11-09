export const territories = ['Zona Centro', 'Zona Norte', 'Zona Sur', 'Zona Este'];
export const records = Array.from({ length: 1248 }, (_, i) => ({
  id: `IJ-${String(i + 1).padStart(4, '0')}`,
  territory: territories[i % 4],
  month: (i % 6) + 1,
  status: i % 10 < 6 ? 'Con empleo' : i % 10 < 8 ? 'En formación' : 'En búsqueda',
  age: 18 + (i % 12),
  professional: `Equipo ${1 + (i % 24)}`,
}));
export type DemoRecord = (typeof records)[number];
export const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
export function summarize(rows: DemoRecord[]) {
 const employed = rows.filter(r => r.status === 'Con empleo').length;
 return { total: rows.length, employed, training: rows.filter(r => r.status === 'En formación').length, rate: rows.length ? Math.round(employed / rows.length * 100) : 0 };
}
