export type PagoResumen = {
  metodoPago: string;
  estado: string;
  cantidadPagos: number;
  montoTotal: number;
};

export type ResumenPagosResponse = {
  desde: string;
  hasta: string;
  resumenPagos: PagoResumen[];
};
