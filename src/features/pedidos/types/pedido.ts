export type DatosEntregaPedido = {
  destinatario: string | null;
  telefono: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  referencia: string | null;
  sucursalNombre: string | null;
  sucursalDireccion: string | null;
};

export type PedidoResumen = {
  id: string;
  codigo: string;
  canal: string;
  tipoEntrega: string;
  estadoCodigo: string;
  estadoNombre: string;
  tipoComprobante: string | null;
  serie: string | null;
  numeroComprobante: string | null;
  total: number;
  createdAt: string;
  datosEntrega: DatosEntregaPedido | null;
};

export type DetallePedido = {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  categoriaNombre: string | null;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  subtotal: number;
  estadoStock: string | null;
};

export type Pedido = PedidoResumen & {
  logisticaId: string | null;
  logisticaNombre: string | null;
  deliveryId: string | null;
  deliveryNombre: string | null;
  subtotal: number;
  descuentoCupon: number;
  costoEnvio: number;
  igv: number;
  tieneReserva: boolean;
  despachado: boolean;
  detalles: DetallePedido[];
};

export type PaginaPedidos = {
  contenido: PedidoResumen[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  primera: boolean;
  ultima: boolean;
  haySiguiente: boolean;
};

export type DeliveryOpcion = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
};
