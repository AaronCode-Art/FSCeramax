import { useEffect, useMemo, useState, type FormEvent } from "react";
import "../css/sale.css";
import { PageHeading } from "../../../components/ui/PageHeading";
import { Icon } from "../../../components/ui/Icon";
import { listUbigeos, type UbigeoEntry } from "../../cliente/services/clienteService";
import { buscarClienteVenta, listarProductosVenta, obtenerImagenPrincipalProducto, registrarVentaPresencial } from "../services/ventaPresencialService";
import type { DatosClienteVenta, ProductoVenta, VentaPresencialInput } from "../types/ventaPresencial";

const moneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const documentoInicial: DatosClienteVenta = {
  tipoDocumento: "DNI",
  numeroDocumento: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  departamento: "",
  provincia: "",
  distrito: "",
  direccion: "",
  codigoPostal: "",
  referencia: "",
  idUbigeo: "",
};
const tiposDocumento = ["DNI", "RUC", "CE", "PASAPORTE"];
const findUbigeoPath = (ubigeos: UbigeoEntry[], districtId: string) => {
  for (const department of ubigeos) {
    for (const province of department.childrens) {
      const district = province.childrens.find((entry) => entry.id === districtId);
      if (district) return { department, province, district };
    }
  }
  return null;
};

export function SalePage({ token, initialSearch = "" }: { token: string; initialSearch?: string }) {
  const [productos, setProductos] = useState<ProductoVenta[]>([]);
  const [ubigeos, setUbigeos] = useState<UbigeoEntry[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [tipoEntrega, setTipoEntrega] = useState<"DELIVERY" | "RECOJO_TIENDA">("DELIVERY");
  const [cliente, setCliente] = useState<DatosClienteVenta>(documentoInicial);
  const [busquedaProducto, setBusquedaProducto] = useState(initialSearch);
  const [categoriaProducto, setCategoriaProducto] = useState("");
  const [paginaProductos, setPaginaProductos] = useState(0);
  const [imagenesProducto, setImagenesProducto] = useState<Record<string, string | null>>({});
  const [errorImagenes, setErrorImagenes] = useState<string | null>(null);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [metodoPago, setMetodoPago] = useState<VentaPresencialInput["metodoPago"]>("EFECTIVO");
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [consultaCliente, setConsultaCliente] = useState<"idle" | "loading" | "found" | "missing">("idle");
  const [lineas, setLineas] = useState<Array<{ productoId: string; cantidad: number }>>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    void Promise.all([listarProductosVenta(), listUbigeos()])
      .then(([productosActivos, catalogoUbigeo]) => {
        if (vigente) {
          setProductos(productosActivos);
          setUbigeos(catalogoUbigeo);
        }
      })
      .catch((loadError: unknown) => {
        if (vigente) setErrorCarga(loadError instanceof Error ? loadError.message : "No se pudieron cargar productos y UBIGEO.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [intentoCarga]);

  useEffect(() => {
    const documentPattern = cliente.tipoDocumento === "DNI"
      ? /^[0-9]{8}$/
      : cliente.tipoDocumento === "RUC"
        ? /^[0-9]{11}$/
        : /^[A-Za-z0-9]{1,20}$/;
    const numeroDocumento = cliente.numeroDocumento.trim();
    if (!documentPattern.test(numeroDocumento)) {
      return;
    }
    let vigente = true;
    const timeout = window.setTimeout(() => {
      setConsultaCliente("loading");
      void buscarClienteVenta(cliente.tipoDocumento, numeroDocumento, token)
        .then((encontrado) => {
          if (!vigente) return;
          setCliente((current) => ({ ...current, ...encontrado }));
          const path = findUbigeoPath(ubigeos, encontrado.idUbigeo);
          setDepartamentoSeleccionado(path?.department.id ?? "");
          setProvinciaSeleccionada(path?.province.id ?? "");
          setConsultaCliente("found");
          setError(null);
          setMensaje("Datos encontrados. Puedes modificarlos antes de registrar la venta.");
        })
        .catch((lookupError: unknown) => {
          if (!vigente) return;
          const message = lookupError instanceof Error ? lookupError.message : "No se encontró el cliente.";
          if (message.toLocaleLowerCase().includes("no se encontró")) {
            setConsultaCliente("missing");
            setError(null);
            setMensaje("No hay un cliente previo con ese documento. Completa los datos para guardarlos en esta venta.");
          } else {
            setConsultaCliente("idle");
            setError(message);
          }
        });
    }, 350);
    return () => {
      vigente = false;
      window.clearTimeout(timeout);
    };
  }, [cliente.numeroDocumento, cliente.tipoDocumento, token, ubigeos]);

  const seleccionUbigeo = useMemo(
    () => findUbigeoPath(ubigeos, cliente.idUbigeo),
    [cliente.idUbigeo, ubigeos],
  );
  const provincias = ubigeos.find((department) => department.id === departamentoSeleccionado)?.childrens ?? [];
  const distritos = provincias.find((province) => province.id === provinciaSeleccionada)?.childrens ?? [];
  const categoriasProducto = useMemo(
    () => [...new Set(productos.map((producto) => producto.categoriaNombre))].sort((first, second) => first.localeCompare(second)),
    [productos],
  );
  const productosFiltrados = useMemo(() => {
    const term = busquedaProducto.trim().toLocaleLowerCase();
    return productos.filter((producto) =>
      (!categoriaProducto || producto.categoriaNombre === categoriaProducto)
      && (!term || [producto.codigo, producto.nombre, producto.categoriaNombre]
        .some((value) => value.toLocaleLowerCase().includes(term))),
    );
  }, [busquedaProducto, categoriaProducto, productos]);
  const productosPorPagina = 12;
  const paginasProductos = Math.ceil(productosFiltrados.length / productosPorPagina);
  const productosVisibles = productosFiltrados.slice(
    paginaProductos * productosPorPagina,
    (paginaProductos + 1) * productosPorPagina,
  );
  const lineasDetalle = useMemo(() => lineas.map((linea) => ({
    ...linea,
    producto: productos.find((producto) => producto.id === linea.productoId),
  })), [lineas, productos]);
  const subtotal = lineasDetalle.reduce((total, linea) => total + (linea.producto?.precioFinal ?? 0) * linea.cantidad, 0);
  const faltaStock = lineasDetalle.some((linea) => !linea.producto || linea.cantidad > linea.producto.stockDisponible);

  useEffect(() => {
    let vigente = true;
    const faltantes = productosVisibles.filter((producto) => !(producto.id in imagenesProducto));
    if (!faltantes.length) return;
    void Promise.all(faltantes.map(async (producto) => ({
      id: producto.id,
      url: await obtenerImagenPrincipalProducto(producto.id),
    })))
      .then((imagenes) => {
        if (!vigente) return;
        setImagenesProducto((actuales) => ({
          ...actuales,
          ...Object.fromEntries(imagenes.map(({ id, url }) => [id, url])),
        }));
        setErrorImagenes(null);
      })
      .catch((imageError: unknown) => {
        if (vigente) setErrorImagenes(imageError instanceof Error ? imageError.message : "No se pudieron cargar las imágenes de productos.");
      });
    return () => {
      vigente = false;
    };
  }, [productosVisibles, imagenesProducto]);

  const updateCliente = (field: keyof DatosClienteVenta, value: string) => {
    if (field === "tipoDocumento" || field === "numeroDocumento") {
      setCliente((current) => ({
        ...documentoInicial,
        tipoDocumento: field === "tipoDocumento" ? value : current.tipoDocumento,
        numeroDocumento: field === "numeroDocumento" ? value : "",
      }));
      setDepartamentoSeleccionado("");
      setProvinciaSeleccionada("");
      setConsultaCliente("idle");
      setMensaje(null);
      setError(null);
      return;
    }
    setCliente((current) => ({ ...current, [field]: value }));
    setConsultaCliente("idle");
    setMensaje(null);
    setError(null);
  };

  const buscarCliente = async () => {
    if (!cliente.tipoDocumento || !cliente.numeroDocumento.trim()) {
      setError("Ingresa el tipo y número de documento para buscar.");
      return;
    }
    setError(null);
    setConsultaCliente("loading");
    try {
      const encontrado = await buscarClienteVenta(cliente.tipoDocumento, cliente.numeroDocumento.trim(), token);
      setCliente(encontrado);
      const path = findUbigeoPath(ubigeos, encontrado.idUbigeo);
      setDepartamentoSeleccionado(path?.department.id ?? "");
      setProvinciaSeleccionada(path?.province.id ?? "");
      setConsultaCliente("found");
      setError(null);
      setMensaje("Datos encontrados. Puedes modificarlos antes de registrar la venta.");
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : "No se encontró el cliente.";
      if (message.toLocaleLowerCase().includes("no se encontró")) {
        setConsultaCliente("missing");
        setMensaje("No hay un cliente previo con ese documento. Completa los datos para guardarlos en esta venta.");
      } else {
        setConsultaCliente("idle");
        setError(message);
      }
    }
  };

  const agregarProducto = (product: ProductoVenta) => {
    setLineas((current) => {
      const existing = current.find((line) => line.productoId === product.id);
      if (existing) {
        return current.map((line) => line.productoId === product.id
          ? { ...line, cantidad: Math.min(line.cantidad + 1, product.stockDisponible) }
          : line);
      }
      return [...current, { productoId: product.id, cantidad: 1 }];
    });
    setError(null);
  };

  const establecerUbigeo = (districtId: string) => {
    const path = findUbigeoPath(ubigeos, districtId);
    setCliente((current) => ({
      ...current,
      distrito: path?.district.name ?? "",
      idUbigeo: districtId,
      departamento: path?.department.name ?? "",
      provincia: path?.province.name ?? "",
    }));
    setDepartamentoSeleccionado(path?.department.id ?? "");
    setProvinciaSeleccionada(path?.province.id ?? "");
  };

  const submitSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    if (lineas.length === 0) {
      setError("Agrega al menos un producto para registrar la venta.");
      return;
    }
    if (faltaStock) {
      setError("Revisa las cantidades: superan el stock disponible.");
      return;
    }
    setGuardando(true);
    try {
      const input: VentaPresencialInput = {
        tipoEntrega,
        datosCliente: {
          ...cliente,
          numeroDocumento: cliente.numeroDocumento.trim(),
          nombres: cliente.nombres.trim(),
          apellidos: cliente.apellidos.trim(),
          telefono: cliente.telefono.trim(),
        },
        tipoComprobante,
        metodoPago,
        ruc: tipoComprobante === "FACTURA" ? ruc.trim() : null,
        razonSocial: tipoComprobante === "FACTURA" ? razonSocial.trim() : "",
        detalles: lineas,
      };
      const result = await registrarVentaPresencial(input, token);
      setLineas([]);
      setMensaje(`Venta ${result.codigoPedido} registrada correctamente. ${result.mensaje}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo registrar la venta.");
    } finally {
      setGuardando(false);
    }
  };

  return <>
    <PageHeading title="Nueva venta" description="Registra una venta presencial con datos del cliente y modalidad de entrega." />
    {errorCarga && <div className="category-error sale-error" role="alert"><span>{errorCarga}</span><button className="secondary-button category-action" type="button" onClick={() => {
      setCargando(true);
      setErrorCarga(null);
      setIntentoCarga((attempt) => attempt + 1);
    }}>Reintentar</button></div>}
    {error && <div className="category-error sale-error" role="alert">{error}</div>}
    {mensaje && <div className={`sale-feedback ${error ? "is-error" : "is-success"}`} role="status">{mensaje}</div>}

    <form className="panel sale-form" onSubmit={(event) => void submitSale(event)}>
      <div className="sale-layout">
        <div className="sale-customer-column">
      <section className="sale-section">
        <div className="sale-section-heading"><div><h2>Datos del cliente</h2><p>Busca un documento anterior o ingresa los datos; los campos se mantienen editables.</p></div></div>
        <div className="sale-form-grid">
          <label>Tipo de documento
            <select required value={cliente.tipoDocumento} onChange={(event) => updateCliente("tipoDocumento", event.target.value)}>
              {tiposDocumento.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label>Número de documento
            <div className="sale-document-search">
              <input required maxLength={20} pattern={cliente.tipoDocumento === "DNI" ? "[0-9]{8}" : cliente.tipoDocumento === "RUC" ? "[0-9]{11}" : "[A-Za-z0-9]{1,20}"} value={cliente.numeroDocumento} onChange={(event) => updateCliente("numeroDocumento", event.target.value)} />
              <button className="secondary-button" type="button" disabled={consultaCliente === "loading" || !cliente.numeroDocumento.trim()} onClick={() => void buscarCliente()}>
                <Icon name="search" size={15}/>{consultaCliente === "loading" ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </label>
          <label>Nombres<input required maxLength={80} value={cliente.nombres} onChange={(event) => updateCliente("nombres", event.target.value)} /></label>
          <label>Apellidos<input required maxLength={80} value={cliente.apellidos} onChange={(event) => updateCliente("apellidos", event.target.value)} /></label>
          <label>Teléfono<input required type="tel" inputMode="numeric" pattern="9[0-9]{8}" maxLength={9} value={cliente.telefono} onChange={(event) => updateCliente("telefono", event.target.value)} placeholder="9 dígitos, inicia con 9" /></label>
        </div>
      </section>

      <section className="sale-section">
        <div className="sale-section-heading"><div><h2>Entrega y comprobante</h2><p>Los datos de dirección solo se solicitan para delivery.</p></div></div>
        <div className="sale-form-grid">
          <label>Modalidad de entrega
            <select value={tipoEntrega} onChange={(event) => setTipoEntrega(event.target.value as "DELIVERY" | "RECOJO_TIENDA")}>
              <option value="DELIVERY">Delivery</option>
              <option value="RECOJO_TIENDA">Recojo en tienda</option>
            </select>
          </label>
          <label>Tipo de comprobante
            <select value={tipoComprobante} onChange={(event) => setTipoComprobante(event.target.value as "BOLETA" | "FACTURA")}>
              <option value="BOLETA">Boleta</option>
              <option value="FACTURA">Factura</option>
            </select>
          </label>
          <label>Método de pago
            <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value as VentaPresencialInput["metodoPago"])}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </label>
          {tipoComprobante === "FACTURA" && <>
            <label>RUC<input required pattern="[0-9]{11}" maxLength={11} value={ruc} onChange={(event) => setRuc(event.target.value)} /></label>
            <label>Razón social<input required maxLength={150} value={razonSocial} onChange={(event) => setRazonSocial(event.target.value)} /></label>
          </>}
        </div>
        {tipoEntrega === "DELIVERY" && <div className="sale-form-grid sale-delivery-fields">
          <label>Departamento
            <select required value={departamentoSeleccionado} onChange={(event) => {
              const selectedDepartment = ubigeos.find((entry) => entry.id === event.target.value);
              setDepartamentoSeleccionado(event.target.value);
              setProvinciaSeleccionada("");
              setCliente((current) => ({
                ...current,
                departamento: selectedDepartment?.name ?? "",
                provincia: "",
                distrito: "",
                idUbigeo: "",
              }));
            }}>
              <option value="">Selecciona departamento</option>
              {ubigeos.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label>Provincia
            <select required disabled={!provincias.length} value={provinciaSeleccionada} onChange={(event) => {
              const selectedProvince = provincias.find((entry) => entry.id === event.target.value);
              setProvinciaSeleccionada(event.target.value);
              setCliente((current) => ({
                ...current,
                provincia: selectedProvince?.name ?? "",
                distrito: "",
                idUbigeo: "",
              }));
            }}>
              <option value="">Selecciona provincia</option>
              {provincias.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
            </select>
          </label>
          <label>Distrito
            <select required disabled={!distritos.length} value={seleccionUbigeo?.district.id ?? ""} onChange={(event) => establecerUbigeo(event.target.value)}>
              <option value="">Selecciona distrito</option>
              {distritos.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
            </select>
          </label>
          <label>Código UBIGEO<input required readOnly value={cliente.idUbigeo} placeholder="Se completa al elegir distrito" /></label>
          <label>Dirección<input required maxLength={200} value={cliente.direccion} onChange={(event) => updateCliente("direccion", event.target.value)} /></label>
          <label>Código postal<input required maxLength={10} pattern="[0-9]+" value={cliente.codigoPostal} onChange={(event) => updateCliente("codigoPostal", event.target.value)} /></label>
          <label className="sale-field-wide">Referencia<input required maxLength={250} value={cliente.referencia} onChange={(event) => updateCliente("referencia", event.target.value)} /></label>
        </div>}
      </section>
        </div>

      <section className="sale-section sale-products-section">
        <div className="sale-section-heading"><div><h2>Productos</h2><p>Busca por nombre o código, filtra por categoría y agrega al carrito.</p></div></div>
        {cargando
          ? <div className="category-message">Cargando productos disponibles…</div>
          : productos.length === 0
            ? <div className="category-message">No hay productos registrados en el catálogo.</div>
            : <>
              {productos.every((producto) => producto.stockDisponible === 0) && <div className="sale-stock-notice" role="status">Los productos del catálogo aparecen aquí, pero no se pueden agregar hasta que tengan stock disponible.</div>}
              <div className="sale-product-filters">
                <label className="sale-product-search"><span className="sr-only">Buscar producto</span>
                  <Icon name="search" size={16}/>
                  <input type="search" value={busquedaProducto} onChange={(event) => {
                    setBusquedaProducto(event.target.value);
                    setPaginaProductos(0);
                  }} placeholder="Buscar producto o código"/>
                </label>
                <label className="sale-category-filter"><span className="sr-only">Filtrar por categoría</span>
                  <select value={categoriaProducto} onChange={(event) => {
                    setCategoriaProducto(event.target.value);
                    setPaginaProductos(0);
                  }}>
                    <option value="">Todas las categorías</option>
                    {categoriasProducto.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                  </select>
                </label>
              </div>
              {errorImagenes && <div className="sale-image-error" role="status">{errorImagenes} Se muestran los productos sin imagen.</div>}
              {productosFiltrados.length === 0
                ? <div className="category-message">No hay productos que coincidan con la búsqueda y categoría.</div>
                : <div className="sale-product-grid">
                  {productosVisibles.map((producto) => {
                    const cantidadEnCarrito = lineas.find((linea) => linea.productoId === producto.id)?.cantidad ?? 0;
                    const imagen = imagenesProducto[producto.id];
                    const sinStock = producto.stockDisponible < 1;
                    return <article className="sale-product-card" key={producto.id}>
                      <div className="sale-product-image">
                        {imagen
                          ? <img src={imagen} alt={producto.nombre} loading="lazy"/>
                          : <Icon name="box" size={28}/>}
                      </div>
                      <div className="sale-product-info">
                        <small>{producto.categoriaNombre}</small>
                        <strong title={producto.nombre}>{producto.nombre}</strong>
                        <span>{producto.codigo} · {sinStock ? "Sin stock" : `Stock ${producto.stockDisponible}`}</span>
                        <b>{moneda.format(producto.precioFinal)}</b>
                      </div>
                      <button className={`sale-product-add ${cantidadEnCarrito ? "is-added" : ""}`} type="button" disabled={sinStock || cantidadEnCarrito >= producto.stockDisponible} onClick={() => agregarProducto(producto)}>
                        <Icon name={sinStock ? "close" : cantidadEnCarrito ? "check" : "plus"} size={15}/>
                        {sinStock ? "No disponible" : cantidadEnCarrito ? `En carrito · ${cantidadEnCarrito}` : "Agregar"}
                      </button>
                    </article>;
                  })}
                </div>}
              {paginasProductos > 1 && <nav className="sale-product-pagination" aria-label="Páginas de productos">
                <button className="secondary-button" type="button" disabled={paginaProductos === 0} onClick={() => setPaginaProductos((page) => page - 1)}>Anterior</button>
                <span>Página {paginaProductos + 1} de {paginasProductos}</span>
                <button className="secondary-button" type="button" disabled={paginaProductos + 1 >= paginasProductos} onClick={() => setPaginaProductos((page) => page + 1)}>Siguiente</button>
              </nav>}
            </>}
        {lineasDetalle.length > 0 && <div className="sale-lines">
          {lineasDetalle.map(({ productoId, cantidad, producto }) => <div className="sale-line" key={productoId}>
            <div className="sale-line-product"><strong>{producto?.nombre ?? "Producto"}</strong><small>{producto?.codigo} · {producto ? moneda.format(producto.precioFinal) : ""} · Disponible: {producto?.stockDisponible ?? 0}</small></div>
            <label>Cantidad<input type="number" min="1" max={producto?.stockDisponible ?? 1} value={cantidad} onChange={(event) => setLineas((current) => current.map((line) => line.productoId === productoId ? { ...line, cantidad: Math.max(1, Number(event.target.value) || 1) } : line))} /></label>
            <strong>{moneda.format((producto?.precioFinal ?? 0) * cantidad)}</strong>
            <button className="icon-button sale-remove-line" type="button" aria-label={`Quitar ${producto?.nombre ?? "producto"}`} onClick={() => setLineas((current) => current.filter((line) => line.productoId !== productoId))}><Icon name="close" size={17}/></button>
          </div>)}
        </div>}
        <div className="sale-total"><span>Subtotal de productos</span><strong>{moneda.format(subtotal)}</strong></div>
        <p className="sale-tax-note">El total final, incluido IGV, se calcula en el servidor.</p>
      </section>
      </div>

      <footer className="sale-submit">
        <p>No se solicita ni se crea correo o contraseña para registrar la venta.</p>
        <button className="primary-button" type="submit" disabled={guardando || cargando || Boolean(errorCarga) || lineas.length === 0 || faltaStock}>
          {guardando ? "Registrando venta…" : "Registrar venta"}
        </button>
      </footer>
    </form>
  </>;
}
