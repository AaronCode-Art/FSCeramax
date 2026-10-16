import { useCallback, useEffect, useMemo, useState } from "react";
import type { Role } from "../../../app/types";
import { DataTable, type TableColumn } from "../../../components/ui/DataTable";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { PageHeading } from "../../../components/ui/PageHeading";
import { descargarExcelFiltrado } from "../../../services/excelExport";
import {
  asignarDelivery,
  cambiarEstadoPedido,
  descargarComprobante,
  listarDeliveries,
  listarPedidos,
  obtenerPedido,
  obtenerTransicionesPedido,
} from "../services/pedidoService";
import type { DeliveryOpcion, Pedido, PedidoResumen } from "../types/pedido";
import "../css/orders.css";

const moneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

const estadoLabels: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PREPARACION: "En preparación",
  LISTO_DESPACHO: "Listo para despacho",
  LISTO_PARA_RECOGER: "Listo para recoger",
  EN_RUTA: "En ruta",
  EN_CAMINO: "En camino",
  COMPLETADA: "Completado",
  NO_ENTREGADA: "No entregado",
  CANCELADO: "Cancelado",
};

const estadoOptions: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PREPARACION: "En preparación",
  LISTO_DESPACHO: "Listo para despacho",
  LISTO_PARA_RECOGER: "Listo para recoger",
  EN_RUTA: "En ruta",
  EN_CAMINO: "En camino",
  COMPLETADA: "Completado",
  NO_ENTREGADA: "No entregado",
  CANCELADO: "Cancelado",
};

function nombreEstado(order: PedidoResumen): string {
  return estadoLabels[order.estadoCodigo] ?? order.estadoNombre;
}

function nombreEntrega(tipo: string): string {
  if (tipo === "DELIVERY") return "Delivery";
  if (tipo === "RECOJO_TIENDA") return "Recojo en tienda";
  return tipo;
}

function clientePedido(order: PedidoResumen): string {
  return order.datosEntrega?.destinatario?.trim() || "Cliente";
}

function direccionPedido(order: PedidoResumen): string {
  if (order.tipoEntrega === "RECOJO_TIENDA") {
    return [order.datosEntrega?.sucursalNombre, order.datosEntrega?.sucursalDireccion]
      .filter(Boolean)
      .join(" · ") || "Sucursal no disponible";
  }
  return [
    order.datosEntrega?.direccion,
    order.datosEntrega?.distrito,
    order.datosEntrega?.provincia,
    order.datosEntrega?.departamento,
  ].filter(Boolean).join(", ") || "Dirección no disponible";
}

function esLogistica(role: Role): boolean {
  return role === "ADMIN" || role === "JEFE_LOGISTICA" || role === "LOGISTICA";
}

export function OrdersPage({ role, page, token, initialSearch = "" }: { role: Role; page: string; token: string; initialSearch?: string }) {
  const [orders, setOrders] = useState<PedidoResumen[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalElementos, setTotalElementos] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState<PedidoResumen | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [deliveries, setDeliveries] = useState<DeliveryOpcion[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadOrders = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listarPedidos(token, role, page, currentPage);
      setOrders(result.contenido);
      setPagina(result.pagina);
      setTotalPaginas(result.totalPaginas);
      setTotalElementos(result.totalElementos);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, [page, role, token]);

  useEffect(() => {
    let isCurrent = true;
    void listarPedidos(token, role, page, pagina)
      .then((result) => {
        if (isCurrent) {
          setOrders(result.contenido);
          setPagina(result.pagina);
          setTotalPaginas(result.totalPaginas);
          setTotalElementos(result.totalElementos);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [page, role, token, pagina]);

  const openOrder = async (order: PedidoResumen) => {
    setSelectedOrderSummary(order);
    setSelectedOrder(null);
    setTransitions([]);
    setSelectedState("");
    setSelectedDelivery("");
    setDeliveries([]);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail = await obtenerPedido(token, order.id);
      const availableTransitions = role === "VENDEDOR"
        ? []
        : await obtenerTransicionesPedido(token, order.id);
      setSelectedOrder(detail);
      setTransitions(availableTransitions);
      setSelectedState(availableTransitions[0] ?? "");
      if (
        esLogistica(role)
        && detail.tipoEntrega === "DELIVERY"
        && detail.estadoCodigo === "LISTO_DESPACHO"
        && !detail.deliveryId
      ) {
        const activeDeliveries = await listarDeliveries(token);
        setDeliveries(activeDeliveries);
        setSelectedDelivery(activeDeliveries[0]?.id ?? "");
      }
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "No se pudo cargar el detalle del pedido.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelectedOrder = async (orderId: string) => {
    const [detail, availableTransitions] = await Promise.all([
      obtenerPedido(token, orderId),
      obtenerTransicionesPedido(token, orderId),
    ]);
    setSelectedOrder(detail);
    setTransitions(availableTransitions);
    setSelectedState(availableTransitions[0] ?? "");
    setOrders((current) => current.map((order) => order.id === detail.id ? { ...order, ...detail } : order));
  };

  const handleChangeState = async () => {
    if (!selectedOrder || !selectedState) return;
    setSavingAction(true);
    setDetailError(null);
    try {
      await cambiarEstadoPedido(token, selectedOrder.id, selectedState);
      await refreshSelectedOrder(selectedOrder.id);
      await loadOrders(pagina);
    } catch (actionError) {
      setDetailError(actionError instanceof Error ? actionError.message : "No se pudo actualizar el estado.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrder || !selectedDelivery) return;
    setSavingAction(true);
    setDetailError(null);
    try {
      await asignarDelivery(token, selectedOrder.id, selectedDelivery);
      await refreshSelectedOrder(selectedOrder.id);
      await loadOrders(pagina);
    } catch (actionError) {
      setDetailError(actionError instanceof Error ? actionError.message : "No se pudo asignar el delivery.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedOrder) return;
    setDownloading(true);
    setDetailError(null);
    try {
      await descargarComprobante(token, selectedOrder.id);
    } catch (downloadError) {
      setDetailError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el comprobante.");
    } finally {
      setDownloading(false);
    }
  };

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return orders;
    return orders.filter((order) => [
      order.codigo,
      order.estadoNombre,
      nombreEstado(order),
      order.canal,
      order.tipoEntrega,
      clientePedido(order),
      order.datosEntrega?.telefono ?? "",
      order.datosEntrega?.direccion ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(term)));
  }, [orders, search]);
  const isRoutePage = role === "DELIVERY" && page === "Mi ruta";
  const routeActiveCount = orders.filter((order) => ["EN_RUTA", "EN_CAMINO"].includes(order.estadoCodigo)).length;
  const routeReadyCount = orders.filter((order) => order.estadoCodigo === "LISTO_DESPACHO").length;

  function exportarPedidos() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: `ceramax-pedidos-pagina-${pagina + 1}.xlsx`,
        nombreHoja: "Pedidos",
        encabezados: [
          "Código", "Canal", "Cliente", "Teléfono", "Fecha", "Tipo de entrega",
          ...(role === "DELIVERY" ? [] : ["Total"]),
          "Estado", "Comprobante", "Número comprobante", "Dirección / recojo",
        ],
        filas: visibleOrders.map((order) => [
          order.codigo,
          order.canal,
          clientePedido(order),
          order.datosEntrega?.telefono ?? "",
          fechaHora.format(new Date(order.createdAt)),
          nombreEntrega(order.tipoEntrega),
          ...(role === "DELIVERY" ? [] : [order.total]),
          nombreEstado(order),
          order.tipoComprobante ?? "",
          [order.serie, order.numeroComprobante].filter(Boolean).join("-"),
          order.tipoEntrega === "RECOJO_TIENDA"
            ? [order.datosEntrega?.sucursalNombre, order.datosEntrega?.sucursalDireccion].filter(Boolean).join(" · ")
            : [order.datosEntrega?.direccion, order.datosEntrega?.distrito, order.datosEntrega?.provincia].filter(Boolean).join(", "),
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudieron exportar los pedidos.");
    }
  }

  const columns: TableColumn<PedidoResumen>[] = [
    { key: "codigo", label: "Pedido", render: (order) => <><strong>{order.codigo}</strong><small>{order.canal === "WEB" ? "Web" : "Presencial"}</small></> },
    { key: "datosEntrega", label: "Cliente", render: (order) => <><strong>{clientePedido(order)}</strong>{order.datosEntrega?.telefono && <small>{order.datosEntrega.telefono}</small>}</> },
    { key: "createdAt", label: "Fecha", render: (order) => fechaHora.format(new Date(order.createdAt)) },
    { key: "tipoEntrega", label: "Entrega", render: (order) => nombreEntrega(order.tipoEntrega) },
    ...(role === "DELIVERY" ? [] : [{ key: "total" as const, label: "Total", render: (order: PedidoResumen) => moneda.format(order.total) }]),
    { key: "estadoNombre", label: "Estado", render: (order) => <span className={`orders-status orders-status-${order.estadoCodigo.toLocaleLowerCase()}`}>{nombreEstado(order)}</span> },
    { key: "id", label: "Acciones", render: (order) => <button className="secondary-button orders-detail-button" type="button" onClick={() => void openOrder(order)}>Ver pedido</button> },
  ];

  return <>
    <PageHeading
      title={page}
      description={isRoutePage
        ? "Tus entregas asignadas. Abre cada pedido para consultar los productos y actualizar su estado."
        : role === "DELIVERY"
        ? page === "Historial" ? "Consulta el historial de tus entregas completadas o no entregadas." : "Consulta tus entregas pendientes y actualiza su estado."
        : role === "VENDEDOR" ? "Consulta el historial de pedidos y ventas registrados."
          : "Revisa la bandeja de pedidos y gestiona su preparación y despacho."}
      action={<>
        <button className="secondary-button" type="button" title="Exporta los pedidos visibles de la página actual." onClick={exportarPedidos} disabled={loading || visibleOrders.length === 0}>Descargar Excel</button>
        <button className="secondary-button" type="button" onClick={() => void loadOrders(pagina)} disabled={loading}><Icon name="clock" size={16}/>Actualizar</button>
      </>}
    />
    {isRoutePage && <section className="orders-route-summary" aria-label="Resumen de mi ruta">
      <article className="panel orders-route-metric">
        <span>Entregas asignadas</span>
        <strong>{totalElementos}</strong>
        <small>Pedidos activos en tu ruta</small>
      </article>
      <article className="panel orders-route-metric">
        <span>Por iniciar</span>
        <strong>{routeReadyCount}</strong>
        <small>Listos para despacho</small>
      </article>
      <article className="panel orders-route-metric">
        <span>En curso</span>
        <strong>{routeActiveCount}</strong>
        <small>Entregas en camino</small>
      </article>
    </section>}
    <section className="panel page-panel orders-panel">
      <div className="category-toolbar">
        <div><h2>{isRoutePage ? "Paradas de entrega" : page === "Historial" ? "Historial de entregas" : "Pedidos registrados"}</h2><p>{loading ? "Cargando…" : `${isRoutePage ? visibleOrders.length : totalElementos} ${isRoutePage ? "entregas visibles" : totalElementos === 1 ? "pedido" : "pedidos"}${search ? ` · ${visibleOrders.length} visibles` : ""}`}</p></div>
        <label className="category-search">
          <Icon name="search" size={17}/>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código, cliente o estado" aria-label="Buscar pedidos"/>
        </label>
      </div>
      {error && <div className="category-error orders-error" role="alert"><span>{error}</span><button className="secondary-button category-action" type="button" onClick={() => void loadOrders(pagina)}>Reintentar</button></div>}
      {loading
        ? <div className="category-message" role="status">Cargando pedidos…</div>
        : error && orders.length === 0
          ? <EmptyState title="No se pudieron cargar los pedidos" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : isRoutePage
            ? visibleOrders.length === 0
              ? <EmptyState
                title={search ? "No se encontraron entregas" : "Tu ruta está despejada"}
                description={search ? "Prueba con otro código, cliente o dirección." : "Cuando logística te asigne pedidos, aparecerán aquí."}
                icon="truck"
              />
              : <div className="orders-route-list">
                {visibleOrders.map((order, index) => {
                  const direccion = direccionPedido(order);
                  return <article className="panel orders-route-stop" key={order.id}>
                    <div className="orders-route-stop-number" aria-label={`Parada ${index + 1}`}>{index + 1}</div>
                    <div className="orders-route-stop-content">
                      <div className="orders-route-stop-header">
                        <div>
                          <span className="orders-route-order-code">{order.codigo}</span>
                          <span className={`orders-status orders-status-${order.estadoCodigo.toLocaleLowerCase()}`}>{nombreEstado(order)}</span>
                        </div>
                        <time dateTime={order.createdAt}>{fechaHora.format(new Date(order.createdAt))}</time>
                      </div>
                      <h3>{clientePedido(order)}</h3>
                      {order.datosEntrega?.telefono && <a className="orders-route-phone" href={`tel:${order.datosEntrega.telefono}`}>{order.datosEntrega.telefono}</a>}
                      <p className="orders-route-address">{direccion}</p>
                      {order.tipoEntrega === "DELIVERY" && direccion !== "Dirección no disponible" && <a
                        className="orders-route-map-link"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                        target="_blank"
                        rel="noreferrer"
                      >Abrir ubicación</a>}
                      <div className="orders-route-stop-footer">
                        <span>{nombreEntrega(order.tipoEntrega)}</span>
                        <button className="primary-button" type="button" onClick={() => void openOrder(order)}>Ver pedido y actualizar</button>
                      </div>
                    </div>
                  </article>;
                })}
              </div>
            : <DataTable
            columns={columns}
            rows={visibleOrders}
            rowKey={(order) => order.id}
            emptyTitle={search ? "No se encontraron pedidos" : "Aún no hay pedidos"}
            emptyDescription={search ? "Prueba con otro código, cliente o estado." : "Cuando se registren pedidos, aparecerán aquí."}
          />}
      {totalPaginas > 1 && <nav className="orders-pagination" aria-label="Paginación de pedidos">
        <button className="secondary-button" type="button" disabled={pagina === 0 || loading} onClick={() => {
          setLoading(true);
          setError(null);
          setPagina((current) => Math.max(0, current - 1));
        }}>Anterior</button>
        <span>Página {pagina + 1} de {totalPaginas}</span>
        <button className="secondary-button" type="button" disabled={pagina + 1 >= totalPaginas || loading} onClick={() => {
          setLoading(true);
          setError(null);
          setPagina((current) => Math.min(totalPaginas - 1, current + 1));
        }}>Siguiente</button>
      </nav>}
    </section>

    {(detailLoading || selectedOrder || detailError) && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !savingAction && !downloading) {
        setSelectedOrder(null);
        setSelectedOrderSummary(null);
        setDetailLoading(false);
        setDetailError(null);
      }
    }}>
      <section className="panel category-modal orders-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <div className="category-modal-heading">
          <div><h2 id="order-detail-title">Pedido {selectedOrder?.codigo ?? selectedOrderSummary?.codigo ?? ""}</h2><p>Información, estado y entrega.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar pedido" onClick={() => {
            setSelectedOrder(null);
            setSelectedOrderSummary(null);
            setDetailLoading(false);
            setDetailError(null);
          }} disabled={savingAction || downloading}><Icon name="close" size={19}/></button>
        </div>
        {detailLoading && <div className="category-message" role="status">Cargando detalle…</div>}
        {detailError && <div className="category-error orders-error" role="alert">
          <span>{detailError}</span>
          {selectedOrderSummary && <button className="secondary-button category-action" type="button" onClick={() => void openOrder(selectedOrderSummary)} disabled={detailLoading}>Reintentar</button>}
        </div>}
        {selectedOrder && <>
          <div className="orders-detail-content">
            <div className="orders-detail-grid">
              <div><span>Cliente</span><strong>{selectedOrder.datosEntrega?.destinatario || "No indicado"}</strong></div>
              <div><span>Teléfono</span><strong>{selectedOrder.datosEntrega?.telefono || "No indicado"}</strong></div>
              <div><span>Estado</span><strong>{nombreEstado(selectedOrder)}</strong></div>
              <div><span>Tipo de entrega</span><strong>{nombreEntrega(selectedOrder.tipoEntrega)}</strong></div>
              <div><span>Registrado</span><strong>{fechaHora.format(new Date(selectedOrder.createdAt))}</strong></div>
              <div><span>Delivery asignado</span><strong>{selectedOrder.deliveryNombre || "Sin asignar"}</strong></div>
              <div className="orders-detail-address"><span>Dirección / recojo</span><strong>{selectedOrder.tipoEntrega === "RECOJO_TIENDA"
                ? [selectedOrder.datosEntrega?.sucursalNombre, selectedOrder.datosEntrega?.sucursalDireccion].filter(Boolean).join(" · ") || "Sucursal no disponible"
                : [selectedOrder.datosEntrega?.direccion, selectedOrder.datosEntrega?.distrito, selectedOrder.datosEntrega?.provincia, selectedOrder.datosEntrega?.departamento].filter(Boolean).join(", ") || "Dirección no disponible"}</strong></div>
            </div>
            <div className="orders-lines-heading"><h3>Productos</h3><span>{moneda.format(selectedOrder.total)}</span></div>
            {selectedOrder.detalles.length
              ? <ul className="orders-line-list">{selectedOrder.detalles.map((line) => <li key={line.id}>
                <div><strong>{line.productoNombre}</strong><small>{line.productoCodigo} · {line.cantidad} × {moneda.format(line.precioUnitario)}</small></div>
                <strong>{moneda.format(line.subtotal)}</strong>
              </li>)}</ul>
              : <p className="orders-detail-muted">El pedido no incluye detalles de productos.</p>}
            {selectedOrder.tipoEntrega === "DELIVERY" && selectedOrder.deliveryId && <p className="orders-delivery-assigned">Asignado a {selectedOrder.deliveryNombre || "delivery"}.</p>}
            {esLogistica(role) && selectedOrder.tipoEntrega === "DELIVERY" && selectedOrder.estadoCodigo === "LISTO_DESPACHO" && !selectedOrder.deliveryId && <div className="orders-action-box">
              <label>Asignar delivery
                <select value={selectedDelivery} onChange={(event) => setSelectedDelivery(event.target.value)} disabled={!deliveries.length || savingAction}>
                  {deliveries.length === 0 && <option value="">No hay deliveries activos</option>}
                  {deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.nombres} {delivery.apellidos}{delivery.telefono ? ` · ${delivery.telefono}` : ""}</option>)}
                </select>
              </label>
              <button className="primary-button" type="button" disabled={!selectedDelivery || savingAction} onClick={() => void handleAssignDelivery()}>{savingAction ? "Asignando…" : "Asignar"}</button>
            </div>}
            {transitions.length > 0 && role !== "VENDEDOR" && <div className="orders-action-box">
              <label>Actualizar estado
                <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)} disabled={savingAction}>
                  {transitions.map((state) => <option key={state} value={state}>{estadoOptions[state] ?? state.replaceAll("_", " ")}</option>)}
                </select>
              </label>
              <button className="primary-button" type="button" disabled={!selectedState || savingAction} onClick={() => void handleChangeState()}>{savingAction ? "Actualizando…" : "Guardar estado"}</button>
            </div>}
          </div>
          <div className="category-modal-actions">
            {role !== "DELIVERY" && <button className="secondary-button" type="button" disabled={downloading} onClick={() => void handleDownloadReceipt()}>{downloading ? "Descargando…" : "Descargar comprobante"}</button>}
            <button className="secondary-button" type="button" disabled={savingAction || downloading} onClick={() => {
              setSelectedOrder(null);
              setSelectedOrderSummary(null);
              setDetailError(null);
            }}>Cerrar</button>
          </div>
        </>}
      </section>
    </div>}
  </>;
}
