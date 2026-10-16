import { apiRequest } from "../../../services/api";

export interface Product {
  id: string;
  codigo: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  descripcion: string | null;
  especificaciones: Array<Record<string, unknown>>;
  precio: number;
  descuentoPorcentaje: number;
  precioFinal: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  codigo: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  especificaciones: Array<Record<string, unknown>>;
  precio: number;
  descuentoPorcentaje: number;
  activo: boolean;
}

interface ProductPage {
  content: Product[];
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAmount(value: unknown, field: string): number {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount)) {
    throw new Error(`La API devolvió un producto con ${field} no válido.`);
  }
  return amount;
}

function parseProduct(value: unknown): Product {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.categoriaId !== "string"
    || typeof value.categoriaNombre !== "string"
    || typeof value.nombre !== "string"
    || !(typeof value.descripcion === "string" || value.descripcion === null)
    || !Array.isArray(value.especificaciones)
    || !value.especificaciones.every(isRecord)
    || typeof value.activo !== "boolean"
    || typeof value.createdAt !== "string"
    || typeof value.updatedAt !== "string") {
    throw new Error("La API devolvió un producto con datos incompletos o no válidos.");
  }

  return {
    id: value.id,
    codigo: value.codigo,
    categoriaId: value.categoriaId,
    categoriaNombre: value.categoriaNombre,
    nombre: value.nombre,
    descripcion: value.descripcion,
    especificaciones: value.especificaciones,
    precio: parseAmount(value.precio, "precio"),
    descuentoPorcentaje: parseAmount(value.descuentoPorcentaje, "descuento"),
    precioFinal: parseAmount(value.precioFinal, "precio final"),
    activo: value.activo,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseProductPage(value: unknown): ProductPage {
  if (typeof value !== "object" || value === null || !("content" in value) || !Array.isArray(value.content)
    || !("totalPages" in value) || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de productos no válida.");
  }

  return { content: value.content.map(parseProduct), totalPages: value.totalPages };
}

async function getProductPage(page: number, token: string): Promise<ProductPage> {
  return parseProductPage(await apiRequest(
    `/api/v1/catalogo/productos?page=${page}&size=100`,
    {},
    token,
  ));
}

export async function listProducts(token: string): Promise<Product[]> {
  const firstPage = await getProductPage(0, token);
  const products = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    products.push(...(await getProductPage(page, token)).content);
  }
  return products;
}

export async function createProduct(input: ProductInput, token: string): Promise<Product> {
  return parseProduct(await apiRequest("/api/v1/catalogo/productos", {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateProduct(id: string, input: ProductInput, token: string): Promise<Product> {
  return parseProduct(await apiRequest(`/api/v1/catalogo/productos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}

export async function deactivateProduct(id: string, token: string): Promise<void> {
  await apiRequest(`/api/v1/catalogo/productos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, token);
}

export async function countProductsInCategory(categoryId: string, token: string): Promise<number> {
  return (await listProducts(token)).filter((product) => product.categoriaId === categoryId).length;
}
