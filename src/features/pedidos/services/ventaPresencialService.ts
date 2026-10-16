import { apiRequest } from "../../../services/api";
import type { DatosClienteVenta, ProductoVenta, VentaPresencialInput, VentaPresencialResult } from "../types/ventaPresencial";

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function leerTexto(value: unknown, campo: string): string {
  if (typeof value !== "string") throw new Error(`La respuesta de venta contiene un campo no válido: ${campo}.`);
  return value;
}

function leerTextoOpcional(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function leerMonto(value: unknown, campo: string): number {
  const monto = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(monto)) throw new Error(`La respuesta de venta contiene un campo no válido: ${campo}.`);
  return monto;
}

function leerProducto(value: unknown): ProductoVenta {
  if (!esObjeto(value)
    || typeof value.stockDisponible !== "number"
    || (typeof value.precioFinal !== "number" && typeof value.precioFinal !== "string")) {
    throw new Error("La API devolvió un producto no válido para la venta.");
  }
  return {
    id: leerTexto(value.id, "producto.id"),
    codigo: leerTexto(value.codigo, "producto.codigo"),
    nombre: leerTexto(value.nombre, "producto.nombre"),
    categoriaNombre: leerTexto(value.categoria ?? value.categoriaNombre, "producto.categoria"),
    precioFinal: leerMonto(value.precioFinal, "producto.precioFinal"),
    stockDisponible: value.stockDisponible,
  };
}

export async function obtenerImagenPrincipalProducto(productoId: string): Promise<string | null> {
  const response: unknown = await apiRequest(`/api/v1/public/catalogo/${encodeURIComponent(productoId)}/galeria`);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una galería de producto no válida.");
  }
  const principal = response.find((image) => esObjeto(image) && image.esPrincipal === true);
  const primeraImagen = principal ?? response[0];
  if (primeraImagen === undefined) return null;
  if (!esObjeto(primeraImagen) || typeof primeraImagen.url !== "string") {
    throw new Error("La API devolvió una imagen de producto no válida.");
  }
  return primeraImagen.url;
}

export async function listarProductosVenta(): Promise<ProductoVenta[]> {
  const productos: ProductoVenta[] = [];
  let page = 0;
  let totalPages = 1;
  do {
    const response: unknown = await apiRequest(`/api/v1/public/catalogo?page=${page}&size=100`);
    if (!esObjeto(response) || !Array.isArray(response.content)
      || typeof response.totalPages !== "number" || !Number.isInteger(response.totalPages) || response.totalPages < 0) {
      throw new Error("La API devolvió una página de catálogo no válida.");
    }
    productos.push(...response.content.map(leerProducto));
    totalPages = response.totalPages;
    page += 1;
  } while (page < totalPages);
  return productos;
}

export async function buscarClienteVenta(
  tipoDocumento: string,
  numeroDocumento: string,
  token: string,
): Promise<DatosClienteVenta> {
  const query = new URLSearchParams({ tipoDocumento, numeroDocumento });
  const response: unknown = await apiRequest(`/api/v1/pedidos/presencial/cliente?${query.toString()}`, {}, token);
  if (!esObjeto(response)) throw new Error("La API devolvió datos de cliente no válidos.");
  return {
    tipoDocumento: leerTexto(response.tipoDocumento, "cliente.tipoDocumento"),
    numeroDocumento: leerTexto(response.numeroDocumento, "cliente.numeroDocumento"),
    nombres: leerTexto(response.nombres, "cliente.nombres"),
    apellidos: leerTexto(response.apellidos, "cliente.apellidos"),
    telefono: leerTextoOpcional(response.telefono),
    departamento: leerTextoOpcional(response.departamento),
    provincia: leerTextoOpcional(response.provincia),
    distrito: leerTextoOpcional(response.distrito),
    direccion: leerTextoOpcional(response.direccion),
    codigoPostal: leerTextoOpcional(response.codigoPostal),
    referencia: leerTextoOpcional(response.referencia),
    idUbigeo: leerTextoOpcional(response.idUbigeo),
  };
}

export async function registrarVentaPresencial(
  input: VentaPresencialInput,
  token: string,
): Promise<VentaPresencialResult> {
  const response: unknown = await apiRequest("/api/v1/pedidos/presencial", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
  if (!esObjeto(response)) throw new Error("La API devolvió una confirmación de venta no válida.");
  return {
    pedidoId: leerTexto(response.pedidoId, "pedidoId"),
    codigoPedido: leerTexto(response.codigoPedido, "codigoPedido"),
    tipoResolucion: leerTexto(response.tipoResolucion, "tipoResolucion"),
    mensaje: leerTexto(response.mensaje, "mensaje"),
  };
}
