import type { DrinkChange } from "@/shared/families";
import { changeText } from "../lib/lineage";

/** The structured changes that make a drink different from its parent, one chip each. */
export function ChangeChips({ changes }: { changes?: DrinkChange[] }) {
  if (!changes || changes.length === 0) return null;

  return (
    <ul className="change-chips" aria-label="What changed from the parent drink">
      {changes.map((c, i) => (
        <li key={i} className={`chip chip--${c.type}`}>
          {c.type === "remove" && <span className="visually-hidden">Remove: </span>}
          {changeText(c)}
        </li>
      ))}
    </ul>
  );
}
