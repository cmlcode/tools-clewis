// src/features/recipes/components/IngredientList.tsx
import { useState } from "react";
import type { RecipeDto } from "../shared/recipes";
import { amountText, servingsLabel } from "../lib/format";

export function IngredientList({ recipe }: { recipe: RecipeDto }) {
  // Ticks are just for this visit: every time the page loads, the list starts blank.
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <section className="rc-panel rc-ingredients" aria-labelledby="rc-ing-title">
      <h2 id="rc-ing-title" className="rc-label">Ingredients</h2>

      <p className="rc-servings">{servingsLabel(recipe.servings)}</p>

      {recipe.ingredients.length === 0 ? (
        <p className="empty">No ingredients yet.</p>
      ) : (
        <ul className="rc-ing-list">
          {recipe.ingredients.map((ing, i) => {
            const done = checked.has(i);
            return (
              <li key={i}>
                <label className={`rc-ing${done ? " rc-ing--done" : ""}`}>
                  <input type="checkbox" checked={done} onChange={() => toggle(i)} />
                  <span className="rc-ing-amount">{amountText(ing)}</span>
                  <span className="rc-ing-name">{ing.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

    </section>
  );
}
