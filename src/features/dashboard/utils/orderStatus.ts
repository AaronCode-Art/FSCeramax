export function orderStatusLabel(value: string) {
  const normalized = value.trim().toUpperCase().replaceAll(' ', '_')
  const labels: Record<string, string> = {
    PENDIENTE_PAGO: 'Pendiente',
    PENDIENTE_DE_PAGO: 'Pendiente',
    PREPARACION: 'Pendiente',
    EN_PREPARACION: 'Pendiente',
    'EN_PREPARACIÓN': 'Pendiente',
    LISTO_DESPACHO: 'Preparado',
    LISTO_PARA_DESPACHAR: 'Preparado',
    LISTO_PARA_DESPACHO: 'Preparado',
    LISTO_PARA_RECOGER: 'Listo para recoger',
    EN_RUTA: 'En ruta',
    EN_CAMINO: 'En camino',
    COMPLETADA: 'Completada',
    NO_ENTREGADA: 'No se pudo entregar',
    NO_ENTREGADO: 'No se pudo entregar',
    CANCELADO: 'Cancelado',
  }
  return labels[normalized] ?? value.replaceAll('_', ' ')
}
