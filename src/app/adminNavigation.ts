import {
  Archive,
  BarChart3,
  Boxes,
  ClipboardList,
  Gift,
  History,
  Images,
  LayoutDashboard,
  MessageCircle,
  Package,
  ReceiptText,
  ScrollText,
  Store,
  Tags,
  Truck,
  Users,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface AdminSection {
  id: string
  label: string
  description: string
  icon: LucideIcon
  endpoint?: string
  unsupportedMessage?: string
}

export interface AdminNavGroup {
  label: string
  sections: AdminSection[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Principal',
    sections: [
      { id: 'dashboard', label: 'Panel general', description: 'Resumen de la operación', icon: LayoutDashboard },
      {
        id: 'pedidos',
        label: 'Pedidos',
        description: 'Consulta y seguimiento de pedidos',
        icon: ReceiptText,
        endpoint: '/v1/pedidos',
      },
      {
        id: 'historial-delivery',
        label: 'Historial de pedidos',
        description: 'Todos los pedidos y sus estados, del más reciente al más antiguo',
        icon: History,
        endpoint: '/v1/pedidos/delivery/historial',
      },
      {
        id: 'reportes',
        label: 'Reportes',
        description: 'Exporta reportes de ventas e inventario',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Catálogo',
    sections: [
      {
        id: 'productos',
        label: 'Productos',
        description: 'Catálogo de productos',
        icon: Package,
        endpoint: '/v1/catalogo/productos',
      },
      {
        id: 'categorias',
        label: 'Categorías',
        description: 'Organización del catálogo',
        icon: Tags,
        endpoint: '/v1/catalogo/categorias',
      },
      {
        id: 'galeria',
        label: 'Galería de imágenes',
        description: 'Imágenes asociadas a los productos',
        icon: Images,
      },
      {
        id: 'cupones',
        label: 'Cupones',
        description: 'Promociones y descuentos',
        icon: Gift,
        unsupportedMessage: 'La API del backend aún no cuenta con operaciones de cupones.',
      },
    ],
  },
  {
    label: 'Operaciones',
    sections: [
      {
        id: 'inventario',
        label: 'Inventario',
        description: 'Stock por almacén, entradas y ajustes',
        icon: Boxes,
        endpoint: '/v1/inventario/stock-disponible',
      },
      {
        id: 'almacenes',
        label: 'Almacenes',
        description: 'Almacenes por sucursal',
        icon: Archive,
        endpoint: '/v1/inventario/almacenes',
      },
      {
        id: 'movimientos',
        label: 'Movimientos',
        description: 'Historial de movimientos y traslados',
        icon: ClipboardList,
        endpoint: '/v1/inventario/movimientos',
      },
      {
        id: 'solicitudes-entradas',
        label: 'Solicitudes de entradas',
        description: 'Entradas pendientes de aprobación',
        icon: ClipboardList,
        endpoint: '/v1/inventario/solicitudes-entradas',
      },
      {
        id: 'sucursales',
        label: 'Sucursales',
        description: 'Puntos de operación',
        icon: Store,
        endpoint: '/v1/sucursales',
      },
      {
        id: 'logistica',
        label: 'Logística',
        description: 'Bandeja de pedidos, asignación de delivery y seguimiento de despacho',
        icon: Truck,
        endpoint: '/v1/pedidos/logistica',
      },
    ],
  },
  {
    label: 'Personas',
    sections: [
      {
        id: 'usuarios',
        label: 'Personal',
        description: 'Usuarios y roles del sistema',
        icon: Users,
        endpoint: '/v1/usuarios',
      },
      {
        id: 'clientes',
        label: 'Clientes',
        description: 'Directorio de clientes',
        icon: UserRound,
        endpoint: '/v1/clientes',
      },
      {
        id: 'chats',
        label: 'Chats',
        description: 'Conversaciones de soporte',
        icon: MessageCircle,
        endpoint: '/v1/chats/soporte',
      },
      {
        id: 'auditoria',
        label: 'Auditoría',
        description: 'Registro de actividad',
        icon: ScrollText,
        unsupportedMessage: 'El backend aún no expone una API de auditoría para consultar eventos.',
      },
    ],
  },
]

export const ADMIN_SECTIONS = ADMIN_NAV_GROUPS.flatMap((group) => group.sections)
