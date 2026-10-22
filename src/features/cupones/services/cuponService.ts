import { apiRequest } from "../../../services/api";

export type Coupon = {
  id: string;
  codigo: string;
  tipoDescuento: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  compraMinima: number;
  usoMaximo: number | null;
  usos: number;
  iniciaEn: string;
  venceEn: string | null;
  limitePorCliente: number;
  anuncioTitulo: string;
  anuncioMensaje: string;
  anunciar: boolean;
  activo: boolean;
};

export type CouponInput = Omit<Coupon, "id" | "usos" | "anuncioTitulo" | "anuncioMensaje" | "anunciar"> & {
  descripcion: string;
};

const couponsPath = "/api/v1/cupones";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCoupon(value: unknown): Coupon {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || (value.tipoDescuento !== "PORCENTAJE" && value.tipoDescuento !== "MONTO_FIJO")
    || typeof value.valor !== "number"
    || typeof value.compraMinima !== "number"
    || !(typeof value.usoMaximo === "number" || value.usoMaximo === null)
    || typeof value.usos !== "number"
    || typeof value.iniciaEn !== "string"
    || !(typeof value.venceEn === "string" || value.venceEn === null)
    || typeof value.limitePorCliente !== "number"
    || typeof value.anuncioTitulo !== "string"
    || typeof value.anuncioMensaje !== "string"
    || typeof value.anunciar !== "boolean"
    || typeof value.activo !== "boolean") {
    throw new Error("La API devolvió un cupón con datos incompletos o no válidos.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    tipoDescuento: value.tipoDescuento,
    valor: value.valor,
    compraMinima: value.compraMinima,
    usoMaximo: value.usoMaximo,
    usos: value.usos,
    iniciaEn: value.iniciaEn,
    venceEn: value.venceEn,
    limitePorCliente: value.limitePorCliente,
    anuncioTitulo: value.anuncioTitulo,
    anuncioMensaje: value.anuncioMensaje,
    anunciar: value.anunciar,
    activo: value.activo,
  };
}

export async function listCoupons(token: string): Promise<Coupon[]> {
  const response = await apiRequest(couponsPath, {}, token);
  if (!Array.isArray(response)) throw new Error("La API devolvió una lista de cupones no válida.");
  return response.map(parseCoupon);
}

export async function createCoupon(input: CouponInput, token: string): Promise<Coupon> {
  return parseCoupon(await apiRequest(couponsPath, {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateCoupon(id: string, input: CouponInput, token: string): Promise<Coupon> {
  return parseCoupon(await apiRequest(`${couponsPath}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}

export async function deactivateCoupon(id: string, token: string): Promise<void> {
  await apiRequest(`${couponsPath}/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
}
