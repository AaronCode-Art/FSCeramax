import { apiRequest } from "../../../services/api";

export interface Category {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

const categoriesPath = "/api/v1/catalogo/categorias";

function isCategory(value: unknown): value is Category {
  return typeof value === "object"
    && value !== null
    && "id" in value
    && typeof value.id === "string"
    && "codigo" in value
    && typeof value.codigo === "string"
    && "nombre" in value
    && typeof value.nombre === "string"
    && "descripcion" in value
    && (typeof value.descripcion === "string" || value.descripcion === null)
    && "activo" in value
    && typeof value.activo === "boolean"
    && "createdAt" in value
    && typeof value.createdAt === "string"
    && "updatedAt" in value
    && typeof value.updatedAt === "string";
}

function parseCategory(value: unknown): Category {
  if (!isCategory(value)) {
    throw new Error("La API devolvió una categoría con datos incompletos o no válidos.");
  }
  return value;
}

export async function listCategories(token: string): Promise<Category[]> {
  const response = await apiRequest(categoriesPath, {}, token);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una lista de categorías no válida.");
  }
  return response.map(parseCategory);
}

export async function createCategory(input: CategoryInput, token: string): Promise<Category> {
  const response = await apiRequest(categoriesPath, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
  return parseCategory(response);
}

export async function updateCategory(id: string, input: CategoryInput, token: string): Promise<Category> {
  const response = await apiRequest(`${categoriesPath}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
  return parseCategory(response);
}

export async function deactivateCategory(id: string, token: string): Promise<void> {
  await apiRequest(`${categoriesPath}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, token);
}
