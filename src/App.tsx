import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import { navigation, settingsPage } from "./app/navigation";
import type { Role } from "./app/types";
import { AppShell } from "./components/layout/AppShell";
import { EmptyResourcePage } from "./components/ui/EmptyResourcePage";
import { AlmacenesPage } from "./features/almacenes/pages/AlmacenesPage";
import { ChatInternoPage } from "./features/chat-interno/pages/ChatInternoPage";
import { ClientsPage } from "./features/cliente/pages/ClientsPage";
import { CategoriesPage } from "./features/categoria/pages/CategoriesPage";
import { SettingsPage } from "./features/configuracion/pages/SettingsPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { GaleriaPage } from "./features/galeria/pages/GaleriaPage";
import { InventarioPage } from "./features/inventario/pages/InventarioPage";
import { EntryPage } from "./features/inventario/pages/InventoryPages";
import { MovimientosPage } from "./features/movimientos/pages/MovimientosPage";
import { PagosPage } from "./features/pagos/pages/PagosPage";
import { PedidosPage } from "./features/pedidos/pages/PedidosPage";
import { SalePage } from "./features/pedidos/pages/SalePage";
import { ProductsPage } from "./features/producto/pages/ProductsPage";
import { ReportsPage } from "./features/reportes/pages/ReportsPage";
import { ResumenPage } from "./features/resumen/pages/ResumenPage";
import { SolicitudesPage } from "./features/solicitudes/pages/SolicitudesPage";
import { SucursalesPage } from "./features/sucursales/pages/SucursalesPage";
import { TrasladosPage } from "./features/traslados/pages/TrasladosPage";
import { UsuariosPage } from "./features/usuarios/pages/UsuariosPage";
import { AppearanceProvider } from "./context/AppearanceContext";
import { AuthProvider } from "./context/AuthContext";
import { useAppearance } from "./hooks/useAppearance";
import { useAuth } from "./hooks/useAuth";
import type { AuthSession } from "./features/auth/authService";

function pagePath(page: string): string {
  const slug = page.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/${slug}`;
}

function readChatTarget(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("chatId" in state)) return null;
  return typeof state.chatId === "string" ? state.chatId : null;
}

function PageContent({ page, role, session }: { page: string; role: Role; session: AuthSession }) {
  const location = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("q") ?? "";

  if (page === settingsPage) {
    return <SettingsRouteContent />;
  }
  if (page === "Mi ruta" || page === "Pedidos" || page === "Entregas" || page === "Historial") {
    return <PedidosPage key={`${page}-${initialSearch}`} role={role} page={page} token={session.token} initialSearch={initialSearch} />;
  }
  if (page === "Resumen") return <ResumenPage role={role} token={session.token} />;
  if (page === "Inventario") return <InventarioPage role={role} />;
  if (page === "Registrar entrada") return <EntryPage />;
  if (page === "Solicitudes" || page === "Mis solicitudes") return <SolicitudesPage page={page} />;
  if (page === "Traslados") return <TrasladosPage role={role} />;
  if (page === "Movimientos") return <MovimientosPage />;
  if (page === "Nueva venta") {
    return <SalePage key={initialSearch} token={session.token} initialSearch={initialSearch} />;
  }
  if (page === "Productos") return <ProductsPage />;
  if (page === "Categorías") return <CategoriesPage />;
  if (page === "Galería de imágenes") return <GaleriaPage />;
  if (page === "Sucursales") return <SucursalesPage />;
  if (page === "Almacenes") return <AlmacenesPage />;
  if (page === "Usuarios") return <UsuariosPage />;
  if (page === "Clientes") return <ClientsPage />;
  if (page === "Pagos") return <PagosPage token={session.token} />;
  if (page === "Reportes") return <ReportsPage token={session.token} />;
  if (page === "Chat interno") {
    return <ChatInternoPage session={session} role={role} initialChatId={readChatTarget(location.state)} />;
  }
  return <EmptyResourcePage title={page} description="Esta sección estará disponible cuando se complete su integración." />;
}

function SettingsRouteContent() {
  const { theme, fontSize, setTheme, setFontSize } = useAppearance();
  return <SettingsPage theme={theme} fontSize={fontSize} onThemeChange={setTheme} onFontSizeChange={setFontSize} />;
}

function AuthenticatedLayout({
  role,
  session,
  signOut,
}: {
  role: Role;
  session: AuthSession;
  signOut: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = location.pathname === pagePath(settingsPage)
    ? settingsPage
    : navigation[role].find((item) => pagePath(item.label) === location.pathname)?.label
      ?? navigation[role][0].label;

  const navigateToPage = (page: string, searchTerm?: string) => {
    const search = searchTerm === undefined ? "" : `?q=${encodeURIComponent(searchTerm)}`;
    navigate(`${pagePath(page)}${search}`);
  };

  const navigateToChat = (chatId: string) => {
    navigate(pagePath("Chat interno"), { state: { chatId } });
  };

  return <AppShell
    role={role}
    user={session}
    activePage={activePage}
    onNavigate={navigateToPage}
    onNavigateChat={navigateToChat}
    onLogout={signOut}
  >
    <Outlet />
  </AppShell>;
}

function AppContent() {
  const { session, signOut } = useAuth();
  const role = session?.rol;
  const defaultPage = role ? pagePath(navigation[role][0].label) : "/";

  if (!session || !role) return <LoginPage />;

  return <Routes>
    <Route element={<AuthenticatedLayout role={role} session={session} signOut={signOut} />}>
      <Route index element={<Navigate to={defaultPage} replace />} />
      {navigation[role].map((item) => <Route
        key={item.label}
        path={pagePath(item.label).slice(1)}
        element={<PageContent page={item.label} role={role} session={session} />}
      />)}
      <Route
        path={pagePath(settingsPage).slice(1)}
        element={<PageContent page={settingsPage} role={role} session={session} />}
      />
    </Route>
    <Route path="*" element={<Navigate to={defaultPage} replace />} />
  </Routes>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppearanceProvider>
          <AppContent />
        </AppearanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
