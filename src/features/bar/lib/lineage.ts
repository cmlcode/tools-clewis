// src/features/bar/lib/lineage.ts
// Builds the family tree from the flat drink list. A home bar has a few dozen drinks,
// so the whole list is fetched once and the tree is worked out here (no recursive SQL).
import { ROLE_LABELS, type Role, type DrinkChange } from "@/shared/families";
import type { Drink } from "../types";

export const drinkHref = (id: number) => `/bar/drinks/${id}`;

export function indexById(drinks: Drink[]): Map<number, Drink> {
  return new Map(drinks.map((r) => [r.id, r]));
}

/** Parent, grandparent, ... root. The first item is the root; the drink itself is not included. */
export function ancestors(drink: Drink, byId: Map<number, Drink>): Drink[] {
  const chain: Drink[] = [];
  const seen = new Set<number>([drink.id]);
  let cur = drink.parentId === null ? undefined : byId.get(drink.parentId);
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.parentId === null ? undefined : byId.get(cur.parentId);
  }
  return chain;
}

export function childrenOf(drink: Drink, drinks: Drink[]): Drink[] {
  return drinks.filter((r) => r.parentId === drink.id && !r.hidden).sort((a, b) => a.name.localeCompare(b.name));
}

/** The slots (base, sweetener, ...) this drink changed relative to its parent. */
export function changedRoles(drink: Drink): Set<Role> {
  const roles = new Set<Role>();
  for (const c of drink.changes ?? []) {
    if (c.type !== "technique" && c.role) roles.add(c.role);
  }
  return roles;
}

/** Other drinks in the same family that changed the same slot (e.g. other base swaps). */
export function moreLikeThis(drink: Drink, drinks: Drink[], limit = 6): Drink[] {
  const roles = changedRoles(drink);
  if (!drink.family || roles.size === 0) return [];
  return drinks
    .filter(
      (r) =>
        r.id !== drink.id &&
        !r.hidden &&
        r.family === drink.family &&
        [...changedRoles(r)].some((role) => roles.has(role))
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Text for a change chip, e.g. "Sweetener: simple syrup → sweet vermouth". */
export function changeText(c: DrinkChange): string {
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
