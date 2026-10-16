import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import "../css/inventory.css";
import type { Role } from "../../../app/types";
import { DataTable, type TableColumn } from "../../../components/ui/DataTable";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { PageHeading } from "../../../components/ui/PageHeading";
import { useAuth } from "../../../hooks/useAuth";
import { descargarExcelFiltrado } from "../../../services/excelExport";
import type { Category } from "../../categoria/services/categoriaService";
import { listProducts, type Product } from "../../producto/services/productoService";
import {
  cancelInventoryTransfer,
  createInventoryAdjustment,
  createInventoryTransfer,
  approveEntryRequest,
  listActiveInventoryReservations,
  listEntryRequests,
  listInventory,
  listInventoryMovements,
  listInventoryTransfers,
  listWarehouses,
  receiveInventoryTransfer,
  rejectEntryRequest,
  registerInventoryEntry,
  type ActiveInventoryReservation,
  type InventoryTransfer,
  type InventoryTransferInput,
  type InventoryAdjustmentInput,
  type InventoryEntryInput,
  type InventoryItem,
  type InventoryMovement,
  type EntryRequest,
  type Warehouse,
} from "../services/inventarioService";

const adjustmentReasons: InventoryAdjustmentInput["motivo"][] = [
  "MERMA",
  "ROBO",
  "INVENTARIO_FISICO",
  "CORRECCION",
  "REPOSICION_AUTORIZADA",
  "OTRO",
];

const adjustmentReasonLabels: Record<InventoryAdjustmentInput["motivo"], string> = {
  MERMA: "Merma",
  ROBO: "Robo",
  INVENTARIO_FISICO: "Inventario físico",
  CORRECCION: "Corrección",
  REPOSICION_AUTORIZADA: "Reposición autorizada",
  OTRO: "Otro",
};

function isAdjustmentReason(value: string): value is InventoryAdjustmentInput["motivo"] {
  return adjustmentReasons.some((reason) => reason === value);
}

function InventoryEntryForm({
  role,
  products,
  categories,
  warehouses,
  token,
  onComplete,
  onCancel,
}: {
  role: Role;
  products: Product[];
  categories: Array<Pick<Category, "id" | "nombre" | "activo">>;
  warehouses: Warehouse[];
  token: string;
  onComplete: (message: string) => void;
  onCancel?: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [input, setInput] = useState<InventoryEntryInput>({
    almacenId: warehouses[0]?.id ?? "",
    productoId: "",
    cantidad: 1,
    observacion: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableProducts = products.filter((product) => product.activo
    && product.categoriaId === categoryId
    && `${product.nombre} ${product.codigo}`.toLocaleLowerCase().includes(productSearch.trim().toLocaleLowerCase()));
  const selectedProduct = products.find((product) => product.id === input.productoId);
  const becomesApprovalRequest = role === "LOGISTICA"
    && (selectedProduct?.precioFinal ?? 0) * input.cantidad >= 2000;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await registerInventoryEntry(input, token);
      onComplete(becomesApprovalRequest
        ? "La solicitud de entrada se envió al jefe de logística para su aprobación."
        : "La entrada se registró correctamente.");
      setInput({
        almacenId: warehouses[0]?.id ?? "",
        productoId: "",
        cantidad: 1,
        observacion: "",
      });
      setCategoryId("");
      setProductSearch("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar la entrada.");
    } finally {
      setSaving(false);
    }
  }

  if (warehouses.length === 0 || !products.some((product) => product.activo) || !categories.some((category) => category.activo)) {
    return <div className="inventory-form-empty" role="alert">
      Se requiere al menos un almacén activo y un producto activo asociado a una categoría para registrar una entrada.
    </div>;
  }

  return <form onSubmit={(event) => void submit(event)}>
    <div className="form-grid inventory-form-grid">
      <label>Almacén
        <select required value={input.almacenId} onChange={(event) => setInput({ ...input, almacenId: event.target.value })}>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.codigo} — {warehouse.nombre}</option>)}
        </select>
      </label>
      <label>Categoría
        <select required value={categoryId} onChange={(event) => {
          setCategoryId(event.target.value);
          setInput({ ...input, productoId: "" });
          setProductSearch("");
        }}>
          <option value="">Selecciona una categoría</option>
          {categories.filter((category) => category.activo).map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
        </select>
      </label>
      <label className="wide">Buscar producto por nombre o código
        <div className="inventory-entry-search">
          <Icon name="search" size={17}/>
          <input
            type="search"
            value={productSearch}
            onChange={(event) => {
              setProductSearch(event.target.value);
              setInput({ ...input, productoId: "" });
            }}
            placeholder="Escribe el nombre o código del producto"
            aria-label="Buscar producto por nombre o código"
            disabled={!categoryId}
          />
        </div>
      </label>
      <label className="wide">Producto
        <select required value={input.productoId} onChange={(event) => setInput({ ...input, productoId: event.target.value })} disabled={!categoryId}>
          <option value="">{categoryId ? "Selecciona un producto" : "Primero selecciona una categoría"}</option>
          {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nombre}</option>)}
        </select>
        {categoryId && availableProducts.length === 0 && <span className="inventory-entry-empty">No hay productos activos que coincidan con esa categoría y búsqueda.</span>}
      </label>
      <label>Cantidad
        <input required type="number" min="1" step="1" value={input.cantidad} onChange={(event) => setInput({ ...input, cantidad: Number(event.target.value) })}/>
      </label>
      <label className="wide">Observación
        <textarea maxLength={300} value={input.observacion} onChange={(event) => setInput({ ...input, observacion: event.target.value })} placeholder="Proveedor, documento u otra referencia (opcional)"/>
      </label>
    </div>
    {becomesApprovalRequest && <div className="inventory-notice" role="status">Por el valor de esta entrada, se enviará una solicitud que debe aprobar el jefe de logística.</div>}
    {error && <div className="category-error inventory-form-error" role="alert">{error}</div>}
    <div className="category-modal-actions">
      {onCancel && <button className="secondary-button" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>}
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar entrada"}</button>
    </div>
  </form>;
}

export function InventoryPage({ role }: { role: Role }) {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustment, setAdjustment] = useState<{
    nuevoStock: string;
    motivo: InventoryAdjustmentInput["motivo"];
    observacion: string;
  }>({ nuevoStock: "", motivo: "INVENTARIO_FISICO", observacion: "" });
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inventoryResult, warehouseResult] = await Promise.all([
        listInventory(token),
        listWarehouses(token),
      ]);
      setInventory(inventoryResult);
      setWarehouses(warehouseResult);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listInventory(token), listWarehouses(token)])
      .then(([inventoryResult, warehouseResult]) => {
        if (isCurrent) {
          setInventory(inventoryResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const visibleInventory = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return inventory.filter((item) =>
      (!warehouseFilter || item.almacenId === warehouseFilter)
      && (stockFilter === "all" || item.stockBajo)
      && (!term || [item.productoCodigo, item.productoNombre, item.categoriaNombre, item.almacenNombre]
        .some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [inventory, search, stockFilter, warehouseFilter]);
  const stockStatusLabel = stockFilter === "all" ? "all" : "low";
  const resumenStock = useMemo(() => inventory.reduce((summary, item) => ({
    unidadesFisicas: summary.unidadesFisicas + item.stockFisico,
    unidadesReservadas: summary.unidadesReservadas + item.stockReservado,
    unidadesDisponibles: summary.unidadesDisponibles + item.stockDisponible,
    ubicacionesBajoMinimo: summary.ubicacionesBajoMinimo + Number(item.stockBajo),
  }), {
    unidadesFisicas: 0,
    unidadesReservadas: 0,
    unidadesDisponibles: 0,
    ubicacionesBajoMinimo: 0,
  }), [inventory]);
  const numeroStock = useMemo(() => new Intl.NumberFormat("es-PE"), []);

  const columns: TableColumn<InventoryItem>[] = [
    {
      key: "productoNombre",
      label: "Producto",
      render: (item) => <><strong>{item.productoNombre}</strong><small>{item.productoCodigo} · {item.categoriaNombre}</small></>,
    },
    { key: "almacenNombre", label: "Almacén", render: (item) => <><strong>{item.almacenNombre}</strong><small>{item.sucursalNombre}</small></> },
    { key: "stockFisico", label: "Stock físico" },
    { key: "stockReservado", label: "Reservado" },
    { key: "stockDisponible", label: "Disponible" },
    { key: "stockMinimo", label: "Stock mínimo" },
    {
      key: "stockBajo",
      label: "Estado",
      render: (item) => <span className={`category-status ${item.stockBajo ? "is-inactive" : "is-active"}`}>
        {item.stockBajo ? "Stock bajo" : "Normal"}
      </span>,
    },
    ...(role === "ADMIN" ? [{
      key: "productoId" as keyof InventoryItem,
      label: "Acciones",
      render: (item: InventoryItem) => <button
        className="secondary-button category-action"
        type="button"
        onClick={() => {
          setAdjustingItem(item);
          setAdjustment({ nuevoStock: String(item.stockFisico), motivo: "INVENTARIO_FISICO", observacion: "" });
          setError(null);
        }}
      >Ajustar stock</button>,
    }] : []),
  ];

  function exportarInventario() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: "ceramax-inventario.xlsx",
        nombreHoja: "Inventario",
        encabezados: ["Sucursal", "Almacén", "Código almacén", "Producto", "Código producto", "Categoría", "Stock físico", "Reservado", "Disponible", "Stock mínimo", "Estado"],
        filas: visibleInventory.map((item) => [
          item.sucursalNombre,
          item.almacenNombre,
          item.almacenCodigo,
          item.productoNombre,
          item.productoCodigo,
          item.categoriaNombre,
          item.stockFisico,
          item.stockReservado,
          item.stockDisponible,
          item.stockMinimo,
          item.stockBajo ? "Stock bajo" : "Normal",
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudo exportar el inventario.");
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustingItem) return;
    setSavingAdjustment(true);
    setError(null);
    try {
      await createInventoryAdjustment({
        almacenId: adjustingItem.almacenId,
        productoId: adjustingItem.productoId,
        nuevoStock: Number(adjustment.nuevoStock),
        motivo: adjustment.motivo,
        observacion: adjustment.observacion.trim(),
      }, token);
      setAdjustingItem(null);
      setNotice("El ajuste de inventario se registró correctamente.");
      await loadInventory();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo ajustar el inventario.");
    } finally {
      setSavingAdjustment(false);
    }
  }

  return <>
    <PageHeading
      title="Inventario"
      description="Consulta existencias físicas, reservadas y disponibles por almacén."
      action={<>
        <button className="secondary-button" type="button" disabled={loading || visibleInventory.length === 0} onClick={exportarInventario}>Descargar Excel</button>
        <button className="secondary-button" type="button" disabled={loading} onClick={() => void loadInventory()}><Icon name="clock" size={16}/>{loading ? "Actualizando…" : "Actualizar"}</button>
      </>}
    />
    <section className="inventory-summary" aria-label="Resumen de existencias">
      <article className="panel inventory-summary-card"><span>Stock físico</span><strong>{numeroStock.format(resumenStock.unidadesFisicas)}</strong><small>Unidades en {inventory.length} ubicaciones</small></article>
      <article className="panel inventory-summary-card"><span>Reservado</span><strong>{numeroStock.format(resumenStock.unidadesReservadas)}</strong><small>Unidades comprometidas en pedidos</small></article>
      <article className="panel inventory-summary-card"><span>Disponible</span><strong>{numeroStock.format(resumenStock.unidadesDisponibles)}</strong><small>Unidades disponibles para operar</small></article>
      <article className="panel inventory-summary-card inventory-summary-warning"><span>Stock bajo</span><strong>{numeroStock.format(resumenStock.ubicacionesBajoMinimo)}</strong><small>Ubicaciones por debajo del mínimo</small></article>
    </section>
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div>
          <h2>Existencias</h2>
          <p>{visibleInventory.length} de {inventory.length} registros · {inventory.filter((item) => item.stockBajo).length} con stock bajo</p>
        </div>
        <div className="inventory-filters">
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o almacén" aria-label="Buscar inventario"/>
          </label>
          <label className="inventory-filter-select">
            <span>Almacén</span>
            <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
              <option value="">Todos</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}
            </select>
          </label>
          <label className="inventory-filter-select">
            <span>Stock</span>
            <select value={stockStatusLabel} onChange={(event) => setStockFilter(event.target.value === "low" ? "low" : "all")}>
              <option value="all">Todos</option>
              <option value="low">Solo stock bajo</option>
            </select>
          </label>
        </div>
      </div>
      {notice && <div className="inventory-notice" role="status">{notice}<button className="inventory-notice-close" type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button></div>}
      {error && !adjustingItem && <div className="category-error" role="alert">
        <span>{error}</span>
        <button className="secondary-button category-action" type="button" onClick={() => void loadInventory()}>Reintentar</button>
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando inventario…</div>
        : error && inventory.length === 0
          ? <EmptyState title="No se pudo cargar el inventario" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleInventory}
            rowKey={(item) => `${item.almacenId}:${item.productoId}`}
            emptyTitle={inventory.length === 0 ? "Aún no hay existencias" : "No se encontraron existencias"}
            emptyDescription={inventory.length === 0 ? "Las existencias registradas aparecerán aquí." : "Prueba con otro término o filtro."}
          />}
    </section>
    {adjustingItem && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !savingAdjustment) setAdjustingItem(null);
    }}>
      <section className="panel category-modal inventory-entry-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-adjust-title">
        <div className="category-modal-heading">
          <div><h2 id="inventory-adjust-title">Ajustar stock</h2><p>{adjustingItem.productoNombre} · {adjustingItem.almacenNombre}</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar ajuste" disabled={savingAdjustment} onClick={() => setAdjustingItem(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void submitAdjustment(event)}>
          <div className="form-grid category-form-grid">
            <label>Stock físico actual<input type="number" value={adjustingItem.stockFisico} disabled/></label>
            <label>Nuevo stock<input required type="number" min="0" step="1" value={adjustment.nuevoStock} onChange={(event) => setAdjustment({ ...adjustment, nuevoStock: event.target.value })}/></label>
            <label className="wide">Motivo
              <select value={adjustment.motivo} onChange={(event) => {
                if (isAdjustmentReason(event.target.value)) {
                  setAdjustment({ ...adjustment, motivo: event.target.value });
                }
              }}>
                {adjustmentReasons.map((reason) => <option key={reason} value={reason}>{adjustmentReasonLabels[reason]}</option>)}
              </select>
            </label>
            <label className="wide">Observación<textarea required maxLength={300} value={adjustment.observacion} onChange={(event) => setAdjustment({ ...adjustment, observacion: event.target.value })} placeholder="Describe el motivo del ajuste"/></label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={savingAdjustment} onClick={() => setAdjustingItem(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={savingAdjustment}>{savingAdjustment ? "Guardando…" : "Guardar ajuste"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

function InventoryTransferForm({
  token,
  onCancel,
  onComplete,
}: {
  token: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<ActiveInventoryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [tipoTraslado, setTipoTraslado] = useState<InventoryTransferInput["tipoTraslado"]>("REABASTECIMIENTO");
  const [almacenOrigenId, setAlmacenOrigenId] = useState("");
  const [almacenDestinoId, setAlmacenDestinoId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [reservaId, setReservaId] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([
      listWarehouses(token),
      listInventory(token),
      listProducts(token),
    ]).then(async ([warehouseResult, inventoryResult, productResult]) => {
      if (!isCurrent) return;
      const activeWarehouses = warehouseResult.filter((warehouse) => warehouse.activo);
      const activeProducts = productResult.filter((product) => product.activo);
      const availableItem = inventoryResult.find((item) =>
        item.stockDisponible > 0 && activeProducts.some((product) => product.id === item.productoId),
      );
      setWarehouses(activeWarehouses);
      setInventory(inventoryResult);
      setProducts(activeProducts);
      setAlmacenOrigenId(availableItem?.almacenId ?? activeWarehouses[0]?.id ?? "");
      setAlmacenDestinoId(activeWarehouses.find((warehouse) => warehouse.id !== availableItem?.almacenId)?.id ?? "");
      setProductoId(availableItem?.productoId ?? activeProducts[0]?.id ?? "");
      try {
        const reservationResult = await listActiveInventoryReservations(token);
        if (!isCurrent) return;
        setReservations(reservationResult);
        const firstReservation = reservationResult[0];
        setReservaId(firstReservation ? `${firstReservation.pedidoId}:${firstReservation.detallePedidoId}` : "");
      } catch (reservationLoadError) {
        if (isCurrent) setReservationError(reservationLoadError instanceof Error
          ? reservationLoadError.message
          : "No se pudieron cargar las reservas activas.");
      }
    }).catch((loadError: unknown) => {
      if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los datos para el traslado.");
    }).finally(() => {
      if (isCurrent) setLoading(false);
    });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const sourceStock = inventory.find((item) =>
    item.almacenId === almacenOrigenId && item.productoId === productoId,
  );
  const availableSourceInventory = inventory.filter((item) =>
    item.almacenId === almacenOrigenId
    && item.stockDisponible > 0
    && products.some((product) => product.id === item.productoId),
  );
  const selectedReservation = reservations.find((reservation) =>
    `${reservation.pedidoId}:${reservation.detallePedidoId}` === reservaId,
  );
  const transferOriginId = tipoTraslado === "PARA_CLIENTE"
    ? selectedReservation?.almacenId ?? ""
    : almacenOrigenId;
  const destinationWarehouses = warehouses.filter((warehouse) => warehouse.id !== transferOriginId);
  const reservationProduct = products.find((product) => product.id === selectedReservation?.productoId);
  const reservationSourceWarehouse = warehouses.find((warehouse) => warehouse.id === selectedReservation?.almacenId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input: InventoryTransferInput = tipoTraslado === "PARA_CLIENTE" && selectedReservation
        ? {
          almacenOrigenId: selectedReservation.almacenId,
          almacenDestinoId,
          productoId: selectedReservation.productoId,
          cantidad: selectedReservation.cantidad,
          tipoTraslado,
          pedidoId: selectedReservation.pedidoId,
          detallePedidoId: selectedReservation.detallePedidoId,
          observacion: observacion.trim(),
        }
        : {
          almacenOrigenId,
          almacenDestinoId,
          productoId,
          cantidad,
          tipoTraslado,
          observacion: observacion.trim(),
        };
      if (tipoTraslado === "PARA_CLIENTE" && !selectedReservation) {
        throw new Error("Selecciona una reserva activa para trasladar el pedido.");
      }
      if (input.almacenOrigenId === input.almacenDestinoId) {
        throw new Error("El almacén de origen y destino deben ser distintos.");
      }
      await createInventoryTransfer(input, token);
      onComplete();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar el traslado.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="category-message" role="status">Cargando almacenes y existencias…</div>;
  if (error && warehouses.length === 0) return <div className="category-error inventory-form-error" role="alert">{error}</div>;

  return <form onSubmit={(event) => void submit(event)}>
    <div className="form-grid inventory-form-grid">
      <label className="wide">Tipo de traslado
        <select value={tipoTraslado} onChange={(event) => {
          if (event.target.value === "PARA_CLIENTE" || event.target.value === "REABASTECIMIENTO") {
            setTipoTraslado(event.target.value);
            setError(null);
            const sourceId = event.target.value === "PARA_CLIENTE" ? selectedReservation?.almacenId : almacenOrigenId;
            setAlmacenDestinoId(warehouses.find((warehouse) => warehouse.id !== sourceId)?.id ?? "");
          }
        }}>
          <option value="REABASTECIMIENTO">Reabastecimiento entre almacenes</option>
          <option value="PARA_CLIENTE">Traslado de pedido reservado</option>
        </select>
      </label>
      {tipoTraslado === "REABASTECIMIENTO" ? <>
        <label>Almacén de origen
          <select required value={almacenOrigenId} onChange={(event) => {
            setAlmacenOrigenId(event.target.value);
            const firstItem = inventory.find((item) =>
              item.almacenId === event.target.value
              && item.stockDisponible > 0
              && products.some((product) => product.id === item.productoId),
            );
            setProductoId(firstItem?.productoId ?? "");
            setCantidad(1);
          }}>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.codigo} — {warehouse.nombre}</option>)}
          </select>
        </label>
        <label>Producto con stock disponible
          <select required value={productoId} onChange={(event) => {
            setProductoId(event.target.value);
            setCantidad(1);
          }}>
            {availableSourceInventory.map((item) => <option key={item.productoId} value={item.productoId}>{item.productoCodigo} — {item.productoNombre}</option>)}
          </select>
        </label>
        <label>Cantidad a trasladar
          <input required type="number" min="1" max={sourceStock?.stockDisponible ?? 0} step="1" value={cantidad} onChange={(event) => setCantidad(Number(event.target.value))}/>
          <small>Disponible en origen: {sourceStock?.stockDisponible ?? 0}</small>
        </label>
      </> : <>
        <label className="wide">Reserva activa del pedido
          <select required value={reservaId} onChange={(event) => {
            setReservaId(event.target.value);
            const reservation = reservations.find((item) => `${item.pedidoId}:${item.detallePedidoId}` === event.target.value);
            setAlmacenDestinoId(warehouses.find((warehouse) => warehouse.id !== reservation?.almacenId)?.id ?? "");
          }}>
            {reservations.map((reservation) => {
              const key = `${reservation.pedidoId}:${reservation.detallePedidoId}`;
              const item = products.find((product) => product.id === reservation.productoId);
              return <option key={key} value={key}>
                {reservation.pedidoCodigo} · {item?.nombre ?? "Producto"} · {reservation.cantidad} unidades{reservation.clienteNombre ? ` · ${reservation.clienteNombre}` : ""}
              </option>;
            })}
          </select>
          {reservationError && <small className="inventory-transfer-error">No se cargaron reservas: {reservationError}</small>}
          {!reservationError && reservations.length === 0 && <small>No hay reservas activas disponibles para trasladar.</small>}
        </label>
        {selectedReservation && <div className="inventory-transfer-reservation wide">
          <strong>{reservationProduct?.codigo} — {reservationProduct?.nombre}</strong>
          <span>Origen: {reservationSourceWarehouse?.nombre ?? selectedReservation.almacenNombre}</span>
          <span>Cantidad reservada: {selectedReservation.cantidad}</span>
        </div>}
      </>}
      <label>Almacén de destino
        <select required value={almacenDestinoId} onChange={(event) => setAlmacenDestinoId(event.target.value)}>
          {destinationWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.codigo} — {warehouse.nombre}</option>)}
        </select>
      </label>
      <label className="wide">Observación
        <textarea maxLength={250} value={observacion} onChange={(event) => setObservacion(event.target.value)} placeholder="Referencia o detalle del traslado (opcional)"/>
      </label>
    </div>
    {warehouses.length < 2 && <div className="inventory-form-empty" role="alert">Se necesitan al menos dos almacenes activos para realizar un traslado.</div>}
    {tipoTraslado === "REABASTECIMIENTO" && availableSourceInventory.length === 0 && <div className="inventory-form-empty" role="alert">El almacén de origen no tiene productos con stock disponible para trasladar.</div>}
    {tipoTraslado === "PARA_CLIENTE" && reservations.length === 0 && <div className="inventory-form-empty" role="alert">{reservationError ? `No se pudieron verificar las reservas: ${reservationError}` : "Solo se pueden trasladar pedidos con una reserva activa."}</div>}
    {error && <div className="category-error inventory-form-error" role="alert">{error}</div>}
    <div className="category-modal-actions">
      <button className="secondary-button" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>
      <button className="primary-button" type="submit" disabled={saving || warehouses.length < 2 || (
        tipoTraslado === "REABASTECIMIENTO"
          ? availableSourceInventory.length === 0 || !sourceStock || cantidad < 1 || cantidad > sourceStock.stockDisponible
          : !selectedReservation || reservations.length === 0
      )}>{saving ? "Iniciando…" : "Iniciar traslado"}</button>
    </div>
  </form>;
}

export function TransfersPage({ role }: { role: Role }) {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const canManage = role === "ADMIN" || role === "JEFE_LOGISTICA" || role === "LOGISTICA";
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionTransfer, setActionTransfer] = useState<{ transfer: InventoryTransfer; action: "receive" | "cancel" } | null>(null);
  const [actionObservation, setActionObservation] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadTransfers = useCallback(async () => {
    try {
      const result = await listInventoryTransfers(token);
      setTransfers(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los traslados.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void listInventoryTransfers(token)
      .then((result) => {
        if (isCurrent) {
          setTransfers(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los traslados.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  async function submitTransferAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionTransfer) return;
    setWorkingId(actionTransfer.transfer.id);
    setError(null);
    setNotice(null);
    try {
      if (actionTransfer.action === "receive") {
        await receiveInventoryTransfer(actionTransfer.transfer.id, actionObservation.trim(), token);
        setNotice(`Se confirmó la recepción del traslado ${actionTransfer.transfer.codigo}.`);
      } else {
        await cancelInventoryTransfer(actionTransfer.transfer.id, actionObservation.trim(), token);
        setNotice(`Se canceló el traslado ${actionTransfer.transfer.codigo}.`);
      }
      setActionTransfer(null);
      setActionObservation("");
      await loadTransfers();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar el traslado.");
    } finally {
      setWorkingId(null);
    }
  }

  const columns: TableColumn<InventoryTransfer>[] = [
    { key: "codigo", label: "Traslado" },
    {
      key: "tipo",
      label: "Tipo",
      render: (transfer) => transfer.tipo === "PARA_CLIENTE" ? "Pedido de cliente" : "Reabastecimiento",
    },
    {
      key: "productoNombre",
      label: "Producto",
      render: (transfer) => <><strong>{transfer.productoNombre}</strong><small>{transfer.productoCodigo}</small></>,
    },
    { key: "almacenOrigenNombre", label: "Origen" },
    { key: "almacenDestinoNombre", label: "Destino" },
    {
      key: "cantidad",
      label: "Cantidad",
      render: (transfer) => <>{transfer.cantidad}{transfer.pedidoCodigo && <small>{transfer.pedidoCodigo}</small>}</>,
    },
    {
      key: "fechaInicio",
      label: "Inicio",
      render: (transfer) => <>{new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(transfer.fechaInicio))}<small>{transfer.diasTransito} {transfer.diasTransito === 1 ? "día" : "días"} en tránsito</small></>,
    },
    {
      key: "estado",
      label: "Estado",
      render: (transfer) => <span className="category-status is-inactive">{transfer.estado}</span>,
    },
    ...(canManage ? [{
      key: "id" as keyof InventoryTransfer,
      label: "Acciones",
      render: (transfer: InventoryTransfer) => <div className="category-actions">
        <button className="secondary-button category-action" type="button" disabled={workingId === transfer.id} onClick={() => {
          setActionTransfer({ transfer, action: "receive" });
          setActionObservation("");
          setError(null);
        }}>Recibir</button>
        <button className="secondary-button category-action category-deactivate" type="button" disabled={workingId === transfer.id} onClick={() => {
          setActionTransfer({ transfer, action: "cancel" });
          setActionObservation("");
          setError(null);
        }}>Cancelar</button>
      </div>,
    }] : []),
  ];

  return <>
    <PageHeading
      title="Traslados"
      description="Inicia movimientos entre almacenes, confirma recepciones y consulta los que siguen en tránsito."
      action={<>
        <button className="secondary-button" type="button" onClick={() => {
          setLoading(true);
          void loadTransfers();
        }} disabled={loading}><Icon name="clock" size={16}/>Actualizar</button>
        {canManage && <button className="primary-button" type="button" onClick={() => {
          setError(null);
          setNotice(null);
          setShowCreateForm(true);
        }}><Icon name="plus" size={17}/>Nuevo traslado</button>}
      </>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar"><div><h2>Traslados en tránsito</h2><p>{transfers.length} {transfers.length === 1 ? "traslado" : "traslados"}</p></div></div>
      {notice && <div className="inventory-notice" role="status">{notice}<button className="inventory-notice-close" type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button></div>}
      {error && !actionTransfer && <div className="category-error" role="alert"><span>{error}</span><button className="secondary-button category-action" type="button" onClick={() => {
        setLoading(true);
        void loadTransfers();
      }}>Reintentar</button></div>}
      {loading
        ? <div className="category-message" role="status">Cargando traslados…</div>
        : error && transfers.length === 0
          ? <EmptyState title="No se pudieron cargar los traslados" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={transfers}
            rowKey={(transfer) => transfer.id}
            emptyTitle="No hay traslados en tránsito"
            emptyDescription="Los traslados iniciados aparecerán aquí hasta que se reciban o cancelen."
          />}
    </section>
    {showCreateForm && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowCreateForm(false);
    }}>
      <section className="panel category-modal inventory-entry-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-transfer-title">
        <div className="category-modal-heading">
          <div><h2 id="inventory-transfer-title">Iniciar traslado</h2><p>El stock de origen se actualizará al confirmar la operación.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" onClick={() => setShowCreateForm(false)}><Icon name="close" size={19}/></button>
        </div>
        <InventoryTransferForm token={token} onCancel={() => setShowCreateForm(false)} onComplete={() => {
          setShowCreateForm(false);
          setNotice("El traslado fue iniciado correctamente.");
          setLoading(true);
          void loadTransfers();
        }}/>
      </section>
    </div>}
    {actionTransfer && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !workingId) setActionTransfer(null);
    }}>
      <section className="panel category-modal inventory-entry-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-transfer-action-title">
        <div className="category-modal-heading">
          <div>
            <h2 id="inventory-transfer-action-title">{actionTransfer.action === "receive" ? "Confirmar recepción" : "Cancelar traslado"}</h2>
            <p>{actionTransfer.transfer.codigo} · {actionTransfer.transfer.productoNombre} · {actionTransfer.transfer.cantidad} unidades</p>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={Boolean(workingId)} onClick={() => setActionTransfer(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void submitTransferAction(event)}>
          <div className="form-grid category-form-grid">
            <label className="wide">{actionTransfer.action === "receive" ? "Observación de recepción" : "Motivo de cancelación"}
              <textarea required={actionTransfer.action === "cancel"} maxLength={250} value={actionObservation} onChange={(event) => setActionObservation(event.target.value)} placeholder={actionTransfer.action === "receive" ? "Observación opcional" : "Indica el motivo de la cancelación"}/>
            </label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={Boolean(workingId)} onClick={() => setActionTransfer(null)}>Volver</button>
            <button className="primary-button" type="submit" disabled={Boolean(workingId)}>{workingId ? "Procesando…" : actionTransfer.action === "receive" ? "Confirmar recepción" : "Confirmar cancelación"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

const movementTypeLabels: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
};

export function MovementsPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    try {
      setMovements(await listInventoryMovements(token));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void listInventoryMovements(token)
      .then((result) => {
        if (isCurrent) {
          setMovements(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los movimientos.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const warehouses = useMemo(() => Array.from(new Map(
    movements.map((movement) => [movement.almacenId, movement.almacenNombre]),
  ).entries()).sort((a, b) => a[1].localeCompare(b[1])), [movements]);
  const movementTypes = useMemo(() => Array.from(new Set(movements.map((movement) => movement.tipo)))
    .sort((a, b) => a.localeCompare(b)), [movements]);
  const visibleMovements = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return movements.filter((movement) =>
      (!warehouseFilter || movement.almacenId === warehouseFilter)
      && (!typeFilter || movement.tipo === typeFilter)
      && (!term || [
        movement.codigo,
        movement.tipo,
        movement.motivo,
        movement.productoCodigo,
        movement.productoNombre,
        movement.almacenNombre,
        movement.usuarioNombre ?? "",
        movement.pedidoId ?? "",
        movement.trasladoId ?? "",
        movement.observacion ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [movements, search, typeFilter, warehouseFilter]);

  const columns: TableColumn<InventoryMovement>[] = [
    { key: "codigo", label: "Movimiento" },
    {
      key: "tipo",
      label: "Tipo / motivo",
      render: (movement) => <><span className={`category-status inventory-movement-type inventory-movement-${movement.tipo.toLocaleLowerCase()}`}>{movementTypeLabels[movement.tipo] ?? movement.tipo}</span><small>{movement.motivo}</small>{movement.observacion && <small>{movement.observacion}</small>}</>,
    },
    {
      key: "productoNombre",
      label: "Producto",
      render: (movement) => <><strong>{movement.productoNombre}</strong><small>{movement.productoCodigo}</small></>,
    },
    { key: "almacenNombre", label: "Almacén" },
    { key: "cantidad", label: "Cantidad" },
    {
      key: "stockResultante",
      label: "Stock resultante",
      render: (movement) => movement.stockResultante ?? "—",
    },
    {
      key: "usuarioNombre",
      label: "Responsable",
      render: (movement) => movement.usuarioNombre ?? "No disponible",
    },
    {
      key: "pedidoId",
      label: "Referencia",
      render: (movement) => movement.trasladoId
        ? <>Traslado<small>{movement.trasladoId}</small></>
        : movement.pedidoId
          ? <>Pedido<small>{movement.pedidoId}</small></>
          : "—",
    },
    {
      key: "fecha",
      label: "Fecha",
      render: (movement) => new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(movement.fecha)),
    },
  ];

  function exportarMovimientos() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: "ceramax-movimientos-inventario.xlsx",
        nombreHoja: "Movimientos",
        encabezados: ["Código", "Fecha", "Tipo", "Motivo", "Producto", "Código producto", "Almacén", "Cantidad", "Stock resultante", "Responsable", "Pedido", "Traslado", "Observación"],
        filas: visibleMovements.map((movement) => [
          movement.codigo,
          movement.fecha,
          movementTypeLabels[movement.tipo] ?? movement.tipo,
          movement.motivo,
          movement.productoNombre,
          movement.productoCodigo,
          movement.almacenNombre,
          movement.cantidad,
          movement.stockResultante,
          movement.usuarioNombre ?? "",
          movement.pedidoId ?? "",
          movement.trasladoId ?? "",
          movement.observacion ?? "",
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudieron exportar los movimientos.");
    }
  }

  return <>
    <PageHeading
      title="Movimientos"
      description="Historial de entradas, salidas y ajustes realizados en el inventario."
      action={<>
        <button className="secondary-button" type="button" onClick={exportarMovimientos} disabled={loading || visibleMovements.length === 0}>Descargar Excel</button>
        <button className="secondary-button" type="button" onClick={() => {
          setLoading(true);
          void loadMovements();
        }} disabled={loading}><Icon name="clock" size={16}/>Actualizar</button>
      </>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Historial de movimientos</h2><p>{visibleMovements.length} de {movements.length} registros</p></div>
        <div className="inventory-filters">
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o referencia" aria-label="Buscar movimientos"/>
          </label>
          <label className="inventory-filter-select"><span>Almacén</span>
            <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
              <option value="">Todos</option>
              {warehouses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="inventory-filter-select"><span>Tipo</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Todos</option>
              {movementTypes.map((type) => <option key={type} value={type}>{movementTypeLabels[type] ?? type}</option>)}
            </select>
          </label>
        </div>
      </div>
      {error && <div className="category-error" role="alert"><span>{error}</span><button className="secondary-button category-action" type="button" onClick={() => {
        setLoading(true);
        void loadMovements();
      }}>Reintentar</button></div>}
      {loading
        ? <div className="category-message" role="status">Cargando movimientos…</div>
        : error && movements.length === 0
          ? <EmptyState title="No se pudieron cargar los movimientos" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleMovements}
            rowKey={(movement) => movement.id}
            emptyTitle={movements.length === 0 ? "Aún no hay movimientos" : "No se encontraron movimientos"}
            emptyDescription={movements.length === 0 ? "Los ingresos, salidas y ajustes del inventario aparecerán aquí." : "Prueba con otro término o filtro."}
          />}
    </section>
  </>;
}

export function RequestsPage({ page }: { page: string }) {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const canReview = session?.rol === "ADMIN" || session?.rol === "JEFE_LOGISTICA";
  const [requests, setRequests] = useState<EntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<EntryRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const result = await listEntryRequests(token);
      setRequests(result.sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud)));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  function refreshRequests() {
    setLoading(true);
    setError(null);
    void loadRequests();
  }

  useEffect(() => {
    let isCurrent = true;
    void listEntryRequests(token)
      .then((result) => {
        if (isCurrent) {
          setRequests(result.sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud)));
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las solicitudes.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  async function handleApprove(request: EntryRequest) {
    if (!window.confirm(`¿Aprobar la solicitud ${request.codigo} y registrar ${request.cantidad} unidades?`)) return;
    setWorkingId(request.id);
    setError(null);
    setNotice(null);
    try {
      await approveEntryRequest(request.id, token);
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setNotice(`La solicitud ${request.codigo} fue aprobada y el ingreso se registró.`);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "No se pudo aprobar la solicitud.");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectingRequest) return;
    setWorkingId(rejectingRequest.id);
    setError(null);
    setNotice(null);
    try {
      await rejectEntryRequest(rejectingRequest.id, rejectionReason.trim(), token);
      setRequests((current) => current.filter((item) => item.id !== rejectingRequest.id));
      setNotice(`La solicitud ${rejectingRequest.codigo} fue rechazada.`);
      setRejectingRequest(null);
      setRejectionReason("");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "No se pudo rechazar la solicitud.");
    } finally {
      setWorkingId(null);
    }
  }

  const columns: TableColumn<EntryRequest>[] = [
    { key: "codigo", label: "Solicitud" },
    {
      key: "productoNombre",
      label: "Producto",
      render: (request) => <><strong>{request.productoNombre}</strong><small>{request.productoCodigo}</small></>,
    },
    { key: "almacenNombre", label: "Almacén" },
    { key: "cantidad", label: "Cantidad" },
    {
      key: "motivo",
      label: "Detalle",
      render: (request) => <>{request.motivo}<small>{request.observacion || "Sin observaciones"}</small></>,
    },
    { key: "usuarioSolicitanteNombre", label: "Solicitante" },
    {
      key: "fechaSolicitud",
      label: "Fecha",
      render: (request) => new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(request.fechaSolicitud)),
    },
    {
      key: "estado",
      label: "Estado",
      render: (request) => <span className={`category-status inventory-request-status ${request.estado === "PENDIENTE" ? "is-inactive" : request.estado === "RECHAZADA" ? "is-rejected" : "is-active"}`}>
        {request.estado}
      </span>,
    },
    ...(canReview ? [{
      key: "id" as keyof EntryRequest,
      label: "Acciones",
      render: (request: EntryRequest) => <div className="category-actions">
        <button
          className="secondary-button category-action"
          type="button"
          disabled={workingId === request.id}
          onClick={() => void handleApprove(request)}
        >{workingId === request.id ? "Procesando…" : "Aprobar"}</button>
        <button
          className="secondary-button category-action category-deactivate"
          type="button"
          disabled={workingId === request.id}
          onClick={() => {
            setRejectingRequest(request);
            setRejectionReason("");
            setError(null);
          }}
        >Rechazar</button>
      </div>,
    }] : []),
  ];

  return <>
    <PageHeading
      title={page}
      description={canReview ? "Revisa las solicitudes de entrada pendientes de aprobación." : "Consulta el estado de tus solicitudes de entrada."}
      action={<button className="secondary-button" type="button" onClick={refreshRequests} disabled={loading}><Icon name="clock" size={16}/>Actualizar</button>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>{canReview ? "Solicitudes pendientes" : "Mis solicitudes de entrada"}</h2><p>{requests.length} {requests.length === 1 ? "solicitud" : "solicitudes"}</p></div>
      </div>
      {notice && <div className="inventory-notice" role="status">{notice}<button className="inventory-notice-close" type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button></div>}
      {error && <div className="category-error" role="alert"><span>{error}</span><button className="secondary-button category-action" type="button" onClick={refreshRequests}>Reintentar</button></div>}
      {loading
        ? <div className="category-message" role="status">Cargando solicitudes…</div>
        : error && requests.length === 0
          ? <EmptyState title="No se pudieron cargar las solicitudes" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={requests}
            rowKey={(request) => request.id}
            emptyTitle={canReview ? "No hay solicitudes pendientes" : "Aún no tienes solicitudes"}
            emptyDescription={canReview ? "Las solicitudes de entrada que requieren aprobación aparecerán aquí." : "Cuando una entrada requiera aprobación, aparecerá aquí su estado."}
          />}
    </section>
    {rejectingRequest && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !workingId) setRejectingRequest(null);
    }}>
      <section className="panel category-modal inventory-entry-modal" role="dialog" aria-modal="true" aria-labelledby="request-reject-title">
        <div className="category-modal-heading">
          <div><h2 id="request-reject-title">Rechazar solicitud</h2><p>{rejectingRequest.codigo} · {rejectingRequest.productoNombre}</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={Boolean(workingId)} onClick={() => setRejectingRequest(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void handleReject(event)}>
          <div className="form-grid category-form-grid">
            <label className="wide">Motivo del rechazo
              <textarea maxLength={300} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Indica por qué se rechaza la solicitud"/>
            </label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={Boolean(workingId)} onClick={() => setRejectingRequest(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={Boolean(workingId)}>{workingId ? "Procesando…" : "Confirmar rechazo"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

export function EntryPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listProducts(token), listWarehouses(token)])
      .then(([productResult, warehouseResult]) => {
        if (isCurrent) {
          setProducts(productResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar productos y almacenes.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const categories = useMemo(() => {
    const uniqueCategories = new Map<string, Pick<Category, "id" | "nombre" | "activo">>();
    products.filter((product) => product.activo).forEach((product) => {
      uniqueCategories.set(product.categoriaId, {
        id: product.categoriaId,
        nombre: product.categoriaNombre,
        activo: true,
      });
    });
    return Array.from(uniqueCategories.values()).sort((first, second) => first.nombre.localeCompare(second.nombre));
  }, [products]);

  return <>
    <PageHeading title="Registrar entrada" description="Registra el ingreso de existencias al almacén." />
    <section className="panel form-preview">
      <div className="form-section">
        <h3>Datos de la entrada</h3>
        {loading
          ? <div className="category-message" role="status">Cargando productos y almacenes…</div>
          : error
            ? <div className="category-error" role="alert">{error}</div>
            : <InventoryEntryForm
              role={session?.rol ?? "LOGISTICA"}
              products={products}
              categories={categories}
              warehouses={warehouses}
              token={token}
              onComplete={setNotice}
            />}
        {notice && <div className="inventory-entry-notice" role="status">
          <Icon name="check" size={18}/>
          <span>{notice}</span>
          <button type="button" aria-label="Cerrar notificación" onClick={() => setNotice(null)}>×</button>
        </div>}
      </div>
    </section>
  </>;
}
