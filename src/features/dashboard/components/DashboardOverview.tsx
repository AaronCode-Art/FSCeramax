import { Boxes, Package, RefreshCw, ShoppingBag } from 'lucide-react'
import type { StaffRole } from '../../../constants/roles'
import { useDashboardData } from '../hooks/useDashboardData'
import { orderStatusLabel } from '../utils/orderStatus'

interface DashboardOverviewProps {
  token: string
  displayName: string
  role: StaffRole
}

export function DashboardOverview({ token, displayName, role }: DashboardOverviewProps) {
  const { products, orders, stock, error, loading, refresh } = useDashboardData(token, role)
  const totalStock = stock.reduce((sum, item) => sum + numeric(item.stockDisponible), 0)
  const inProgressOrders = orders.filter((order) => {
    const state = String(order.estado ?? order.estadoPedido ?? '').toUpperCase()
    return state && !['ENTREGADO', 'CANCELADO', 'COMPLETADO'].includes(state)
  }).length

  const metrics = [
    ...(['ADMIN', 'JEFE_LOGISTICA'].includes(role) ? [{ label: 'Productos activos', value: countActive(products), icon: Package, detail: `${products.length} consultados` }] : []),
    { label: 'Pedidos en seguimiento', value: inProgressOrders, icon: ShoppingBag, detail: `De ${orders.length} pedidos recientes` },
    ...(role !== 'DELIVERY' ? [{ label: 'Unidades disponibles', value: totalStock, icon: Boxes, detail: 'Stock informado por almacén' }] : []),
  ]

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Resumen de operaciones</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hola{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Aquí tienes el estado actual de tu negocio.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudieron cargar todos los datos del panel: {error}
        </div>
      )}

      <div className={`grid gap-4 ${metrics.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {metrics.map(({ label, value, icon: Icon, detail }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={20} /></span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">API</span>
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{loading ? '—' : value.toLocaleString('es-PE')}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">Pedidos recientes</h2>
            <p className="mt-1 text-xs text-slate-500">Información consultada desde el sistema de pedidos.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{orders.length} pedidos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-6 py-3 font-semibold">Pedido</th><th className="px-6 py-3 font-semibold">Canal</th><th className="px-6 py-3 font-semibold">Fecha</th><th className="px-6 py-3 font-semibold">Estado</th><th className="px-6 py-3 text-right font-semibold">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order, index) => (
                <tr key={String(order.id ?? order.numero ?? index)} className="text-slate-700">
                  <td className="px-6 py-4 font-semibold text-slate-900">#{String(order.codigo ?? order.numero ?? order.numeroPedido ?? order.id ?? '—').slice(0, 12)}</td>
                  <td className="px-6 py-4">{String(order.canal ?? '—')}</td>
                  <td className="px-6 py-4">{formatDate(order.createdAt ?? order.fechaCreacion ?? order.fecha)}</td>
                  <td className="px-6 py-4"><StatusPill value={String(order.estadoNombre ?? order.estadoCodigo ?? order.estado ?? order.estadoPedido ?? 'Pendiente')} /></td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(order.total ?? order.montoTotal)}</td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No hay pedidos para mostrar.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Cargando información…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  const label = orderStatusLabel(value)
  const normalized = value.toUpperCase().replaceAll(' ', '_')
  const style = ['ENTREGADO', 'COMPLETADO', 'COMPLETADA', 'PAGADO'].some((status) => normalized.includes(status))
    ? 'bg-emerald-50 text-emerald-700'
    : ['CANCELADO', 'RECHAZADO', 'NO_ENTREGADA', 'NO_SE_PUDO_ENTREGAR'].some((status) => normalized.includes(status))
      ? 'bg-rose-50 text-rose-700'
      : ['EN_RUTA', 'EN_CAMINO'].some((status) => normalized.includes(status))
        ? 'bg-sky-50 text-sky-700'
      : 'bg-amber-50 text-amber-700'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>
}

function countActive(products: Record<string, unknown>[]) {
  return products.filter((product) => product.activo !== false).length
}

function numeric(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(number)
    : '—'
}

function formatDate(value: unknown) {
  if (typeof value !== 'string') return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-PE').format(date)
}
