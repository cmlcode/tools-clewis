// src/features/bar/lib/lineage.ts
// Builds the family tree from the flat recipe list. A home bar has a few dozen drinks,
// so the whole list is fetched once and the tree is worked out here (no recursive SQL).
import { ROLE_LABELS, type Role, type RecipeChange } from "@/shared/families";
import type { Recipe } from "../types";

export const drinkHref = (id: number) => `/bar/drinks/${id}`;

export function indexById(recipes: Recipe[]): Map<number, Recipe> {
  return new Map(recipes.map((r) => [r.id, r]));
}

/** Parent, grandparent, ... root. The first item is the root; the recipe itself is not included. */
export function ancestors(recipe: Recipe, byId: Map<number, Recipe>): Recipe[] {
  const chain: Recipe[] = [];
  const seen = new Set<number>([recipe.id]);
  let cur = recipe.parentId === null ? undefined : byId.get(recipe.parentId);
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.parentId === null ? undefined : byId.get(cur.parentId);
  }
  return chain;
}

export function childrenOf(recipe: Recipe, recipes: Recipe[]): Recipe[] {
  return recipes.filter((r) => r.parentId === recipe.id).sort((a, b) => a.name.localeCompare(b.name));
}

/** The slots (base, sweetener, ...) this drink changed relative to its parent. */
export function changedRoles(recipe: Recipe): Set<Role> {
  const roles = new Set<Role>();
  for (const c of recipe.changes ?? []) {
    if (c.type !== "technique" && c.role) roles.add(c.role);
  }
  return roles;
}

/** Other drinks in the same family that changed the same slot (e.g. other base swaps). */
export function moreLikeThis(recipe: Recipe, recipes: Recipe[], limit = 6): Recipe[] {
  const roles = changedRoles(recipe);
  if (!recipe.family || roles.size === 0) return [];
  return recipes
    .filter(
      (r) =>
        r.id !== recipe.id &&
        r.family === recipe.family &&
        [...changedRoles(r)].some((role) => roles.has(role))
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Text for a change chip, e.g. "Sweetener: simple syrup → sweet vermouth". */
export function changeText(c: RecipeChange): string {
  const slot = (role?: Role) => (role ? `${ROLE_LABELS[role]}: ` : "");
  switch (c.type) {
    case "swap":
      return `${slot(c.role)}${c.from} → ${c.to}`;
    case "add":
      return `+ ${c.to}`;
    case "remove":
      return `${c.from}`;
    case "technique":
      return c.detail;
  }
}
