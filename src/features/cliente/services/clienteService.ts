import { apiRequest } from "../../../services/api";

export interface ClientRecord {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  codigoPostal: string;
  referencia: string;
  idUbigeo: string;
  activo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClientCreateInput {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  codigoPostal: string;
  referencia: string;
  idUbigeo: string;
}

export interface ClientUpdateInput extends ClientCreateInput {
  activo: boolean;
}

export interface UbigeoEntry {
  id: string;
  name: string;
  level: "department" | "province" | "district";
  childrens: UbigeoEntry[];
}

interface ClientPage {
  content: ClientRecord[];
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClient(value: unknown): ClientRecord {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.nombres !== "string"
    || typeof value.apellidos !== "string"
    || !(typeof value.email === "string" || value.email === null)
    || typeof value.tipoDocumento !== "string"
    || typeof value.numeroDocumento !== "string"
    || !(typeof value.telefono === "string" || value.telefono === null)
    || !(typeof value.departamento === "string" || value.departamento === null)
    || !(typeof value.provincia === "string" || value.provincia === null)
    || !(typeof value.distrito === "string" || value.distrito === null)
    || !(typeof value.direccion === "string" || value.direccion === null)
    || !(typeof value.codigoPostal === "string" || value.codigoPostal === null)
    || !(typeof value.referencia === "string" || value.referencia === null)
    || !(typeof value.idUbigeo === "string" || value.idUbigeo === null)
    || typeof value.activo !== "boolean"
    || !(typeof value.createdAt === "string" || value.createdAt === null)
    || !(typeof value.updatedAt === "string" || value.updatedAt === null)) {
    throw new Error("La API devolvió un cliente no válido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    nombres: value.nombres,
    apellidos: value.apellidos,
    email: value.email ?? "",
    tipoDocumento: value.tipoDocumento,
    numeroDocumento: value.numeroDocumento,
    telefono: value.telefono ?? "",
    departamento: value.departamento ?? "",
    provincia: value.provincia ?? "",
    distrito: value.distrito ?? "",
    direccion: value.direccion ?? "",
    codigoPostal: value.codigoPostal ?? "",
    referencia: value.referencia ?? "",
    idUbigeo: value.idUbigeo ?? "",
    activo: value.activo,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseClientPage(value: unknown): ClientPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de clientes no válida.");
  }
  return { content: value.content.map(parseClient), totalPages: value.totalPages };
}

function parseUbigeoEntry(value: unknown, expectedLevel: UbigeoEntry["level"]): UbigeoEntry {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.name !== "string"
    || value.level !== expectedLevel) {
    throw new Error("La API devolvió una ubicación UBIGEO no válida.");
  }
  if (expectedLevel === "district") {
    return { id: value.id, name: value.name, level: expectedLevel, childrens: [] };
  }
  if (!Array.isArray(value.childrens)) {
    throw new Error("La API devolvió una jerarquía UBIGEO no válida.");
  }
  const childLevel = expectedLevel === "department" ? "province" : "district";
  return {
    id: value.id,
    name: value.name,
    level: expectedLevel,
    childrens: value.childrens.map((item) => parseUbigeoEntry(item, childLevel)),
  };
}

export async function listClients(token: string): Promise<ClientRecord[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseClientPage(await apiRequest(
    `/api/v1/clientes?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const clients = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    clients.push(...(await loadPage(page)).content);
  }
  return clients;
}

export async function listUbigeos(): Promise<UbigeoEntry[]> {
  const response = await apiRequest("/api/v1/public/ubigeos");
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió un catálogo UBIGEO no válido.");
  }
  return response.map((entry) => parseUbigeoEntry(entry, "department"));
}

export async function createClient(input: ClientCreateInput, token: string): Promise<ClientRecord> {
  return parseClient(await apiRequest("/api/v1/clientes", {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateClient(id: string, input: ClientUpdateInput, token: string): Promise<ClientRecord> {
  return parseClient(await apiRequest(`/api/v1/clientes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}
