import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export type TableColumn<Row> = {
  key: keyof Row;
  label: string;
  render?: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyTitle,
  emptyDescription,
}: {
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return <div className="table-scroll">
    <table>
      <thead><tr>{columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr></thead>
      <tbody>{rows.length === 0
        ? <tr><td className="empty-table-cell" colSpan={Math.max(columns.length, 1)}><EmptyState title={emptyTitle} description={emptyDescription}/></td></tr>
        : rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={String(column.key)} data-label={column.label}>{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
