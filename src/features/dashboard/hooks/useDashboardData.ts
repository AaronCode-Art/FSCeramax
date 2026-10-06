import { useCallback, useEffect, useState } from 'react'
import type { StaffRole } from '../../../constants/roles'
import { getJson } from '../../../lib/api/httpClient'

interface DataRecord {
  [key: string]: unknown
}

interface DashboardData {
  products: DataRecord[]
  orders: DataRecord[]
  stock: DataRecord[]
  error: string | null
  loading: boolean
  refresh: () => void
}

export function useDashboardData(token: string, role: StaffRole): DashboardData {
  const [products, setProducts] = useState<DataRecord[]>([])
  const [orders, setOrders] = useState<DataRecord[]>([])
  const [stock, setStock] = useState<DataRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    setRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    let current = true
    const requests: [string, Promise<unknown>][] = [
      ['pedidos', getJson<unknown>(token, '/v1/pedidos/pagina?pagina=0&tamano=8')],
    ]
    if (role === 'ADMIN' || role === 'JEFE_LOGISTICA') requests.push(['productos', getJson<unknown>(token, '/v1/catalogo/productos')])
    if (['ADMIN', 'JEFE_LOGISTICA', 'LOGISTICA'].includes(role)) requests.push(['inventario', getJson<unknown>(token, '/v1/inventario/stock-disponible')])
    Promise.allSettled(requests.map(([, request]) => request)).then((results) => {
      if (!current) return
      const messages: string[] = []
      results.forEach((result, index) => {
        const [name] = requests[index]
        if (result.status === 'rejected') {
          messages.push(`${name}: ${result.reason instanceof Error ? result.reason.message : 'Error al cargar.'}`)
          return
        }
        const records = toRecords(result.value)
        if (name === 'productos') setProducts(records)
        if (name === 'pedidos') setOrders(records)
        if (name === 'inventario') setStock(records)
      })
      setError(messages.length ? messages.join(' · ') : null)
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [role, token, revision])

  return { products, orders, stock, error, loading, refresh }
}

export function toRecords(value: unknown): DataRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (!isRecord(value)) return []
  for (const key of ['contenido', 'content', 'data', 'items', 'resultados', 'results']) {
    if (Array.isArray(value[key])) return (value[key] as unknown[]).filter(isRecord)
  }
  return []
}

export function isRecord(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
