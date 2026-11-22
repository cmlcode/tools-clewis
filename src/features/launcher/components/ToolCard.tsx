/* src/features/launcher/components/ToolCard.tsx */
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import type { Tool } from "../data/tools";
import "./tool-card.css"

/** A status that comes from live data (e.g. the bar's open/closed), overriding tool.status. */
export type LiveStatus = { label: string; tone: string };

export function ToolCard({ tool, liveStatus }: { tool: Tool; liveStatus?: LiveStatus }) {
  const label = liveStatus?.label ?? tool.status;
  const tone = (liveStatus?.tone ?? tool.status).toLowerCase();

  return (
    <Link to={tool.href} className="card-link">
      <Panel className="card">
        <div className="ref">{tool.ref}</div>
        <h2>{tool.title}</h2>
        <p>{tool.description}</p>
        <span className={`status status--${tone}`}>{label}</span>
      </Panel>
    </Link>
  );
}
