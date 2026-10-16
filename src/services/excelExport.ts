import * as XLSX from "xlsx";

type ExcelValue = string | number | boolean | null;

export function descargarExcelFiltrado({
  nombreArchivo,
  nombreHoja,
  encabezados,
  filas,
}: {
  nombreArchivo: string;
  nombreHoja: string;
  encabezados: string[];
  filas: ExcelValue[][];
}): void {
  if (encabezados.length === 0) {
    throw new Error("No se puede exportar una hoja sin columnas.");
  }

  const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  hoja["!autofilter"] = {
    ref: `A1:${XLSX.utils.encode_col(encabezados.length - 1)}${Math.max(filas.length + 1, 1)}`,
  };
  hoja["!cols"] = encabezados.map((encabezado, index) => ({
    wch: Math.min(
      42,
      Math.max(
        encabezado.length + 2,
        ...filas.slice(0, 100).map((fila) => String(fila[index] ?? "").length + 2),
      ),
    ),
  }));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31));
  XLSX.writeFile(libro, nombreArchivo, { compression: true });
}
