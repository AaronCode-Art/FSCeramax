import { useEffect, useState } from "react";
import "../css/dashboard.css";
import type { Role } from "../../../app/types";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { PageHeading } from "../../../components/ui/PageHeading";
import { listEntryRequests, listInventory, type EntryRequest, type InventoryItem } from "../../inventario/services/inventarioService";
import { listarPedidos } from "../../pedidos/services/pedidoService";
import type { PedidoResumen } from "../../pedidos/types/pedido";
import { obtenerReporteVentasInventario } from "../../reportes/services/reporteService";
import { descargarReporte, type FormatoReporte } from "../../reportes/services/reporteExportacionService";
import type { ReporteVentasInventario } from "../../reportes/types/reporte";

function fechaLocal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const moneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const numero = new Intl.NumberFormat("es-PE");

type ResumenLogistico = {
  inventario: InventoryItem[];
  solicitudes: EntryRequest[];
  pedidos: PedidoResumen[];
};

type ResumenVendedor = {
  pedidos: PedidoResumen[];
};

async function listarPedidosOperativos(token: string, role: Role): Promise<PedidoResumen[]> {
  const firstPage = await listarPedidos(token, role, "Pedidos", 0, 100);
  const pedidos = [...firstPage.contenido];
  for (let page = 1; page < firstPage.totalPaginas; page += 1) {
    pedidos.push(...(await listarPedidos(token, role, "Pedidos", page, 100)).contenido);
  }
  return pedidos;
}

export function DashboardPage({ role, token }: { role: Role; token: string }) {
  const puedeVerReporte = role === "ADMIN";
  const puedeVerResumenLogistico = role === "LOGISTICA" || role === "JEFE_LOGISTICA";
  const puedeVerResumenVendedor = role === "VENDEDOR";
  const title = role === "DELIVERY" ? "Mi ruta" : "Resumen";
  const [hoy] = useState(() => fechaLocal(new Date()));
  const [desde, setDesde] = useState(() => `${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [reporte, setReporte] = useState<ReporteVentasInventario | null>(null);
  const [rangoConsultado, setRangoConsultado] = useState(() => ({
    desde: `${hoy.slice(0, 7)}-01`,
    hasta: hoy,
  }));
  const [cargando, setCargando] = useState(role === "ADMIN");
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumenLogistico, setResumenLogistico] = useState<ResumenLogistico | null>(null);
  const [cargandoLogistico, setCargandoLogistico] = useState(puedeVerResumenLogistico);
  const [errorLogistico, setErrorLogistico] = useState<string | null>(null);
  const [actualizacionLogistica, setActualizacionLogistica] = useState(0);
  const [actualizadoLogisticoEn, setActualizadoLogisticoEn] = useState(() => new Date());
  const [resumenVendedor, setResumenVendedor] = useState<ResumenVendedor | null>(null);
  const [cargandoVendedor, setCargandoVendedor] = useState(puedeVerResumenVendedor);
  const [errorVendedor, setErrorVendedor] = useState<string | null>(null);
  const [actualizacionVendedor, setActualizacionVendedor] = useState(0);
  const [actualizadoVendedorEn, setActualizadoVendedorEn] = useState(() => new Date());

  useEffect(() => {
    if (!puedeVerReporte) return;
    let isCurrent = true;
    void obtenerReporteVentasInventario(rangoConsultado.desde, rangoConsultado.hasta, token)
      .then((result) => {
        if (isCurrent) {
          setReporte(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el resumen.");
      })
      .finally(() => {
        if (isCurrent) setCargando(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [puedeVerReporte, rangoConsultado, token]);

  useEffect(() => {
    if (!puedeVerResumenLogistico) return;
    let isCurrent = true;
    void Promise.all([
      listInventory(token),
      listEntryRequests(token),
      listarPedidosOperativos(token, role),
    ])
      .then(([inventario, solicitudes, pedidos]) => {
        if (isCurrent) {
          setResumenLogistico({ inventario, solicitudes, pedidos });
          setErrorLogistico(null);
          setActualizadoLogisticoEn(new Date());
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setErrorLogistico(loadError instanceof Error ? loadError.message : "No se pudo cargar el resumen logístico.");
      })
      .finally(() => {
        if (isCurrent) setCargandoLogistico(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [actualizacionLogistica, puedeVerResumenLogistico, role, token]);

  useEffect(() => {
    if (!puedeVerResumenVendedor) return;
    let isCurrent = true;
    void listarPedidosOperativos(token, role)
      .then((pedidos) => {
        if (isCurrent) {
          setResumenVendedor({ pedidos });
          setErrorVendedor(null);
          setActualizadoVendedorEn(new Date());
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setErrorVendedor(loadError instanceof Error ? loadError.message : "No se pudo cargar tu resumen de ventas.");
      })
      .finally(() => {
        if (isCurrent) setCargandoVendedor(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [actualizacionVendedor, puedeVerResumenVendedor, role, token]);

  const manejarDescarga = async (formato: FormatoReporte) => {
    setDescargando(formato);
    setError(null);
    try {
      await descargarReporte(formato, rangoConsultado.desde, rangoConsultado.hasta, token);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el reporte.");
    } finally {
      setDescargando(null);
    }
  };

  const rangoActualizado = reporte?.desde === rangoConsultado.desde && reporte.hasta === rangoConsultado.hasta;
  const productosMasVendidos = reporte?.productosMasVendidos ?? [];
  const inventarioBajo = reporte?.inventarioActual.filter((item) => item.stockBajo) ?? [];
  const inventarioBajoLogistico = resumenLogistico?.inventario.filter((item) => item.stockBajo) ?? [];
  const solicitudesPendientes = resumenLogistico?.solicitudes.filter((solicitud) => solicitud.estado === "PENDIENTE") ?? [];
  const pedidosEnPreparacion = resumenLogistico?.pedidos.filter((pedido) => pedido.estadoCodigo === "PREPARACION").length ?? 0;
  const pedidosListosDespacho = resumenLogistico?.pedidos.filter((pedido) => pedido.estadoCodigo === "LISTO_DESPACHO").length ?? 0;
  const entregasEnCurso = resumenLogistico?.pedidos.filter((pedido) => ["EN_RUTA", "EN_CAMINO"].includes(pedido.estadoCodigo)).length ?? 0;
  const pedidosDelMesVendedor = resumenVendedor?.pedidos.filter((pedido) => {
    const fecha = new Date(pedido.createdAt);
    return fecha.getFullYear() === new Date(`${hoy}T12:00:00`).getFullYear()
      && fecha.getMonth() === new Date(`${hoy}T12:00:00`).getMonth();
  }) ?? [];
  const ventasDelMesVendedor = pedidosDelMesVendedor.reduce((total, pedido) => total + pedido.total, 0);
  const pedidosPendientesVendedor = pedidosDelMesVendedor.filter((pedido) =>
    !["COMPLETADA", "CANCELADO", "NO_ENTREGADA"].includes(pedido.estadoCodigo),
  ).length;

  return <>
    <PageHeading
      title={title}
      description={puedeVerReporte
        ? "Resumen de ventas e inventario del período seleccionado."
        : puedeVerResumenLogistico
        ? role === "JEFE_LOGISTICA"
          ? "Supervisa inventario, solicitudes pendientes y pedidos en operación."
          : "Consulta tus solicitudes, el estado del inventario y la bandeja de pedidos."
        : puedeVerResumenVendedor
        ? "Consulta tus ventas y el estado de los pedidos que registraste."
        : "Indicadores operativos disponibles según tu perfil."}
      action={<>{puedeVerReporte ? <>
        <label className="dashboard-date-field">
          <span>Desde</span>
          <input type="date" value={desde} max={hasta} onChange={(event) => setDesde(event.target.value)} />
        </label>
        <label className="dashboard-date-field">
          <span>Hasta</span>
          <input type="date" value={hasta} min={desde} max={hoy} onChange={(event) => setHasta(event.target.value)} />
        </label>
        <button
          className="primary-button"
          type="button"
          disabled={cargando || !desde || !hasta}
          onClick={() => {
            setCargando(true);
            setRangoConsultado({ desde, hasta });
          }}
        >
          {cargando ? "Consultando..." : "Consultar"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={descargando !== null || cargando || !rangoActualizado || desde !== rangoConsultado.desde || hasta !== rangoConsultado.hasta}
          onClick={() => void manejarDescarga("pdf")}
        >
          {descargando === "pdf" ? "Descargando PDF..." : "Descargar PDF"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={descargando !== null || cargando || !rangoActualizado || desde !== rangoConsultado.desde || hasta !== rangoConsultado.hasta}
          onClick={() => void manejarDescarga("excel")}
        >
          {descargando === "excel" ? "Descargando Excel..." : "Descargar Excel"}
        </button>
      </> : puedeVerResumenLogistico ? <button
        className="secondary-button"
        type="button"
        disabled={cargandoLogistico}
        onClick={() => {
          setCargandoLogistico(true);
          setActualizacionLogistica((current) => current + 1);
        }}
      ><Icon name="clock" size={16}/>{cargandoLogistico ? "Actualizando…" : "Actualizar"}</button> : null}
      {puedeVerResumenVendedor && <button
        className="secondary-button"
        type="button"
        disabled={cargandoVendedor}
        onClick={() => {
          setCargandoVendedor(true);
          setActualizacionVendedor((current) => current + 1);
        }}
      ><Icon name="clock" size={16}/>{cargandoVendedor ? "Actualizando…" : "Actualizar"}</button>}</>}
    />

    {error && <p className="dashboard-export-error" role="alert">{error}</p>}
    {puedeVerResumenLogistico && errorLogistico && <p className="dashboard-export-error" role="alert">{errorLogistico}</p>}
    {puedeVerResumenVendedor && errorVendedor && <p className="dashboard-export-error" role="alert">{errorVendedor}</p>}
    {puedeVerResumenVendedor && cargandoVendedor && !resumenVendedor && <section className="panel dashboard-loading" aria-live="polite">Cargando tu resumen de ventas…</section>}
    {puedeVerResumenVendedor && !cargandoVendedor && !resumenVendedor && !errorVendedor && <section className="panel dashboard-loading">No hay información de ventas disponible.</section>}
    {puedeVerResumenVendedor && resumenVendedor && <section className="dashboard-vendedor-content">
      <section className="stats-grid" aria-label="Indicadores de ventas del vendedor">
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">V</div>
          <div className="stat-copy"><span>Ventas del mes</span><strong>{moneda.format(ventasDelMesVendedor)}</strong><small>Importe de tus pedidos del mes</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">P</div>
          <div className="stat-copy"><span>Pedidos del mes</span><strong>{numero.format(pedidosDelMesVendedor.length)}</strong><small>Pedidos registrados por ti</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">A</div>
          <div className="stat-copy"><span>Pedidos pendientes</span><strong>{numero.format(pedidosPendientesVendedor)}</strong><small>Esperan completar su proceso</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">T</div>
          <div className="stat-copy"><span>Pedidos históricos</span><strong>{numero.format(resumenVendedor.pedidos.length)}</strong><small>Total de pedidos creados por ti</small></div>
        </article>
      </section>
      <section className="panel dashboard-data-panel dashboard-vendedor-orders">
        <div className="panel-head"><div><h2>Pedidos recientes</h2><p>Tus últimos pedidos registrados</p></div></div>
        {resumenVendedor.pedidos.length
          ? <ul className="dashboard-operation-list">{resumenVendedor.pedidos.slice(0, 6).map((pedido) => <li key={pedido.id}>
            <span className="dashboard-product-copy">
              <strong>{pedido.codigo} · {pedido.datosEntrega?.destinatario || "Cliente"}</strong>
              <small>{new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(pedido.createdAt))} · {pedido.estadoNombre}</small>
            </span>
            <strong className="dashboard-product-total">{moneda.format(pedido.total)}</strong>
          </li>)}</ul>
          : <EmptyState title="Aún no tienes pedidos" description="Al registrar una venta, aparecerá aquí junto con el resumen del mes." icon="cart" />}
      </section>
      <p className="dashboard-updated-at">Datos actualizados: {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(actualizadoVendedorEn)}</p>
    </section>}
    {puedeVerResumenLogistico && cargandoLogistico && !resumenLogistico && <section className="panel dashboard-loading" aria-live="polite">Cargando resumen logístico…</section>}
    {puedeVerResumenLogistico && !cargandoLogistico && !resumenLogistico && !errorLogistico && <section className="panel dashboard-loading">No hay información logística disponible.</section>}
    {puedeVerResumenLogistico && resumenLogistico && <>
      <section className="stats-grid" aria-label="Indicadores logísticos">
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">P</div>
          <div className="stat-copy"><span>Pedidos activos</span><strong>{numero.format(resumenLogistico.pedidos.length)}</strong><small>En la bandeja logística</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">D</div>
          <div className="stat-copy"><span>Listos para despacho</span><strong>{numero.format(pedidosListosDespacho)}</strong><small>Requieren gestión de despacho</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">R</div>
          <div className="stat-copy"><span>Entregas en curso</span><strong>{numero.format(entregasEnCurso)}</strong><small>En ruta o en camino</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">!</div>
          <div className="stat-copy"><span>Alertas de stock bajo</span><strong>{numero.format(inventarioBajoLogistico.length)}</strong><small>Registros por almacén bajo mínimo</small></div>
        </article>
      </section>

      <section className="dashboard-insights">
        <article className="panel insight-card dashboard-data-panel">
          <div className="panel-head"><div><h2>Solicitudes de entrada pendientes</h2><p>{role === "JEFE_LOGISTICA" ? "Solicitudes que requieren aprobación" : "Tus solicitudes por resolver"}</p></div><span className="dashboard-low-count">{numero.format(solicitudesPendientes.length)}</span></div>
          {solicitudesPendientes.length
            ? <ul className="dashboard-operation-list">{solicitudesPendientes.slice(0, 5).map((solicitud) => <li key={solicitud.id}>
              <span className="dashboard-product-copy"><strong>{solicitud.productoNombre}</strong><small>{solicitud.codigo} · {solicitud.almacenNombre} · {numero.format(solicitud.cantidad)} unidades</small></span>
              <time dateTime={solicitud.fechaSolicitud}>{new Intl.DateTimeFormat("es-PE", { dateStyle: "short" }).format(new Date(solicitud.fechaSolicitud))}</time>
            </li>)}</ul>
            : <EmptyState title="No hay solicitudes pendientes" description="Las solicitudes por revisar aparecerán aquí." icon="check" />}
        </article>

        <article className="panel insight-card dashboard-data-panel">
          <div className="panel-head"><div><h2>Alertas de inventario</h2><p>Productos por debajo del stock mínimo</p></div><span className="dashboard-low-count">{numero.format(inventarioBajoLogistico.length)}</span></div>
          {inventarioBajoLogistico.length
            ? <ul className="dashboard-low-stock">{inventarioBajoLogistico.slice(0, 5).map((item) => <li key={`${item.almacenId}-${item.productoId}`}>
              <span className="dashboard-product-copy"><strong>{item.productoNombre}</strong><small>{item.almacenNombre} · Mínimo {numero.format(item.stockMinimo)}</small></span>
              <strong className="dashboard-low-quantity">{numero.format(item.stockDisponible)} disp.</strong>
            </li>)}</ul>
            : <EmptyState title="Inventario dentro del mínimo" description="No se detectaron registros con stock bajo." icon="box" />}
        </article>
      </section>
      <p className="dashboard-updated-at">En preparación: {numero.format(pedidosEnPreparacion)} · Datos actualizados: {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(actualizadoLogisticoEn)}</p>
    </>}
    {puedeVerReporte && cargando && !reporte && <section className="panel dashboard-loading" aria-live="polite">Cargando resumen de ventas e inventario…</section>}
    {puedeVerReporte && !cargando && !reporte && !error && <section className="panel dashboard-loading">No hay información disponible para este período.</section>}

    {puedeVerReporte && reporte && <>
      <section className="stats-grid" aria-label="Indicadores del período">
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">V</div>
          <div className="stat-copy"><span>Ventas válidas</span><strong>{numero.format(reporte.cantidadVentas)}</strong><small>En el período seleccionado</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">S/</div>
          <div className="stat-copy"><span>Ingresos totales</span><strong>{moneda.format(reporte.ingresosTotales)}</strong><small>Pagos aprobados no simulados</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">W</div>
          <div className="stat-copy"><span>Ventas web</span><strong>{numero.format(reporte.ventasWeb)}</strong><small>Pedidos del canal web</small></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" aria-hidden="true">T</div>
          <div className="stat-copy"><span>Ventas presenciales</span><strong>{numero.format(reporte.ventasPresenciales)}</strong><small>Pedidos de tienda</small></div>
        </article>
      </section>

      <section className="dashboard-insights">
        <article className="panel insight-card dashboard-data-panel">
          <div className="panel-head"><div><h2>Productos más vendidos</h2><p>Principales productos del período</p></div></div>
          {productosMasVendidos.length
            ? <ol className="dashboard-top-products">{productosMasVendidos.slice(0, 5).map((producto, index) => <li key={producto.productoId}>
              <span className="dashboard-product-rank">{index + 1}</span>
              <span className="dashboard-product-copy"><strong>{producto.nombre}</strong><small>{producto.codigo} · {numero.format(producto.unidadesVendidas)} unidades</small></span>
              <strong className="dashboard-product-total">{moneda.format(producto.importeVendido)}</strong>
            </li>)}</ol>
            : <EmptyState title="Sin ventas en este período" description="Los productos vendidos aparecerán aquí." icon="chart" />}
        </article>

        <article className="panel insight-card dashboard-data-panel">
          <div className="panel-head"><div><h2>Inventario con stock bajo</h2><p>Productos en almacenes bajo su mínimo</p></div><span className="dashboard-low-count">{numero.format(inventarioBajo.length)}</span></div>
          {inventarioBajo.length
            ? <ul className="dashboard-low-stock">{inventarioBajo.slice(0, 5).map((item) => <li key={`${item.almacenId}-${item.productoId}`}>
              <span className="dashboard-product-copy"><strong>{item.productoNombre}</strong><small>{item.almacenNombre} · Mínimo {numero.format(item.stockMinimo)}</small></span>
              <strong className="dashboard-low-quantity">{numero.format(item.stockDisponible)} disp.</strong>
            </li>)}</ul>
            : <EmptyState title="Inventario dentro del mínimo" description="No se detectaron registros con stock bajo." icon="box" />}
        </article>
      </section>
      <p className="dashboard-updated-at">Datos actualizados: {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reporte.generadoEn))}</p>
    </>}

    {!puedeVerReporte && !puedeVerResumenLogistico && !puedeVerResumenVendedor && <section className="panel dashboard-role-empty">
      <EmptyState title="Resumen según tu perfil" description="Los indicadores generales de ventas e inventario están disponibles para Gerencia. Aquí se mostrarán datos operativos específicos cuando el backend exponga un resumen para tu rol." icon="chart" />
    </section>}
  </>;
}
