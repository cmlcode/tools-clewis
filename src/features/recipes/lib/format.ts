// src/features/recipes/lib/format.ts
// Time, quantity and servings helpers shared by the recipe pages.
import type { IngredientDto, RecipeSummaryDto } from "../shared/recipes";

/** 12 → "12 min", 60 → "1 hr", 190 → "3 hr 10", 150 → "2 hr 30" (same style as the mockup). */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} hr ${m}` : `${h} hr`;
}

/** "6 servings", "1 serving". */
export function servingsLabel(n: number): string {
  return `${n} ${n === 1 ? "serving" : "servings"}`;
}

// ---- Quantities -------------------------------------------------------------

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

/** 1.5 → "1½", 0.333 → "⅓", 12.25 → "12.3". Amounts it can't show as a tidy fraction fall back to decimals. */
export function formatQty(qty: number): string {
  if (qty >= 10) return String(Math.round(qty * 10) / 10);

  let whole = Math.floor(qty);
  const rest = qty - whole;

  if (rest < 0.04) return String(whole || Math.round(qty * 100) / 100);
  if (rest > 0.96) return String(whole + 1);

  for (const [value, glyph] of FRACTIONS) {
    if (Math.abs(rest - value) < 0.04) return `${whole || ""}${glyph}`;
  }
  return String(Math.round(qty * 100) / 100);
}

const GLYPH_VALUES = new Map<string, number>(FRACTIONS.map(([v, g]) => [g, v]));

/**
 * Reads what a person types into an amount box: "2", "1.5", "1/2", "1 1/2", "1½", "½".
 * Returns null for an empty box, NaN for something it can't read.
 */
export function parseQty(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // A trailing unicode fraction, with or without a whole number before it.
  const glyph = [...s].at(-1);
  if (glyph && GLYPH_VALUES.has(glyph)) {
    const head = s.slice(0, -1).trim();
    const whole = head === "" ? 0 : Number(head);
    return Number.isFinite(whole) && whole >= 0 ? whole + GLYPH_VALUES.get(glyph)! : NaN;
  }

  const finite = (v: number) => (Number.isFinite(v) ? v : NaN); // "1/0" is not an amount

  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return finite(Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]));

  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return finite(Number(frac[1]) / Number(frac[2]));

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const SINGULAR: Record<string, string> = { cups: "cup", cans: "can", pinches: "pinch" };
const PLURAL: Record<string, string> = { cup: "cups", can: "cans", pinch: "pinches" };

/** "cup" and "cups" follow the amount; every other unit is shown as written. */
export function unitLabel(unit: string | null, qty: number | null): string {
  if (!unit) return "";
  if (qty === null) return unit;
  const key = unit.toLowerCase();
  if (qty > 1 && PLURAL[key]) return PLURAL[key];
  if (qty <= 1 && SINGULAR[key]) return SINGULAR[key];
  return unit;
}

/** The amount column for one ingredient, e.g. "1½ cups". */
export function amountText(ing: IngredientDto): string {
  const qty = ing.qty;
  if (qty === null) return ing.unit ?? "";
  const unit = unitLabel(ing.unit, qty);
  return unit ? `${formatQty(qty)} ${unit}` : formatQty(qty);
}

// ---- Search -----------------------------------------------------------------

/** True when every word in the query appears in the recipe name or category. */
export function matchesQuery(r: RecipeSummaryDto, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [r.title, r.category].join("\n").toLowerCase();
  return words.every((w) => haystack.includes(w));
}
