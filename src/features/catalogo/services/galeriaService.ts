import { apiRequest } from "../../../services/api";

export interface ProductImage {
  id: string;
  productoId: string;
  url: string;
  publicId: string | null;
  orden: number;
  esPrincipal: boolean;
  createdAt: string;
}

export interface ProductImageInput {
  url: string;
  publicId: string | null;
  orden: number;
  esPrincipal: boolean;
}

function parseProductImage(value: unknown): ProductImage {
  if (typeof value !== "object" || value === null
    || !("id" in value) || typeof value.id !== "string"
    || !("productoId" in value) || typeof value.productoId !== "string"
    || !("url" in value) || typeof value.url !== "string"
    || !("publicId" in value) || !(typeof value.publicId === "string" || value.publicId === null)
    || !("orden" in value) || typeof value.orden !== "number"
    || !("esPrincipal" in value) || typeof value.esPrincipal !== "boolean"
    || !("createdAt" in value) || typeof value.createdAt !== "string") {
    throw new Error("La API devolvió una imagen con datos incompletos o no válidos.");
  }
  return {
    id: value.id,
    productoId: value.productoId,
    url: value.url,
    publicId: value.publicId,
    orden: value.orden,
    esPrincipal: value.esPrincipal,
    createdAt: value.createdAt,
  };
}

function productGalleryPath(productId: string): string {
  return `/api/v1/catalogo/productos/${encodeURIComponent(productId)}/galeria`;
}

export async function listProductImages(productId: string, token: string): Promise<ProductImage[]> {
  const response = await apiRequest(productGalleryPath(productId), {}, token);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una lista de imágenes no válida.");
  }
  return response.map(parseProductImage).sort((first, second) => first.orden - second.orden);
}

export async function createProductImage(
  productId: string,
  input: ProductImageInput,
  token: string,
): Promise<ProductImage> {
  return parseProductImage(await apiRequest(productGalleryPath(productId), {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function uploadProductImage(
  productId: string,
  file: File,
  orden: number,
  esPrincipal: boolean,
  token: string,
  imageId?: string,
): Promise<ProductImage> {
  const form = new FormData();
  form.set("archivo", file);
  form.set("orden", String(orden));
  form.set("esPrincipal", String(esPrincipal));
  const path = imageId
    ? `${productGalleryPath(productId)}/${encodeURIComponent(imageId)}/archivo`
    : `${productGalleryPath(productId)}/archivo`;
  return parseProductImage(await apiRequest(path, {
    method: imageId ? "PUT" : "POST",
    body: form,
  }, token));
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: ProductImageInput,
  token: string,
): Promise<ProductImage> {
  return parseProductImage(await apiRequest(
    `${productGalleryPath(productId)}/${encodeURIComponent(imageId)}`,
    { method: "PUT", body: JSON.stringify(input) },
    token,
  ));
}

export async function deleteProductImage(productId: string, imageId: string, token: string): Promise<void> {
  await apiRequest(`${productGalleryPath(productId)}/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  }, token);
}
