import { apiRequest } from "../../../services/api";

export interface InventoryItem {
  sucursalId: string;
  sucursalNombre: string;
  almacenId: string;
  almacenCodigo: string;
  almacenNombre: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  categoriaNombre: string;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  stockBajo: boolean;
}

export interface Warehouse {
  id: string;
  codigo: string;
  nombre: string;
  sucursalId: string;
  sucursalNombre: string;
  activo: boolean;
}

export interface WarehouseInput {
  nombre: string;
  sucursalId: string;
  activo: boolean;
}

export interface Branch {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia: string | null;
  codigoPostal: string | null;
  idUbigeo: string | null;
  activo: boolean;
}

export interface BranchInput {
  nombre: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia: string;
  codigoPostal: string;
  idUbigeo: string;
  activo: boolean;
}

export interface InventoryEntryInput {
  almacenId: string;
  productoId: string;
  cantidad: number;
  observacion: string;
}

export interface InventoryAdjustmentInput {
  almacenId: string;
  productoId: string;
  nuevoStock: number;
  motivo: "MERMA" | "ROBO" | "INVENTARIO_FISICO" | "CORRECCION" | "REPOSICION_AUTORIZADA" | "OTRO";
  observacion: string;
}

export interface EntryRequest {
  id: string;
  codigo: string;
  tipo: string;
  estado: string;
  idAlmacen: string;
  almacenNombre: string;
  idProducto: string;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  stockResultanteEsperado: number | null;
  motivo: string;
  observacion: string | null;
  usuarioSolicitanteNombre: string;
  usuarioAprobadorNombre: string | null;
  fechaSolicitud: string;
  fechaRespuesta: string | null;
  motivoRespuesta: string | null;
}

export interface InventoryTransfer {
  id: string;
  codigo: string;
  tipo: "PARA_CLIENTE" | "REABASTECIMIENTO";
  estado: string;
  almacenOrigenId: string;
  almacenOrigenNombre: string;
  almacenDestinoId: string;
  almacenDestinoNombre: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  pedidoId: string | null;
  pedidoCodigo: string | null;
  fechaInicio: string;
  diasTransito: number;
}

export interface ActiveInventoryReservation {
  pedidoId: string;
  pedidoCodigo: string;
  detallePedidoId: string;
  almacenId: string;
  almacenNombre: string;
  productoId: string;
  cantidad: number;
  clienteNombre: string | null;
}

export interface InventoryTransferInput {
  almacenOrigenId: string;
  almacenDestinoId: string;
  productoId: string;
  cantidad: number;
  tipoTraslado: "PARA_CLIENTE" | "REABASTECIMIENTO";
  pedidoId?: string;
  detallePedidoId?: string;
  observacion: string;
}

export interface InventoryMovement {
  id: string;
  codigo: string;
  fecha: string;
  almacenId: string;
  almacenNombre: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  usuarioId: string | null;
  usuarioNombre: string | null;
  pedidoId: string | null;
  trasladoId: string | null;
  tipo: string;
  motivo: string;
  cantidad: number;
  stockResultante: number | null;
  observacion: string | null;
}

interface InventoryPage {
  content: InventoryItem[];
  totalPages: number;
}

interface InventoryMovementPage {
  content: InventoryMovement[];
  totalPages: number;
}

interface InventoryTransferPage {
  content: InventoryTransfer[];
  totalPages: number;
}

interface ActiveInventoryReservationPage {
  content: ActiveInventoryReservation[];
  totalPages: number;
}

interface EntryRequestPage {
  content: EntryRequest[];
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInventoryItem(value: unknown): InventoryItem {
  if (!isRecord(value)
    || typeof value.sucursalId !== "string"
    || typeof value.sucursalNombre !== "string"
    || typeof value.almacenId !== "string"
    || typeof value.almacenCodigo !== "string"
    || typeof value.almacenNombre !== "string"
    || typeof value.productoId !== "string"
    || typeof value.productoCodigo !== "string"
    || typeof value.productoNombre !== "string"
    || typeof value.categoriaNombre !== "string"
    || typeof value.stockFisico !== "number"
    || typeof value.stockReservado !== "number"
    || typeof value.stockDisponible !== "number"
    || typeof value.stockMinimo !== "number"
    || typeof value.stockBajo !== "boolean") {
    throw new Error("La API devolvió un registro de inventario no válido.");
  }
  return {
    sucursalId: value.sucursalId,
    sucursalNombre: value.sucursalNombre,
    almacenId: value.almacenId,
    almacenCodigo: value.almacenCodigo,
    almacenNombre: value.almacenNombre,
    productoId: value.productoId,
    productoCodigo: value.productoCodigo,
    productoNombre: value.productoNombre,
    categoriaNombre: value.categoriaNombre,
    stockFisico: value.stockFisico,
    stockReservado: value.stockReservado,
    stockDisponible: value.stockDisponible,
    stockMinimo: value.stockMinimo,
    stockBajo: value.stockBajo,
  };
}

function parseInventoryPage(value: unknown): InventoryPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de inventario no válida.");
  }
  return { content: value.content.map(parseInventoryItem), totalPages: value.totalPages };
}

function parseInventoryMovement(value: unknown): InventoryMovement {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.fecha !== "string"
    || Number.isNaN(Date.parse(value.fecha))
    || typeof value.almacenId !== "string"
    || typeof value.almacenNombre !== "string"
    || typeof value.productoId !== "string"
    || typeof value.productoCodigo !== "string"
    || typeof value.productoNombre !== "string"
    || !(typeof value.usuarioId === "string" || value.usuarioId === null)
    || !(typeof value.usuarioNombre === "string" || value.usuarioNombre === null)
    || !(typeof value.pedidoId === "string" || value.pedidoId === null)
    || !(typeof value.trasladoId === "string" || value.trasladoId === null)
    || typeof value.tipo !== "string"
    || typeof value.motivo !== "string"
    || typeof value.cantidad !== "number"
    || !(typeof value.stockResultante === "number" || value.stockResultante === null)
    || !(typeof value.observacion === "string" || value.observacion === null)) {
    throw new Error("La API devolvió un movimiento de inventario no válido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    fecha: value.fecha,
    almacenId: value.almacenId,
    almacenNombre: value.almacenNombre,
    productoId: value.productoId,
    productoCodigo: value.productoCodigo,
    productoNombre: value.productoNombre,
    usuarioId: value.usuarioId,
    usuarioNombre: value.usuarioNombre,
    pedidoId: value.pedidoId,
    trasladoId: value.trasladoId,
    tipo: value.tipo,
    motivo: value.motivo,
    cantidad: value.cantidad,
    stockResultante: value.stockResultante,
    observacion: value.observacion,
  };
}

function parseInventoryMovementPage(value: unknown): InventoryMovementPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de movimientos no válida.");
  }
  return { content: value.content.map(parseInventoryMovement), totalPages: value.totalPages };
}

function parseEntryRequest(value: unknown): EntryRequest {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.tipo !== "string"
    || typeof value.estado !== "string"
    || typeof value.idAlmacen !== "string"
    || typeof value.almacenNombre !== "string"
    || typeof value.idProducto !== "string"
    || typeof value.productoCodigo !== "string"
    || typeof value.productoNombre !== "string"
    || typeof value.cantidad !== "number"
    || !(typeof value.stockResultanteEsperado === "number" || value.stockResultanteEsperado === null)
    || typeof value.motivo !== "string"
    || !(typeof value.observacion === "string" || value.observacion === null)
    || typeof value.usuarioSolicitanteNombre !== "string"
    || !(typeof value.usuarioAprobadorNombre === "string" || value.usuarioAprobadorNombre === null)
    || typeof value.fechaSolicitud !== "string"
    || !(typeof value.fechaRespuesta === "string" || value.fechaRespuesta === null)
    || !(typeof value.motivoRespuesta === "string" || value.motivoRespuesta === null)) {
    throw new Error("La API devolvió una solicitud de entrada no válida.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    tipo: value.tipo,
    estado: value.estado,
    idAlmacen: value.idAlmacen,
    almacenNombre: value.almacenNombre,
    idProducto: value.idProducto,
    productoCodigo: value.productoCodigo,
    productoNombre: value.productoNombre,
    cantidad: value.cantidad,
    stockResultanteEsperado: value.stockResultanteEsperado,
    motivo: value.motivo,
    observacion: value.observacion,
    usuarioSolicitanteNombre: value.usuarioSolicitanteNombre,
    usuarioAprobadorNombre: value.usuarioAprobadorNombre,
    fechaSolicitud: value.fechaSolicitud,
    fechaRespuesta: value.fechaRespuesta,
    motivoRespuesta: value.motivoRespuesta,
  };
}

function parseEntryRequestPage(value: unknown): EntryRequestPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de solicitudes no válida.");
  }
  return { content: value.content.map(parseEntryRequest), totalPages: value.totalPages };
}

function parseInventoryTransfer(value: unknown): InventoryTransfer {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || (value.tipo !== "PARA_CLIENTE" && value.tipo !== "REABASTECIMIENTO")
    || typeof value.estado !== "string"
    || typeof value.almacenOrigenId !== "string"
    || typeof value.almacenOrigenNombre !== "string"
    || typeof value.almacenDestinoId !== "string"
    || typeof value.almacenDestinoNombre !== "string"
    || typeof value.productoId !== "string"
    || typeof value.productoCodigo !== "string"
    || typeof value.productoNombre !== "string"
    || typeof value.cantidad !== "number"
    || !(typeof value.pedidoId === "string" || value.pedidoId === null)
    || !(typeof value.pedidoCodigo === "string" || value.pedidoCodigo === null)
    || typeof value.fechaInicio !== "string"
    || typeof value.diasTransito !== "number") {
    throw new Error("La API devolvió un traslado de inventario no válido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    tipo: value.tipo,
    estado: value.estado,
    almacenOrigenId: value.almacenOrigenId,
    almacenOrigenNombre: value.almacenOrigenNombre,
    almacenDestinoId: value.almacenDestinoId,
    almacenDestinoNombre: value.almacenDestinoNombre,
    productoId: value.productoId,
    productoCodigo: value.productoCodigo,
    productoNombre: value.productoNombre,
    cantidad: value.cantidad,
    pedidoId: value.pedidoId,
    pedidoCodigo: value.pedidoCodigo,
    fechaInicio: value.fechaInicio,
    diasTransito: value.diasTransito,
  };
}

function parseInventoryTransferPage(value: unknown): InventoryTransferPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de traslados no válida.");
  }
  return { content: value.content.map(parseInventoryTransfer), totalPages: value.totalPages };
}

function parseActiveInventoryReservation(value: unknown): ActiveInventoryReservation {
  if (!isRecord(value)
    || typeof value.pedidoId !== "string"
    || typeof value.pedidoCodigo !== "string"
    || typeof value.detallePedidoId !== "string"
    || typeof value.almacenId !== "string"
    || typeof value.almacenNombre !== "string"
    || typeof value.productoId !== "string"
    || typeof value.cantidad !== "number"
    || !(typeof value.clienteNombre === "string" || value.clienteNombre === null)) {
    throw new Error("La API devolvió una reserva activa no válida.");
  }
  return {
    pedidoId: value.pedidoId,
    pedidoCodigo: value.pedidoCodigo,
    detallePedidoId: value.detallePedidoId,
    almacenId: value.almacenId,
    almacenNombre: value.almacenNombre,
    productoId: value.productoId,
    cantidad: value.cantidad,
    clienteNombre: value.clienteNombre,
  };
}

function parseActiveInventoryReservationPage(value: unknown): ActiveInventoryReservationPage {
  if (!isRecord(value) || !Array.isArray(value.content)
    || typeof value.totalPages !== "number" || !Number.isInteger(value.totalPages) || value.totalPages < 0) {
    throw new Error("La API devolvió una página de reservas activas no válida.");
  }
  return { content: value.content.map(parseActiveInventoryReservation), totalPages: value.totalPages };
}

function parseWarehouse(value: unknown): Warehouse {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.nombre !== "string"
    || typeof value.sucursalId !== "string"
    || typeof value.sucursalNombre !== "string"
    || typeof value.activo !== "boolean") {
    throw new Error("La API devolvió un almacén no válido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    nombre: value.nombre,
    sucursalId: value.sucursalId,
    sucursalNombre: value.sucursalNombre,
    activo: value.activo,
  };
}

function parseBranch(value: unknown): Branch {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || typeof value.nombre !== "string"
    || typeof value.departamento !== "string"
    || typeof value.provincia !== "string"
    || typeof value.distrito !== "string"
    || typeof value.direccion !== "string"
    || !(typeof value.referencia === "string" || value.referencia === null)
    || !(typeof value.codigoPostal === "string" || value.codigoPostal === null)
    || !(typeof value.idUbigeo === "string" || value.idUbigeo === null)
    || typeof value.activo !== "boolean") {
    throw new Error("La API devolvió una sucursal no válida.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    nombre: value.nombre,
    departamento: value.departamento,
    provincia: value.provincia,
    distrito: value.distrito,
    direccion: value.direccion,
    referencia: value.referencia,
    codigoPostal: value.codigoPostal,
    idUbigeo: value.idUbigeo,
    activo: value.activo,
  };
}

export async function listInventory(token: string): Promise<InventoryItem[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseInventoryPage(await apiRequest(
    `/api/v1/inventario?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const items = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    items.push(...(await loadPage(page)).content);
  }
  return items;
}

export async function listInventoryMovements(token: string): Promise<InventoryMovement[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseInventoryMovementPage(await apiRequest(
    `/api/v1/inventario/movimientos?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const movements = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    movements.push(...(await loadPage(page)).content);
  }
  return movements;
}

export async function listWarehouses(token: string): Promise<Warehouse[]> {
  const response = await apiRequest("/api/v1/inventario/almacenes", {}, token);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una lista de almacenes no válida.");
  }
  return response.map(parseWarehouse);
}

export async function listBranches(token: string): Promise<Branch[]> {
  const response = await apiRequest("/api/v1/sucursales", {}, token);
  if (!Array.isArray(response)) {
    throw new Error("La API devolvió una lista de sucursales no válida.");
  }
  return response.map(parseBranch);
}

export async function createBranch(input: BranchInput, token: string): Promise<Branch> {
  return parseBranch(await apiRequest("/api/v1/sucursales", {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateBranch(id: string, input: BranchInput, token: string): Promise<Branch> {
  return parseBranch(await apiRequest(`/api/v1/sucursales/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}

function parseWarehouseMutation(value: unknown): Warehouse {
  return parseWarehouse(value);
}

export async function createWarehouse(input: WarehouseInput, token: string): Promise<Warehouse> {
  return parseWarehouseMutation(await apiRequest("/api/v1/inventario/almacenes", {
    method: "POST",
    body: JSON.stringify(input),
  }, token));
}

export async function updateWarehouse(id: string, input: WarehouseInput, token: string): Promise<Warehouse> {
  return parseWarehouseMutation(await apiRequest(`/api/v1/inventario/almacenes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token));
}

export async function deactivateWarehouse(id: string, token: string): Promise<void> {
  await apiRequest(`/api/v1/inventario/almacenes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, token);
}

export async function registerInventoryEntry(input: InventoryEntryInput, token: string): Promise<void> {
  await apiRequest("/api/v1/inventario/entradas", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function createInventoryAdjustment(input: InventoryAdjustmentInput, token: string): Promise<void> {
  await apiRequest("/api/v1/inventario/ajustes", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listEntryRequests(token: string): Promise<EntryRequest[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseEntryRequestPage(await apiRequest(
    `/api/v1/inventario/solicitudes-entradas?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const requests = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    requests.push(...(await loadPage(page)).content);
  }
  return requests;
}

export async function listInventoryTransfers(token: string): Promise<InventoryTransfer[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseInventoryTransferPage(await apiRequest(
    `/api/v1/inventario/traslados/en-transito?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const transfers = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    transfers.push(...(await loadPage(page)).content);
  }
  return transfers;
}

export async function listActiveInventoryReservations(token: string): Promise<ActiveInventoryReservation[]> {
  const pageSize = 100;
  const loadPage = async (page: number) => parseActiveInventoryReservationPage(await apiRequest(
    `/api/v1/inventario/reservas-activas?page=${page}&size=${pageSize}`,
    {},
    token,
  ));
  const firstPage = await loadPage(0);
  const reservations = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    reservations.push(...(await loadPage(page)).content);
  }
  return reservations;
}

export async function createInventoryTransfer(input: InventoryTransferInput, token: string): Promise<string> {
  const response = await apiRequest("/api/v1/inventario/traslados", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
  if (!isRecord(response) || typeof response.id !== "string") {
    throw new Error("La API no devolvió el identificador del traslado creado.");
  }
  return response.id;
}

export async function receiveInventoryTransfer(id: string, observacion: string, token: string): Promise<void> {
  await apiRequest(`/api/v1/inventario/traslados/${encodeURIComponent(id)}/recepcion`, {
    method: "POST",
    body: JSON.stringify({ observacion }),
  }, token);
}

export async function cancelInventoryTransfer(id: string, motivo: string, token: string): Promise<void> {
  await apiRequest(`/api/v1/inventario/traslados/${encodeURIComponent(id)}/cancelacion`, {
    method: "POST",
    body: JSON.stringify({ observacion: motivo }),
  }, token);
}

export async function approveEntryRequest(id: string, token: string): Promise<void> {
  await apiRequest(`/api/v1/inventario/solicitudes-entradas/${encodeURIComponent(id)}/aprobar`, {
    method: "POST",
  }, token);
}

export async function rejectEntryRequest(id: string, reason: string, token: string): Promise<void> {
  const query = new URLSearchParams({ motivo: reason });
  await apiRequest(
    `/api/v1/inventario/solicitudes-entradas/${encodeURIComponent(id)}/rechazar?${query.toString()}`,
    { method: "POST" },
    token,
  );
}
