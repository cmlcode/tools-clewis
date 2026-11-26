// src/features/bar/components/DrinkLink.tsx
// Shows a drink name; if the menu has a recipe with that name, it links to the recipe page.
// The recipe list is fetched once and shared by every DrinkLink on the page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRecipes } from "../services/barService";
import { drinkHref } from "../lib/lineage";
import type { Recipe } from "../types";

let cache: Promise<Recipe[]> | null = null;
function recipes(): Promise<Recipe[]> {
  if (!cache) {
    cache = listRecipes().catch(() => {
      cache = null; // let the next render try again
      return [] as Recipe[];
    });
  }
  return cache;
}

const norm = (s: string) => s.trim().toLowerCase();

export function DrinkLink({ name }: { name: string }) {
  const [match, setMatch] = useState<Recipe | null>(null);

  useEffect(() => {
    let cancelled = false;
    recipes().then((list) => {
      if (!cancelled) setMatch(list.find((r) => norm(r.name) === norm(name)) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!match) return <>{name}</>;
  return (
    <Link to={drinkHref(match.id)} className="drink-link" title="View recipe">
      {name}
    </Link>
  );
}
