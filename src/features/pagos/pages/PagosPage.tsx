import { useEffect, useState } from "react";
import { DataTable, type TableColumn } from "../../../components/ui/DataTable";
import { PageHeading } from "../../../components/ui/PageHeading";
import { descargarExcelFiltrado } from "../../../services/excelExport";
import { listarResumenPagos } from "../services/pagoService";
import type { PagoResumen, ResumenPagosResponse } from "../types/pago";
import "../css/pagos.css";

const moneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const numero = new Intl.NumberFormat("es-PE");

const metodosPago: Record<string, string> = {
  TARJETA: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

const estadosPago: Record<string, string> = {
  APROBADO: "Aprobado",
  PENDIENTE: "Pendiente",
  RECHAZADO: "Rechazado",
  ANULADO: "Anulado",
  REEMBOLSADO: "Reembolsado",
};

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function PagosPage({ token }: { token: string }) {
  const [hoy] = useState(() => fechaLocal(new Date()));
  const [desde, setDesde] = useState(() => `${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [rangoConsultado, setRangoConsultado] = useState(() => ({
    desde: `${hoy.slice(0, 7)}-01`,
    hasta: hoy,
  }));
  const [datos, setDatos] = useState<ResumenPagosResponse | null>(null);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("TODOS");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void listarResumenPagos(rangoConsultado.desde, rangoConsultado.hasta, token)
      .then((resultado) => {
        if (vigente) {
          setDatos(resultado);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (vigente) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pagos.");
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [rangoConsultado, token]);

  const pagos = datos?.resumenPagos ?? [];
  const pagosFiltrados = pagos.filter((pago) =>
    (metodoSeleccionado === "TODOS" || pago.metodoPago === metodoSeleccionado)
    && (estadoSeleccionado === "TODOS" || pago.estado === estadoSeleccionado),
  );
  const cantidadPagos = pagos.reduce((total, pago) => total + pago.cantidadPagos, 0);
  const totalPagado = pagos
    .filter((pago) => pago.estado === "APROBADO")
    .reduce((total, pago) => total + pago.montoTotal, 0);
  const pendientes = pagos
    .filter((pago) => pago.estado === "PENDIENTE")
    .reduce((total, pago) => total + pago.cantidadPagos, 0);
  const metodosDisponibles = [...new Set(pagos.map((pago) => pago.metodoPago))];
  const estadosDisponibles = [...new Set(pagos.map((pago) => pago.estado))];

  const columnas: TableColumn<PagoResumen>[] = [
    {
      key: "metodoPago",
      label: "Método de pago",
      render: (pago) => metodosPago[pago.metodoPago] ?? pago.metodoPago,
    },
    {
      key: "estado",
      label: "Estado",
      render: (pago) => (
        <span className={`pagos-status pagos-status-${pago.estado.toLowerCase()}`}>
          {estadosPago[pago.estado] ?? pago.estado}
        </span>
      ),
    },
    {
      key: "cantidadPagos",
      label: "Cantidad",
      render: (pago) => numero.format(pago.cantidadPagos),
    },
    {
      key: "montoTotal",
      label: "Monto agrupado",
      render: (pago) => moneda.format(pago.montoTotal),
    },
  ];

  const consultar = () => {
    setCargando(true);
    setError(null);
    setRangoConsultado({ desde, hasta });
  };

  function exportarPagos() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: `ceramax-pagos-${rangoConsultado.desde}-${rangoConsultado.hasta}.xlsx`,
        nombreHoja: "Pagos",
        encabezados: ["Desde", "Hasta", "Método", "Estado", "Cantidad de pagos", "Monto total"],
        filas: pagosFiltrados.map((pago) => [
          datos?.desde ?? rangoConsultado.desde,
          datos?.hasta ?? rangoConsultado.hasta,
          metodosPago[pago.metodoPago] ?? pago.metodoPago,
          estadosPago[pago.estado] ?? pago.estado,
          pago.cantidadPagos,
          pago.montoTotal,
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudieron exportar los pagos.");
    }
  }

  const rangoValido = Boolean(desde && hasta && desde <= hasta);

  return <>
    <PageHeading
      title="Pagos"
      description="Consulta los pagos registrados por período, método y estado."
      action={<button className="secondary-button" type="button" onClick={exportarPagos} disabled={cargando || pagosFiltrados.length === 0}>Descargar Excel</button>}
    />

    <section className="panel pagos-filters" aria-label="Filtros de pagos">
      <label className="pagos-date-field">
        <span>Desde</span>
        <input type="date" value={desde} max={hasta || hoy} onChange={(event) => setDesde(event.target.value)} />
      </label>
      <label className="pagos-date-field">
        <span>Hasta</span>
        <input type="date" value={hasta} min={desde} max={hoy} onChange={(event) => setHasta(event.target.value)} />
      </label>
      <button className="primary-button" type="button" disabled={cargando || !rangoValido} onClick={consultar}>
        {cargando ? "Consultando..." : "Consultar pagos"}
      </button>
    </section>

    {error && <div className="pagos-error" role="alert">{error}</div>}
    {cargando && !datos && <section className="panel pagos-message" aria-live="polite">Cargando resumen de pagos…</section>}
    {!cargando && !datos && !error && <section className="panel pagos-message">No hay datos de pagos para mostrar.</section>}

    {datos && <>
      <section className="pagos-summary" aria-label="Indicadores de pagos">
        <article className="panel pagos-metric">
          <span>Pagos registrados</span>
          <strong>{numero.format(cantidadPagos)}</strong>
          <small>En el período consultado</small>
        </article>
        <article className="panel pagos-metric">
          <span>Monto aprobado</span>
          <strong>{moneda.format(totalPagado)}</strong>
          <small>Solo transacciones aprobadas</small>
        </article>
        <article className="panel pagos-metric">
          <span>Pendientes</span>
          <strong>{numero.format(pendientes)}</strong>
          <small>Requieren confirmación</small>
        </article>
      </section>

      <section className="panel page-panel pagos-section">
        <div className="panel-head pagos-table-head">
          <div>
            <h2>Resumen por método y estado</h2>
            <p>Período: {datos.desde} al {datos.hasta}. Los importes están agrupados; no representan el detalle individual de cada transacción.</p>
          </div>
          <div className="pagos-table-filters">
            <label>
              <span>Método</span>
              <select value={metodoSeleccionado} onChange={(event) => setMetodoSeleccionado(event.target.value)}>
                <option value="TODOS">Todos</option>
                {metodosDisponibles.map((metodo) => (
                  <option key={metodo} value={metodo}>{metodosPago[metodo] ?? metodo}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select value={estadoSeleccionado} onChange={(event) => setEstadoSeleccionado(event.target.value)}>
                <option value="TODOS">Todos</option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>{estadosPago[estado] ?? estado}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <DataTable
          columns={columnas}
          rows={pagosFiltrados}
          rowKey={(pago) => `${pago.metodoPago}-${pago.estado}`}
          emptyTitle="No hay pagos con estos filtros"
          emptyDescription="Prueba otro método o estado para el período seleccionado."
        />
      </section>
    </>}
  </>;
}
