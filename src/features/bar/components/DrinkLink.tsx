// src/features/bar/components/DrinkLink.tsx
// Shows a drink name; if the menu has a drink with that name, it links to the drink page.
// The drinks list is fetched once and shared by every DrinkLink on the page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDrinks } from "../services/barService";
import { drinkHref } from "../lib/lineage";
import type { Drink } from "../types";

let cache: Promise<Drink[]> | null = null;
function drinks(): Promise<Drink[]> {
  if (!cache) {
    cache = listDrinks().catch(() => {
      cache = null; // let the next render try again
      return [] as Drink[];
    });
  }
  return cache;
}

const norm = (s: string) => s.trim().toLowerCase();

export function DrinkLink({ name }: { name: string }) {
  const [match, setMatch] = useState<Drink| null>(null);

  useEffect(() => {
    let cancelled = false;
    drinks().then((list) => {
      if (!cancelled) setMatch(list.find((r) => norm(r.name) === norm(name)) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!match) return <>{name}</>;
  return (
    <Link to={drinkHref(match.id)} className="drink-link" title="View drink">
      {name}
    </Link>
  );
}
