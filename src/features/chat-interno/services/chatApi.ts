import { apiRequest } from "../../../services/api";
import type {
  ChatAttachment,
  ChatMember,
  ChatMessage,
  ChatStaffUser,
  InternalChat,
} from "../types/chatInternoTypes";

interface Page<T> {
  content: T[];
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readChat(value: unknown): InternalChat {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.codigo !== "string"
    || (value.asunto !== null && typeof value.asunto !== "string")
    || typeof value.estado !== "string"
    || typeof value.usuarioCreadorId !== "string"
    || typeof value.actualizadoEn !== "string"
    || !Array.isArray(value.miembros)
  ) {
    throw new Error("La API devolvió una conversación con formato inválido.");
  }
  return {
    id: value.id,
    codigo: value.codigo,
    asunto: value.asunto,
    estado: value.estado,
    usuarioCreadorId: value.usuarioCreadorId,
    actualizadoEn: value.actualizadoEn,
    miembros: value.miembros.map(readMember),
  };
}

function readMember(value: unknown): ChatMember {
  if (
    !isRecord(value)
    || typeof value.chatId !== "string"
    || typeof value.usuarioId !== "string"
    || typeof value.nombres !== "string"
    || typeof value.apellidos !== "string"
    || typeof value.email !== "string"
    || typeof value.rol !== "string"
  ) {
    throw new Error("La API devolvió un miembro con formato inválido.");
  }
  return {
    chatId: value.chatId,
    usuarioId: value.usuarioId,
    nombres: value.nombres,
    apellidos: value.apellidos,
    email: value.email,
    rol: value.rol,
  };
}

function readStaffUser(value: unknown): ChatStaffUser {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.nombres !== "string"
    || typeof value.apellidos !== "string"
    || typeof value.email !== "string"
    || typeof value.rol !== "string"
  ) {
    throw new Error("La API devolvió un usuario interno con formato inválido.");
  }
  return {
    id: value.id,
    nombres: value.nombres,
    apellidos: value.apellidos,
    email: value.email,
    rol: value.rol,
  };
}

function readAttachment(value: unknown): ChatAttachment {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.nombreArchivo !== "string"
    || typeof value.url !== "string"
    || typeof value.tipoContenido !== "string"
    || typeof value.tamanoBytes !== "number"
    || typeof value.creadoEn !== "string"
  ) {
    throw new Error("La API devolvió un adjunto con formato inválido.");
  }
  return {
    id: value.id,
    nombreArchivo: value.nombreArchivo,
    url: value.url,
    tipoContenido: value.tipoContenido,
    tamanoBytes: value.tamanoBytes,
    creadoEn: value.creadoEn,
  };
}

export function readMessage(value: unknown): ChatMessage {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.chatId !== "string"
    || typeof value.remitenteId !== "string"
    || typeof value.tipoRemitente !== "string"
    || typeof value.contenido !== "string"
    || typeof value.creadoEn !== "string"
    || !Array.isArray(value.adjuntos)
  ) {
    throw new Error("La API devolvió un mensaje con formato inválido.");
  }
  return {
    id: value.id,
    chatId: value.chatId,
    remitenteId: value.remitenteId,
    tipoRemitente: value.tipoRemitente,
    contenido: value.contenido,
    creadoEn: value.creadoEn,
    adjuntos: value.adjuntos.map(readAttachment),
  };
}

async function readPage<T>(
  path: string,
  token: string,
  map: (item: unknown) => T,
): Promise<Page<T>> {
  const result = await apiRequest(path, {}, token);
  if (
    !isRecord(result)
    || !Array.isArray(result.content)
    || typeof result.totalPages !== "number"
  ) {
    throw new Error("La API devolvió una página con formato inválido.");
  }
  return {
    content: result.content.map(map),
    totalPages: result.totalPages,
  };
}

export const internalChatApi = {
  listChats: (token: string) =>
    readPage("/api/v1/chats/interno?page=0&size=100", token, readChat),

  listStaffUsers: async (token: string) => {
    const result = await apiRequest("/api/v1/chats/interno/usuarios", {}, token);
    if (!Array.isArray(result)) {
      throw new Error("La API devolvió una lista de usuarios con formato inválido.");
    }
    return result.map(readStaffUser);
  },

  listMessages: (token: string, chatId: string, page = 0) =>
    readPage(
      `/api/v1/chats/interno/${encodeURIComponent(chatId)}/mensajes?page=${page}&size=100`,
      token,
      readMessage,
    ),

  sendMessage: async (token: string, chatId: string, contenido: string) =>
    readMessage(await apiRequest(
      `/api/v1/chats/interno/${encodeURIComponent(chatId)}/mensajes`,
      {
        method: "POST",
        body: JSON.stringify({ contenido }),
      },
      token,
    )),

  createChat: async (token: string, asunto: string, miembroIds: string[]) =>
    readChat(await apiRequest("/api/v1/chats/interno", {
      method: "POST",
      body: JSON.stringify({ asunto, miembroIds }),
    }, token)),

  renameChat: async (token: string, chatId: string, asunto: string) =>
    readChat(await apiRequest(`/api/v1/chats/interno/${encodeURIComponent(chatId)}`, {
      method: "PATCH",
      body: JSON.stringify({ asunto }),
    }, token)),

  closeChat: (token: string, chatId: string) =>
    apiRequest(`/api/v1/chats/interno/${encodeURIComponent(chatId)}`, {
      method: "DELETE",
    }, token),

  sendAttachment: async (token: string, chatId: string, file: File, contenido: string) => {
    const body = new FormData();
    body.append("archivo", file);
    body.append("contenido", contenido);
    return readMessage(await apiRequest(
      `/api/v1/chats/interno/${encodeURIComponent(chatId)}/adjuntos`,
      { method: "POST", body },
      token,
    ));
  },
};

export function getWebSocketUrl(): string {
  const backendUrl = import.meta.env.VITE_API_URL?.trim();
  if (!backendUrl) {
    throw new Error("La API no está configurada. Define VITE_API_URL en el entorno del frontend.");
  }
  return new URL("/ws", backendUrl).toString();
}
