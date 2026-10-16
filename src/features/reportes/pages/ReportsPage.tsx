import { useEffect, useState } from "react";
import { DataTable, type TableColumn } from "../../../components/ui/DataTable";
import { PageHeading } from "../../../components/ui/PageHeading";
import { descargarReporte, type FormatoReporte } from "../services/reporteExportacionService";
import { obtenerReporteVentasInventario } from "../services/reporteService";
import type { InventarioReporte, PagoResumen, ProductoMasVendido, ReporteVentasInventario } from "../types/reporte";
import "../css/reports.css";

function fechaLocal(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const moneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const numero = new Intl.NumberFormat("es-PE");

function mostrarFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(`${fecha}T00:00:00`));
}

const metodoPagoLabels: Record<string, string> = {
  TARJETA: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

const estadoPagoLabels: Record<string, string> = {
  APROBADO: "Aprobado",
  PENDIENTE: "Pendiente",
  RECHAZADO: "Rechazado",
  ANULADO: "Anulado",
  REEMBOLSADO: "Reembolsado",
};

export function ReportsPage({ token }: { token: string }) {
  const [hoy] = useState(() => fechaLocal(new Date()));
  const [desde, setDesde] = useState(() => `${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [rangoConsultado, setRangoConsultado] = useState(() => ({
    desde: `${hoy.slice(0, 7)}-01`,
    hasta: hoy,
  }));
  const [reporte, setReporte] = useState<ReporteVentasInventario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<FormatoReporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void obtenerReporteVentasInventario(rangoConsultado.desde, rangoConsultado.hasta, token)
      .then((result) => {
        if (isCurrent) {
          setReporte(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el reporte.");
      })
      .finally(() => {
        if (isCurrent) setCargando(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [rangoConsultado, token]);

  const consultar = () => {
    setCargando(true);
    setError(null);
    setRangoConsultado({ desde, hasta });
  };

  const manejarExportacion = async (formato: FormatoReporte) => {
    setExportando(formato);
    setError(null);
    try {
      await descargarReporte(formato, rangoConsultado.desde, rangoConsultado.hasta, token);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudo descargar el reporte.");
    } finally {
      setExportando(null);
    }
  };

  const columnasProductos: TableColumn<ProductoMasVendido>[] = [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Producto" },
    { key: "unidadesVendidas", label: "Unidades", render: (producto) => numero.format(producto.unidadesVendidas) },
    { key: "importeVendido", label: "Importe", render: (producto) => moneda.format(producto.importeVendido) },
  ];

  const columnasInventario: TableColumn<InventarioReporte>[] = [
    { key: "almacenNombre", label: "Almacén", render: (item) => <><strong>{item.almacenNombre}</strong><small>{item.almacenCodigo}</small></> },
    { key: "productoNombre", label: "Producto", render: (item) => <><strong>{item.productoNombre}</strong><small>{item.productoCodigo}{item.categoriaNombre ? ` · ${item.categoriaNombre}` : ""}</small></> },
    { key: "stockFisico", label: "Físico", render: (item) => numero.format(item.stockFisico) },
    { key: "stockReservado", label: "Reservado", render: (item) => numero.format(item.stockReservado) },
    { key: "stockDisponible", label: "Disponible", render: (item) => numero.format(item.stockDisponible) },
    { key: "stockMinimo", label: "Mínimo", render: (item) => numero.format(item.stockMinimo) },
    {
      key: "stockBajo",
      label: "Estado",
      render: (item) => <span className={`reports-stock-status${item.stockBajo ? " is-low" : ""}`}>{item.stockBajo ? "Stock bajo" : "Normal"}</span>,
    },
  ];
  const columnasPagos: TableColumn<PagoResumen>[] = [
    { key: "metodoPago", label: "Método", render: (pago) => metodoPagoLabels[pago.metodoPago] ?? pago.metodoPago },
    { key: "estado", label: "Estado", render: (pago) => estadoPagoLabels[pago.estado] ?? pago.estado },
    { key: "cantidadPagos", label: "Cantidad", render: (pago) => numero.format(pago.cantidadPagos) },
    { key: "montoTotal", label: "Monto total", render: (pago) => moneda.format(pago.montoTotal) },
  ];
  const reporteCorrespondeAlRango = reporte?.desde === rangoConsultado.desde && reporte.hasta === rangoConsultado.hasta;
  const totalVentasPorCanal = reporte ? reporte.ventasWeb + reporte.ventasPresenciales : 0;
  const porcentajeWeb = totalVentasPorCanal > 0 ? ((reporte?.ventasWeb ?? 0) / totalVentasPorCanal) * 100 : 0;
  const mayorCantidadVendida = Math.max(...(reporte?.productosMasVendidos.map((producto) => producto.unidadesVendidas) ?? [0]), 0);

  return <>
    <PageHeading title="Reportes" description="Consulta ventas e inventario y descarga los resultados para el período seleccionado." />
    <section className="panel reports-filters" aria-label="Filtros del reporte">
      <label className="reports-date-field">
        <span>Desde</span>
        <input type="date" value={desde} max={hasta} onChange={(event) => setDesde(event.target.value)} />
      </label>
      <label className="reports-date-field">
        <span>Hasta</span>
        <input type="date" value={hasta} min={desde} max={hoy} onChange={(event) => setHasta(event.target.value)} />
      </label>
      <button className="primary-button" type="button" disabled={cargando || !desde || !hasta} onClick={consultar}>
        {cargando ? "Consultando..." : "Consultar"}
      </button>
      <span className="reports-filter-spacer" />
      <button className="secondary-button" type="button" disabled={exportando !== null || cargando || !reporteCorrespondeAlRango || desde !== rangoConsultado.desde || hasta !== rangoConsultado.hasta} onClick={() => void manejarExportacion("pdf")}>
        {exportando === "pdf" ? "Preparando PDF..." : "Descargar PDF"}
      </button>
      <button className="secondary-button" type="button" disabled={exportando !== null || cargando || !reporteCorrespondeAlRango || desde !== rangoConsultado.desde || hasta !== rangoConsultado.hasta} onClick={() => void manejarExportacion("excel")}>
        {exportando === "excel" ? "Preparando Excel..." : "Descargar Excel"}
      </button>
    </section>

    {error && <div className="reports-error" role="alert">{error}</div>}
    {cargando && !reporte && <section className="panel reports-loading" aria-live="polite">Cargando reporte de ventas e inventario…</section>}
    {!cargando && !reporte && !error && <section className="panel reports-loading">No hay información del reporte para mostrar.</section>}

    {reporte && <>
      <section className="reports-summary" aria-label="Resumen de ventas">
        <article className="panel reports-metric"><span>Ventas válidas</span><strong>{numero.format(reporte.cantidadVentas)}</strong><small>{mostrarFecha(reporte.desde)} – {mostrarFecha(reporte.hasta)}</small></article>
        <article className="panel reports-metric"><span>Ingresos totales</span><strong>{moneda.format(reporte.ingresosTotales)}</strong><small>Pagos aprobados, incluidos los simulados; excluye pedidos cancelados</small></article>
        <article className="panel reports-metric"><span>Ventas web</span><strong>{numero.format(reporte.ventasWeb)}</strong><small>Pedidos realizados por canal web</small></article>
        <article className="panel reports-metric"><span>Ventas presenciales</span><strong>{numero.format(reporte.ventasPresenciales)}</strong><small>Pedidos realizados en tienda</small></article>
      </section>

      <section className="reports-charts" aria-label="Gráficos del reporte">
        <article className="panel reports-chart-card">
          <div className="reports-chart-heading">
            <div><h2>Ventas por canal</h2><p>Distribución de pedidos del período.</p></div>
            <strong>{numero.format(totalVentasPorCanal)} ventas</strong>
          </div>
          {totalVentasPorCanal > 0 ? <>
            <div className="reports-channel-bar" role="img" aria-label={`${numero.format(reporte.ventasWeb)} ventas web y ${numero.format(reporte.ventasPresenciales)} ventas presenciales`}>
              {reporte.ventasWeb > 0 && <span className="reports-channel-web" style={{ width: `${porcentajeWeb}%` }} />}
              {reporte.ventasPresenciales > 0 && <span className="reports-channel-store" style={{ width: `${100 - porcentajeWeb}%` }} />}
            </div>
            <div className="reports-channel-legend">
              <div><span className="reports-legend-dot reports-channel-web" /><span>Web</span><strong>{numero.format(reporte.ventasWeb)}</strong><small>{Math.round(porcentajeWeb)}%</small></div>
              <div><span className="reports-legend-dot reports-channel-store" /><span>Presencial</span><strong>{numero.format(reporte.ventasPresenciales)}</strong><small>{Math.round(100 - porcentajeWeb)}%</small></div>
            </div>
          </> : <p className="reports-chart-empty">No hay ventas en el período seleccionado.</p>}
        </article>

        <article className="panel reports-chart-card">
          <div className="reports-chart-heading">
            <div><h2>Productos más vendidos</h2><p>Unidades vendidas por producto.</p></div>
            <strong>Top {reporte.productosMasVendidos.length}</strong>
          </div>
          {reporte.productosMasVendidos.length > 0 ? <div className="reports-product-bars">
            {reporte.productosMasVendidos.map((producto) => {
              const porcentaje = mayorCantidadVendida > 0 ? (producto.unidadesVendidas / mayorCantidadVendida) * 100 : 0;
              return <div className="reports-product-bar-row" key={producto.productoId}>
                <div className="reports-product-bar-label"><strong title={producto.nombre}>{producto.nombre}</strong><span>{numero.format(producto.unidadesVendidas)} unid.</span></div>
                <div className="reports-product-bar-track" role="progressbar" aria-label={`Unidades vendidas de ${producto.nombre}`} aria-valuemin={0} aria-valuemax={mayorCantidadVendida} aria-valuenow={producto.unidadesVendidas}>
                  <span style={{ width: `${porcentaje}%` }} />
                </div>
              </div>;
            })}
          </div> : <p className="reports-chart-empty">No hay productos vendidos en este período.</p>}
        </article>
      </section>

      <section className="panel page-panel reports-section">
        <div className="panel-head"><div><h2>Productos más vendidos</h2><p>Hasta 10 productos en el período seleccionado.</p></div></div>
        <DataTable columns={columnasProductos} rows={reporte.productosMasVendidos} rowKey={(producto) => producto.productoId} emptyTitle="Sin ventas en este período" emptyDescription="No hay productos vendidos para las fechas seleccionadas." />
      </section>

      <section className="panel page-panel reports-section">
        <div className="panel-head"><div><h2>Pagos</h2><p>Pagos reales agrupados por método y estado dentro del período.</p></div><span className="reports-inventory-count">{numero.format(reporte.resumenPagos.reduce((total, pago) => total + pago.cantidadPagos, 0))} registros</span></div>
        <DataTable columns={columnasPagos} rows={reporte.resumenPagos} rowKey={(pago) => `${pago.metodoPago}-${pago.estado}`} emptyTitle="Sin pagos en este período" emptyDescription="No hay pagos para las fechas seleccionadas." />
      </section>

      <section className="panel page-panel reports-section">
        <div className="panel-head"><div><h2>Inventario actual</h2><p>Existencias por almacén, incluyendo reservas y stock mínimo.</p></div><span className="reports-inventory-count">{numero.format(reporte.inventarioActual.length)} registros</span></div>
        <DataTable columns={columnasInventario} rows={reporte.inventarioActual} rowKey={(item) => `${item.almacenId}-${item.productoId}`} emptyTitle="Inventario sin registros" emptyDescription="No hay existencias de productos para mostrar." />
      </section>
      <p className="reports-generated-at">Reporte actualizado: {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reporte.generadoEn))}</p>
    </>}
  </>;
}
