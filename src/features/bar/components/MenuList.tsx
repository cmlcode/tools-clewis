// src/features/bar/components/MenuList.tsx
import { useEffect, useMemo, useState } from "react";
import { listRecipes } from "../services/barService";
import type { Recipe } from "../types";

interface MenuListProps {
  /** Called with the drink's name when a guest taps "Order". */
  onPick: (drink: string) => void;
  /** True when the bar is closed, so picking is turned off. */
  disabled?: boolean;
}

export function MenuList({ onPick, disabled = false }: MenuListProps) {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    listRecipes()
      .then((r) => {
        if (!cancelled) setRecipes(r);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Name matches first, then ingredient matches, each alphabetical.
  const matches = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;

    const byName = sorted.filter((r) => r.name.toLowerCase().includes(q));
    const byIngredient = sorted.filter(
      (r) => !r.name.toLowerCase().includes(q) && r.ingredients.toLowerCase().includes(q)
    );
    return [...byName, ...byIngredient];
  }, [recipes, query]);

  return (
    <section className="menu" aria-labelledby="menu-heading">
      <h2 id="menu-heading">Menu</h2>

      <div className="menu-search">
        <label htmlFor="menu-search" className="visually-hidden">
          Search the menu
        </label>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id="menu-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search drinks or ingredients"
          autoComplete="off"
        />
      </div>

      {/* announces the result count to screen readers as the guest types */}
      <p className="visually-hidden" role="status">
        {recipes ? `${matches.length} drinks` : ""}
      </p>

      {failed && <p className="menu-note">Couldn't load the menu. You can still type a drink below.</p>}
      {!failed && recipes === null && <p className="menu-note">Loading the menu…</p>}
      {recipes && recipes.length === 0 && <p className="menu-note">The menu is empty right now.</p>}
      {recipes && recipes.length > 0 && matches.length === 0 && (
        <p className="menu-note">Nothing on the menu matches that. Try another word.</p>
      )}

      <ul className="menu-list">
        {matches.map((r) => (
          <li key={r.id} className="menu-item">
            <div>
              <span className="menu-name">{r.name}</span>
              <span className="menu-desc">{r.ingredients}</span>
            </div>
            <button
              type="button"
              className="menu-order"
              disabled={disabled}
              onClick={() => onPick(r.name)}
              aria-label={`Order ${r.name}`}
            >
              Order →
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
