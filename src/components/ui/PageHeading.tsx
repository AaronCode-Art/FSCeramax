import type { ReactNode } from "react";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-head">
    <div><h1>{title}</h1><p>{description}</p></div>
    {action && <div className="page-actions">{action}</div>}
  </div>;
}
