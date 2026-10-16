export type ProductoMasVendido = {
  productoId: string;
  codigo: string;
  nombre: string;
  unidadesVendidas: number;
  importeVendido: number;
};

export type InventarioReporte = {
  almacenId: string;
  almacenCodigo: string;
  almacenNombre: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  categoriaNombre: string | null;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  stockBajo: boolean;
};

export type PagoResumen = {
  metodoPago: string;
  estado: string;
  cantidadPagos: number;
  montoTotal: number;
};

export type ReporteVentasInventario = {
  desde: string;
  hasta: string;
  generadoEn: string;
  cantidadVentas: number;
  ventasWeb: number;
  ventasPresenciales: number;
  ingresosTotales: number;
  productosMasVendidos: ProductoMasVendido[];
  resumenPagos: PagoResumen[];
  inventarioActual: InventarioReporte[];
};
