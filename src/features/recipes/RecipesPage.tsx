// src/features/recipes/RecipesPage.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/routes/paths";
import { recipePaths } from "./paths";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { isManager } from "@/lib/auth";
import { listRecipes } from "./api";
import { RecipeCard } from "./components/RecipeCard";
import { useLoad } from "./hooks/useLoad";
import { matchesQuery } from "./lib/format";
import "./recipes.css";

export function RecipesPage() {
  const { role } = useAuthStatus();
  const canManage = isManager(role);
  const { data, error, loading } = useLoad(listRecipes, "library");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => (data ?? []).filter((r) => matchesQuery(r, query)), [data, query]);

  return (
    <div className="wrap rc">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            <Link to={paths.launcher} className="eyebrow">tools</Link> /{" "}
            <span>recipes</span>
          </p>
          <div className="rc-actions">
            {canManage && (
              <Link to={recipePaths.new} className="rc-btn rc-btn--cta">Add recipe</Link>
            )}
          </div>
        </div>
        <h1>Recipes</h1>
        <p>Everything we cook, in one place.</p>
      </header>

      <main className="rc-main">
        <div className="rc-search">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or category"
            aria-label="Search by name or category"
          />
        </div>

        {loading && <p className="empty" role="status">Loading recipes…</p>}
        {error && <p className="rc-error" role="alert">{error}</p>}

        {data && (
          <>
            <p className="rc-sr" role="status">
              {query ? `${shown.length} of ${data.length} recipes` : `${data.length} recipes`}
            </p>
            {shown.length > 0 ? (
              <div className="rc-grid">
                {shown.map((r) => (
                  <RecipeCard key={r.id} recipe={r} />
                ))}
              </div>
            ) : (
              <p className="empty">
                {data.length === 0 ? "No recipes yet." : `Nothing matches “${query}”.`}
              </p>
            )}
          </>
        )}
      </main>

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
