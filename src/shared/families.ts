// src/shared/families.ts
// The six base drinks ("families") every recipe descends from, inspired by the
// family trees in The Cocktail Codex, plus the shared vocabulary for roles and changes.
// No zod in here, so the React app can import the values without pulling it into the bundle.

export const FAMILIES = ["old-fashioned", "martini", "daiquiri", "sidecar", "highball", "flip"] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_INFO: Record<Family, { label: string; hint: string }> = {
  "old-fashioned": { label: "Old Fashioned", hint: "Spirit, sugar, bitters" },
  martini: { label: "Martini", hint: "Spirit and aromatized wine" },
  daiquiri: { label: "Daiquiri", hint: "Spirit, citrus, sugar" },
  sidecar: { label: "Sidecar", hint: "Spirit, citrus, liqueur" },
  highball: { label: "Whiskey Highball", hint: "Spirit and a carbonated mixer" },
  flip: { label: "Flip", hint: "Spirit, egg, sugar" },
};

/** One shared vocabulary for the slot an ingredient fills, used by changes and (later) recipe lines. */
export const ROLES = ["base", "sweetener", "sour", "modifier", "bitters", "topper", "garnish"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  base: "Base",
  sweetener: "Sweetener",
  sour: "Sour",
  modifier: "Modifier",
  bitters: "Bitters",
  topper: "Topper",
  garnish: "Garnish",
};

export const CHANGE_TYPES = ["swap", "add", "remove", "technique"] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

/** What makes a drink different from its parent. Ingredient names are plain text. */
export type RecipeChange =
  | { type: "swap"; role: Role; from: string; to: string }
  | { type: "add"; role?: Role; to: string }
  | { type: "remove"; role?: Role; from: string }
  | { type: "technique"; detail: string };
