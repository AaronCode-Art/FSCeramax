import { useEffect, useState } from 'react'
import { BarChart3, Download, Package, RefreshCw, ShoppingCart, Wallet } from 'lucide-react'
import { getBlob, getJson } from '../../../lib/api/httpClient'

interface SalesInventoryReport {
  desde: string
  hasta: string
  generadoEn: string
  cantidadVentas: number
  ventasWeb: number
  ventasPresenciales: number
  ingresosTotales: number
  productosMasVendidos: BestSellingProduct[]
  inventarioActual: InventoryReportRow[]
}

interface BestSellingProduct {
  productoId: string
  codigo: string
  nombre: string
  unidadesVendidas: number
  importeVendido: number
}

interface InventoryReportRow {
  almacenId: string
  almacenCodigo: string
  almacenNombre: string
  productoId: string
  productoCodigo: string
  productoNombre: string
  categoriaNombre: string
  stockFisico: number
  stockReservado: number
  stockDisponible: number
  stockMinimo: number
  stockBajo: boolean
}

interface ReportsPageProps {
  token: string
}

export function ReportsPage({ token }: ReportsPageProps) {
  const [today] = useState(() => localDate(new Date()))
  const [from, setFrom] = useState(() => `${today.slice(0, 7)}-01`)
  const [to, setTo] = useState(today)
  const [appliedRange, setAppliedRange] = useState(() => ({ from: `${today.slice(0, 7)}-01`, to: today }))
  const [report, setReport] = useState<SalesInventoryReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const query = new URLSearchParams({ desde: appliedRange.from, hasta: appliedRange.to })
    getJson<SalesInventoryReport>(token, `/v1/reportes/ventas-inventario?${query.toString()}`)
      .then((data) => { if (current) setReport(data) })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [appliedRange, token])

  async function exportReport(format: 'pdf' | 'excel') {
    setDownloading(format)
    setExportError(null)
    try {
      const query = new URLSearchParams({ desde: appliedRange.from, hasta: appliedRange.to })
      const blob = await getBlob(token, `/v1/reportes/ventas-inventario/${format}?${query.toString()}`)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ceramax-ventas-inventario-${appliedRange.from}-${appliedRange.to}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'No se pudo descargar el reporte.')
    } finally {
      setDownloading(null)
    }
  }

  function applyRange() {
    if (!from || !to || from > to) {
      setError('Selecciona un rango válido: la fecha inicial debe ser anterior o igual a la fecha final.')
      return
    }
    setLoading(true)
    setError(null)
    setAppliedRange({ from, to })
  }

  const products = report?.productosMasVendidos ?? []
  const topUnits = Math.max(1, ...products.map((product) => product.unidadesVendidas))
  const lowStockCount = report?.inventarioActual.filter((item) => item.stockBajo).length ?? 0

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Ventas e inventario</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reportes</h1>
          <p className="mt-2 text-sm text-slate-500">Revisa resultados de venta, productos con mayor rotación y existencias.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-semibold text-slate-600">Desde
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={dateInputClass} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Hasta
            <input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} className={dateInputClass} />
          </label>
          <button type="button" onClick={applyRange} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Consultar
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ingresos totales" value={loading ? '—' : currency(report?.ingresosTotales)} detail={`${formatDate(appliedRange.from)} – ${formatDate(appliedRange.to)}`} icon={Wallet} />
        <Metric label="Ventas registradas" value={loading ? '—' : number(report?.cantidadVentas)} detail="En el período seleccionado" icon={ShoppingCart} />
        <Metric label="Ventas web" value={loading ? '—' : number(report?.ventasWeb)} detail="Pedidos del canal web" icon={BarChart3} />
        <Metric label="Ventas presenciales" value={loading ? '—' : number(report?.ventasPresenciales)} detail="Atención en sucursal" icon={Package} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-bold text-slate-900">Productos más comprados</h2><p className="mt-1 text-xs text-slate-500">Ordenados por unidades vendidas durante el período.</p></div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{products.length} productos</span>
          </div>
          {loading && <p className="px-5 py-10 text-center text-sm text-slate-500">Cargando estadísticas…</p>}
          {!loading && products.length > 0 && (
            <div className="divide-y divide-slate-100">
              {products.slice(0, 10).map((product, index) => (
                <div key={product.productoId} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{index + 1}. {product.nombre}</p><p className="mt-1 text-xs text-slate-500">{product.codigo}</p></div>
                    <div className="shrink-0 text-right"><p className="text-sm font-bold text-slate-900">{number(product.unidadesVendidas)} un.</p><p className="mt-1 text-xs text-slate-500">{currency(product.importeVendido)}</p></div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${Math.max(3, (product.unidadesVendidas / topUnits) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {!loading && products.length === 0 && <EmptyState error={error} label="No hay ventas de productos en este rango." />}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Detalle por producto</h2><p className="mt-1 text-xs text-slate-500">Unidades e importe vendido.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Producto</th><th className="px-4 py-3 text-right font-semibold">Unidades</th><th className="px-4 py-3 text-right font-semibold">Importe</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => <tr key={product.productoId}><td className="px-4 py-3"><p className="font-medium text-slate-900">{product.nombre}</p><p className="mt-0.5 text-xs text-slate-500">{product.codigo}</p></td><td className="px-4 py-3 text-right">{number(product.unidadesVendidas)}</td><td className="px-4 py-3 text-right font-medium">{currency(product.importeVendido)}</td></tr>)}
                {!loading && products.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">{error ? 'No se pudo cargar el detalle.' : 'Sin productos vendidos en estas fechas.'}</td></tr>}
                {loading && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">Cargando detalle…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-bold text-slate-900">Inventario actual</h2><p className="mt-1 text-xs text-slate-500">Existencias por producto y almacén, consultadas al generar el reporte.</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lowStockCount ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{lowStockCount} con stock bajo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Producto</th><th className="px-5 py-3 font-semibold">Categoría</th><th className="px-5 py-3 font-semibold">Almacén</th><th className="px-5 py-3 text-right font-semibold">Físico</th><th className="px-5 py-3 text-right font-semibold">Reservado</th><th className="px-5 py-3 text-right font-semibold">Disponible</th><th className="px-5 py-3 text-right font-semibold">Mínimo</th><th className="px-5 py-3 font-semibold">Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.inventarioActual ?? []).map((item) => (
                <tr key={`${item.almacenId}-${item.productoId}`}>
                  <td className="px-5 py-3"><p className="font-medium text-slate-900">{item.productoNombre}</p><p className="mt-0.5 text-xs text-slate-500">{item.productoCodigo}</p></td>
                  <td className="px-5 py-3">{item.categoriaNombre || '—'}</td><td className="px-5 py-3">{item.almacenNombre}</td>
                  <td className="px-5 py-3 text-right">{number(item.stockFisico)}</td><td className="px-5 py-3 text-right">{number(item.stockReservado)}</td><td className="px-5 py-3 text-right font-semibold">{number(item.stockDisponible)}</td><td className="px-5 py-3 text-right">{number(item.stockMinimo)}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.stockBajo ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{item.stockBajo ? 'Stock bajo' : 'Normal'}</span></td>
                </tr>
              ))}
              {!loading && (report?.inventarioActual.length ?? 0) === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">{error ? 'No se pudo cargar el inventario.' : 'No hay registros de inventario.'}</td></tr>}
              {loading && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">Cargando inventario…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="font-bold text-slate-900">Descargar reporte detallado</h2><p className="mt-1 text-sm text-slate-500">Los archivos incluyen el rango {formatDate(appliedRange.from)} – {formatDate(appliedRange.to)}.</p>{exportError && <p role="alert" className="mt-2 text-sm text-rose-700">{exportError}</p>}</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void exportReport('pdf')} disabled={loading || downloading !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Download size={15} /> {downloading === 'pdf' ? 'Preparando…' : 'PDF'}</button>
          <button type="button" onClick={() => void exportReport('excel')} disabled={loading || downloading !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Download size={15} /> {downloading === 'excel' ? 'Preparando…' : 'Excel'}</button>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Wallet }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={19} /></span><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></article>
}

function EmptyState({ error, label }: { error: string | null; label: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{error ? 'No se pudo cargar la estadística.' : label}</p>
}

function number(value: number | null | undefined) {
  return new Intl.NumberFormat('es-PE').format(value ?? 0)
}

function currency(value: number | null | undefined) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value ?? 0)
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(date)
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateInputClass = 'mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-700'
