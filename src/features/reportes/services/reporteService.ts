import { apiRequest } from "../../../services/api";
import type { InventarioReporte, PagoResumen, ProductoMasVendido, ReporteVentasInventario } from "../types/reporte";

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function texto(value: unknown, campo: string): string {
  if (typeof value !== "string") throw new Error(`El reporte contiene un campo no válido: ${campo}.`);
  return value;
}

function textoOpcional(value: unknown, campo: string): string | null {
  if (value === null) return null;
  return texto(value, campo);
}

function cantidad(value: unknown, campo: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`El reporte contiene un campo numérico no válido: ${campo}.`);
  }
  return value;
}

function leerLista<T>(value: unknown, campo: string, parsear: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`El reporte contiene una lista no válida: ${campo}.`);
  return value.map(parsear);
}

function leerProducto(value: unknown): ProductoMasVendido {
  if (!esObjeto(value)) throw new Error("El reporte contiene un producto no válido.");
  return {
    productoId: texto(value.productoId, "productoId"),
    codigo: texto(value.codigo, "codigo"),
    nombre: texto(value.nombre, "nombre"),
    unidadesVendidas: cantidad(value.unidadesVendidas, "unidadesVendidas"),
    importeVendido: cantidad(value.importeVendido, "importeVendido"),
  };
}

function leerInventario(value: unknown): InventarioReporte {
  if (!esObjeto(value)) throw new Error("El reporte contiene un registro de inventario no válido.");
  if (typeof value.stockBajo !== "boolean") throw new Error("El reporte contiene un estado de stock no válido.");
  return {
    almacenId: texto(value.almacenId, "almacenId"),
    almacenCodigo: texto(value.almacenCodigo, "almacenCodigo"),
    almacenNombre: texto(value.almacenNombre, "almacenNombre"),
    productoId: texto(value.productoId, "productoId"),
    productoCodigo: texto(value.productoCodigo, "productoCodigo"),
    productoNombre: texto(value.productoNombre, "productoNombre"),
    categoriaNombre: textoOpcional(value.categoriaNombre, "categoriaNombre"),
    stockFisico: cantidad(value.stockFisico, "stockFisico"),
    stockReservado: cantidad(value.stockReservado, "stockReservado"),
    stockDisponible: cantidad(value.stockDisponible, "stockDisponible"),
    stockMinimo: cantidad(value.stockMinimo, "stockMinimo"),
    stockBajo: value.stockBajo,
  };
}

function leerPago(value: unknown): PagoResumen {
  if (!esObjeto(value)) throw new Error("El reporte contiene un resumen de pagos no válido.");
  return {
    metodoPago: texto(value.metodoPago, "metodoPago"),
    estado: texto(value.estado, "estado"),
    cantidadPagos: cantidad(value.cantidadPagos, "cantidadPagos"),
    montoTotal: cantidad(value.montoTotal, "montoTotal"),
  };
}

function leerReporte(value: unknown): ReporteVentasInventario {
  if (!esObjeto(value)) throw new Error("La API devolvió un reporte no válido.");
  return {
    desde: texto(value.desde, "desde"),
    hasta: texto(value.hasta, "hasta"),
    generadoEn: texto(value.generadoEn, "generadoEn"),
    cantidadVentas: cantidad(value.cantidadVentas, "cantidadVentas"),
    ventasWeb: cantidad(value.ventasWeb, "ventasWeb"),
    ventasPresenciales: cantidad(value.ventasPresenciales, "ventasPresenciales"),
    ingresosTotales: cantidad(value.ingresosTotales, "ingresosTotales"),
    productosMasVendidos: leerLista(value.productosMasVendidos, "productosMasVendidos", leerProducto),
    resumenPagos: leerLista(value.resumenPagos, "resumenPagos", leerPago),
    inventarioActual: leerLista(value.inventarioActual, "inventarioActual", leerInventario),
  };
}

export async function obtenerReporteVentasInventario(
  desde: string,
  hasta: string,
  token: string,
): Promise<ReporteVentasInventario> {
  const query = new URLSearchParams({ desde, hasta });
  const response = await apiRequest(`/api/v1/reportes/ventas-inventario?${query.toString()}`, {}, token);
  return leerReporte(response);
}
