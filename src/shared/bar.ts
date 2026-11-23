// src/shared/bar.ts
// Request schemas + response types shared by the Worker and the React app.
// In React files, prefer `import type { ... }` so zod stays out of the client bundle.
import { z } from "zod";
import { FAMILIES, ROLES, type Family, type RecipeChange } from "./families";

export const ORDER_STATUSES = ["pending", "made", "served"] as const;

// ---- Response types ---------------------------------------------------------

export type BarStatusDto = { isOpen: boolean };

export type OrderDto = {
  id: number;
  guestName: string;
  drink: string;
  status: (typeof ORDER_STATUSES)[number];
  createdAt: string;
};

// What a guest may see about an order (no guest name).
export type PublicOrderDto = Pick<OrderDto, "id" | "drink" | "status">;

export type RecipeDto = {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  /** Short line for the menu. */
  description: string;
  /** Which of the six base drinks this belongs to (null for recipes added before lineage existed). */
  family: Family | null;
  /** The drink this one is derived from; null for the six base drinks. */
  parentId: number | null;
  /** Structured changes relative to the parent. */
  changes: RecipeChange[];
  /** Prose nuance the change chips can't carry. */
  changeNote: string;
  createdAt: string;
};

// ---- Request schemas --------------------------------------------------------

// Field schemas, defined once and reused by both recipe bodies.
const recipeName = z.string().trim().min(1).max(100);
const recipeIngredients = z.string().trim().min(1).max(2000);
const recipeInstructions = z.string().trim().max(5000);

const recipeDescription = z.string().trim().max(200);
const recipeFamily = z.enum(FAMILIES).nullable();
const recipeParentId = z.number().int().positive().nullable();
const recipeChangeNote = z.string().trim().max(1000);

// Changes are relative to the parent drink. Each type requires what it needs.
const changeText = z.string().trim().min(1).max(100);
const recipeChange = z.discriminatedUnion("type", [
  z.object({ type: z.literal("swap"), role: z.enum(ROLES), from: changeText, to: changeText }),
  z.object({ type: z.literal("add"), role: z.enum(ROLES).optional(), to: changeText }),
  z.object({ type: z.literal("remove"), role: z.enum(ROLES).optional(), from: changeText }),
  z.object({ type: z.literal("technique"), detail: z.string().trim().min(1).max(200) }),
]);
const recipeChanges = z.array(recipeChange).max(12);

// Default only on create, so a partial update never wipes existing values.
// A new drink needs a family or a parent (the family is then copied from the parent).
export const CreateRecipeBody = z
  .object({
    name: recipeName,
    description: recipeDescription.default(""),
    ingredients: recipeIngredients,
    instructions: recipeInstructions.default(""),
    family: recipeFamily.optional(),
    parentId: recipeParentId.optional(),
    changes: recipeChanges.default([]),
    changeNote: recipeChangeNote.default(""),
  })
  .refine((b) => b.family != null || b.parentId != null, {
    message: "Pick a family or a parent drink",
    path: ["family"],
  });

export const UpdateRecipeBody = z
  .object({
    name: recipeName,
    description: recipeDescription,
    ingredients: recipeIngredients,
    instructions: recipeInstructions,
    family: recipeFamily,
    parentId: recipeParentId,
    changes: recipeChanges,
    changeNote: recipeChangeNote,
  })
  .partial();

export const CreateOrderBody = z.object({
  guestName: z.string().trim().min(1).max(60),
  drink: z.string().trim().min(1).max(100),
});

export const UpdateOrderBody = z.object({ status: z.enum(ORDER_STATUSES) });

export const UpdateStatusBody = z.object({ isOpen: z.boolean() });
