import type { ReactNode } from "react";
import "./panel.css"

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return <div className={`panel ${className}`}>{children}</div>;
}
