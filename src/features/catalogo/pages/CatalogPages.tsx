import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import "../css/catalog.css";
import type { TableColumn } from "../../../components/ui/DataTable";
import { DataTable } from "../../../components/ui/DataTable";
import { PageHeading } from "../../../components/ui/PageHeading";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../../hooks/useAuth";
import { descargarExcelFiltrado } from "../../../services/excelExport";
import {
  createCategory,
  deactivateCategory,
  listCategories,
  updateCategory,
  type Category,
  type CategoryInput,
} from "../../categoria/services/categoriaService";
import {
  countProductsInCategory,
  createProduct,
  deactivateProduct,
  listProducts,
  updateProduct,
  type Product,
  type ProductInput,
} from "../../producto/services/productoService";
import type { Category as CategoryOption } from "../../categoria/services/categoriaService";
import {
  createProductImage,
  deleteProductImage,
  listProductImages,
  updateProductImage,
  uploadProductImage,
  type ProductImage,
  type ProductImageInput,
} from "../services/galeriaService";

interface ProductDraft {
  codigo: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  precio: string;
  descuentoPorcentaje: string;
  especificaciones: Array<{ nombre: string; valor: string }>;
  activo: boolean;
}

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const PRODUCTS_PER_PAGE = 10;

function specificationValueToString(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function ProductsPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productResult, categoryResult] = await Promise.all([listProducts(token), listCategories(token)]);
      setProducts(productResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCategories(categoryResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listProducts(token), listCategories(token)])
      .then(([productResult, categoryResult]) => {
        if (isCurrent) {
          setProducts(productResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
          setCategories(categoryResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const matchingProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return products.filter((product) =>
      (!categoryFilter || product.categoriaId === categoryFilter)
      && (!term || [product.codigo, product.nombre, product.categoriaNombre, product.descripcion ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [categoryFilter, products, search]);

  const productPageCount = Math.ceil(matchingProducts.length / PRODUCTS_PER_PAGE);
  const currentProductPage = Math.min(productPage, Math.max(productPageCount - 1, 0));
  const visibleProducts = matchingProducts.slice(
    currentProductPage * PRODUCTS_PER_PAGE,
    (currentProductPage + 1) * PRODUCTS_PER_PAGE,
  );

  function startCreate() {
    const firstActiveCategory = categories.find((category) => category.activo);
    setEditingId(null);
    setDraft({
      codigo: "",
      categoriaId: firstActiveCategory?.id ?? "",
      nombre: "",
      descripcion: "",
      precio: "",
      descuentoPorcentaje: "0",
      especificaciones: [],
      activo: true,
    });
    setError(null);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setDraft({
      codigo: product.codigo,
      categoriaId: product.categoriaId,
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      precio: String(product.precio),
      descuentoPorcentaje: String(product.descuentoPorcentaje),
      especificaciones: product.especificaciones.flatMap((specification) =>
        Object.entries(specification).map(([nombre, valor]) => ({
          nombre,
          valor: specificationValueToString(valor),
        })),
      ),
      activo: product.activo,
    });
    setError(null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (draft.especificaciones.some((specification) =>
      Boolean(specification.nombre.trim()) !== Boolean(specification.valor.trim()),
    )) {
      setError("Completa el nombre y el valor de cada especificación, o elimina la fila vacía.");
      return;
    }

    const input: ProductInput = {
      codigo: draft.codigo.trim(),
      categoriaId: draft.categoriaId,
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim(),
      especificaciones: draft.especificaciones
        .filter((specification) => specification.nombre.trim() && specification.valor.trim())
        .map((specification) => ({ [specification.nombre.trim()]: specification.valor.trim() })),
      precio: Number(draft.precio),
      descuentoPorcentaje: Number(draft.descuentoPorcentaje || 0),
      activo: draft.activo,
    };
    setSaving(true);
    setError(null);
    try {
      const saved = editingId
        ? await updateProduct(editingId, input, token)
        : await createProduct(input, token);
      setProducts((current) => {
        const updated = editingId
          ? current.map((product) => product.id === saved.id ? saved : product)
          : [...current, saved];
        return updated.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setDraft(null);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product: Product) {
    if (!window.confirm(`¿Desactivar el producto "${product.nombre}"?`)) return;
    setDeactivatingId(product.id);
    setError(null);
    try {
      await deactivateProduct(product.id, token);
      setProducts((current) => current.map((item) =>
        item.id === product.id ? { ...item, activo: false } : item,
      ));
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "No se pudo desactivar el producto.");
    } finally {
      setDeactivatingId(null);
    }
  }

  const columns: TableColumn<Product>[] = [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Producto" },
    { key: "categoriaNombre", label: "Categoría" },
    { key: "precio", label: "Precio", render: (product) => currency.format(product.precio) },
    { key: "descuentoPorcentaje", label: "Descuento", render: (product) => `${product.descuentoPorcentaje}%` },
    { key: "precioFinal", label: "Precio final", render: (product) => currency.format(product.precioFinal) },
    {
      key: "activo",
      label: "Estado",
      render: (product) => <span className={`category-status ${product.activo ? "is-active" : "is-inactive"}`}>
        {product.activo ? "Activo" : "Inactivo"}
      </span>,
    },
    {
      key: "id",
      label: "Acciones",
      render: (product) => <div className="category-actions">
        <button className="secondary-button category-action" type="button" onClick={() => startEdit(product)}>Editar</button>
        {product.activo && <button
          className="secondary-button category-action category-deactivate"
          type="button"
          disabled={deactivatingId === product.id}
          onClick={() => void handleDeactivate(product)}
        >{deactivatingId === product.id ? "Desactivando…" : "Desactivar"}</button>}
      </div>,
    },
  ];

  function exportarProductos() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: "ceramax-productos.xlsx",
        nombreHoja: "Productos",
        encabezados: ["Código", "Producto", "Categoría", "Descripción", "Especificaciones", "Precio", "Descuento (%)", "Precio final", "Estado", "Actualizado"],
        filas: matchingProducts.map((product) => [
          product.codigo,
          product.nombre,
          product.categoriaNombre,
          product.descripcion ?? "",
          product.especificaciones.map((item) => JSON.stringify(item)).join(" | "),
          product.precio,
          product.descuentoPorcentaje,
          product.precioFinal,
          product.activo ? "Activo" : "Inactivo",
          product.updatedAt,
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudo exportar el catálogo de productos.");
    }
  }

  const selectableCategories = categories.filter((category) =>
    category.activo || category.id === draft?.categoriaId,
  );

  return <>
    <PageHeading
      title="Productos"
      description="Administra el catálogo, los precios y las categorías de tus productos."
      action={<>
        <button className="secondary-button" type="button" onClick={exportarProductos} disabled={loading || matchingProducts.length === 0}>Descargar Excel</button>
        <button className="primary-button" type="button" onClick={startCreate} disabled={!categories.some((category) => category.activo)}><Icon name="plus" size={17}/>Nuevo producto</button>
      </>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Productos registrados</h2><p>
          {matchingProducts.length} {matchingProducts.length === 1 ? "producto" : "productos"}
          {matchingProducts.length !== products.length ? ` de ${products.length}` : ""}
        </p></div>
        <div className="products-toolbar-filters">
          <label className="products-category-filter">Categoría
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setProductPage(0);
              }}
              aria-label="Filtrar productos por categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => <option key={category.id} value={category.id}>
                {category.nombre}{category.activo ? "" : " (inactiva)"}
              </option>)}
            </select>
          </label>
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setProductPage(0);
              }}
              placeholder="Buscar código o producto"
              aria-label="Buscar productos"
            />
          </label>
        </div>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => void loadProducts()}>Reintentar</button>}
      </div>}
      {!categories.some((category) => category.activo) && !loading && !error && <div className="category-error" role="status">Crea primero una categoría activa para poder registrar productos.</div>}
      {loading
        ? <div className="category-message" role="status">Cargando productos…</div>
        : error && products.length === 0
          ? <EmptyState title="No se pudieron cargar los productos" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <>
            <div className="products-table-view">
              <DataTable
                columns={columns}
                rows={visibleProducts}
                rowKey={(product) => product.id}
                emptyTitle={search || categoryFilter ? "No se encontraron productos" : "Aún no hay productos"}
                emptyDescription={search || categoryFilter ? "Prueba con otra búsqueda o categoría." : "Registra productos para completar el catálogo."}
              />
            </div>
            {visibleProducts.length > 0 && <div className="products-cards-view">
              {visibleProducts.map((product) => <article className="panel product-card" key={product.id}>
                <div className="product-card-heading">
                  <div>
                    <span className="product-card-code">{product.codigo}</span>
                    <h3>{product.nombre}</h3>
                  </div>
                  <span className={`category-status ${product.activo ? "is-active" : "is-inactive"}`}>
                    {product.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <dl className="product-card-details">
                  <div><dt>Categoría</dt><dd>{product.categoriaNombre}</dd></div>
                  <div><dt>Precio</dt><dd>{currency.format(product.precio)}</dd></div>
                  <div><dt>Descuento</dt><dd>{product.descuentoPorcentaje}%</dd></div>
                  <div><dt>Precio final</dt><dd>{currency.format(product.precioFinal)}</dd></div>
                </dl>
                <div className="product-card-actions">
                  <button className="secondary-button category-action" type="button" onClick={() => startEdit(product)}>Editar</button>
                  {product.activo && <button
                    className="secondary-button category-action category-deactivate"
                    type="button"
                    disabled={deactivatingId === product.id}
                    onClick={() => void handleDeactivate(product)}
                  >{deactivatingId === product.id ? "Desactivando…" : "Desactivar"}</button>}
                </div>
              </article>)}
            </div>}
          </>}
      {!loading && !error && productPageCount > 1 && <nav className="products-pagination" aria-label="Paginación de productos">
        <button
          className="secondary-button category-action"
          type="button"
          disabled={currentProductPage === 0}
          onClick={() => setProductPage(currentProductPage - 1)}
        >Anterior</button>
        <span>Página {currentProductPage + 1} de {productPageCount} · Mostrando {currentProductPage * PRODUCTS_PER_PAGE + 1}–{Math.min((currentProductPage + 1) * PRODUCTS_PER_PAGE, matchingProducts.length)} de {matchingProducts.length}</span>
        <button
          className="secondary-button category-action"
          type="button"
          disabled={currentProductPage + 1 >= productPageCount}
          onClick={() => setProductPage(currentProductPage + 1)}
        >Siguiente</button>
      </nav>}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
        <div className="category-modal-heading">
          <div><h2 id="product-form-title">{editingId ? "Editar producto" : "Nuevo producto"}</h2><p>Completa la información del producto.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveProduct(event)}>
          <div className="form-grid category-form-grid product-form-grid">
            <label>Código<input required maxLength={30} value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} autoFocus/></label>
            <label>Nombre<input required maxLength={150} value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}/></label>
            <label className="wide">Categoría
              <select required value={draft.categoriaId} onChange={(event) => setDraft({ ...draft, categoriaId: event.target.value })}>
                <option value="" disabled>Selecciona una categoría</option>
                {selectableCategories.map((category) => <option key={category.id} value={category.id}>
                  {category.nombre}{category.activo ? "" : " (inactiva)"}
                </option>)}
              </select>
            </label>
            <label>Precio (S/)
              <input required type="number" min="0" max="99999999.99" step="0.01" value={draft.precio} onChange={(event) => setDraft({ ...draft, precio: event.target.value })}/>
            </label>
            <label>Descuento (%)
              <input type="number" min="0" max="100" step="0.01" value={draft.descuentoPorcentaje} onChange={(event) => setDraft({ ...draft, descuentoPorcentaje: event.target.value })}/>
            </label>
            <label className="wide">Descripción<textarea value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })}/></label>
            <div className="wide product-specifications">
              <div className="product-specifications-heading">
                <strong>Especificaciones</strong>
                <button
                  className="secondary-button category-action"
                  type="button"
                  onClick={() => setDraft({
                    ...draft,
                    especificaciones: [...draft.especificaciones, { nombre: "", valor: "" }],
                  })}
                ><Icon name="plus" size={15}/>Añadir especificación</button>
              </div>
              {draft.especificaciones.length === 0
                ? <p className="product-specifications-empty">Agrega características como material, formato o color.</p>
                : draft.especificaciones.map((specification, index) => <div className="product-specification-row" key={index}>
                  <label>Nombre
                    <input
                      value={specification.nombre}
                      maxLength={100}
                      placeholder="Ej. Material"
                      onChange={(event) => setDraft({
                        ...draft,
                        especificaciones: draft.especificaciones.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, nombre: event.target.value } : item,
                        ),
                      })}
                    />
                  </label>
                  <label>Valor
                    <input
                      value={specification.valor}
                      maxLength={250}
                      placeholder="Ej. Porcelanato"
                      onChange={(event) => setDraft({
                        ...draft,
                        especificaciones: draft.especificaciones.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, valor: event.target.value } : item,
                        ),
                      })}
                    />
                  </label>
                  <button
                    className="secondary-button category-action category-deactivate"
                    type="button"
                    aria-label={`Quitar especificación ${index + 1}`}
                    onClick={() => setDraft({
                      ...draft,
                      especificaciones: draft.especificaciones.filter((_, itemIndex) => itemIndex !== index),
                    })}
                  >Quitar</button>
                </div>)}
            </div>
            <label className="category-active-field"><input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })}/>Producto activo</label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving || selectableCategories.length === 0}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear producto"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}

export function CategoriesPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<{ category: Category; productCount: number } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCategories(token);
      setCategories(result.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void listCategories(token)
      .then((result) => {
        if (isCurrent) setCategories(result.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las categorías.");
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return categories;
    return categories.filter((category) =>
      [category.codigo, category.nombre, category.descripcion ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [categories, search]);

  function startCreate() {
    setEditingId(null);
    setDraft({ codigo: "", nombre: "", descripcion: "", activo: true });
    setError(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setDraft({
      codigo: category.codigo,
      nombre: category.nombre,
      descripcion: category.descripcion ?? "",
      activo: category.activo,
    });
    setError(null);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const saved = editingId
        ? await updateCategory(editingId, draft, token)
        : await createCategory(draft, token);
      setCategories((current) => {
        const updated = editingId
          ? current.map((category) => category.id === saved.id ? saved : category)
          : [...current, saved];
        return updated.sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setDraft(null);
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la categoría.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(category: Category) {
    if (!window.confirm(`¿Desactivar la categoría "${category.nombre}"?`)) return;
    setDeactivatingId(category.id);
    setError(null);
    try {
      await deactivateCategory(category.id, token);
      setCategories((current) => current.map((item) =>
        item.id === category.id ? { ...item, activo: false } : item,
      ));
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "No se pudo desactivar la categoría.");
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleDelete(category: Category) {
    setDeletingId(category.id);
    setError(null);
    try {
      const productCount = await countProductsInCategory(category.id, token);
      if (productCount > 0) {
        setBlockedDelete({ category, productCount });
        return;
      }

      await deactivateCategory(category.id, token);
      setCategories((current) => current.map((item) =>
        item.id === category.id ? { ...item, activo: false } : item,
      ));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la categoría.");
    } finally {
      setDeletingId(null);
    }
  }

  const columns: TableColumn<Category>[] = [
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Categoría" },
    { key: "descripcion", label: "Descripción", render: (category) => category.descripcion || "—" },
    {
      key: "activo",
      label: "Estado",
      render: (category) => <span className={`category-status ${category.activo ? "is-active" : "is-inactive"}`}>
        {category.activo ? "Activa" : "Inactiva"}
      </span>,
    },
    {
      key: "id",
      label: "Acciones",
      render: (category) => <div className="category-actions">
        <button className="secondary-button category-action" type="button" onClick={() => startEdit(category)}>Editar</button>
        {category.activo && <button
          className="secondary-button category-action category-deactivate"
          type="button"
          disabled={deactivatingId === category.id}
          onClick={() => void handleDeactivate(category)}
        >{deactivatingId === category.id ? "Desactivando…" : "Desactivar"}</button>}
        <button
          className="secondary-button category-action category-deactivate"
          type="button"
          disabled={deletingId === category.id}
          onClick={() => void handleDelete(category)}
        >{deletingId === category.id ? "Verificando…" : "Eliminar"}</button>
      </div>,
    },
  ];

  function exportarCategorias() {
    try {
      descargarExcelFiltrado({
        nombreArchivo: "ceramax-categorias.xlsx",
        nombreHoja: "Categorías",
        encabezados: ["Código", "Categoría", "Descripción", "Estado", "Creada", "Actualizada"],
        filas: visibleCategories.map((category) => [
          category.codigo,
          category.nombre,
          category.descripcion ?? "",
          category.activo ? "Activa" : "Inactiva",
          category.createdAt,
          category.updatedAt,
        ]),
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudieron exportar las categorías.");
    }
  }

  return <>
    <PageHeading
      title="Categorías"
      description="Organiza los productos por categoría."
      action={<>
        <button className="secondary-button" type="button" onClick={exportarCategorias} disabled={loading || visibleCategories.length === 0}>Descargar Excel</button>
        <button className="primary-button" type="button" onClick={startCreate}><Icon name="plus" size={17}/>Nueva categoría</button>
      </>}
    />
    <section className="panel page-panel">
      <div className="category-toolbar">
        <div><h2>Categorías registradas</h2><p>{categories.length} {categories.length === 1 ? "categoría" : "categorías"}</p></div>
        <label className="category-search">
          <Icon name="search" size={17}/>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, nombre o descripción"
            aria-label="Buscar categorías"
          />
        </label>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {!draft && <button className="secondary-button category-action" type="button" onClick={() => void loadCategories()}>Reintentar</button>}
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando categorías…</div>
        : error && categories.length === 0
          ? <EmptyState title="No se pudieron cargar las categorías" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : <DataTable
            columns={columns}
            rows={visibleCategories}
            rowKey={(category) => category.id}
            emptyTitle={search ? "No se encontraron categorías" : "Aún no hay categorías"}
            emptyDescription={search ? "Prueba con otro código, nombre o descripción." : "Crea una categoría para organizar los productos."}
          />}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
        <div className="category-modal-heading">
          <div><h2 id="category-form-title">{editingId ? "Editar categoría" : "Nueva categoría"}</h2><p>Completa los datos de la categoría.</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveCategory(event)}>
          <div className="form-grid category-form-grid">
            <label>Código<input required maxLength={20} value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} autoFocus/></label>
            <label>Nombre<input required maxLength={80} value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}/></label>
            <label className="wide">Descripción<textarea maxLength={250} value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })}/></label>
            <label className="category-active-field"><input type="checkbox" checked={draft.activo} onChange={(event) => setDraft({ ...draft, activo: event.target.checked })}/>Categoría activa</label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear categoría"}</button>
          </div>
        </form>
      </section>
    </div>}
    {blockedDelete && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setBlockedDelete(null);
    }}>
      <section className="panel category-modal category-delete-modal" role="dialog" aria-modal="true" aria-labelledby="category-delete-title">
        <div className="category-modal-heading">
          <div>
            <h2 id="category-delete-title">No se puede eliminar la categoría</h2>
            <p>{blockedDelete.category.nombre}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar aviso" onClick={() => setBlockedDelete(null)}><Icon name="close" size={19}/></button>
        </div>
        <div className="category-delete-message" role="alert">
          Hay productos en esta categoría, no se puede eliminar. ({blockedDelete.productCount} {blockedDelete.productCount === 1 ? "producto" : "productos"})
        </div>
        <div className="category-modal-actions">
          <button className="primary-button" type="button" onClick={() => setBlockedDelete(null)}>Entendido</button>
        </div>
      </section>
    </div>}
  </>;
}

export function GalleryPage() {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imagesProductId, setImagesProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ url: string; orden: string; esPrincipal: boolean; archivo: File | null } | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const matchingProducts = useMemo(() => {
    const term = productSearch.trim().toLocaleLowerCase();
    return products.filter((product) =>
      (!categoryFilter || product.categoriaId === categoryFilter)
      && (!term || [product.codigo, product.nombre, product.categoriaNombre]
        .some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [categoryFilter, productSearch, products]);
  const productPageSize = 8;
  const productPageCount = Math.ceil(matchingProducts.length / productPageSize);
  const visibleProducts = matchingProducts.slice(productPage * productPageSize, (productPage + 1) * productPageSize);

  const loadImages = useCallback(async (productId: string) => {
    setImagesProductId("");
    setError(null);
    try {
      const result = await listProductImages(productId, token);
      setImages(result);
      setImagesProductId(productId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las imágenes.");
    }
  }, [token]);

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([listProducts(token), listCategories(token)])
      .then(([result, categoryResult]) => {
        if (isCurrent) {
          const sorted = result.sort((a, b) => a.nombre.localeCompare(b.nombre));
          setProducts(sorted);
          setCategories(categoryResult.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }
    let isCurrent = true;
    void listProductImages(selectedProductId, token)
      .then((result) => {
        if (isCurrent) {
          setImages(result);
          setImagesProductId(selectedProductId);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las imágenes.");
      });
    return () => {
      isCurrent = false;
    };
  }, [selectedProductId, token]);

  const visibleImages = imagesProductId === selectedProductId ? images : [];
  const imagesLoading = Boolean(selectedProductId && imagesProductId !== selectedProductId && !error);

  function startAddImage() {
    setEditingImageId(null);
    setDraft({ url: "", orden: String(visibleImages.length), esPrincipal: visibleImages.length === 0, archivo: null });
    setError(null);
  }

  function startEditImage(image: ProductImage) {
    setEditingImageId(image.id);
    setDraft({
      url: image.url,
      orden: String(image.orden),
      esPrincipal: image.esPrincipal,
      archivo: null,
    });
    setError(null);
  }

  async function saveImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !selectedProductId) return;
    const order = Number(draft.orden);
    if (!Number.isInteger(order) || order < 0 || order > 32767) {
      setError("El orden debe ser un número entero entre 0 y 32767.");
      return;
    }
    if (!draft.archivo && !draft.url.trim()) {
      setError("Selecciona un archivo de imagen o ingresa una URL.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let saved: ProductImage;
      if (draft.archivo) {
        saved = await uploadProductImage(
          selectedProductId,
          draft.archivo,
          order,
          draft.esPrincipal,
          token,
          editingImageId ?? undefined,
        );
      } else {
        const input: ProductImageInput = {
          url: draft.url.trim(),
          publicId: editingImageId ? visibleImages.find((image) => image.id === editingImageId)?.publicId ?? null : null,
          orden: order,
          esPrincipal: draft.esPrincipal,
        };
        saved = editingImageId
          ? await updateProductImage(selectedProductId, editingImageId, input, token)
          : await createProductImage(selectedProductId, input, token);
      }
      setImages((current) => {
        const updated = current.map((image) => image.id === saved.id
          ? saved
          : saved.esPrincipal ? { ...image, esPrincipal: false } : image);
        if (!current.some((image) => image.id === saved.id)) updated.push(saved);
        return updated.sort((first, second) => first.orden - second.orden);
      });
      setDraft(null);
      setEditingImageId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la imagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteImage(image: ProductImage) {
    if (!selectedProductId || !window.confirm("¿Eliminar esta imagen de la galería? Esta acción también la quitará del almacenamiento.")) return;
    setDeletingImageId(image.id);
    setError(null);
    try {
      await deleteProductImage(selectedProductId, image.id, token);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la imagen.");
    } finally {
      setDeletingImageId(null);
    }
  }

  function handleFileChange(file: File | undefined) {
    if (!draft) return;
    if (!file) {
      setDraft({ ...draft, archivo: null });
      return;
    }
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!acceptedTypes.includes(file.type)) {
      setError("El archivo debe ser una imagen JPEG, PNG, WEBP, GIF o AVIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen supera el límite de 10 MB.");
      return;
    }
    setError(null);
    setDraft({ ...draft, archivo: file, url: "" });
  }

  return <>
    <PageHeading
      title="Galería de imágenes"
      description="Selecciona un producto para administrar sus imágenes."
    />
    <section className="panel gallery-manager">
      <div className="category-toolbar">
        <div><h2>Productos</h2><p>{matchingProducts.length} {matchingProducts.length === 1 ? "producto" : "productos"} disponibles</p></div>
        <div className="gallery-product-filters">
          <label className="category-search">
            <Icon name="search" size={17}/>
            <input
              type="search"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductPage(0);
              }}
              placeholder="Buscar por código o producto"
              aria-label="Buscar productos para la galería"
            />
          </label>
          <label className="gallery-category-filter">Categoría
            <select value={categoryFilter} onChange={(event) => {
              setCategoryFilter(event.target.value);
              setProductPage(0);
            }}>
              <option value="">Todas las categorías</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>
      {error && <div className="category-error" role="alert">
        <span>{error}</span>
        {selectedProductId && !draft && <button className="secondary-button category-action" type="button" onClick={() => void loadImages(selectedProductId)}>Reintentar</button>}
      </div>}
      {loading
        ? <div className="category-message" role="status">Cargando productos…</div>
        : error && products.length === 0
          ? <EmptyState title="No se pudieron cargar los productos" description="Verifica tu conexión y vuelve a intentarlo." icon="alert"/>
          : matchingProducts.length === 0
            ? <EmptyState
              title={products.length === 0 ? "No hay productos disponibles" : "No hay productos para estos filtros"}
              description={products.length === 0
                ? "Primero registra un producto para poder administrar sus imágenes."
                : "Prueba otra búsqueda o selecciona una categoría diferente."}
              icon="store"
            />
            : <>
              <div className="gallery-product-grid">
                {visibleProducts.map((product) => <button
                  className={`gallery-product-card ${selectedProductId === product.id ? "is-selected" : ""}`}
                  key={product.id}
                  type="button"
                  aria-pressed={selectedProductId === product.id}
                  onClick={() => {
                    setError(null);
                    setImagesProductId("");
                    setSelectedProductId(product.id);
                  }}
                >
                  <span className="gallery-product-icon"><Icon name="box" size={24}/></span>
                  <span className="gallery-product-card-content">
                    <strong>{product.nombre}</strong>
                    <small>{product.codigo}</small>
                    <small>{product.categoriaNombre}</small>
                  </span>
                  {selectedProductId === product.id && <span className="gallery-product-selected">Seleccionado</span>}
                </button>)}
              </div>
              {productPageCount > 1 && <nav className="gallery-pagination" aria-label="Paginación de productos">
                <button className="secondary-button category-action" type="button" disabled={productPage === 0} onClick={() => setProductPage((page) => page - 1)}>Anterior</button>
                <span>Página {productPage + 1} de {productPageCount}</span>
                <button className="secondary-button category-action" type="button" disabled={productPage + 1 >= productPageCount} onClick={() => setProductPage((page) => page + 1)}>Siguiente</button>
              </nav>}
            </>}
      {selectedProduct && <div className="gallery-selected-product">
        <div className="gallery-selected-heading">
          <div><h2>Galería de imágenes</h2><p>{selectedProduct.nombre} · {visibleImages.length} {visibleImages.length === 1 ? "imagen" : "imágenes"}</p></div>
          <button className="primary-button" type="button" onClick={startAddImage} disabled={imagesLoading}><Icon name="plus" size={17}/>Añadir imagen</button>
        </div>
        {imagesLoading
          ? <div className="category-message" role="status">Cargando imágenes…</div>
          : visibleImages.length === 0
            ? <EmptyState title="Este producto aún no tiene imágenes" description="Añade una imagen desde un archivo o una URL para comenzar su galería." icon="file"/>
            : <div className="gallery-image-grid">
              {visibleImages.map((image) => <article className="gallery-image-card" key={image.id}>
                  <div className="gallery-image-preview">
                    <img src={image.url} alt={`Imagen ${image.orden + 1} de ${selectedProduct.nombre}`} loading="lazy"/>
                    {image.esPrincipal && <span className="gallery-primary-badge">Imagen principal</span>}
                  </div>
                  <div className="gallery-image-info">
                    <span>Orden {image.orden}</span>
                    <div className="category-actions">
                      <button className="secondary-button category-action" type="button" onClick={() => startEditImage(image)}>Editar</button>
                      <button className="secondary-button category-action category-deactivate" type="button" disabled={deletingImageId === image.id} onClick={() => void handleDeleteImage(image)}>
                        {deletingImageId === image.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </article>)}
            </div>}
      </div>}
    </section>
    {draft && <div className="category-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) setDraft(null);
    }}>
      <section className="panel category-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-form-title">
        <div className="category-modal-heading">
          <div><h2 id="gallery-form-title">{editingImageId ? "Editar imagen" : "Añadir imagen"}</h2><p>{selectedProduct?.nombre}</p></div>
          <button className="icon-button" type="button" aria-label="Cerrar formulario" disabled={saving} onClick={() => setDraft(null)}><Icon name="close" size={19}/></button>
        </div>
        <form onSubmit={(event) => void saveImage(event)}>
          <div className="form-grid category-form-grid">
            <label className="wide">Archivo de imagen
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </label>
            {draft.archivo && <div className="wide gallery-selected-file">
              <span>{draft.archivo.name} ({(draft.archivo.size / (1024 * 1024)).toFixed(2)} MB)</span>
              <button className="secondary-button category-action" type="button" onClick={() => {
                setDraft({ ...draft, archivo: null });
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}>Quitar archivo</button>
            </div>}
            <label className="wide">O ingresa la URL de una imagen
              <input type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://…"/>
            </label>
            <label>Orden
              <input type="number" min="0" max="32767" step="1" required value={draft.orden} onChange={(event) => setDraft({ ...draft, orden: event.target.value })}/>
            </label>
            <label className="category-active-field"><input type="checkbox" checked={draft.esPrincipal} onChange={(event) => setDraft({ ...draft, esPrincipal: event.target.checked })}/>Imagen principal</label>
          </div>
          {error && <div className="category-error category-form-error" role="alert">{error}</div>}
          <div className="category-modal-actions">
            <button className="secondary-button" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando…" : editingImageId ? "Guardar cambios" : "Añadir imagen"}</button>
          </div>
        </form>
      </section>
    </div>}
  </>;
}
