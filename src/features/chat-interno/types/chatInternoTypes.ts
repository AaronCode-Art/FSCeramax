export interface InternalChat {
  id: string;
  codigo: string;
  asunto: string | null;
  estado: string;
  usuarioCreadorId: string;
  actualizadoEn: string;
  miembros: ChatMember[];
}

export interface ChatMember {
  chatId: string;
  usuarioId: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
}

export interface ChatStaffUser {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
}

export interface ChatAttachment {
  id: string;
  nombreArchivo: string;
  url: string;
  tipoContenido: string;
  tamanoBytes: number;
  creadoEn: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  remitenteId: string;
  tipoRemitente: string;
  contenido: string;
  creadoEn: string;
  adjuntos: ChatAttachment[];
}
