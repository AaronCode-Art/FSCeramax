import { apiDownload, apiRequest } from "../../../services/api";
import type { DeliveryOpcion, DetallePedido, DatosEntregaPedido, PaginaPedidos, Pedido, PedidoResumen } from "../types/pedido";

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function texto(value: unknown, campo: string, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string") throw new Error(`La respuesta de pedidos contiene un campo no válido: ${campo}.`);
  return value;
}

function cantidad(value: unknown, campo: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`La respuesta de pedidos contiene un campo numérico no válido: ${campo}.`);
  }
  return value;
}

function booleano(value: unknown, campo: string): boolean {
  if (typeof value !== "boolean") throw new Error(`La respuesta de pedidos contiene un campo no válido: ${campo}.`);
  return value;
}

function leerDatosEntrega(value: unknown): DatosEntregaPedido | null {
  if (value === null) return null;
  if (!esObjeto(value)) throw new Error("La respuesta del pedido contiene datos de entrega no válidos.");
  return {
    destinatario: texto(value.destinatario, "destinatario", true),
    telefono: texto(value.telefono, "telefono", true),
    departamento: texto(value.departamento, "departamento", true),
    provincia: texto(value.provincia, "provincia", true),
    distrito: texto(value.distrito, "distrito", true),
    direccion: texto(value.direccion, "direccion", true),
    codigoPostal: texto(value.codigoPostal, "codigoPostal", true),
    referencia: texto(value.referencia, "referencia", true),
    sucursalNombre: texto(value.sucursalNombre, "sucursalNombre", true),
    sucursalDireccion: texto(value.sucursalDireccion, "sucursalDireccion", true),
  };
}

function leerResumen(value: unknown): PedidoResumen {
  if (!esObjeto(value)) throw new Error("La API devolvió un pedido con formato inválido.");
  return {
    id: texto(value.id, "id")!,
    codigo: texto(value.codigo, "codigo")!,
    canal: texto(value.canal, "canal")!,
    tipoEntrega: texto(value.tipoEntrega, "tipoEntrega")!,
    estadoCodigo: texto(value.estadoCodigo, "estadoCodigo")!,
    estadoNombre: texto(value.estadoNombre, "estadoNombre")!,
    tipoComprobante: texto(value.tipoComprobante, "tipoComprobante", true),
    serie: texto(value.serie, "serie", true),
    numeroComprobante: texto(value.numeroComprobante, "numeroComprobante", true),
    total: cantidad(value.total, "total"),
    createdAt: texto(value.createdAt, "createdAt")!,
    datosEntrega: leerDatosEntrega(value.datosEntrega),
  };
}

function leerDetalle(value: unknown): DetallePedido {
  if (!esObjeto(value)) throw new Error("La API devolvió un detalle de pedido con formato inválido.");
  return {
    id: texto(value.id, "detalle.id")!,
    productoId: texto(value.productoId, "detalle.productoId")!,
    productoCodigo: texto(value.productoCodigo, "detalle.productoCodigo")!,
    productoNombre: texto(value.productoNombre, "detalle.productoNombre")!,
    categoriaNombre: texto(value.categoriaNombre, "detalle.categoriaNombre", true),
    cantidad: cantidad(value.cantidad, "detalle.cantidad"),
    precioUnitario: cantidad(value.precioUnitario, "detalle.precioUnitario"),
    descuentoPorcentaje: cantidad(value.descuentoPorcentaje, "detalle.descuentoPorcentaje"),
    subtotal: cantidad(value.subtotal, "detalle.subtotal"),
    estadoStock: texto(value.estadoStock, "detalle.estadoStock", true),
  };
}

function leerPedido(value: unknown): Pedido {
  if (!esObjeto(value)) throw new Error("La API devolvió el pedido con formato inválido.");
  return {
    ...leerResumen(value),
    logisticaId: texto(value.logisticaId, "logisticaId", true),
    logisticaNombre: texto(value.logisticaNombre, "logisticaNombre", true),
    deliveryId: texto(value.deliveryId, "deliveryId", true),
    deliveryNombre: texto(value.deliveryNombre, "deliveryNombre", true),
    subtotal: cantidad(value.subtotal, "subtotal"),
    descuentoCupon: cantidad(value.descuentoCupon, "descuentoCupon"),
    costoEnvio: cantidad(value.costoEnvio, "costoEnvio"),
    igv: cantidad(value.igv, "igv"),
    tieneReserva: booleano(value.tieneReserva, "tieneReserva"),
    despachado: booleano(value.despachado, "despachado"),
    detalles: Array.isArray(value.detalles) ? value.detalles.map(leerDetalle) : [],
  };
}

function leerPagina(value: unknown): PaginaPedidos {
  if (!esObjeto(value) || !Array.isArray(value.contenido)) {
    throw new Error("La API devolvió una página de pedidos con formato inválido.");
  }
  return {
    contenido: value.contenido.map(leerResumen),
    pagina: cantidad(value.pagina, "pagina"),
    tamano: cantidad(value.tamano, "tamano"),
    totalElementos: cantidad(value.totalElementos, "totalElementos"),
    totalPaginas: cantidad(value.totalPaginas, "totalPaginas"),
    primera: booleano(value.primera, "primera"),
    ultima: booleano(value.ultima, "ultima"),
    haySiguiente: booleano(value.haySiguiente, "haySiguiente"),
  };
}

export async function listarPedidos(token: string, rol: string, page: string, pagina: number, tamano = 20): Promise<PaginaPedidos> {
  const query = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  const endpoint = page === "Historial"
    ? "/api/v1/pedidos/delivery/historial"
    : rol === "ADMIN" || rol === "JEFE_LOGISTICA" || rol === "LOGISTICA"
      ? "/api/v1/pedidos/logistica"
      : "/api/v1/pedidos/pagina";
  return leerPagina(await apiRequest(`${endpoint}?${query.toString()}`, {}, token));
}

export async function obtenerPedido(token: string, id: string): Promise<Pedido> {
  return leerPedido(await apiRequest(`/api/v1/pedidos/${encodeURIComponent(id)}`, {}, token));
}

export async function obtenerTransicionesPedido(token: string, id: string): Promise<string[]> {
  const result = await apiRequest(`/api/v1/pedidos/${encodeURIComponent(id)}/transiciones`, {}, token);
  if (!Array.isArray(result) || result.some((state) => typeof state !== "string")) {
    throw new Error("La API devolvió las transiciones del pedido con formato inválido.");
  }
  return result;
}

export async function cambiarEstadoPedido(token: string, id: string, estadoCodigo: string): Promise<Pedido> {
  return leerPedido(await apiRequest(`/api/v1/pedidos/${encodeURIComponent(id)}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estadoCodigo }),
  }, token));
}

function leerDelivery(value: unknown): DeliveryOpcion {
  if (!esObjeto(value)) throw new Error("La API devolvió un delivery con formato inválido.");
  return {
    id: texto(value.id, "delivery.id")!,
    nombres: texto(value.nombres, "delivery.nombres")!,
    apellidos: texto(value.apellidos, "delivery.apellidos")!,
    telefono: texto(value.telefono, "delivery.telefono", true),
  };
}

export async function listarDeliveries(token: string): Promise<DeliveryOpcion[]> {
  const result = await apiRequest("/api/v1/pedidos/deliveries", {}, token);
  if (!Array.isArray(result)) throw new Error("La API devolvió una lista de deliveries con formato inválido.");
  return result.map(leerDelivery);
}

export async function asignarDelivery(token: string, pedidoId: string, usuarioId: string): Promise<Pedido> {
  return leerPedido(await apiRequest(`/api/v1/pedidos/${encodeURIComponent(pedidoId)}/delivery`, {
    method: "PUT",
    body: JSON.stringify({ usuarioId }),
  }, token));
}

export async function descargarComprobante(token: string, pedidoId: string): Promise<void> {
  const archivo = await apiDownload(`/api/v1/pedidos/${encodeURIComponent(pedidoId)}/comprobante/pdf`, token);
  const url = URL.createObjectURL(archivo.blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.filename;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
