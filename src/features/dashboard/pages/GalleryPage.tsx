import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { deleteResource, getJson, sendFormData, sendJson } from '../../../lib/api/httpClient'
import { toRecords } from '../hooks/useDashboardData'

interface GalleryPageProps {
  token: string
}

export function GalleryPage({ token }: GalleryPageProps) {
  const [products, setProducts] = useState<Record<string, unknown>[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Record<string, unknown> | null>(null)
  const [images, setImages] = useState<Record<string, unknown>[]>([])
  const [selectedImage, setSelectedImage] = useState<Record<string, unknown> | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    setRevision((current) => current + 1)
  }, [])

  useEffect(() => {
    let current = true
    getJson<unknown>(token, '/v1/catalogo/productos')
      .then((response) => { if (current) setProducts(toRecords(response)) })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los productos.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token])

  useEffect(() => {
    if (!selectedProduct || typeof selectedProduct.id !== 'string') return
    let current = true
    getJson<unknown>(token, `/v1/catalogo/productos/${encodeURIComponent(selectedProduct.id)}/galeria`)
      .then((response) => { if (current) setImages(toRecords(response)) })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las imágenes.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [selectedProduct, token, revision])

  async function saveImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProduct || typeof selectedProduct.id !== 'string') return
    setSaving(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const archivo = form.get('archivo')
    const orden = String(form.get('orden') ?? images.length)
    const esPrincipal = form.get('esPrincipal') === 'on'
    try {
      const imageId = selectedImage?.id
      const path = `/v1/catalogo/productos/${encodeURIComponent(selectedProduct.id)}/galeria`
      if (archivo instanceof File && archivo.size > 0) {
        const body = new FormData()
        body.set('archivo', archivo)
        body.set('orden', orden)
        body.set('esPrincipal', String(esPrincipal))
        await sendFormData<unknown>(
          token,
          imageId ? `${path}/${encodeURIComponent(String(imageId))}/archivo` : `${path}/archivo`,
          imageId ? 'PUT' : 'POST',
          body,
        )
      } else if (imageId) {
        const body = {
          url: String(selectedImage?.url ?? ''),
          publicId: String(selectedImage?.publicId ?? '') || null,
          orden: Number(orden),
          esPrincipal,
        }
        await sendJson<unknown, typeof body>(
          token,
          `${path}/${encodeURIComponent(String(imageId))}`,
          'PUT',
          body,
        )
      } else {
        throw new Error('Selecciona un archivo de imagen para agregarlo a Cloudinary.')
      }
      setFormOpen(false)
      setSelectedImage(null)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la imagen.')
    } finally {
      setSaving(false)
    }
  }

  async function removeImage(image: Record<string, unknown>) {
    if (!selectedProduct || typeof selectedProduct.id !== 'string' || typeof image.id !== 'string') return
    if (!window.confirm('¿Eliminar esta imagen de la galería del producto?')) return
    setError(null)
    try {
      await deleteResource(
        token,
        `/v1/catalogo/productos/${encodeURIComponent(selectedProduct.id)}/galeria/${encodeURIComponent(image.id)}`,
      )
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la imagen.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {selectedProduct && (
            <button type="button" onClick={() => { setSelectedProduct(null); setImages([]); setError(null) }} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
              <ArrowLeft size={16} /> Todos los productos
            </button>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Galería de imágenes</h1>
          <p className="mt-2 text-sm text-slate-500">
            {selectedProduct ? `Imágenes de ${String(selectedProduct.nombre ?? selectedProduct.codigo ?? 'producto')}` : 'Selecciona un producto para administrar sus imágenes.'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProduct && (
            <>
              <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
              <button type="button" onClick={() => { setSelectedImage(null); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900"><ImagePlus size={16} /> Agregar imagen</button>
            </>
          )}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {!selectedProduct && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><p className="text-sm text-slate-500">{loading ? 'Cargando productos…' : `${products.length} productos`}</p></div>
          <div className="divide-y divide-slate-100">
            {products.map((product, index) => (
              <button key={String(product.id ?? index)} type="button" onClick={() => { setLoading(true); setError(null); setSelectedProduct(product) }} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-emerald-50/50">
                <span><span className="block font-semibold text-slate-900">{String(product.nombre ?? 'Producto')}</span><span className="mt-1 block text-xs text-slate-500">{String(product.codigo ?? '')} · {String(product.categoriaNombre ?? 'Sin categoría')}</span></span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><Plus size={14} /> Administrar galería</span>
              </button>
            ))}
            {!loading && products.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-500">{error ? 'No se pudieron consultar los productos.' : 'No hay productos disponibles.'}</p>}
          </div>
        </section>
      )}

      {selectedProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {loading && <p className="py-10 text-center text-sm text-slate-500">Cargando galería…</p>}
          {!loading && images.length === 0 && (
            <div className="py-12 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ImagePlus size={24} /></span>
              <h2 className="mt-4 font-bold text-slate-900">Aún no hay imágenes</h2>
              <p className="mt-1 text-sm text-slate-500">Sube imágenes para guardarlas en Cloudinary dentro de la carpeta del producto.</p>
            </div>
          )}
          {!loading && images.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((image, index) => (
                <article key={String(image.id ?? index)} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {image.esPrincipal === true && <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-800 px-2.5 py-1 text-[11px] font-semibold text-white">Principal</span>}
                    <img src={String(image.url ?? '')} alt={`${String(selectedProduct.nombre ?? 'Producto')} ${index + 1}`} className="size-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <p className="truncate text-xs text-slate-500" title={String(image.url ?? '')}>{String(image.url ?? 'Sin URL')}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Orden {String(image.orden ?? index)}</span>
                      <div className="flex gap-1">
                        <button type="button" aria-label="Editar imagen" onClick={() => { setSelectedImage(image); setFormOpen(true) }} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"><Pencil size={15} /></button>
                        <button type="button" aria-label="Eliminar imagen" onClick={() => void removeImage(image)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {formOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="gallery-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="gallery-form-title" className="text-lg font-bold text-slate-900">{selectedImage ? 'Editar imagen' : 'Agregar imagen'}</h2>
            <p className="mt-1 text-sm text-slate-500">Se guardará en `ceramax/categoría/producto` y la API almacenará su URL segura e ID público.</p>
            <form onSubmit={(event) => void saveImage(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">{selectedImage ? 'Reemplazar archivo (opcional)' : 'Archivo de imagen'}
                <input name="archivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required={!selectedImage} className={inputClass} />
                <span className="mt-1 block text-xs font-normal text-slate-500">JPEG, PNG, WEBP, GIF o AVIF; máximo 10 MB.</span>
              </label>
              <label className="block text-sm font-medium text-slate-700">Orden
                <input name="orden" type="number" min="0" step="1" defaultValue={String(selectedImage?.orden ?? images.length)} className={inputClass} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input name="esPrincipal" type="checkbox" defaultChecked={selectedImage?.esPrincipal === true} className="size-4 accent-emerald-800" /> Imagen principal</label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700'
