import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./cupones.css";
import { DataTable, type TableColumn } from "../../../components/ui/DataTable";
import { Icon } from "../../../components/ui/Icon";
import { PageHeading } from "../../../components/ui/PageHeading";
import { useAuth } from "../../../hooks/useAuth";
import {
  createCoupon,
  deactivateCoupon,
  listCoupons,
  updateCoupon,
  type Coupon,
  type CouponInput,
} from "../services/cuponService";

type CouponDraft = {
  codigo: string;
  tipoDescuento: CouponInput["tipoDescuento"];
  valor: string;
  compraMinima: string;
  usoMaximo: string;
  limitePorCliente: string;
  iniciaEn: string;
  venceEn: string;
  descripcion: string;
  activo: boolean;
};

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const dateTime = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

function localDateTimeInput(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function createDraft(): CouponDraft {
  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(expiration.getDate() + 30);
  return {
    codigo: "",
    tipoDescuento: "PORCENTAJE",
    valor: "",
    compraMinima: "0",
    usoMaximo: "",
    limitePorCliente: "1",
    iniciaEn: localDateTimeInput(now),
    venceEn: localDateTimeInput(expiration),
    descripcion: "",
    activo: true,
  };
}

function toDraft(coupon: Coupon): CouponDraft {
  return {
    codigo: coupon.codigo,
    tipoDescuento: coupon.tipoDescuento,
    valor: String(coupon.valor),
    compraMinima: String(coupon.compraMinima),
    usoMaximo: coupon.usoMaximo === null ? "" : String(coupon.usoMaximo),
    limitePorCliente: String(coupon.limitePorCliente),
    iniciaEn: localDateTimeInput(new Date(coupon.iniciaEn)),
    venceEn: coupon.venceEn ? localDateTimeInput(new Date(coupon.venceEn)) : "",
    descripcion: coupon.anuncioMensaje,
    activo: coupon.activo,
  };
}

function toInput(draft: CouponDraft): CouponInput {
  return {
    codigo: draft.codigo.trim().toUpperCase(),
    tipoDescuento: draft.tipoDescuento,
    valor: Number(draft.valor),
    compraMinima: Number(draft.compraMinima),
    usoMaximo: draft.usoMaximo.trim() ? Number(draft.usoMaximo) : null,
    limitePorCliente: Number(draft.limitePorCliente),
    iniciaEn: new Date(draft.iniciaEn).toISOString(),
    venceEn: draft.venceEn.trim() ? new Date(draft.venceEn).toISOString() : null,
    descripcion: draft.descripcion.trim(),
    activo: draft.activo,
  };
}

function couponStatus(coupon: Coupon): string {
  const now = Date.now();
  if (!coupon.activo) return "Desactivado";
  if (coupon.usoMaximo !== null && coupon.usos >= coupon.usoMaximo) return "Agotado";
  if (Date.parse(coupon.iniciaEn) > now) return "Programado";
  if (coupon.venceEn && Date.parse(coupon.venceEn) < now) return "Vencido";
  return "Vigente";
}

export function CuponesPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoupons(await listCoupons(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los cupones.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let current = true;
    void listCoupons(token)
      .then((result) => { if (current) setCoupons(result); })
      .catch((loadError: unknown) => {
        if (current) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los cupones.");
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [token]);

  const columns: TableColumn<Coupon>[] = [
    {
      key: "codigo",
      label: "Cupón",
      render: (coupon) => <><strong>{coupon.codigo}</strong><small>{coupon.anuncioMensaje}</small></>,
    },
    {
      key: "valor",
      label: "Descuento",
      render: (coupon) => coupon.tipoDescuento === "PORCENTAJE"
        ? `${coupon.valor}%`
        : currency.format(coupon.valor),
    },
    {
      key: "iniciaEn",
      label: "Vigencia",
      render: (coupon) => `${dateTime.format(new Date(coupon.iniciaEn))} — ${coupon.venceEn ? dateTime.format(new Date(coupon.venceEn)) : "Sin vencimiento"}`,
    },
    {
      key: "usos",
      label: "Usos",
      render: (coupon) => `${coupon.usos}${coupon.usoMaximo === null ? " / ∞" : ` / ${coupon.usoMaximo}`} · ${coupon.limitePorCliente}/cliente`,
    },
    {
      key: "activo",
      label: "Estado",
      render: (coupon) => <span className={`coupon-status coupon-status-${couponStatus(coupon).toLocaleLowerCase("es")}`}>{couponStatus(coupon)}</span>,
    },
    {
      key: "id",
      label: "Acciones",
      render: (coupon) => <span className="coupon-row-actions">
        <button className="secondary-button" type="button" onClick={() => { setEditingId(coupon.id); setDraft(toDraft(coupon)); setError(null); setNotice(null); }}>Editar</button>
        {coupon.activo && <button
          className="secondary-button coupon-deactivate"
          type="button"
          disabled={deactivatingId === coupon.id}
          onClick={() => void handleDeactivate(coupon)}
        >{deactivatingId === coupon.id ? "Desactivando…" : "Desactivar"}</button>}
      </span>,
    },
  ];

  function startCreate() {
    setEditingId(null);
    setDraft(createDraft());
    setError(null);
    setNotice(null);
  }

  function closeEditor() {
    if (saving) return;
    setDraft(null);
    setEditingId(null);
  }

  async function saveCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const startsAt = new Date(draft.iniciaEn);
    const expiresAt = draft.venceEn.trim() ? new Date(draft.venceEn) : null;
    if (Number.isNaN(startsAt.getTime())
      || (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt))) {
      setError("La fecha de vencimiento debe ser posterior al inicio.");
      return;
    }
    if (draft.tipoDescuento === "PORCENTAJE" && Number(draft.valor) > 100) {
      setError("El descuento porcentual no puede superar el 100%.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const input = toInput(draft);
      if (editingId) await updateCoupon(editingId, input, token);
      else await createCoupon(input, token);
      setDraft(null);
      setEditingId(null);
      setNotice(editingId ? "El cupón se actualizó correctamente." : "El cupón se creó correctamente.");
      await loadCoupons();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el cupón.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(coupon: Coupon) {
    if (!window.confirm(`¿Desactivar el cupón ${coupon.codigo}?`)) return;
    setDeactivatingId(coupon.id);
    setError(null);
    setNotice(null);
    try {
      await deactivateCoupon(coupon.id, token);
      setNotice(`El cupón ${coupon.codigo} quedó desactivado.`);
      await loadCoupons();
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "No se pudo desactivar el cupón.");
    } finally {
      setDeactivatingId(null);
    }
  }

  return <section className="coupons-page">
    <PageHeading
      title="Cupones"
      description="Crea descuentos para la tienda. Los cupones activos y vigentes pueden aparecer en el anuncio de inicio."
      action={<button className="primary-button" type="button" onClick={startCreate}><Icon name="plus" size={17}/>Nuevo cupón</button>}
    />
    {error && <div className="coupon-feedback coupon-feedback-error" role="alert">{error}</div>}
    {notice && <div className="coupon-feedback coupon-feedback-success" role="status">{notice}</div>}
    <section className="panel page-panel">
      <div className="panel-head"><div><h2>Cupones creados</h2><p>Los anuncios publicados se muestran temporalmente en la página de inicio de la tienda.</p></div></div>
      {loading
        ? <div className="coupon-loading" role="status">Cargando cupones…</div>
        : <DataTable
          columns={columns}
          rows={coupons}
          rowKey={(coupon) => coupon.id}
          emptyTitle="Aún no hay cupones"
          emptyDescription="Crea un cupón para ofrecer descuentos en la tienda web."
        />}
    </section>
    {draft && <div className="coupon-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
      <section className="coupon-editor" role="dialog" aria-modal="true" aria-labelledby="coupon-editor-title">
        <div className="coupon-editor-heading">
          <div><span>Promoción de tienda</span><h2 id="coupon-editor-title">{editingId ? "Editar cupón" : "Nuevo cupón"}</h2></div>
          <button className="coupon-editor-close" type="button" aria-label="Cerrar" disabled={saving} onClick={closeEditor}>×</button>
        </div>
        <form onSubmit={(event) => void saveCoupon(event)}>
          <div className="form-grid coupon-form-grid">
            <label>Código del cupón<input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]+" value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value.toUpperCase() })} placeholder="CERAMAX10" /></label>
            <label>Tipo de descuento<select value={draft.tipoDescuento} onChange={(event) => setDraft({ ...draft, tipoDescuento: event.target.value as CouponInput["tipoDescuento"] })}><option value="PORCENTAJE">Porcentaje</option><option value="MONTO_FIJO">Monto fijo (S/)</option></select></label>
            <label>{draft.tipoDescuento === "PORCENTAJE" ? "Porcentaje de descuento" : "Monto de descuento (S/)"}<input required type="number" min="0.01" max={draft.tipoDescuento === "PORCENTAJE" ? 100 : undefined} step="0.01" value={draft.valor} onChange={(event) => setDraft({ ...draft, valor: event.target.value })} /></label>
            <label>Compra mínima (S/)<input required type="number" min="0" step="0.01" value={draft.compraMinima} onChange={(event) => setDraft({ ...draft, compraMinima: event.target.value })} /></label>
            <label>Máximo de usos <span className="coupon-optional">Opcional; vacío = ilimitado</span><input type="number" min="1" step="1" value={draft.usoMaximo} onChange={(event) => setDraft({ ...draft, usoMaximo: event.target.value })} placeholder="Ilimitado" /></label>
            <label>Usos máximos por cliente<input required type="number" min="1" step="1" value={draft.limitePorCliente} onChange={(event) => setDraft({ ...draft, limitePorCliente: event.target.value })} /></label>
            <label>Inicio de vigencia<input required type="datetime-local" value={draft.iniciaEn} onChange={(event) => setDraft({ ...draft, iniciaEn: event.target.value })} /></label>
            <label>Fin de vigencia <span className="coupon-optional">Opcional; vacío = sin vencimiento</span><input type="datetime-local" value={draft.venceEn} onChange={(event) => setDraft({ ...draft, venceEn: event.target.value })} /></label>
            <label className="wide">Descripción del cupón<textarea required maxLength={200} value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} placeholder="Describe qué ofrece esta promoción." /></label>
            <label className="coupon-checkbox"><input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })} /><span>Dejar cupón activo</span></label>
          </div>
          {error && <div className="coupon-feedback coupon-feedback-error" role="alert">{error}</div>}
          <div className="coupon-editor-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={closeEditor}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear cupón"}</button>
          </div>
        </form>
      </section>
    </div>}
  </section>;
}
