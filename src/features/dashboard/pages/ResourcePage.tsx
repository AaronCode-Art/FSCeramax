import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { AlertCircle, Download, FilePlus2, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import type { AdminSection } from '../../../app/adminNavigation'
import type { StaffRole } from '../../../constants/roles'
import { deleteResource, getBlob, getJson, sendFormData, sendJson } from '../../../lib/api/httpClient'
import { StatusPill } from '../components/DashboardOverview'
import { isRecord, toRecords } from '../hooks/useDashboardData'
import { orderStatusLabel } from '../utils/orderStatus'

interface ResourcePageProps {
  section: AdminSection
  token: string
  role: StaffRole
}

export function ResourcePage({ section, token, role }: ResourcePageProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [stockRows, setStockRows] = useState<Record<string, unknown>[]>([])
  const [inventoryProducts, setInventoryProducts] = useState<Record<string, unknown>[]>([])
  const [inventoryWarehouses, setInventoryWarehouses] = useState<Record<string, unknown>[]>([])
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(Boolean(section.endpoint))
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null)
  const [staffCode, setStaffCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<Record<string, unknown> | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, unknown>[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [inventoryOperation, setInventoryOperation] = useState<'entrada' | 'ajuste' | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferOriginId, setTransferOriginId] = useState('')
  const [transferProductId, setTransferProductId] = useState('')
  const [branches, setBranches] = useState<Record<string, unknown>[]>([])
  const [roles, setRoles] = useState<Record<string, unknown>[]>([])
  const [chatType, setChatType] = useState<'soporte' | 'interno'>('soporte')
  const [movementView, setMovementView] = useState<'movimientos' | 'traslados'>('movimientos')
  const [deliveries, setDeliveries] = useState<Record<string, unknown>[]>([])
  const [logisticsDepartment, setLogisticsDepartment] = useState('')
  const [logisticsProvince, setLogisticsProvince] = useState('')
  const [logisticsDistrict, setLogisticsDistrict] = useState('')
  const [logisticsStatus, setLogisticsStatus] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [orderTransitions, setOrderTransitions] = useState<string[]>([])
  const [orderStatusHistory, setOrderStatusHistory] = useState<Record<string, unknown>[]>([])
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false)
  const [nextOrderStatus, setNextOrderStatus] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState('')
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const canManage = ['ADMIN', 'JEFE_LOGISTICA'].includes(role) && ['productos', 'categorias', 'almacenes', 'sucursales'].includes(section.id)
  const canDeactivate = ['ADMIN', 'JEFE_LOGISTICA'].includes(role) && ['productos', 'categorias', 'almacenes'].includes(section.id)
  const canEdit = role === 'ADMIN' && ['usuarios', 'clientes'].includes(section.id)
  const hasRowActions = canManage || canEdit || ['pedidos', 'logistica', 'historial-delivery', 'chats'].includes(section.id)
  const canCreate = canManage || (role === 'ADMIN' && ['usuarios', 'clientes'].includes(section.id))
  const endpoint = section.id === 'chats' && chatType === 'interno'
    ? '/v1/chats/interno'
    : section.id === 'movimientos' && movementView === 'traslados'
      ? '/v1/inventario/traslados/en-transito'
      : section.id === 'historial-delivery' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)
        ? '/v1/pedidos'
        : section.endpoint
  const canOperateLogistics = ['pedidos', 'logistica'].includes(section.id) && ['ADMIN', 'JEFE_LOGISTICA', 'LOGISTICA'].includes(role)
  const canUpdateDeliveryOrder = section.id === 'pedidos' && role === 'DELIVERY'
  const canReadDeliveryHistory = section.id === 'historial-delivery' && (role === 'DELIVERY' || role === 'JEFE_LOGISTICA' || role === 'ADMIN')
  const canReadOrderStatusHistory = ['ADMIN', 'JEFE_LOGISTICA', 'LOGISTICA'].includes(role) || canUpdateDeliveryOrder || canReadDeliveryHistory
  const canFilterAllOrderHistory = section.id === 'historial-delivery' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    setRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!endpoint) return
    let current = true
    getJson<unknown>(token, endpoint)
      .then((payload) => { if (current) setRows(toRecords(payload)) })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la información.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [endpoint, token, revision])

  useEffect(() => {
    if (!['productos', 'almacenes', 'usuarios'].includes(section.id)) return
    let current = true
    const lookups = section.id === 'productos'
      ? [getJson<unknown>(token, '/v1/catalogo/categorias').then((payload) => {
        if (current) setCategories(toRecords(payload))
      })]
      : getJson<unknown>(token, '/v1/sucursales').then((payload) => {
        if (current) setBranches(toRecords(payload))
      })
    const lookupPromises = Array.isArray(lookups) ? lookups : [lookups]
    if (section.id === 'usuarios') {
      lookupPromises.push(
        getJson<unknown>(token, '/v1/roles').then((payload) => {
          if (current) setRoles(toRecords(payload))
        }),
      )
    }
    Promise.all(lookupPromises)
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos relacionados.')
      })
    return () => { current = false }
  }, [section.id, token, revision])

  useEffect(() => {
    if (section.id !== 'inventario' && !(section.id === 'movimientos' && movementView === 'traslados')) return
    let current = true
    const requests = [
      getJson<unknown>(token, '/v1/inventario/stock-disponible')
        .then((payload) => { if (current) setStockRows(toRecords(payload)) }),
      getJson<unknown>(token, '/v1/inventario/almacenes')
        .then((payload) => { if (current) setInventoryWarehouses(toRecords(payload)) }),
    ]
    if (section.id === 'inventario' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)) {
      requests.push(
        getJson<unknown>(token, '/v1/catalogo/productos')
          .then((payload) => { if (current) setInventoryProducts(toRecords(payload)) }),
      )
    }
    Promise.all(requests)
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos de inventario.')
      })
    return () => { current = false }
  }, [section.id, movementView, role, token, revision])

  useEffect(() => {
    if (section.id !== 'logistica' && !(['pedidos'].includes(section.id) && ['ADMIN', 'JEFE_LOGISTICA', 'LOGISTICA'].includes(role))) return
    let current = true
    getJson<unknown>(token, '/v1/pedidos/deliveries')
      .then((payload) => { if (current) setDeliveries(toRecords(payload)) })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los deliveries activos.')
      })
    return () => { current = false }
  }, [section.id, role, token, revision])

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return rows.filter((row) => {
      const delivery = isRecord(row.datosEntrega) ? row.datosEntrega : {}
      const matchesQuery = !normalized || JSON.stringify(row).toLocaleLowerCase().includes(normalized)
      const matchesDepartment = !logisticsDepartment || delivery.departamento === logisticsDepartment
      const matchesProvince = !logisticsProvince || delivery.provincia === logisticsProvince
      const matchesDistrict = !logisticsDistrict || delivery.distrito === logisticsDistrict
      const matchesStatus = !logisticsStatus || row.estadoCodigo === logisticsStatus
      const orderDate = dateInputValue(row.createdAt)
      const matchesHistoryStatus = !canFilterAllOrderHistory || !historyStatus || row.estadoCodigo === historyStatus
      const matchesHistoryDateFrom = !canFilterAllOrderHistory || !historyDateFrom || (orderDate !== '' && orderDate >= historyDateFrom)
      const matchesHistoryDateTo = !canFilterAllOrderHistory || !historyDateTo || (orderDate !== '' && orderDate <= historyDateTo)
      return matchesQuery && matchesDepartment && matchesProvince && matchesDistrict && matchesStatus
        && matchesHistoryStatus && matchesHistoryDateFrom && matchesHistoryDateTo
    })
  }, [rows, query, logisticsDepartment, logisticsProvince, logisticsDistrict, logisticsStatus, canFilterAllOrderHistory, historyStatus, historyDateFrom, historyDateTo])
  const logisticsDepartments = useMemo(() => distinctLocationValues(rows, 'departamento'), [rows])
  const logisticsProvinces = useMemo(() => distinctLocationValues(rows, 'provincia', 'departamento', logisticsDepartment), [rows, logisticsDepartment])
  const logisticsDistricts = useMemo(() => distinctLocationValues(
    rows,
    'distrito',
    'provincia',
    logisticsProvince,
    'departamento',
    logisticsDepartment,
  ), [rows, logisticsProvince, logisticsDepartment])
  const orderStatusOptions = useMemo(() => [...new Set(rows.map((row) => String(row.estadoCodigo ?? '')).filter(Boolean))].sort(), [rows])
  const activeInventoryProducts = inventoryProducts.filter((product) => typeof product.id === 'string' && product.activo !== false)
  const activeInventoryWarehouses = inventoryWarehouses.filter((warehouse) => typeof warehouse.id === 'string' && warehouse.activo !== false)
  const availableTransferProducts = stockRows.filter((row) =>
    row.almacenId === transferOriginId
    && typeof row.productoId === 'string'
    && Number(row.stockDisponible) > 0,
  )
  const selectedTransferProduct = availableTransferProducts.find((row) => row.productoId === transferProductId)

  function updateStaffCodeFromIdentity(event: ChangeEvent<HTMLInputElement>) {
    const form = event.currentTarget.form
    if (!form) return
    const fieldValue = (name: string) => {
      const field = form.elements.namedItem(name)
      return field instanceof HTMLInputElement ? field.value : ''
    }
    setStaffCode(generateStaffCode(
      fieldValue('nombres'),
      fieldValue('apellidos'),
      fieldValue('numeroDocumento'),
    ))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!section.endpoint) return
    setSaving(true)
    setError(null)
    setFormError(null)
    try {
      const form = new FormData(event.currentTarget)
      let body: Record<string, unknown>
      if (section.id === 'categorias') {
        body = {
          codigo: String(form.get('codigo') ?? '').trim(),
          nombre: String(form.get('nombre') ?? '').trim(),
          descripcion: String(form.get('descripcion') ?? '').trim() || null,
          activo: form.get('activo') === 'on',
        }
      } else if (section.id === 'productos') {
        body = {
          codigo: String(form.get('codigo') ?? '').trim(),
          categoriaId: String(form.get('categoriaId') ?? ''),
          nombre: String(form.get('nombre') ?? '').trim(),
          descripcion: String(form.get('descripcion') ?? '').trim() || null,
          especificaciones: parseSpecifications(String(form.get('especificaciones') ?? '[]')),
          precio: Number(form.get('precio')),
          descuentoPorcentaje: form.get('descuentoPorcentaje') ? Number(form.get('descuentoPorcentaje')) : null,
          activo: form.get('activo') === 'on',
        }
      } else if (section.id === 'almacenes') {
        body = {
          nombre: String(form.get('nombre') ?? '').trim(),
          sucursalId: String(form.get('sucursalId') ?? ''),
          activo: form.get('activo') === 'on',
        }
      } else if (section.id === 'usuarios') {
        body = {
          codigo: String(form.get('codigo') ?? '').trim(),
          rolId: String(form.get('rolId') ?? ''),
          sucursalId: String(form.get('sucursalId') ?? '') || null,
          tipoDocumento: String(form.get('tipoDocumento') ?? ''),
          numeroDocumento: String(form.get('numeroDocumento') ?? '').trim(),
          nombres: String(form.get('nombres') ?? '').trim(),
          apellidos: String(form.get('apellidos') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          ...(String(form.get('password') ?? '').trim() ? { password: String(form.get('password')).trim() } : {}),
          telefono: String(form.get('telefono') ?? '').trim() || null,
          activo: form.get('activo') === 'on',
        }
      } else if (section.id === 'clientes') {
        body = {
          tipoDocumento: String(form.get('tipoDocumento') ?? ''),
          numeroDocumento: String(form.get('numeroDocumento') ?? '').trim(),
          nombres: String(form.get('nombres') ?? '').trim(),
          apellidos: String(form.get('apellidos') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          ...(String(form.get('password') ?? '').trim() ? { password: String(form.get('password')).trim() } : {}),
          telefono: String(form.get('telefono') ?? '').trim(),
          departamento: String(form.get('departamento') ?? '').trim(),
          provincia: String(form.get('provincia') ?? '').trim(),
          distrito: String(form.get('distrito') ?? '').trim(),
          direccion: String(form.get('direccion') ?? '').trim(),
          codigoPostal: String(form.get('codigoPostal') ?? '').trim(),
          referencia: String(form.get('referencia') ?? '').trim(),
          idUbigeo: String(form.get('idUbigeo') ?? '').trim(),
          activo: form.get('activo') === 'on',
        }
      } else {
        body = {
          nombre: String(form.get('nombre') ?? '').trim(),
          departamento: String(form.get('departamento') ?? '').trim(),
          provincia: String(form.get('provincia') ?? '').trim(),
          distrito: String(form.get('distrito') ?? '').trim(),
          direccion: String(form.get('direccion') ?? '').trim(),
          referencia: String(form.get('referencia') ?? '').trim() || null,
          codigoPostal: String(form.get('codigoPostal') ?? '').trim() || null,
          idUbigeo: String(form.get('idUbigeo') ?? '').trim() || null,
          activo: form.get('activo') === 'on',
        }
      }
      const id = editing?.id
      const saved = await sendJson<unknown, Record<string, unknown>>(
        token,
        id ? `${section.endpoint}/${encodeURIComponent(String(id))}` : section.endpoint,
        id ? 'PUT' : 'POST',
        body,
      )
      if (section.id === 'productos' && !id) {
        const selectedImages = form.getAll('imagenes').filter((value): value is File => value instanceof File && value.size > 0)
        const invalidImage = selectedImages.find((file) => file.size > 10 * 1024 * 1024 || !/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type))
        if (invalidImage) {
          setCreating(false)
          refresh()
          setError(`El producto se creó, pero "${invalidImage.name}" no es un formato permitido o supera 10 MB. Agrégala desde Galería de imágenes.`)
          return
        }
        if (selectedImages.length > 0) {
          if (!isRecord(saved) || typeof saved.id !== 'string') {
            setCreating(false)
            refresh()
            setError('El producto se creó, pero la API no devolvió su identificador para asociar las imágenes.')
            return
          }
          const uploadErrors: string[] = []
          for (const [index, image] of selectedImages.entries()) {
            const upload = new FormData()
            upload.set('archivo', image)
            upload.set('orden', String(index))
            upload.set('esPrincipal', String(index === 0))
            try {
              await sendFormData<unknown>(
                token,
                `/v1/catalogo/productos/${encodeURIComponent(saved.id)}/galeria/archivo`,
                'POST',
                upload,
              )
            } catch (cause) {
              uploadErrors.push(`${image.name}: ${cause instanceof Error ? cause.message : 'error de carga'}`)
            }
          }
          if (uploadErrors.length > 0) {
            setCreating(false)
            setEditing(null)
            refresh()
            setError(`El producto se creó, pero algunas imágenes no se cargaron: ${uploadErrors.join(' · ')}. Puedes reintentarlo en Galería de imágenes.`)
            return
          }
        }
      }
      setCreating(false)
      setEditing(null)
      refresh()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo guardar el registro.'
      setError(message)
      setFormError(message)
    } finally {
      setSaving(false)
    }
  }

  async function saveInventoryOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inventoryOperation) return
    setSaving(true)
    setError(null)
    try {
      const form = new FormData(event.currentTarget)
      const selection = inventoryOperation === 'entrada' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)
        ? {
            almacenId: String(form.get('almacenId') ?? ''),
            productoId: String(form.get('productoId') ?? ''),
          }
        : JSON.parse(String(form.get('stockSelection'))) as { almacenId: string; productoId: string }
      const observation = String(form.get('observacion') ?? '').trim() || null
      if (inventoryOperation === 'entrada') {
        await sendJson<unknown, Record<string, unknown>>(token, '/v1/inventario/entradas', 'POST', {
          ...selection,
          cantidad: Number(form.get('cantidad')),
          observacion: observation,
        })
      } else {
        await sendJson<unknown, Record<string, unknown>>(token, '/v1/inventario/ajustes', 'POST', {
          ...selection,
          nuevoStock: Number(form.get('nuevoStock')),
          motivo: String(form.get('motivo')),
          observacion: observation,
        })
      }
      setInventoryOperation(null)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la operación de inventario.')
    } finally {
      setSaving(false)
    }
  }

  async function saveTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const form = new FormData(event.currentTarget)
      await sendJson<unknown, Record<string, unknown>>(token, '/v1/inventario/traslados', 'POST', {
        almacenOrigenId: String(form.get('almacenOrigenId') ?? ''),
        almacenDestinoId: String(form.get('almacenDestinoId') ?? ''),
        productoId: String(form.get('productoId') ?? ''),
        cantidad: Number(form.get('cantidad')),
        tipoTraslado: 'REABASTECIMIENTO',
        pedidoId: null,
        detallePedidoId: null,
        observacion: String(form.get('observacion') ?? '').trim() || null,
      })
      setTransferOpen(false)
      setTransferOriginId('')
      setTransferProductId('')
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el traslado.')
    } finally {
      setSaving(false)
    }
  }

  async function openOrder(row: Record<string, unknown>) {
    setSelectedOrder(row)
    setOrderTransitions([])
    setOrderStatusHistory([])
    setNextOrderStatus('')
    setSelectedDelivery(typeof row.deliveryId === 'string' ? row.deliveryId : '')
    if (typeof row.id !== 'string') return
    const orderId = encodeURIComponent(row.id)
    if (canOperateLogistics || canUpdateDeliveryOrder) {
      try {
        const options = await getJson<unknown>(token, `/v1/pedidos/${orderId}/transiciones`)
        const codes = Array.isArray(options) ? options.filter((code): code is string => typeof code === 'string') : []
        setOrderTransitions(codes)
        setNextOrderStatus(codes[0] ?? '')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los cambios de estado permitidos.')
      }
    }
    if (canReadOrderStatusHistory) {
      setOrderHistoryLoading(true)
      try {
        const history = await getJson<unknown>(token, `/v1/pedidos/${orderId}/historial-estados`)
        setOrderStatusHistory(toRecords(history))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial de estados.')
      } finally {
        setOrderHistoryLoading(false)
      }
    }
  }

  async function changeOrderStatus() {
    if (!selectedOrder || typeof selectedOrder.id !== 'string' || !nextOrderStatus) return
    setSaving(true)
    setError(null)
    try {
      const updated = await sendJson<unknown, { estadoCodigo: string }>(
        token,
        `/v1/pedidos/${encodeURIComponent(selectedOrder.id)}/estado`,
        'PATCH',
        { estadoCodigo: nextOrderStatus },
      )
      if (isRecord(updated)) {
        setSelectedOrder(updated)
        setOrderTransitions([])
        setNextOrderStatus('')
        const options = await getJson<unknown>(token, `/v1/pedidos/${encodeURIComponent(selectedOrder.id)}/transiciones`)
        const codes = Array.isArray(options) ? options.filter((code): code is string => typeof code === 'string') : []
        setOrderTransitions(codes)
        setNextOrderStatus(codes[0] ?? '')
        const history = await getJson<unknown>(
          token,
          `/v1/pedidos/${encodeURIComponent(selectedOrder.id)}/historial-estados`,
        )
        setOrderStatusHistory(toRecords(history))
      }
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado del pedido.')
    } finally {
      setSaving(false)
    }
  }

  async function assignOrderDelivery() {
    if (!selectedOrder || typeof selectedOrder.id !== 'string' || !selectedDelivery) return
    setSaving(true)
    setError(null)
    try {
      const updated = await sendJson<unknown, { usuarioId: string }>(
        token,
        `/v1/pedidos/${encodeURIComponent(selectedOrder.id)}/delivery`,
        'PUT',
        { usuarioId: selectedDelivery },
      )
      if (isRecord(updated)) setSelectedOrder(updated)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo asignar el delivery.')
    } finally {
      setSaving(false)
    }
  }

  async function approveSolicitudEntrada(id: string) {
    setSaving(true)
    setError(null)
    try {
      await sendJson<unknown, Record<string, never>>(token, `/v1/inventario/solicitudes-entradas/${encodeURIComponent(id)}/aprobar`, 'POST', {})
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aprobar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  async function rejectSolicitudEntrada(id: string) {
    setSaving(true)
    setError(null)
    try {
      await sendJson<unknown, Record<string, never>>(token, `/v1/inventario/solicitudes-entradas/${encodeURIComponent(id)}/rechazar`, 'POST', {})
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo rechazar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(row: Record<string, unknown>) {
    if (!section.endpoint || typeof row.id !== 'string') return
    if (!window.confirm(`¿Desactivar "${String(row.nombre ?? row.codigo ?? 'este registro')}"?`)) return
    setError(null)
    try {
      await deleteResource(token, `${section.endpoint}/${encodeURIComponent(row.id)}`)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo desactivar el registro.')
    }
  }

  async function openChat(row: Record<string, unknown>) {
    if (typeof row.id !== 'string') {
      setError('No se puede abrir la conversación porque no tiene un identificador válido.')
      return
    }
    setSelectedChat(row)
    setMessagesLoading(true)
    setMessagesError(null)
    try {
      const response = await getJson<unknown>(token, `/v1/chats/${chatType}/${encodeURIComponent(row.id)}/mensajes`)
      setChatMessages(toRecords(response))
    } catch (cause) {
      setMessagesError(cause instanceof Error ? cause.message : 'No se pudieron cargar los mensajes.')
    } finally {
      setMessagesLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{section.label}</h1>
          <p className="mt-2 text-sm text-slate-500">{section.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {section.id === 'reportes' && <ReportExports token={token} />}
          {section.id === 'chats' && (
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              {(['soporte', 'interno'] as const).map((type) => (
                <button key={type} type="button" onClick={() => { setChatType(type); setLoading(true) }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${chatType === type ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {type === 'soporte' ? 'Soporte' : 'Internos'}
                </button>
              ))}
            </div>
          )}
          {section.id === 'movimientos' && (
            <>
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                {(['movimientos', 'traslados'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => {
                      setLoading(true)
                      setError(null)
                      setMovementView(view)
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${movementView === view ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {view === 'movimientos' ? 'Historial' : 'Traslados'}
                  </button>
                ))}
              </div>
              {movementView === 'traslados' && role !== 'DELIVERY' && (
                <button
                  type="button"
                  onClick={() => { setTransferOriginId(''); setTransferProductId(''); setTransferOpen(true) }}
                  className="rounded-xl bg-emerald-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  Registrar traslado
                </button>
              )}
            </>
          )}
          {section.id === 'inventario' && role !== 'DELIVERY' && (
            <>
              <button type="button" onClick={() => setInventoryOperation('entrada')} className="rounded-xl bg-emerald-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Registrar entrada</button>
              {['ADMIN', 'JEFE_LOGISTICA'].includes(role) && <button type="button" onClick={() => setInventoryOperation('ajuste')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ajustar stock</button>}
            </>
          )}
          {section.endpoint && (
            <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => { setEditing(null); setStaffCode(''); setFormError(null); setCreating(true) }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
            >
              <FilePlus2 size={16} /> Nuevo
            </button>
          )}
        </div>
      </div>

      {section.unsupportedMessage && (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div><p className="font-semibold">Función no disponible en la API</p><p className="mt-1 leading-6">{section.unsupportedMessage}</p></div>
        </div>
      )}

      {section.id === 'logistica' && (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">Departamento
            <select
              value={logisticsDepartment}
              onChange={(event) => {
                setLogisticsDepartment(event.currentTarget.value)
                setLogisticsProvince('')
                setLogisticsDistrict('')
              }}
              className={inputClass}
            >
              <option value="">Todos los departamentos</option>
              {logisticsDepartments.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Provincia
            <select
              value={logisticsProvince}
              onChange={(event) => {
                setLogisticsProvince(event.currentTarget.value)
                setLogisticsDistrict('')
              }}
              disabled={!logisticsDepartment}
              className={inputClass}
            >
              <option value="">Todas las provincias</option>
              {logisticsProvinces.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Distrito
            <select
              value={logisticsDistrict}
              onChange={(event) => setLogisticsDistrict(event.currentTarget.value)}
              disabled={!logisticsProvince}
              className={inputClass}
            >
              <option value="">Todos los distritos</option>
              {logisticsDistricts.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Estado del pedido
            <select value={logisticsStatus} onChange={(event) => setLogisticsStatus(event.currentTarget.value)} className={inputClass}>
              <option value="">Todos los estados operativos</option>
              {orderStatusOptions.map((code) => <option key={code} value={code}>{orderStatusLabel(code)}</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">
            Los pedidos del mismo destino pueden agruparse para planificar las rutas. La bandeja incluye preparación, despacho, ruta y entregas no realizadas.
          </p>
        </section>
      )}

      {canFilterAllOrderHistory && (
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Estado del pedido
            <select value={historyStatus} onChange={(event) => setHistoryStatus(event.currentTarget.value)} className={inputClass}>
              <option value="">Todos los estados</option>
              {orderStatusOptions.map((code) => <option key={code} value={code}>{orderStatusLabel(code)}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Desde
            <input type="date" value={historyDateFrom} max={historyDateTo || undefined} onChange={(event) => setHistoryDateFrom(event.currentTarget.value)} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Hasta
            <input type="date" value={historyDateTo} min={historyDateFrom || undefined} onChange={(event) => setHistoryDateTo(event.currentTarget.value)} className={inputClass} />
          </label>
          <button
            type="button"
            onClick={() => { setQuery(''); setHistoryStatus(''); setHistoryDateFrom(''); setHistoryDateTo('') }}
            className="self-end rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {section.endpoint && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5">
            <div className="text-sm text-slate-500">{loading ? 'Cargando registros…' : `${visibleRows.length} registros`}</div>
            <label className="relative block w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={canFilterAllOrderHistory ? 'Buscar código, delivery o destino…' : `Buscar ${section.label.toLocaleLowerCase()}…`} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-700 focus:bg-white" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columnLabels(section.id, movementView).map((column) => <th key={column.key} className="px-5 py-3 font-semibold">{column.label}</th>)}
                  {hasRowActions && <th className="px-5 py-3 text-right font-semibold">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row, index) => (
                  <tr key={String(row.id ?? row.codigo ?? index)} className="text-slate-600 hover:bg-slate-50/60">
                    {columnLabels(section.id, movementView).map((column) => (
                      <td key={column.key} className="max-w-[260px] px-5 py-4">
                        {column.key === 'activo' || column.key === 'estado' || column.key === 'estadoPedido' || column.key === 'estadoNombre'
                          ? <StatusPill value={displayValue(row[column.key])} />
                          : <span className={column.key === 'nombre' || column.key === 'numero' ? 'font-semibold text-slate-900' : ''}>
                              {column.key === 'destino' && isRecord(row.datosEntrega)
                                ? logisticsDestination(row.datosEntrega)
                                : column.key === 'deliveryNombre'
                                  ? displayValue(row.deliveryNombre)
                                  : column.key === 'rolCodigo'
                                ? displayValue(roles.find((item) => item.codigo === row.rolCodigo)?.nombre ?? row.rolCodigo)
                                : displayValue(row[column.key])}
                            </span>}
                      </td>
                    ))}
                    {(canManage || canEdit) && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label="Editar" onClick={() => { setEditing(row); setStaffCode(String(row.codigo ?? '')); setFormError(null); setCreating(true) }} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"><Pencil size={16} /></button>
                          {canDeactivate && <button type="button" aria-label="Desactivar" onClick={() => void deactivate(row)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    )}
                    {(['pedidos', 'logistica', 'historial-delivery'].includes(section.id)) && (
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => void openOrder(row)} className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Ver pedido</button>
                      </td>
                    )}
                    {section.id === 'chats' && (
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => void openChat(row)} className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Ver mensajes</button>
                      </td>
                    )}
                    {section.id === 'solicitudes-entradas' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role) && row.estado === 'PENDIENTE' && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => void approveSolicitudEntrada(String(row.id))} className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">Aprobar</button>
                          <button type="button" onClick={() => void rejectSolicitudEntrada(String(row.id))} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Rechazar</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!loading && visibleRows.length === 0 && (
                  <tr><td colSpan={columnLabels(section.id, movementView).length + (hasRowActions ? 1 : 0)} className="px-5 py-12 text-center text-slate-500">{error ? 'No se pudieron obtener los registros.' : 'No se encontraron registros.'}</td></tr>
                )}
                {loading && <tr><td colSpan={columnLabels(section.id, movementView).length + (hasRowActions ? 1 : 0)} className="px-5 py-12 text-center text-slate-500">Cargando información…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreating(false); setEditing(null) } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="resource-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="resource-form-title" className="text-lg font-bold text-slate-900">{editing ? 'Editar' : 'Crear'} {formEntity(section.id)}</h2>
            <form onSubmit={(event) => void save(event)} onInput={() => setFormError(null)} className="mt-5 space-y-4">
              {['productos', 'categorias'].includes(section.id) && (
                <FormField label="Código" name="codigo" required defaultValue={editing?.codigo} maxLength={section.id === 'productos' ? 30 : 20} />
              )}
              {section.id === 'usuarios' && (
                <label className="block text-sm font-medium text-slate-700">Código de personal
                  <input
                    name="codigo"
                    value={staffCode}
                    onChange={(event) => setStaffCode(event.currentTarget.value.toLocaleUpperCase())}
                    maxLength={editing ? 20 : 8}
                    required
                    className={inputClass}
                  />
                </label>
              )}
              {section.id === 'productos' && (
                <>
                  <label className="block text-sm font-medium text-slate-700">Categoría
                    <select name="categoriaId" required defaultValue={String(editing?.categoriaId ?? '')} className={inputClass}>
                      <option value="">Selecciona una categoría</option>
                      {categories.filter((category) => category.activo !== false).map((category) => <option key={String(category.id)} value={String(category.id)}>{String(category.nombre ?? category.codigo)}</option>)}
                    </select>
                  </label>
                  <FormField label="Nombre" name="nombre" required defaultValue={editing?.nombre} />
                  <FormField label="Precio (S/)" name="precio" type="number" min="0" step="0.01" required defaultValue={editing?.precio} />
                  <FormField label="Descuento (%)" name="descuentoPorcentaje" type="number" min="0" max="100" step="0.01" defaultValue={editing?.descuentoPorcentaje} />
                  <label className="block text-sm font-medium text-slate-700">Descripción<textarea name="descripcion" rows={3} defaultValue={String(editing?.descripcion ?? '')} className={inputClass} /></label>
                  <ProductSpecificationsEditor
                    key={String(editing?.id ?? 'new-product')}
                    initialValue={editing?.especificaciones}
                  />
                  {!editing && (
                    <label className="block text-sm font-medium text-slate-700">Imágenes del producto (opcional)
                      <input name="imagenes" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className={inputClass} />
                      <span className="mt-1 block text-xs font-normal text-slate-500">Se subirán a Cloudinary en `ceramax/categoría/producto`. La primera imagen será la principal. Máximo 10 MB por imagen.</span>
                    </label>
                  )}
                </>
              )}
              {section.id === 'categorias' && (
                <>
                  <FormField label="Nombre" name="nombre" required defaultValue={editing?.nombre} />
                  <label className="block text-sm font-medium text-slate-700">Descripción<textarea name="descripcion" rows={3} defaultValue={String(editing?.descripcion ?? '')} className={inputClass} /></label>
                </>
              )}
              {section.id === 'almacenes' && (
                <>
                  <FormField label="Nombre" name="nombre" required defaultValue={editing?.nombre} />
                  <label className="block text-sm font-medium text-slate-700">Sucursal
                    <select name="sucursalId" required defaultValue={String(editing?.sucursalId ?? '')} className={inputClass}>
                      <option value="">Selecciona una sucursal</option>
                      {branches.filter((branch) => branch.activo !== false).map((branch) => <option key={String(branch.id)} value={String(branch.id)}>{String(branch.nombre)}</option>)}
                    </select>
                  </label>
                </>
              )}
              {section.id === 'sucursales' && (
                <>
                  <FormField label="Nombre" name="nombre" required defaultValue={editing?.nombre} />
                  <FormField label="Departamento" name="departamento" required defaultValue={editing?.departamento} />
                  <FormField label="Provincia" name="provincia" required defaultValue={editing?.provincia} />
                  <FormField label="Distrito" name="distrito" required defaultValue={editing?.distrito} />
                  <FormField label="Dirección" name="direccion" required defaultValue={editing?.direccion} />
                  <FormField label="Referencia" name="referencia" defaultValue={editing?.referencia} />
                  <FormField label="Código postal" name="codigoPostal" defaultValue={editing?.codigoPostal} />
                  <FormField label="Código de ubigeo" name="idUbigeo" defaultValue={editing?.idUbigeo} />
                </>
              )}
              {section.id === 'usuarios' && (
                <>
                  <label className="block text-sm font-medium text-slate-700">Rol
                    <select name="rolId" required defaultValue={String(editing?.rolId ?? '')} className={inputClass}>
                      <option value="">Selecciona un rol</option>
                      {roles.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.nombre ?? item.codigo)}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Sucursal
                    <select name="sucursalId" defaultValue="" className={inputClass}>
                      <option value="">Sin sucursal asignada</option>
                      {branches.filter((branch) => branch.activo !== false).map((branch) => <option key={String(branch.id)} value={String(branch.id)}>{String(branch.nombre)}</option>)}
                    </select>
                  </label>
                  <FormField label="Nombres" name="nombres" required defaultValue={editing?.nombres} onChange={updateStaffCodeFromIdentity} />
                  <FormField label="Apellidos" name="apellidos" required defaultValue={editing?.apellidos} onChange={updateStaffCodeFromIdentity} />
                  <label className="block text-sm font-medium text-slate-700">Tipo de documento
                    <select name="tipoDocumento" required defaultValue={String(editing?.tipoDocumento ?? 'DNI')} className={inputClass}>
                      {['DNI', 'RUC', 'CE', 'PASAPORTE'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <FormField label="Número de documento" name="numeroDocumento" required defaultValue={editing?.numeroDocumento} maxLength={20} onChange={updateStaffCodeFromIdentity} />
                  <FormField label="Correo electrónico" name="email" type="email" required defaultValue={editing?.email} />
                  <FormField label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'} name="password" type="password" required={!editing} defaultValue="" />
                  <FormField label="Teléfono" name="telefono" defaultValue={editing?.telefono} />
                </>
              )}
              {section.id === 'clientes' && (
                <>
                  <label className="block text-sm font-medium text-slate-700">Tipo de documento
                    <select name="tipoDocumento" required defaultValue={String(editing?.tipoDocumento ?? 'DNI')} className={inputClass}>
                      {['DNI', 'RUC', 'CE', 'PASAPORTE'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <FormField label="Número de documento" name="numeroDocumento" required defaultValue={editing?.numeroDocumento} />
                  <FormField label="Nombres" name="nombres" required defaultValue={editing?.nombres} />
                  <FormField label="Apellidos" name="apellidos" required defaultValue={editing?.apellidos} />
                  <FormField label="Correo electrónico" name="email" type="email" required defaultValue={editing?.email} />
                  <FormField label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña temporal'} name="password" type="password" required={!editing} defaultValue="" />
                  <FormField label="Teléfono" name="telefono" required defaultValue={editing?.telefono} />
                  <FormField label="Departamento" name="departamento" required defaultValue={editing?.departamento} />
                  <FormField label="Provincia" name="provincia" required defaultValue={editing?.provincia} />
                  <FormField label="Distrito" name="distrito" required defaultValue={editing?.distrito} />
                  <FormField label="Dirección" name="direccion" required defaultValue={editing?.direccion} />
                  <FormField label="Código postal" name="codigoPostal" required defaultValue={editing?.codigoPostal} />
                  <FormField label="Referencia" name="referencia" required defaultValue={editing?.referencia} />
                  <FormField label="Código UBIGEO (6 dígitos)" name="idUbigeo" required defaultValue={editing?.idUbigeo} />
                </>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="activo" defaultChecked={editing?.activo !== false} className="size-4 accent-emerald-800" /> Activo</label>
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setCreating(false); setEditing(null); setFormError(null) }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {inventoryOperation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInventoryOperation(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="inventory-form-title" className="text-lg font-bold text-slate-900">{inventoryOperation === 'entrada' ? 'Registrar entrada de inventario' : 'Ajustar inventario'}</h2>
            <p className="mt-1 text-sm text-slate-500">{inventoryOperation === 'entrada' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role) ? 'La primera entrada crea la asignación del producto al almacén; las siguientes entradas suman stock.' : 'La operación se registra en el inventario del almacén seleccionado.'}</p>
            <form onSubmit={(event) => void saveInventoryOperation(event)} className="mt-5 space-y-4">
              {inventoryOperation === 'entrada' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)
                ? <>
                    <label className="block text-sm font-medium text-slate-700">Producto
                      <select name="productoId" required className={inputClass} defaultValue="">
                        <option value="">Selecciona un producto activo</option>
                        {activeInventoryProducts.map((product) => (
                          <option key={String(product.id)} value={String(product.id)}>{String(product.nombre ?? product.codigo ?? 'Producto')}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">Almacén
                      <select name="almacenId" required className={inputClass} defaultValue="">
                        <option value="">Selecciona un almacén activo</option>
                        {activeInventoryWarehouses.map((warehouse) => (
                          <option key={String(warehouse.id)} value={String(warehouse.id)}>{String(warehouse.nombre ?? warehouse.codigo ?? 'Almacén')}</option>
                        ))}
                      </select>
                    </label>
                  </>
                : <label className="block text-sm font-medium text-slate-700">Producto y almacén
                    <select name="stockSelection" required className={inputClass} defaultValue="">
                      <option value="">Selecciona un producto y almacén</option>
                      {stockOptions(stockRows).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </label>}
              {inventoryOperation === 'entrada'
                ? <FormField label="Cantidad que ingresa" name="cantidad" type="number" min="1" step="1" required defaultValue="" />
                : <>
                    <FormField label="Nuevo stock físico" name="nuevoStock" type="number" min="0" step="1" required defaultValue="" />
                    <label className="block text-sm font-medium text-slate-700">Motivo
                      <select name="motivo" required className={inputClass}>
                        {['MERMA', 'ROBO', 'INVENTARIO_FISICO', 'CORRECCION', 'REPOSICION_AUTORIZADA', 'OTRO'].map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}
                      </select>
                    </label>
                  </>}
              <label className="block text-sm font-medium text-slate-700">Observación<textarea name="observacion" rows={2} maxLength={300} className={inputClass} /></label>
              {inventoryOperation === 'entrada' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role)
                ? (activeInventoryProducts.length === 0 || activeInventoryWarehouses.length === 0) && <p role="alert" className="text-sm text-amber-800">Se necesitan productos y almacenes activos para registrar una entrada.</p>
                : stockOptions(stockRows).length === 0 && <p role="alert" className="text-sm text-amber-800">No hay productos asociados a un almacén para seleccionar.</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setInventoryOperation(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving || (inventoryOperation === 'entrada' && ['ADMIN', 'JEFE_LOGISTICA'].includes(role) ? activeInventoryProducts.length === 0 || activeInventoryWarehouses.length === 0 : stockOptions(stockRows).length === 0)} className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Confirmar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {transferOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTransferOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="transfer-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="transfer-form-title" className="text-lg font-bold text-slate-900">Registrar traslado entre almacenes</h2>
            <p className="mt-1 text-sm text-slate-500">Elige un producto con stock disponible en el almacén de origen y el almacén que lo recibirá.</p>
            <form onSubmit={(event) => void saveTransfer(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Almacén de origen
                <select
                  name="almacenOrigenId"
                  required
                  value={transferOriginId}
                  onChange={(event) => { setTransferOriginId(event.currentTarget.value); setTransferProductId('') }}
                  className={inputClass}
                >
                  <option value="">Selecciona el almacén de origen</option>
                  {activeInventoryWarehouses.map((warehouse) => (
                    <option key={String(warehouse.id)} value={String(warehouse.id)}>{String(warehouse.nombre ?? warehouse.codigo ?? 'Almacén')}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Almacén de destino
                <select name="almacenDestinoId" required className={inputClass} defaultValue="">
                  <option value="">Selecciona el almacén de destino</option>
                  {activeInventoryWarehouses.filter((warehouse) => warehouse.id !== transferOriginId).map((warehouse) => (
                    <option key={String(warehouse.id)} value={String(warehouse.id)}>{String(warehouse.nombre ?? warehouse.codigo ?? 'Almacén')}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Producto disponible
                <select name="productoId" required className={inputClass} value={transferProductId} onChange={(event) => setTransferProductId(event.currentTarget.value)}>
                  <option value="">Selecciona un producto</option>
                  {availableTransferProducts.map((row) => (
                    <option key={String(row.productoId)} value={String(row.productoId)}>
                      {String(row.productoNombre ?? row.productoCodigo ?? 'Producto')} · disponible: {String(row.stockDisponible)}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                label="Cantidad"
                name="cantidad"
                type="number"
                min="1"
                max={selectedTransferProduct ? String(selectedTransferProduct.stockDisponible) : undefined}
                step="1"
                required
                defaultValue=""
              />
              <label className="block text-sm font-medium text-slate-700">Observación<textarea name="observacion" rows={2} maxLength={250} className={inputClass} /></label>
              {activeInventoryWarehouses.length < 2 && <p role="alert" className="text-sm text-amber-800">Se necesitan al menos dos almacenes activos para trasladar stock.</p>}
              {transferOriginId && availableTransferProducts.length === 0 && <p role="alert" className="text-sm text-amber-800">El almacén seleccionado no tiene productos con stock disponible.</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setTransferOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving || activeInventoryWarehouses.length < 2 || availableTransferProducts.length === 0} className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Confirmar traslado'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Detalle del pedido</p>
                <h2 id="order-detail-title" className="mt-1 text-xl font-bold text-slate-900">#{String(selectedOrder.codigo ?? selectedOrder.id ?? '')}</h2>
              </div>
              <StatusPill value={String(selectedOrder.estadoNombre ?? selectedOrder.estadoCodigo ?? 'Pendiente')} />
            </div>
            <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <p><span className="text-slate-500">Canal</span><br /><strong className="mt-1 block text-slate-800">{displayValue(selectedOrder.canal)}</strong></p>
              <p><span className="text-slate-500">Entrega</span><br /><strong className="mt-1 block text-slate-800">{displayValue(selectedOrder.tipoEntrega)}</strong></p>
              <p><span className="text-slate-500">Fecha</span><br /><strong className="mt-1 block text-slate-800">{displayValue(selectedOrder.createdAt)}</strong></p>
            </div>
            {isRecord(selectedOrder.datosEntrega) && (
              <section className="mt-4 rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">Destino y contacto</h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <p><span className="text-slate-500">Destinatario</span><br /><strong>{displayValue(selectedOrder.datosEntrega.destinatario)}</strong></p>
                  <p><span className="text-slate-500">Teléfono</span><br /><strong>{displayValue(selectedOrder.datosEntrega.telefono)}</strong></p>
                  <p><span className="text-slate-500">Departamento / provincia / distrito</span><br /><strong>{logisticsDestination(selectedOrder.datosEntrega)}</strong></p>
                  <p><span className="text-slate-500">Dirección</span><br /><strong>{displayValue(selectedOrder.datosEntrega.direccion)}</strong></p>
                  {selectedOrder.datosEntrega.referencia != null && <p className="sm:col-span-2"><span className="text-slate-500">Referencia</span><br /><strong>{displayValue(selectedOrder.datosEntrega.referencia)}</strong></p>}
                </div>
              </section>
            )}
            {(canOperateLogistics || canUpdateDeliveryOrder) && (
              <section className={`mt-4 grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 ${canOperateLogistics ? 'sm:grid-cols-2' : ''}`}>
                <div>
                  <h3 className="font-bold text-slate-900">Seguimiento del pedido</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {canUpdateDeliveryOrder
                      ? 'Avanza el pedido por En ruta y En camino; al finalizar, confirma Entregado o No entregada.'
                      : 'El sistema solo ofrece transiciones autorizadas para el estado y tipo de entrega.'}
                  </p>
                  {orderTransitions.length > 0
                    ? <div className="mt-3 flex gap-2">
                        <select value={nextOrderStatus} onChange={(event) => setNextOrderStatus(event.currentTarget.value)} className={`${inputClass} mt-0 min-w-0`}>
                          {orderTransitions.map((code) => <option key={code} value={code}>{orderStatusLabel(code)}</option>)}
                        </select>
                        <button type="button" onClick={() => void changeOrderStatus()} disabled={saving || !nextOrderStatus} className="shrink-0 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Cambiar estado'}</button>
                      </div>
                    : <p className="mt-3 text-sm text-slate-600">No hay cambios de estado disponibles para este pedido.</p>}
                </div>
                {canOperateLogistics && (
                  <div>
                    <h3 className="font-bold text-slate-900">Asignación de delivery</h3>
                    <p className="mt-1 text-xs text-slate-600">La asignación se habilita cuando un pedido DELIVERY está listo para despacho.</p>
                    {selectedOrder.deliveryId
                      ? <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
                          <p className="font-semibold text-emerald-900">Delivery: {displayValue(selectedOrder.deliveryNombre)}</p>
                          {typeof selectedOrder.logisticaNombre === 'string' && selectedOrder.logisticaNombre && <p className="text-slate-600">Asignado por logística: {displayValue(selectedOrder.logisticaNombre)}</p>}
                        </div>
                      : selectedOrder.tipoEntrega === 'DELIVERY' && selectedOrder.estadoCodigo === 'LISTO_DESPACHO'
                        ? <div className="mt-3 flex gap-2">
                          <select value={selectedDelivery} onChange={(event) => setSelectedDelivery(event.currentTarget.value)} className={`${inputClass} mt-0 min-w-0`}>
                            <option value="">Selecciona delivery activo</option>
                            {deliveries.map((delivery) => (
                              <option key={String(delivery.id)} value={String(delivery.id)}>
                                {String(delivery.nombres ?? '')} {String(delivery.apellidos ?? '')}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => void assignOrderDelivery()} disabled={saving || !selectedDelivery || deliveries.length === 0} className="shrink-0 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Asignar'}</button>
                        </div>
                        : <p className="mt-3 text-sm text-slate-600">
                            {selectedOrder.tipoEntrega === 'DELIVERY'
                              ? 'La asignación estará disponible cuando el pedido esté listo para despacho.'
                              : 'Este pedido no requiere asignación de delivery.'}
                          </p>}
                    {!selectedOrder.deliveryId && selectedOrder.tipoEntrega === 'DELIVERY' && selectedOrder.estadoCodigo === 'LISTO_DESPACHO' && deliveries.length === 0 && <p className="mt-2 text-xs text-amber-800">No hay deliveries activos para asignar.</p>}
                  </div>
                )}
              </section>
            )}
            {canReadOrderStatusHistory && (
              <section className="mt-5 rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">Historial de estados</h3>
                <p className="mt-1 text-xs text-slate-500">Fecha y hora registradas para cada cambio de estado.</p>
                {orderHistoryLoading
                  ? <p className="mt-3 text-sm text-slate-500">Cargando historial…</p>
                  : orderStatusHistory.length > 0
                    ? <ol className="mt-4 space-y-3">
                        {orderStatusHistory.map((item, index) => (
                          <li key={String(item.id ?? index)} className="flex gap-3 text-sm">
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-700" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">
                                {item.estadoAnteriorCodigo
                                  ? `${orderStatusLabel(String(item.estadoAnteriorCodigo))} → `
                                  : ''}
                                {orderStatusLabel(String(item.estadoCodigo ?? 'Estado registrado'))}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDateTime(item.creadoEn)} · {displayValue(item.usuarioNombre)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    : <p className="mt-3 text-sm text-slate-500">Aún no hay cambios de estado guardados para este pedido.</p>}
              </section>
            )}
            <h3 className="mt-6 font-bold text-slate-900">Productos</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {toRecords(selectedOrder.detalles).map((detail, index) => (
                    <tr key={String(detail.id ?? index)}><td className="px-4 py-3 font-medium text-slate-800">{String(detail.productoNombre ?? detail.productoCodigo ?? 'Producto')}</td><td className="px-4 py-3">{displayValue(detail.cantidad)}</td><td className="px-4 py-3">{formatCurrency(detail.precioUnitario)}</td><td className="px-4 py-3 text-right">{formatCurrency(detail.subtotal)}</td></tr>
                  ))}
                  {toRecords(selectedOrder.detalles).length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">El pedido no tiene productos en la respuesta.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
              <TotalLine label="Subtotal" value={selectedOrder.subtotal} />
              <TotalLine label="Descuento" value={selectedOrder.descuentoCupon} />
              <TotalLine label="Envío" value={selectedOrder.costoEnvio} />
              <TotalLine label="IGV" value={selectedOrder.igv} />
              <TotalLine label="Total" value={selectedOrder.total} strong />
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {selectedChat && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedChat(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="chat-detail-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Conversación · {chatType}</p>
              <h2 id="chat-detail-title" className="mt-1 font-bold text-slate-900">{String(selectedChat.asunto ?? selectedChat.codigo ?? 'Chat')}</h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
              {messagesError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{messagesError}</p>}
              {messagesLoading && <p className="py-8 text-center text-sm text-slate-500">Cargando mensajes…</p>}
              {!messagesLoading && chatMessages.map((message, index) => (
                <article key={String(message.id ?? index)} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex justify-between gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{displayValue(message.tipoRemitente)}</span>
                    <span>{displayValue(message.creadoEn)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{String(message.contenido ?? '')}</p>
                </article>
              ))}
              {!messagesLoading && chatMessages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Esta conversación aún no tiene mensajes.</p>}
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4">
              <button type="button" onClick={() => setSelectedChat(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700'

function FormField({ label, name, defaultValue, type = 'text', required = false, min, max, step, maxLength, onChange }: {
  label: string
  name: string
  defaultValue: unknown
  type?: string
  required?: boolean
  min?: string
  max?: string
  step?: string
  maxLength?: number
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">{label}
      <input name={name} type={type} required={required} min={min} max={max} step={step} maxLength={maxLength} onChange={onChange} defaultValue={defaultValue == null ? '' : String(defaultValue)} className={inputClass} />
    </label>
  )
}

function generateStaffCode(nombres: string, apellidos: string, numeroDocumento: string) {
  if (!nombres.trim() || !apellidos.trim() || !numeroDocumento.trim()) return ''
  const initials = `${firstCodeCharacter(nombres)}${firstCodeCharacter(apellidos)}`
  const identity = `${nombres.trim()}|${apellidos.trim()}|${numeroDocumento.trim()}`
  const suffix = String(stableNumericSuffix(identity)).padStart(6, '0')
  return `${initials}${suffix}`.slice(0, 8)
}

function firstCodeCharacter(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleUpperCase().match(/[A-Z0-9]/)?.[0] ?? 'X'
}

function stableNumericSuffix(value: string) {
  let hash = 2166136261
  for (const character of value.toLocaleUpperCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return (hash >>> 0) % 1_000_000
}

interface SpecificationRow {
  id: number
  nombre: string
  valor: string
}

function ProductSpecificationsEditor({ initialValue }: { initialValue: unknown }) {
  const [rows, setRows] = useState<SpecificationRow[]>(() => normalizeSpecifications(initialValue))
  const [nextId, setNextId] = useState(() => rows.length)
  const serialized = JSON.stringify(rows
    .map(({ nombre, valor }) => ({ nombre: nombre.trim(), valor: valor.trim() }))
    .filter(({ nombre, valor }) => nombre || valor))

  function addRow() {
    setRows((current) => [...current, { id: nextId, nombre: '', valor: '' }])
    setNextId((current) => current + 1)
  }

  function updateRow(id: number, field: 'nombre' | 'valor', value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Especificaciones</legend>
      <input type="hidden" name="especificaciones" value={serialized} />
      {rows.length === 0 && <p className="text-xs text-slate-500">Agrega pares de nombre y valor para describir el producto.</p>}
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
          <label className="sr-only" htmlFor={`spec-name-${row.id}`}>Nombre de especificación</label>
          <input
            id={`spec-name-${row.id}`}
            value={row.nombre}
            onChange={(event) => updateRow(row.id, 'nombre', event.target.value)}
            placeholder="Ej. Material"
            aria-label="Nombre de especificación"
            className={inputClass}
          />
          <label className="sr-only" htmlFor={`spec-value-${row.id}`}>Valor de especificación</label>
          <input
            id={`spec-value-${row.id}`}
            value={row.valor}
            onChange={(event) => updateRow(row.id, 'valor', event.target.value)}
            placeholder="Ej. Porcelanato"
            aria-label="Valor de especificación"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            aria-label="Quitar especificación"
            className="mt-1.5 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">
        <Plus size={16} /> Agregar especificación
      </button>
    </fieldset>
  )
}

function normalizeSpecifications(value: unknown): SpecificationRow[] {
  return toRecords(value).flatMap((specification) => {
    const label = specification.nombre ?? specification.atributo ?? specification.caracteristica ?? specification.key
    const detail = specification.valor ?? specification.value ?? specification.descripcion ?? specification.detail
    if (label !== undefined && detail !== undefined) {
      return [{ nombre: String(label), valor: displayValue(detail) }]
    }
    return Object.entries(specification)
      .filter(([key, fieldValue]) => !['id', 'orden'].includes(key.toLowerCase()) && fieldValue != null)
      .map(([nombre, fieldValue]) => ({ nombre, valor: displayValue(fieldValue) }))
  }).map((row, id) => ({ ...row, id }))
}

function parseSpecifications(value: string): unknown[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some((item) => !isRecord(item))) {
    throw new Error('Las especificaciones del producto no tienen un formato válido.')
  }
  return parsed
}

function stockOptions(rows: Record<string, unknown>[]) {
  const options = new Map<string, { key: string; label: string }>()
  rows.forEach((row) => {
    if (typeof row.almacenId !== 'string' || typeof row.productoId !== 'string') return
    const key = JSON.stringify({ almacenId: row.almacenId, productoId: row.productoId })
    options.set(key, {
      key,
      label: `${String(row.productoNombre ?? row.productoCodigo ?? 'Producto')} · ${String(row.almacenNombre ?? 'Almacén')}`,
    })
  })
  return [...options.values()]
}

function formEntity(sectionId: string) {
  const labels: Record<string, string> = {
    productos: 'producto',
    categorias: 'categoría',
    almacenes: 'almacén',
    sucursales: 'sucursal',
    usuarios: 'usuario',
    clientes: 'cliente',
  }
  return labels[sectionId] ?? 'registro'
}

function columnLabels(sectionId: string, movementView: 'movimientos' | 'traslados' = 'movimientos') {
  const sets: Record<string, { key: string; label: string }[]> = {
    productos: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Producto' }, { key: 'categoriaNombre', label: 'Categoría' }, { key: 'precioFinal', label: 'Precio' }, { key: 'activo', label: 'Estado' }],
    categorias: [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Categoría' }, { key: 'descripcion', label: 'Descripción' }, { key: 'activo', label: 'Estado' }],
    inventario: [{ key: 'productoCodigo', label: 'Código' }, { key: 'productoNombre', label: 'Producto' }, { key: 'almacenNombre', label: 'Almacén' }, { key: 'stockFisico', label: 'Stock físico' }, { key: 'stockDisponible', label: 'Disponible' }],
    almacenes: [{ key: 'nombre', label: 'Almacén' }, { key: 'sucursalNombre', label: 'Sucursal' }, { key: 'activo', label: 'Estado' }],
    movimientos: [{ key: 'codigo', label: 'Movimiento' }, { key: 'tipo', label: 'Tipo' }, { key: 'productoNombre', label: 'Producto' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'fecha', label: 'Fecha' }],
    sucursales: [{ key: 'nombre', label: 'Sucursal' }, { key: 'departamento', label: 'Departamento' }, { key: 'provincia', label: 'Provincia' }, { key: 'distrito', label: 'Distrito' }, { key: 'activo', label: 'Estado' }],
    usuarios: [{ key: 'nombres', label: 'Nombres' }, { key: 'apellidos', label: 'Apellidos' }, { key: 'email', label: 'Correo' }, { key: 'rolCodigo', label: 'Rol' }, { key: 'activo', label: 'Estado' }],
    clientes: [{ key: 'nombres', label: 'Nombres' }, { key: 'apellidos', label: 'Apellidos' }, { key: 'email', label: 'Correo' }, { key: 'telefono', label: 'Teléfono' }, { key: 'createdAt', label: 'Registro' }],
    pedidos: [{ key: 'codigo', label: 'Pedido' }, { key: 'canal', label: 'Canal' }, { key: 'createdAt', label: 'Fecha' }, { key: 'estadoNombre', label: 'Estado' }, { key: 'logisticaNombre', label: 'Asignado por logística' }, { key: 'deliveryNombre', label: 'Delivery asignado' }, { key: 'total', label: 'Total' }],
    'historial-delivery': [{ key: 'codigo', label: 'Pedido' }, { key: 'canal', label: 'Canal' }, { key: 'createdAt', label: 'Fecha' }, { key: 'estadoNombre', label: 'Estado' }, { key: 'logisticaNombre', label: 'Asignado por' }, { key: 'deliveryNombre', label: 'Delivery' }, { key: 'destino', label: 'Destino' }, { key: 'total', label: 'Total' }],
    logistica: [{ key: 'codigo', label: 'Pedido' }, { key: 'estadoNombre', label: 'Estado' }, { key: 'destino', label: 'Departamento / provincia / distrito' }, { key: 'logisticaNombre', label: 'Asignado por' }, { key: 'deliveryNombre', label: 'Delivery' }, { key: 'createdAt', label: 'Fecha' }],
    chats: [{ key: 'codigo', label: 'Conversación' }, { key: 'tipo', label: 'Tipo' }, { key: 'asunto', label: 'Asunto' }, { key: 'estado', label: 'Estado' }, { key: 'creadoEn', label: 'Creado' }],
  }
  if (sectionId === 'movimientos' && movementView === 'traslados') {
    return [
      { key: 'codigo', label: 'Traslado' },
      { key: 'productoNombre', label: 'Producto' },
      { key: 'almacenOrigenNombre', label: 'Origen' },
      { key: 'almacenDestinoNombre', label: 'Destino' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'estado', label: 'Estado' },
    ]
  }
  return sets[sectionId] ?? [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'estado', label: 'Estado' }]
}

function displayValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function dateInputValue(value: unknown) {
  if (typeof value !== 'string') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string') return 'Fecha no disponible'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function distinctLocationValues(
  rows: Record<string, unknown>[],
  key: 'departamento' | 'provincia' | 'distrito',
  dependencyKey?: 'departamento' | 'provincia',
  dependencyValue?: string,
  secondDependencyKey?: 'departamento' | 'provincia',
  secondDependencyValue?: string,
) {
  return [...new Set(rows.flatMap((row) => {
    const delivery = isRecord(row.datosEntrega) ? row.datosEntrega : {}
    if (dependencyKey && delivery[dependencyKey] !== dependencyValue) return []
    if (secondDependencyKey && delivery[secondDependencyKey] !== secondDependencyValue) return []
    const value = delivery[key]
    return typeof value === 'string' && value.trim() ? [value.trim()] : []
  }))].sort((left, right) => left.localeCompare(right, 'es'))
}

function logisticsDestination(delivery: Record<string, unknown>) {
  return [delivery.departamento, delivery.provincia, delivery.distrito]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' / ') || 'Destino no especificado'
}

function formatCurrency(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(number)
    : '—'
}

function TotalLine({ label, value, strong = false }: { label: string; value: unknown; strong?: boolean }) {
  return <p className={`flex justify-between ${strong ? 'border-t border-slate-200 pt-2 font-bold text-slate-900' : 'text-slate-600'}`}><span>{label}</span><span>{formatCurrency(value)}</span></p>
}

function ReportExports({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  async function exportReport(format: 'pdf' | 'excel') {
    setError(null)
    try {
      const blob = await getBlob(token, `/v1/reportes/ventas-inventario/${format}`)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `reporte-ventas-inventario.${format === 'excel' ? 'xlsx' : 'pdf'}`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al descargar el reporte.')
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void exportReport('pdf')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} /> PDF</button>
      <button type="button" onClick={() => void exportReport('excel')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} /> Excel</button>
      {error && <p role="alert" className="w-full text-xs text-rose-700">{error}</p>}
    </div>
  )
}
