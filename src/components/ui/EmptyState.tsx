import type { IconName } from "../../app/types";
import { Icon } from "./Icon";

export function EmptyState({
  title = "Aún no hay registros",
  description = "Cuando existan registros, aparecerán aquí.",
  icon = "file",
}: {
  title?: string;
  description?: string;
  icon?: IconName;
}) {
  return <div className="empty-state" role="status">
    <span><Icon name={icon}/></span>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>;
}
