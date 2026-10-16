import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Role } from "../../../app/types";
import { Icon } from "../../../components/ui/Icon";
import type { AuthSession } from "../../auth/authService";
import { ChatInternoStyles } from "../css/ChatInternoStyles";
import {
  getWebSocketUrl,
  internalChatApi,
  readMessage,
} from "../services/chatApi";
import type {
  ChatMessage,
  ChatStaffUser,
  InternalChat,
} from "../types/chatInternoTypes";

const CREATOR_ROLES = new Set<Role>(["ADMIN", "JEFE_LOGISTICA", "LOGISTICA"]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "avif", "pdf", "txt", "csv", "doc", "docx", "xls", "xlsx",
]);

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mergeMessage(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort((left, right) => left.creadoEn.localeCompare(right.creadoEn));
}

export function ChatInternoPage({
  session,
  role,
  initialChatId,
}: {
  session: AuthSession;
  role: Role;
  initialChatId?: string | null;
}) {
  const [chats, setChats] = useState<InternalChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [showMobileChatList, setShowMobileChatList] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState("");
  const [dialog, setDialog] = useState<"create" | "rename" | null>(null);
  const [chatName, setChatName] = useState("");
  const [staffUsers, setStaffUsers] = useState<ChatStaffUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("TODOS");
  const [loadingStaffUsers, setLoadingStaffUsers] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectedChatId, setConnectedChatId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const clientRef = useRef<Client | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const selectedChatIdRef = useRef("");
  const selectedChat = chats.find((chat) => chat.id === selectedChatId) ?? null;
  const currentUserId = selectedChat?.miembros.find(
    (member) => member.email === session.email,
  )?.usuarioId;
  const connected = connectedChatId === selectedChatId && selectedChatId !== "";
  const canCreate = CREATOR_ROLES.has(role);
  const canManageSelectedChat = Boolean(selectedChat?.miembros.some((member) =>
    member.email === session.email
    && (role === "ADMIN" || member.usuarioId === selectedChat.usuarioCreadorId),
  ));
  const memberNames = selectedChat?.miembros
    .map((member) => `${member.nombres} ${member.apellidos}`)
    .join(", ") ?? "";
  const visibleMemberNames = selectedChat?.miembros
    .slice(0, 2)
    .map((member) => `${member.nombres} ${member.apellidos}`)
    .join(", ") ?? "";

  const visibleChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return chats;
    return chats.filter((chat) =>
      `${chat.asunto ?? ""} ${chat.codigo}`.toLocaleLowerCase("es").includes(query),
    );
  }, [chats, search]);

  const filteredStaffUsers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase("es");
    return staffUsers.filter((user) => {
      const matchesRole = memberRoleFilter === "TODOS" || user.rol === memberRoleFilter;
      const matchesSearch = !query
        || `${user.nombres} ${user.apellidos} ${user.email}`.toLocaleLowerCase("es").includes(query);
      return matchesRole && matchesSearch;
    });
  }, [memberRoleFilter, memberSearch, staffUsers]);

  const selectedMembers = useMemo(
    () => staffUsers.filter((user) => selectedMemberIds.includes(user.id)),
    [selectedMemberIds, staffUsers],
  );

  const refreshChats = useCallback(async () => {
    try {
      const page = await internalChatApi.listChats(session.token);
      setChats(page.content);
      const nextSelectedChatId = page.content.some((chat) => chat.id === selectedChatIdRef.current)
        ? selectedChatIdRef.current
        : page.content[0]?.id ?? "";
      if (nextSelectedChatId !== selectedChatIdRef.current) {
        setMessages([]);
        setLoadingMessages(Boolean(nextSelectedChatId));
        selectedChatIdRef.current = nextSelectedChatId;
      }
      setSelectedChatId(nextSelectedChatId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las conversaciones.");
    } finally {
      setLoadingChats(false);
    }
  }, [session.token]);

  useEffect(() => {
    let active = true;
    internalChatApi.listChats(session.token)
      .then((page) => {
        if (!active) return;
        setChats(page.content);
        const requestedChatId = initialChatId ?? "";
        const nextSelectedChatId = page.content.some((chat) => chat.id === requestedChatId)
          ? requestedChatId
          : page.content.some((chat) => chat.id === selectedChatIdRef.current)
            ? selectedChatIdRef.current
            : page.content[0]?.id ?? "";
        if (nextSelectedChatId !== selectedChatIdRef.current) {
          setMessages([]);
          setLoadingMessages(Boolean(nextSelectedChatId));
          selectedChatIdRef.current = nextSelectedChatId;
        }
        setSelectedChatId(nextSelectedChatId);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las conversaciones.");
        }
      })
      .finally(() => {
        if (active) setLoadingChats(false);
      });
    return () => {
      active = false;
    };
  }, [initialChatId, session.token]);

  useEffect(() => {
    if (!selectedChatId) return;
    let active = true;

    async function loadMessages() {
      try {
        const firstPage = await internalChatApi.listMessages(session.token, selectedChatId, 0);
        const lastPage = firstPage.totalPages > 1
          ? await internalChatApi.listMessages(session.token, selectedChatId, firstPage.totalPages - 1)
          : firstPage;
        if (active) setMessages(lastPage.content);
      } catch (cause) {
        if (active) {
          setMessages([]);
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
        }
      } finally {
        if (active) setLoadingMessages(false);
      }
    }
    void loadMessages();
    return () => {
      active = false;
    };
  }, [selectedChatId, session.token]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }
    let subscription: StompSubscription | undefined;
    const client = new Client({
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      connectHeaders: { Authorization: `Bearer ${session.token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnectedChatId(selectedChatId);
        setError("");
        subscription = client.subscribe(`/topic/chat-interno/${selectedChatId}`, (frame: IMessage) => {
          try {
            setMessages((current) => mergeMessage(current, readMessage(JSON.parse(frame.body) as unknown)));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Se recibió un mensaje no válido.");
          }
        });
      },
      onStompError: (frame) => {
        setConnectedChatId(null);
        setError(frame.headers.message || "No se pudo establecer la conexión con el chat.");
      },
      onWebSocketClose: () => setConnectedChatId(null),
      onWebSocketError: () => {
        setConnectedChatId(null);
        setError("Se perdió la conexión. El chat intentará reconectarse automáticamente.");
      },
    });
    clientRef.current = client;
    client.activate();
    return () => {
      subscription?.unsubscribe();
      clientRef.current = null;
      void client.deactivate();
    };
  }, [selectedChatId, session.token]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loadingMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !selectedChat || selectedChat.estado === "CERRADO") return;
    setSending(true);
    setError("");
    try {
      const saved = await internalChatApi.sendMessage(session.token, selectedChat.id, content);
      setMessages((current) => mergeMessage(current, saved));
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function validateAttachment(file: File): string | null {
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US") ?? "";
    if (file.size > MAX_ATTACHMENT_BYTES) return "El archivo supera el límite de 10 MB.";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return "Tipo de archivo no permitido. Usa imágenes, PDF, DOCX, XLSX, TXT o CSV.";
    }
    return null;
  }

  function selectChat(chatId: string) {
    setShowMobileChatList(false);
    if (chatId === selectedChatId) return;
    selectedChatIdRef.current = chatId;
    setMessages([]);
    setLoadingMessages(Boolean(chatId));
    setSelectedChatId(chatId);
  }

  async function sendAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachment || !selectedChat || selectedChat.estado === "CERRADO") return;
    const fileError = validateAttachment(attachment);
    if (fileError) {
      setError(fileError);
      return;
    }
    setSending(true);
    setError("");
    try {
      const saved = await internalChatApi.sendAttachment(
        session.token,
        selectedChat.id,
        attachment,
        attachmentCaption.trim(),
      );
      setMessages((current) => mergeMessage(current, saved));
      setAttachment(null);
      setAttachmentCaption("");
      const input = document.getElementById("internal-chat-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Adjunto enviado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el adjunto.");
    } finally {
      setSending(false);
    }
  }

  function openDialog(mode: "create" | "rename") {
    setChatName(mode === "rename" ? selectedChat?.asunto ?? "" : "");
    setSelectedMemberIds([]);
    setMemberSearch("");
    setMemberRoleFilter("TODOS");
    setDialog(mode);
    setError("");
    if (mode === "create") {
      setLoadingStaffUsers(true);
      internalChatApi.listStaffUsers(session.token)
        .then(setStaffUsers)
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el personal.");
        })
        .finally(() => setLoadingStaffUsers(false));
    }
  }

  async function saveChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = chatName.trim();
    if (!name || !selectedChat && dialog === "rename") return;
    if (dialog === "create" && selectedMemberIds.length === 0) {
      setError("Selecciona al menos un miembro para la conversación.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (dialog === "rename" && selectedChat) {
        const updated = await internalChatApi.renameChat(session.token, selectedChat.id, name);
        setChats((current) => current.map((chat) => chat.id === updated.id ? updated : chat));
      } else {
        const created = await internalChatApi.createChat(session.token, name, selectedMemberIds);
        setChats((current) => [created, ...current.filter((chat) => chat.id !== created.id)]);
        selectedChatIdRef.current = created.id;
        setLoadingMessages(true);
        setSelectedChatId(created.id);
        setShowMobileChatList(false);
      }
      setDialog(null);
      setChatName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la conversación.");
    } finally {
      setSaving(false);
    }
  }

  async function closeChat() {
    if (!selectedChat) return;
    const accepted = window.confirm(
      `¿Cerrar "${selectedChat.asunto || selectedChat.codigo}"? El historial se conservará.`,
    );
    if (!accepted) return;
    setError("");
    try {
      await internalChatApi.closeChat(session.token, selectedChat.id);
      setChats((current) => current.map((chat) =>
        chat.id === selectedChat.id ? { ...chat, estado: "CERRADO" } : chat,
      ));
      setNotice("Conversación cerrada. El historial se conserva.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cerrar la conversación.");
    }
  }

  return <>
    <ChatInternoStyles />
    <section className={`internal-chat ${showMobileChatList ? "is-mobile-list-open" : "is-mobile-chat-open"}`}>
      <aside className="internal-chat-sidebar">
        <header className="internal-chat-brand">
          <span className="internal-chat-mark"><Icon name="chat" size={20}/></span>
          <div><strong>Chat interno</strong><small>Comunicación del equipo</small></div>
          <button className="internal-chat-icon-button" type="button" onClick={() => {
            setLoadingChats(true);
            void refreshChats();
          }} aria-label="Actualizar conversaciones" title="Actualizar">
            <span aria-hidden="true">↻</span>
          </button>
        </header>
        <div className="internal-chat-profile">
          <span className="internal-chat-avatar">{session.nombres.trim().charAt(0).toUpperCase()}</span>
          <span><strong>{session.nombres} {session.apellidos}</strong><small>{session.rol.replaceAll("_", " ")}</small></span>
        </div>
        <div className="internal-chat-list-heading">
          <div><small>ESPACIO COMPARTIDO</small><h2>Conversaciones</h2></div>
          {canCreate && <button className="internal-chat-add" type="button" onClick={() => openDialog("create")} aria-label="Crear conversación" title="Crear conversación"><Icon name="plus" size={18}/></button>}
        </div>
        <label className="internal-chat-search">
          <span className="internal-chat-sr-only">Buscar conversaciones</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversación"/>
        </label>
        <div className="internal-chat-list">
          {loadingChats && <p className="internal-chat-list-message">Cargando conversaciones…</p>}
          {!loadingChats && visibleChats.length === 0 && (
            <div className="internal-chat-empty-list">
              <Icon name="chat" size={24}/>
              <p>{chats.length ? "No hay coincidencias." : "Aún no hay conversaciones."}</p>
              {canCreate && chats.length === 0 && <button type="button" onClick={() => openDialog("create")}>Crear la primera</button>}
            </div>
          )}
          {visibleChats.map((chat) => <button
            key={chat.id}
            type="button"
            className={`internal-chat-item ${chat.id === selectedChatId ? "is-selected" : ""}`}
            onClick={() => selectChat(chat.id)}
          >
            <span className="internal-chat-item-icon"><Icon name="chat" size={17}/></span>
            <span className="internal-chat-item-copy"><strong>{chat.asunto || chat.codigo}</strong><small>{formatDate(chat.actualizadoEn)}</small></span>
            {chat.estado === "CERRADO" && <span className="internal-chat-closed-tag">Cerrado</span>}
          </button>)}
        </div>
        <footer className="internal-chat-status">
          <span className={connected ? "is-online" : "is-offline"}/>
          {connected ? "Conectado en tiempo real" : "Conectando…"}
        </footer>
      </aside>

      <section className="internal-chat-conversation">
        <header className="internal-chat-conversation-header">
          <div className="internal-chat-conversation-title">
            <button
              className="internal-chat-mobile-back"
              type="button"
              onClick={() => setShowMobileChatList(true)}
              aria-label="Volver a las conversaciones"
              title="Volver a las conversaciones"
            >←</button>
            <span className="internal-chat-title-icon"><Icon name="chat" size={19}/></span>
            <div><h1>{selectedChat?.asunto || selectedChat?.codigo || "Selecciona una conversación"}</h1>
              {selectedChat && <p title={memberNames}>{selectedChat.estado === "CERRADO"
                ? "Conversación cerrada"
                : `Miembros: ${visibleMemberNames}${selectedChat.miembros.length > 2 ? ` y ${selectedChat.miembros.length - 2} más` : ""}`}</p>}
            </div>
          </div>
          <div className="internal-chat-actions">
            <span className={`internal-chat-connection ${connected ? "online" : ""}`}>{connected ? "En línea" : "Reconectando"}</span>
            {selectedChat && selectedChat.estado !== "CERRADO" && <>
              {canManageSelectedChat && <>
                <button className="internal-chat-action-button" type="button" onClick={() => openDialog("rename")} title="Cambiar nombre">Editar nombre</button>
                <button className="internal-chat-action-button close" type="button" onClick={() => void closeChat()} title="Cerrar conversación">Cerrar</button>
              </>}
            </>}
          </div>
        </header>

        {error && <div className="internal-chat-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar aviso">×</button></div>}
        {notice && <div className="internal-chat-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button></div>}

        {selectedChat ? <>
          <div className="internal-chat-messages">
            {loadingMessages && <p className="internal-chat-list-message">Cargando historial…</p>}
            {!loadingMessages && messages.length === 0 && <div className="internal-chat-empty">
              <span><Icon name="chat" size={24}/></span><h2>Inicia la conversación</h2>
              <p>Solo los miembros seleccionados pueden ver y responder en esta conversación.</p>
            </div>}
            {messages.map((item) => {
              const isOwnMessage = item.remitenteId === currentUserId;
              const sender = selectedChat.miembros.find(
                (member) => member.usuarioId === item.remitenteId,
              );
              return <article
                className={`internal-chat-message ${isOwnMessage ? "is-own" : "is-other"}`}
                key={item.id}
              >
                <div className="internal-chat-message-meta">
                  <strong>{isOwnMessage ? "Tú" : sender ? `${sender.nombres} ${sender.apellidos}` : "Personal"}</strong>
                  <time dateTime={item.creadoEn}>{formatDate(item.creadoEn)}</time>
                </div>
                {item.contenido && <p className="internal-chat-message-text">{item.contenido}</p>}
                {item.adjuntos.map((file) => <a className="internal-chat-attachment" href={file.url} key={file.id} target="_blank" rel="noreferrer">
                  {file.tipoContenido.startsWith("image/")
                    ? <img src={file.url} alt={file.nombreArchivo}/>
                    : <span className="internal-chat-file-icon"><Icon name="file" size={20}/></span>}
                  <span><strong>{file.nombreArchivo}</strong><small>{formatFileSize(file.tamanoBytes)}</small></span>
                </a>)}
              </article>;
            })}
            <div ref={messageEndRef}/>
          </div>
          {selectedChat.estado === "CERRADO"
            ? <div className="internal-chat-closed-notice">Esta conversación está cerrada. El historial sigue disponible.</div>
            : <div className="internal-chat-composer">
              <form className="internal-chat-message-form" onSubmit={sendMessage}>
                <label className="internal-chat-sr-only" htmlFor="internal-chat-message">Mensaje</label>
                <textarea id="internal-chat-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={2} placeholder="Escribe un mensaje…" disabled={sending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}/>
                <button className="internal-chat-send" type="submit" disabled={!message.trim() || sending} aria-label="Enviar mensaje">{sending ? "Enviando…" : "Enviar"}</button>
              </form>
              <form className="internal-chat-attachment-form" onSubmit={sendAttachment}>
                <label className="internal-chat-file-picker" htmlFor="internal-chat-file">
                  <span aria-hidden="true">＋</span>{attachment?.name || "Adjuntar archivo"}
                </label>
                <input id="internal-chat-file" className="internal-chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setAttachment(file);
                  setError(file ? validateAttachment(file) ?? "" : "");
                }}/>
                {attachment && <>
                  <label className="internal-chat-sr-only" htmlFor="internal-chat-caption">Comentario del archivo</label>
                  <input id="internal-chat-caption" className="internal-chat-caption" value={attachmentCaption} onChange={(event) => setAttachmentCaption(event.target.value)} maxLength={4000} placeholder="Comentario opcional"/>
                  <button className="internal-chat-upload" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar archivo"}</button>
                </>}
                <small>Máximo 10 MB</small>
              </form>
            </div>}
        </> : <div className="internal-chat-no-selection">
          <span><Icon name="chat" size={27}/></span><h2>Conversa con tu equipo</h2>
          <p>Selecciona una conversación o crea un nuevo espacio compartido.</p>
          {canCreate && <button className="primary-button" type="button" onClick={() => openDialog("create")}>Crear conversación</button>}
        </div>}
      </section>

      {dialog && <div className="internal-chat-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
        <section
          className={`internal-chat-dialog ${dialog === "create" ? "is-creating" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="internal-chat-dialog-title"
        >
          <div className="internal-chat-dialog-heading">
            <div><small>{dialog === "create" ? "NUEVA CONVERSACIÓN" : "EDITAR CONVERSACIÓN"}</small>
              <h2 id="internal-chat-dialog-title">{dialog === "create" ? "Crear espacio del equipo" : "Cambiar nombre"}</h2></div>
            <button type="button" onClick={() => setDialog(null)} aria-label="Cerrar">×</button>
          </div>
          <form onSubmit={saveChat}>
            <label className="internal-chat-dialog-label" htmlFor="internal-chat-name">Nombre de la conversación</label>
            <input id="internal-chat-name" className="internal-chat-dialog-input" autoFocus required maxLength={150} value={chatName} onChange={(event) => setChatName(event.target.value)} placeholder="Ej. Coordinación de logística"/>
            {dialog === "create" && <div className="internal-chat-member-picker">
              {loadingStaffUsers
                ? <div className="internal-chat-member-loading" role="status"><span/>Cargando personal disponible…</div>
                : staffUsers.length === 0
                  ? <div className="internal-chat-member-empty-state">
                    <span><Icon name="users" size={20}/></span>
                    <strong>No hay miembros disponibles</strong>
                    <small>No hay otros usuarios internos activos para agregar.</small>
                  </div>
                  : <>
                    <div className="internal-chat-member-heading">
                      <div>
                        <span className="internal-chat-member-eyebrow">PARTICIPANTES</span>
                        <strong>¿Quiénes estarán en este chat?</strong>
                      </div>
                      <span className="internal-chat-member-total">{selectedMemberIds.length}</span>
                    </div>
                    <p className="internal-chat-member-description">
                      Elige una o varias personas. Solo los participantes podrán acceder a la conversación.
                    </p>
                    <div className="internal-chat-member-filters">
                      <label className="internal-chat-member-search">
                        <span>Buscar personal</span>
                        <input
                          type="search"
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                          placeholder="Nombre o correo electrónico"
                        />
                      </label>
                      <label className="internal-chat-member-role">
                        <span>Filtrar por rol</span>
                        <select
                          value={memberRoleFilter}
                          onChange={(event) => setMemberRoleFilter(event.target.value)}
                        >
                          <option value="TODOS">Todos los roles</option>
                          {[...new Set(staffUsers.map((user) => user.rol))].sort().map((userRole) => (
                            <option value={userRole} key={userRole}>{userRole.replaceAll("_", " ")}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {selectedMembers.length > 0 && <div className="internal-chat-selected-members">
                      <span>SELECCIONADOS</span>
                      <div>
                        {selectedMembers.map((user) => <span className="internal-chat-member-chip" key={user.id}>
                          {user.nombres} {user.apellidos}
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIds((current) => current.filter((id) => id !== user.id))}
                            aria-label={`Quitar a ${user.nombres} ${user.apellidos}`}
                          >×</button>
                        </span>)}
                      </div>
                    </div>}
                    <div className="internal-chat-member-results">
                      <span>Personal disponible</span>
                      <small>{filteredStaffUsers.length} {filteredStaffUsers.length === 1 ? "persona" : "personas"}</small>
                    </div>
                    <div className="internal-chat-member-list">
                      {filteredStaffUsers.length === 0
                        ? <div className="internal-chat-member-empty-state">
                          <span><Icon name="search" size={18}/></span>
                          <strong>Sin resultados</strong>
                          <small>Prueba con otro nombre o selecciona un rol diferente.</small>
                        </div>
                        : filteredStaffUsers.map((user) => <label
                          className={`internal-chat-member-option ${selectedMemberIds.includes(user.id) ? "is-selected" : ""}`}
                          key={user.id}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(user.id)}
                            onChange={(event) => setSelectedMemberIds((current) => event.target.checked
                              ? [...current, user.id]
                              : current.filter((id) => id !== user.id))}
                          />
                          <span className="internal-chat-member-avatar" aria-hidden="true">
                            {(user.nombres.trim().charAt(0) + user.apellidos.trim().charAt(0)).toUpperCase()}
                          </span>
                          <span className="internal-chat-member-info">
                            <strong>{user.nombres} {user.apellidos}</strong>
                            <small>{user.email}</small>
                          </span>
                          <span className="internal-chat-member-role-tag">{user.rol.replaceAll("_", " ")}</span>
                        </label>)}
                    </div>
                  </>}
              {!loadingStaffUsers && staffUsers.length > 0 && (
                <p className="internal-chat-member-footnote">Tú también formarás parte de la conversación.</p>
              )}
            </div>}
            {error && <p className="internal-chat-dialog-error" role="alert">{error}</p>}
            <div className="internal-chat-dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setDialog(null)}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={saving || !chatName.trim() || (dialog === "create" && (loadingStaffUsers || selectedMemberIds.length === 0))}>{saving ? "Guardando…" : dialog === "create" ? "Crear conversación" : "Guardar nombre"}</button>
            </div>
          </form>
        </section>
      </div>}
    </section>
  </>;
}
