import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { navigation, roleDescriptions, roleLabels, settingsPage } from "../../app/navigation";
import type { Role } from "../../app/types";
import type { AuthSession } from "../../features/auth/authService";
import { getWebSocketUrl, internalChatApi, readMessage } from "../../features/chat-interno/services/chatApi";
import type { InternalChat } from "../../features/chat-interno/types/chatInternoTypes";
import { listarPedidos } from "../../features/pedidos/services/pedidoService";
import type { PedidoResumen } from "../../features/pedidos/types/pedido";
import { listarProductosVenta } from "../../features/pedidos/services/ventaPresencialService";
import type { ProductoVenta } from "../../features/pedidos/types/ventaPresencial";
import { Icon } from "../ui/Icon";

type ResultadoBusqueda = {
  id: string;
  titulo: string;
  detalle: string;
  tipo: "Pedido" | "Producto";
  pagina: string;
  consulta: string;
};

type ChatNotification = {
  id: string;
  chatId: string;
  titulo: string;
  remitente: string;
  contenido: string;
  creadoEn: string;
};

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AppShell({
  role,
  user,
  activePage,
  onNavigate,
  onNavigateChat,
  onLogout,
  children,
}: {
  role: Role;
  user: AuthSession;
  activePage: string;
  onNavigate: (page: string, searchTerm?: string) => void;
  onNavigateChat: (chatId: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchData, setSearchData] = useState<{ pedidos: PedidoResumen[]; productos: ProductoVenta[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const displayName = `${user.nombres} ${user.apellidos}`.trim() || user.email;
  const initials = `${user.nombres.trim().charAt(0)}${user.apellidos.trim().charAt(0)}`.trim()
    || user.email.slice(0, 2);
  const navigate = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  useEffect(() => {
    let active = true;
    let client: Client | null = null;
    let chatsById = new Map<string, InternalChat>();
    const subscribedChatIds = new Set<string>();

    const subscribeToChat = (chat: InternalChat) => {
      if (!client?.connected || subscribedChatIds.has(chat.id)) return;
      const currentMember = chat.miembros.find((member) => member.email === user.email);
      if (!currentMember) return;
      client.subscribe(`/topic/chat-interno/${chat.id}`, (frame: IMessage) => {
        try {
          const message = readMessage(JSON.parse(frame.body) as unknown);
          const currentChat = chatsById.get(chat.id);
          const member = currentChat?.miembros.find((item) => item.email === user.email);
          if (!currentChat || !member || message.chatId !== chat.id || message.remitenteId === member.usuarioId) return;
          const sender = currentChat.miembros.find((item) => item.usuarioId === message.remitenteId);
          if (!sender) return;
          const contenido = message.contenido.trim()
            || (message.adjuntos.length > 0 ? "Envió un archivo adjunto" : "Nuevo mensaje");
          setNotifications((current) => {
            if (current.some((notification) => notification.id === message.id)) return current;
            return [{
              id: message.id,
              chatId: chat.id,
              titulo: currentChat.asunto?.trim() || currentChat.codigo,
              remitente: `${sender.nombres} ${sender.apellidos}`.trim() || sender.email,
              contenido,
              creadoEn: message.creadoEn,
            }, ...current].slice(0, 50);
          });
        } catch (cause) {
          setNotificationError(cause instanceof Error
            ? cause.message
            : "Se recibió una notificación de chat no válida.");
        }
      });
      subscribedChatIds.add(chat.id);
    };

    const subscribeToChats = () => {
      chatsById.forEach(subscribeToChat);
    };

    async function refreshChats() {
      try {
        const page = await internalChatApi.listChats(user.token);
        if (!active) return;
        chatsById = new Map(page.content.map((chat) => [chat.id, chat]));
        if (client?.connected) subscribeToChats();
      } catch (cause) {
        if (active) {
          setNotificationError(cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las conversaciones para las notificaciones.");
        }
      }
    }

    client = new Client({
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      connectHeaders: { Authorization: `Bearer ${user.token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (!active) return;
        setNotificationError(null);
        subscribeToChats();
      },
      onStompError: (frame) => {
        setNotificationError(frame.headers.message || "No se pudo conectar con las notificaciones de chat.");
      },
      onWebSocketError: () => {
        setNotificationError("Se perdió la conexión de notificaciones. Se intentará reconectar.");
      },
    });
    client.activate();
    void refreshChats();
    const refreshInterval = window.setInterval(() => void refreshChats(), 30000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      if (client) void client.deactivate();
    };
  }, [user.email, user.token]);

  const searchEnabled = search.trim().length >= 2;
  const searchLoading = searchEnabled && searchData === null && searchError === null;

  useEffect(() => {
    if (!searchEnabled || searchData || searchError) return;
    let vigente = true;
    void Promise.allSettled([
      listarPedidos(user.token, role, role === "DELIVERY" ? "Entregas" : "Pedidos", 0, 100),
      listarProductosVenta(),
    ])
      .then(([pedidosResult, productosResult]) => {
        if (!vigente) return;
        const pedidos = pedidosResult.status === "fulfilled" ? pedidosResult.value.contenido : [];
        const productos = productosResult.status === "fulfilled" ? productosResult.value : [];
        setSearchData({ pedidos, productos });
        if (pedidosResult.status === "rejected" && productosResult.status === "rejected") {
          setSearchError("No se pudieron cargar pedidos ni productos para la búsqueda.");
        } else if (pedidosResult.status === "rejected" || productosResult.status === "rejected") {
          setSearchError("Algunos resultados no están disponibles. Revisa tu conexión y vuelve a intentar.");
        }
      })
      .catch((loadError: unknown) => {
        if (vigente) setSearchError(loadError instanceof Error ? loadError.message : "No se pudo realizar la búsqueda.");
      });
    return () => {
      vigente = false;
    };
  }, [role, searchData, searchEnabled, searchError, user.token]);

  const resultados = useMemo<ResultadoBusqueda[]>(() => {
    const term = search.trim().toLocaleLowerCase();
    if (term.length < 2 || !searchData) return [];
    const paginas = navigation[role].map((item) => item.label);
    const pedidoPage = paginas.includes("Pedidos") ? "Pedidos" : paginas.includes("Entregas") ? "Entregas" : null;
    const productPage = paginas.includes("Nueva venta") ? "Nueva venta" : paginas.includes("Productos") ? "Productos" : null;
    const pedidos = pedidoPage ? searchData.pedidos
      .filter((pedido) => [
        pedido.codigo,
        pedido.estadoNombre,
        pedido.estadoCodigo,
        pedido.datosEntrega?.destinatario ?? "",
        pedido.datosEntrega?.telefono ?? "",
        pedido.datosEntrega?.direccion ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(term)))
      .slice(0, 5)
      .map((pedido) => ({
        id: `pedido-${pedido.id}`,
        titulo: pedido.codigo,
        detalle: `${pedido.datosEntrega?.destinatario || "Cliente"} · ${pedido.estadoNombre}`,
        tipo: "Pedido" as const,
        pagina: pedidoPage,
        consulta: pedido.codigo,
      })) : [];
    const productos = productPage ? searchData.productos
      .filter((producto) => [producto.codigo, producto.nombre, producto.categoriaNombre]
        .some((value) => value.toLocaleLowerCase().includes(term)))
      .slice(0, 5)
      .map((producto) => ({
        id: `producto-${producto.id}`,
        titulo: producto.nombre,
        detalle: `${producto.codigo} · ${producto.categoriaNombre} · ${producto.stockDisponible} disponibles`,
        tipo: "Producto" as const,
        pagina: productPage,
        consulta: producto.nombre,
      })) : [];
    return [...pedidos, ...productos].slice(0, 8);
  }, [role, search, searchData]);

  const seleccionarResultado = (resultado: ResultadoBusqueda) => {
    onNavigate(resultado.pagina, resultado.consulta);
    setSearch(resultado.consulta);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <img className="brand-logo" src="/ceramax-app-logo.svg" alt="" />
        <div><strong>Cerámax</strong><small>Gestión integral</small></div>
        <button className="icon-button close-menu" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><Icon name="close"/></button>
      </div>
      <nav aria-label="Navegación principal">
        <span className="nav-heading">MENÚ PRINCIPAL</span>
        {navigation[role].map((item) => <button key={item.label} className={`nav-item ${activePage === item.label ? "active" : ""}`} onClick={() => navigate(item.label)}>
          <Icon name={item.icon}/><span>{item.label}</span>
        </button>)}
      </nav>
      <div className="sidebar-footer">
        <button className={`nav-item ${activePage === settingsPage ? "active active-no-accent" : ""}`} onClick={() => navigate(settingsPage)}><Icon name="settings"/><span>{settingsPage}</span></button>
        <span className="prototype-note">Panel de operaciones</span>
      </div>
    </aside>
    {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"/>}
    <main>
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Icon name="menu"/></button>
        <div className="top-search-container" onBlur={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
        }}>
          <div className="top-search">
            <Icon name="search" size={18}/>
            <input
              aria-label="Búsqueda"
              aria-expanded={searchOpen && search.trim().length >= 2}
              aria-controls="global-search-results"
              aria-autocomplete="list"
              placeholder="Buscar pedidos o productos"
              value={search}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
                if (event.key === "Enter" && resultados[0]) seleccionarResultado(resultados[0]);
              }}
            />
            {search.length > 0 && <button className="top-search-clear" type="button" aria-label="Limpiar búsqueda" onClick={() => {
              setSearch("");
              setSearchOpen(true);
            }}><Icon name="close" size={15}/></button>}
          </div>
          {searchOpen && search.trim().length >= 2 && <div className="top-search-results" id="global-search-results" role="listbox" aria-label="Resultados de búsqueda">
            {searchLoading
              ? <div className="top-search-message" role="status">Buscando pedidos y productos…</div>
              : resultados.length
                ? resultados.map((resultado) => <button className="top-search-result" key={resultado.id} type="button" role="option" aria-selected="false" onClick={() => seleccionarResultado(resultado)}>
                  <span><strong>{resultado.titulo}</strong><small>{resultado.detalle}</small></span>
                  <span className="top-search-result-type">{resultado.tipo}</span>
                </button>)
                : <div className="top-search-message">No se encontraron coincidencias.</div>}
            {searchError && <div className="top-search-error" role="status">{searchError}</div>}
            {searchError && <button className="top-search-retry" type="button" onClick={() => {
              setSearchError(null);
              setSearchData(null);
            }}>Reintentar búsqueda</button>}
          </div>}
        </div>
        <div className="top-actions">
          <div className="notification-menu" onBlur={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
              setNotificationsOpen(false);
            }
          }}>
            <button
              className="icon-button notification"
              type="button"
              aria-label={notifications.length ? `Notificaciones, ${notifications.length} sin leer` : "Notificaciones"}
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Icon name="bell" size={20}/>
              {notifications.length > 0 && <span className="notification-count">{notifications.length > 9 ? "9+" : notifications.length}</span>}
            </button>
            {notificationsOpen && <div className="notification-dropdown" role="region" aria-label="Notificaciones">
              <div className="notification-heading">
                <strong>Notificaciones</strong>
                {notifications.length > 0 && <button type="button" onClick={() => setNotifications([])}>Marcar todas como leídas</button>}
              </div>
              {notificationError && <p className="notification-error" role="status">{notificationError}</p>}
              {notifications.length === 0
                ? <p className="notification-empty">{notificationError ? "No se pudo cargar la conexión." : "No tienes mensajes nuevos."}</p>
                : <ul className="notification-list">
                  {notifications.map((notification) => <li key={notification.id}>
                    <button
                      className="notification-item"
                      type="button"
                      onClick={() => {
                        setNotifications((current) => current.filter((item) => item.id !== notification.id));
                        setNotificationsOpen(false);
                        onNavigateChat(notification.chatId);
                      }}
                    >
                      <span className="notification-item-top">
                        <strong>{notification.remitente}</strong>
                        <time>{formatNotificationTime(notification.creadoEn)}</time>
                      </span>
                      <span className="notification-item-chat">{notification.titulo}</span>
                      <span className="notification-item-content">{notification.contenido}</span>
                    </button>
                  </li>)}
                </ul>}
            </div>}
          </div>
          <div className="profile-menu" onBlur={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setProfileMenuOpen(false);
          }}>
            <button className="profile-toggle" aria-expanded={profileMenuOpen} aria-haspopup="menu" onClick={() => setProfileMenuOpen((open) => !open)}>
                <span className="avatar">{initials.toUpperCase()}</span>
                <span className="profile-copy"><strong>{displayName}</strong><small>{roleLabels[role]}</small></span>
              <span className="chevron" aria-hidden="true"/>
            </button>
            {profileMenuOpen && <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-heading">
                  <strong>{displayName}</strong>
                  <small>{user.email}</small>
                  <small>{roleDescriptions[role]}</small>
                </div>
                <button className="profile-logout" role="menuitem" onClick={() => {
                  setProfileMenuOpen(false);
                  onLogout();
                }}>
                  <Icon name="logout" size={16}/>
                  <span>Cerrar sesión</span>
                </button>
              </div>}
          </div>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
