import { Icon } from "./Icon";
import { PageHeading } from "./PageHeading";
import { EmptyState } from "./EmptyState";
import { DataTable, type TableColumn } from "./DataTable";

type EmptyRecord = Record<string, string>;

export function EmptyResourcePage({
  title,
  description,
  emptyDescription = "Esta vista está lista para conectarse con el backend. Todavía no se muestran registros.",
  columns = [],
  icon = "file",
  action,
}: {
  title: string;
  description: string;
  emptyDescription?: string;
  columns?: string[];
  icon?: "file" | "box" | "cart" | "truck" | "users" | "chart" | "store";
  action?: string;
}) {
  const tableColumns: TableColumn<EmptyRecord>[] = columns.map((label) => ({ key: label, label }));

  return <>
    <PageHeading title={title} description={description} action={action && <button className="primary-button" disabled title="Disponible al conectar el backend"><Icon name="plus" size={17}/>{action}</button>}/>
    <section className="panel page-panel">
      {columns.length > 0
        ? <DataTable columns={tableColumns} rows={[]} rowKey={() => ""} emptyTitle="Sin datos disponibles" emptyDescription={emptyDescription}/>
        : <EmptyState title="Sin datos disponibles" description={emptyDescription} icon={icon}/>}
    </section>
  </>;
}
