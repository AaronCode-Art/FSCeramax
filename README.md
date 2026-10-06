# Cerámax · Sistema de gestión

Frontend interno para los equipos de gerencia, logística y delivery. Está separado de la tienda pública y consume la API del backend `BCeramax`.

## Desarrollo local

1. Inicia el backend Spring Boot en `http://localhost:8080`.
2. Desde esta carpeta ejecuta:

   ```powershell
   pnpm install
   pnpm run dev
   ```

3. Abre `http://localhost:5174`.

Vite mantiene el puerto `5174` fijo y envía las solicitudes `/api` al backend `http://localhost:8080`. Para apuntar a otro servidor API, define `VITE_API_URL` como la URL base que incluye `/api`.

## Inicio de sesión

El formulario envía correo y contraseña a `POST /api/auth/staff/login`. Solo se admite el acceso a roles `ADMIN`, `LOGISTICA` y `DELIVERY`; las demás cuentas de personal se rechazan en el frontend aunque el backend devuelva un token. La sesión se guarda en `sessionStorage` y se borra al cerrar sesión o cerrar la pestaña.

Las reglas de autorización reales deben permanecer en el backend. La restricción de roles en el frontend solo controla qué usuarios continúan en esta aplicación.

## Organización de `src`

- `app/`: composición, providers y guards de rutas.
- `components/ui/`: controles compartidos; `components/layout/`: estructura visual de la aplicación.
- `features/auth/`: pantalla, formulario, hook y servicio de autenticación.
- `features/dashboard/`, `features/gerencia/`, `features/logistica/` y `features/delivery/`: pantallas y capacidades separadas por flujo/rol.
- `features/pedidos/`: tipos, servicios y componentes de pedidos compartidos entre equipos.
- `features/dashboard/`: panel principal y vistas administrativas conectadas a la API disponible.
- `hooks/`: hooks React compartidos.
- `lib/api/`: cliente HTTP y configuración de comunicación con la API.
- `constants/`, `types/`, `utils/`, `assets/` y `styles/`: configuración estática, contratos, funciones puras y recursos compartidos.

Los componentes `.tsx` contienen la interfaz; los hooks coordinan estado de React; los servicios hacen solicitudes; los tipos y constantes no contienen JSX ni efectos. El sistema usa Tailwind CSS v4 para estilos utilitarios y CSS global únicamente para los estilos base.

## Panel y alcance de la API

Después de iniciar sesión, el panel muestra indicadores, pedidos recientes, navegación adaptada por rol y listados reales para catálogo, pedidos, inventario, almacenes, movimientos, sucursales, personal, clientes y logística. Desde el catálogo se pueden crear, editar y desactivar productos y categorías; almacenes y sucursales tienen las operaciones que permite su API. Reportes consulta ventas, ingresos, productos más vendidos y existencias para un rango de fechas, además de exportar ese mismo rango a PDF o Excel.

La interfaz no simula operaciones que el backend no expone: cupones y auditoría todavía no tienen API; usuarios/clientes y pedidos tienen capacidades limitadas por sus endpoints actuales; el chat aún no dispone de un listado unificado. El backend es la autoridad para autorización y validación; los errores de API se muestran en pantalla.

## Comprobaciones

```powershell
pnpm run lint
pnpm run build
```
