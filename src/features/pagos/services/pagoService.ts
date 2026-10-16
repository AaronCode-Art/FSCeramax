import { apiRequest } from "../../../services/api";
import type { PagoResumen, ResumenPagosResponse } from "../types/pago";

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function leerTexto(value: unknown, campo: string): string {
  if (typeof value !== "string") throw new Error(`La respuesta de pagos contiene un campo no válido: ${campo}.`);
  return value;
}

function leerNumero(value: unknown, campo: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`La respuesta de pagos contiene un campo numérico no válido: ${campo}.`);
  }
  return value;
}

function leerPago(value: unknown): PagoResumen {
  if (!esObjeto(value)) throw new Error("La respuesta de pagos contiene un registro no válido.");
  return {
    metodoPago: leerTexto(value.metodoPago, "metodoPago"),
    estado: leerTexto(value.estado, "estado"),
    cantidadPagos: leerNumero(value.cantidadPagos, "cantidadPagos"),
    montoTotal: leerNumero(value.montoTotal, "montoTotal"),
  };
}

export async function listarResumenPagos(
  desde: string,
  hasta: string,
  token: string,
): Promise<ResumenPagosResponse> {
  const query = new URLSearchParams({ desde, hasta });
  const response = await apiRequest(`/api/v1/reportes/ventas-inventario?${query.toString()}`, {}, token);
  if (!esObjeto(response) || !Array.isArray(response.resumenPagos)) {
    throw new Error("La API devolvió un resumen de pagos no válido.");
  }
  return {
    desde: leerTexto(response.desde, "desde"),
    hasta: leerTexto(response.hasta, "hasta"),
    resumenPagos: response.resumenPagos.map(leerPago),
  };
}
