// src/features/recipes/shared/recipes.ts
// Request schemas + response types for food recipes, shared by the Worker and the React app.
// In React files, use `import type { ... }` so zod stays out of the client bundle.
import { z } from "zod";

export const RECIPE_CATEGORIES = ["breakfast", "lunch", "dinner", "sides"] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const STEP_PHASES = ["prep", "cook"] as const;
export type StepPhase = (typeof STEP_PHASES)[number];

// These slugs are routes, so a recipe can't use them.
export const RESERVED_SLUGS = ["new"] as const;

// ---- Response types ---------------------------------------------------------

export type IngredientDto = {
  qty: number | null;
  unit: string | null;
  name: string;
};

export type StepDto = {
  phase: StepPhase;
  body: string;
  minutes: number | null;
};

/** What the library page needs, including ingredient names so search can match them. */
export type RecipeSummaryDto = {
  id: number;
  slug: string;
  title: string;
  category: RecipeCategory;
  /** Total time start to finish, in minutes. */
  cookMinutes: number;
  servings: number;
  tint: string;
  /** Where to load the photo from, or null when the recipe has none. */
  photoUrl: string | null;
};

export type RecipeDto = RecipeSummaryDto & {
  ingredients: IngredientDto[];
  steps: StepDto[];
  createdAt: string;
  updatedAt: string;
};

// ---- Request schemas --------------------------------------------------------

const ingredient = z.object({
  qty: z.number().positive().max(100000).nullable(),
  unit: z.string().trim().max(20).nullable(),
  name: z.string().trim().min(1).max(120),
});

const step = z.object({
  phase: z.enum(STEP_PHASES),
  body: z.string().trim().min(1).max(2000),
  minutes: z.number().int().min(0).max(10080).nullable(),
});

/** Full recipe body. Used for create and for replacing an existing recipe. */
export const RecipeBody = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.enum(RECIPE_CATEGORIES),
  cookMinutes: z.number().int().min(1).max(10080),
  servings: z.number().int().min(1).max(1000),
  // Optional: the server picks a plate color on create and keeps the existing one on edit.
  tint: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ingredients: z.array(ingredient).max(60),
  steps: z.array(step).max(60),
});
export type RecipeBodyInput = z.infer<typeof RecipeBody>;
