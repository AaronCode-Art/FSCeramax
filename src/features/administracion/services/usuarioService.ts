import { apiRequest } from "../../../services/api";

export interface UserRecord {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipoDocumento: string;
  numeroDocumento: string;
  rolId: string;
  rolCodigo: string;
  sucursalId: string | null;
  telefono: string | null;
  activo: boolean;
  createdAt: string | null;
}

export interface UserRole {
  id: string;
  codigo: string;
  nombre: string;
}

export interface UserInput {
  codigo: string;
  rolId: string;
  sucursalId: string | null;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  activo: boolean;
}

interface UserPage {
  content: UserRecord[];
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown): UserRecord {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.nombres !== "string"
    || typeof value.apellidos !== "string"
    || typeof value.email !== "string"
    || typeof value.tipoDocumento !== "string"
    || typeof value.numeroDocumento !== "string"
    || typeof value.rolId !== "string"
    || typeof value.rolCodigo !== "string"
    || !(typeof value.sucursalId === "string" || value.sucursalId === null)
    || !(typeof value.telefono === "string" || value.telefono === null)
    || typeof value.activo !== "boolean"
    || !(typeof value.createdAt === "string" || value.createdAt === null)) {
    throw new Error("La API devolvió un usuario no válido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    nombres: value.nombres,
    apellidos: value.apellidos,
    email: value.email,
    tipoDocumento: value.tipoDocumento,
    numeroDocumento: value.numeroDocumento,
    rolId: value.rolId,
    rolCodigo: value.rolCodigo,
    sucursalId: value.sucursalId,
    telefono: value.telefono,
    activo: value.activo,
    createdAt: value.createdAt,
  };
}

function parseUserPage(value: unknown): UserPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de usuarios no válida.");
  }
  return { content: value.content.map(parseUser), totalPages: value.totalPages };
}

function parseUserRole(value: unknown): UserRole {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.nombre !== "string") {
    throw new Error("La API devolvió un rol no válido.");
  }
  return { id: value.id, codigo: value.codigo, nombre: value.nombre };
}

export async function listUsers(token: string): Promise<UserRecord[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseUserPage(await apiRequest(
    `/api/v1/usuarios?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const users = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    users.push(...(await loadPage(page)).content);
  }
  return users;
}

export async function listUserRoles(token: string): Promise<UserRole[]> {
  const response = await apiRequest("/api/v1/roles", {}, token);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una lista de roles no válida.");
  }
  return response.map(parseUserRole);
}

export async function createUser(input: UserInput, token: string): Promise<UserRecord> {
  return parseUser(await apiRequest("/api/v1/usuarios", {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateUser(id: string, input: UserInput, token: string): Promise<UserRecord> {
  return parseUser(await apiRequest(`/api/v1/usuarios/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}
