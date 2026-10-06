export const SECTION_PATHS: Record<string, string> = {
  dashboard: '/admin/dashboard',
  pedidos: '/admin/pedidos',
  'historial-delivery': '/admin/historial-delivery',
  reportes: '/admin/reportes',
  productos: '/admin/productos',
  categorias: '/admin/categorias',
  galeria: '/admin/galeria',
  cupones: '/admin/cupones',
  inventario: '/admin/inventario',
  almacenes: '/admin/almacenes',
  movimientos: '/admin/movimientos',
  'solicitudes-entradas': '/admin/solicitudes-entradas',
  sucursales: '/admin/sucursales',
  logistica: '/admin/logistica',
  usuarios: '/admin/usuarios',
  clientes: '/admin/clientes',
  chats: '/admin/chats',
  auditoria: '/admin/auditoria',
}

export function pathForSection(sectionId: string) {
  return SECTION_PATHS[sectionId] ?? '/dashboard'
}

export function sectionFromPath(path: string) {
  const normalized = path.replace(/\/+$/, '') || '/'
  if (normalized === '/' || normalized === '/dashboard' || normalized === '/admin' || normalized === '/admin/dashboard') return 'dashboard'
  return Object.entries(SECTION_PATHS).find(([, route]) => route === normalized)?.[0] ?? 'dashboard'
}
