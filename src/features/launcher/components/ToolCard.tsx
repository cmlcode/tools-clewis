import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import type { Tool } from "../data/tools";
import "./tool-card.css"

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link to={tool.href} className="card-link">
      <Panel className="card">
        <div className="ref">{tool.ref}</div>
        <h2>{tool.title}</h2>
        <p>{tool.description}</p>
        <span className={`status status--${tool.status.toLowerCase()}`}>
          {tool.status}
        </span>
      </Panel>
    </Link>
  );
}
