// src/features/bar/components/MenuList.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FAMILY_INFO } from "@/shared/families";
import { listRecipes } from "../services/barService";
import { drinkHref } from "../lib/lineage";
import type { Recipe } from "../types";
import "../lineage.css";

/** Most drinks shown at once; guests search to narrow the rest. */
const MAX_VISIBLE = 3;

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

  // Name matches first, then everything else that matches (ingredients, family name), each alphabetical.
  const matches = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    const sorted = [...recipes]
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;

    const nameHit = (r: Recipe) => r.name.toLowerCase().includes(q);
    const otherHit = (r: Recipe) =>
      r.ingredients.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.family !== null && FAMILY_INFO[r.family].label.toLowerCase().includes(q));
    return [...sorted.filter(nameHit), ...sorted.filter((r) => !nameHit(r) && otherHit(r))];
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
        {matches.slice(0, MAX_VISIBLE).map((r) => (
          <li key={r.id} className="menu-item">
            <div>
              <Link to={drinkHref(r.id)} className="menu-name">
                {r.name}
              </Link>
              {r.family && (
                <span className={`family-tag family--${r.family}`}>{FAMILY_INFO[r.family].label} family</span>
              )}
              <span className="menu-desc">{r.description || r.ingredients}</span>
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

      {matches.length > MAX_VISIBLE && (
        <p className="menu-note">
          Showing {MAX_VISIBLE} of {matches.length} drinks. Search to find more.
        </p>
      )}
    </section>
  );
}
