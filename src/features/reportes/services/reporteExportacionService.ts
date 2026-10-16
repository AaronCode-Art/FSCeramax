import { apiDownload } from "../../../services/api";

export type FormatoReporte = "pdf" | "excel";

export async function descargarReporte(
  formato: FormatoReporte,
  desde: string,
  hasta: string,
  token: string,
): Promise<void> {
  const query = new URLSearchParams({ desde, hasta });
  const archivo = await apiDownload(
    `/api/v1/reportes/ventas-inventario/${formato}?${query.toString()}`,
    token,
  );
  const url = URL.createObjectURL(archivo.blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo.filename;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
