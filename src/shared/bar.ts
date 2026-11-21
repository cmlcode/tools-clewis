// src/shared/bar.ts
// Request schemas + response types shared by the Worker and the React app.
// In React files, prefer `import type { ... }` so zod stays out of the client bundle.
import { z } from "zod";

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
  createdAt: string;
};

// ---- Request schemas --------------------------------------------------------

// Field schemas, defined once and reused by both recipe bodies.
const recipeName = z.string().trim().min(1).max(100);
const recipeIngredients = z.string().trim().min(1).max(2000);
const recipeInstructions = z.string().trim().max(5000);

// Default only on create, so a partial update never wipes existing instructions.
export const CreateRecipeBody = z.object({
  name: recipeName,
  ingredients: recipeIngredients,
  instructions: recipeInstructions.default(""),
});
export const UpdateRecipeBody = z
  .object({
    name: recipeName,
    ingredients: recipeIngredients,
    instructions: recipeInstructions,
  })
  .partial();

export const CreateOrderBody = z.object({
  guestName: z.string().trim().min(1).max(60),
  drink: z.string().trim().min(1).max(100),
});

export const UpdateOrderBody = z.object({ status: z.enum(ORDER_STATUSES) });

export const UpdateStatusBody = z.object({ isOpen: z.boolean() });
