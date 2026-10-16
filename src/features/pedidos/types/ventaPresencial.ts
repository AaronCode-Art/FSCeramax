export type DatosClienteVenta = {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  codigoPostal: string;
  referencia: string;
  idUbigeo: string;
};

export type ProductoVenta = {
  id: string;
  codigo: string;
  nombre: string;
  categoriaNombre: string;
  precioFinal: number;
  stockDisponible: number;
};

export type VentaPresencialInput = {
  tipoEntrega: "DELIVERY" | "RECOJO_TIENDA";
  datosCliente: DatosClienteVenta;
  tipoComprobante: "BOLETA" | "FACTURA";
  metodoPago: "TARJETA" | "YAPE" | "PLIN" | "TRANSFERENCIA" | "EFECTIVO";
  ruc: string | null;
  razonSocial: string;
  detalles: Array<{ productoId: string; cantidad: number }>;
};

export type VentaPresencialResult = {
  pedidoId: string;
  codigoPedido: string;
  tipoResolucion: string;
  mensaje: string;
};
