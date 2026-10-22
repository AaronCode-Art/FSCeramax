import type { IconName, Role } from "./types";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Gerencia",
  JEFE_LOGISTICA: "Jefatura de logística",
  LOGISTICA: "Logística",
  VENDEDOR: "Vendedor",
  DELIVERY: "Delivery",
};

export const roleDescriptions: Record<Role, string> = {
  ADMIN: "Administración general",
  JEFE_LOGISTICA: "Control de operaciones",
  LOGISTICA: "Inventario y despacho",
  VENDEDOR: "Ventas presenciales",
  DELIVERY: "Entregas asignadas",
};

export const navigation: Record<Role, { label: string; icon: IconName }[]> = {
  ADMIN: [
    { label: "Resumen", icon: "grid" }, { label: "Pedidos", icon: "cart" },
    { label: "Inventario", icon: "box" }, { label: "Solicitudes", icon: "file" },
    { label: "Traslados", icon: "truck" }, { label: "Movimientos", icon: "clock" },
    { label: "Productos", icon: "store" }, { label: "Categorías", icon: "box" },
    { label: "Cupones", icon: "store" },
    { label: "Galería de imágenes", icon: "file" }, { label: "Sucursales", icon: "store" },
    { label: "Almacenes", icon: "truck" },
    { label: "Usuarios", icon: "users" }, { label: "Clientes", icon: "users" },
    { label: "Pagos", icon: "cart" }, { label: "Reportes", icon: "chart" },
    { label: "Chat interno", icon: "chat" },
  ],
  JEFE_LOGISTICA: [
    { label: "Resumen", icon: "grid" }, { label: "Pedidos", icon: "cart" },
    { label: "Inventario", icon: "box" }, { label: "Solicitudes", icon: "file" },
    { label: "Traslados", icon: "truck" }, { label: "Movimientos", icon: "clock" },
    { label: "Productos", icon: "store" }, { label: "Categorías", icon: "box" },
    { label: "Cupones", icon: "store" },
    { label: "Galería de imágenes", icon: "file" }, { label: "Chat interno", icon: "chat" },
  ],
  LOGISTICA: [
    { label: "Resumen", icon: "grid" }, { label: "Pedidos", icon: "cart" },
    { label: "Inventario", icon: "box" }, { label: "Registrar entrada", icon: "plus" },
    { label: "Mis solicitudes", icon: "file" }, { label: "Traslados", icon: "truck" },
    { label: "Movimientos", icon: "clock" }, { label: "Chat interno", icon: "chat" },
  ],
  VENDEDOR: [
    { label: "Resumen", icon: "grid" }, { label: "Nueva venta", icon: "plus" },
    { label: "Pedidos", icon: "cart" }, { label: "Chat interno", icon: "chat" },
  ],
  DELIVERY: [
    { label: "Mi ruta", icon: "truck" }, { label: "Entregas", icon: "cart" },
    { label: "Historial", icon: "clock" }, { label: "Chat interno", icon: "chat" },
  ],
};

export const settingsPage = "Configuración";
