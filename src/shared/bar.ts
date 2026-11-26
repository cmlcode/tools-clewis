// src/shared/bar.ts
// Request schemas + response types shared by the Worker and the React app.
// In React files, prefer `import type { ... }` so zod stays out of the client bundle.
import { z } from "zod";
import { FAMILIES, ROLES, type Family, type DrinkChange } from "./families";

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

export type DrinkDto = {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  /** Short line for the menu. */
  description: string;
  /** Which of the six base drinks this belongs to (null for drinks added before lineage existed). */
  family: Family | null;
  /** The drink this one is derived from; null for the six base drinks. */
  parentId: number | null;
  /** Structured changes relative to the parent. */
  changes: DrinkChange[];
  /** Hidden drinks stay out of the menu and search but can still be a parent or family reference. */
  hidden: boolean;
  createdAt: string;
};

// ---- Request schemas --------------------------------------------------------

// Field schemas, defined once and reused by both drink bodies.
const drinkName = z.string().trim().min(1).max(100);
const drinkIngredients = z.string().trim().min(1).max(2000);
const drinkInstructions = z.string().trim().max(5000);

const drinkDescription = z.string().trim().max(200);
const drinkFamily = z.enum(FAMILIES).nullable();
const drinkParentId = z.number().int().positive().nullable();

// Changes are relative to the parent drink. Each type requires what it needs.
const changeText = z.string().trim().min(1).max(100);
const drinkChange = z.discriminatedUnion("type", [
  z.object({ type: z.literal("swap"), role: z.enum(ROLES), from: changeText, to: changeText }),
  z.object({ type: z.literal("add"), role: z.enum(ROLES).optional(), to: changeText }),
  z.object({ type: z.literal("remove"), role: z.enum(ROLES).optional(), from: changeText }),
  z.object({ type: z.literal("technique"), detail: z.string().trim().min(1).max(200) }),
]);
const drinkChanges = z.array(drinkChange).max(12);

// Default only on create, so a partial update never wipes existing values.
// A new drink needs a family or a parent (the family is then copied from the parent).
export const CreateDrinkBody = z
  .object({
    name: drinkName,
    description: drinkDescription.default(""),
    ingredients: drinkIngredients,
    instructions: drinkInstructions.default(""),
    family: drinkFamily.optional(),
    parentId: drinkParentId.optional(),
    changes: drinkChanges.default([]),
    hidden: z.boolean().default(false),
  })
  .refine((b) => b.family != null || b.parentId != null, {
    message: "Pick a family or a parent drink",
    path: ["family"],
  });

export const UpdateDrinkBody = z
  .object({
    name: drinkName,
    description: drinkDescription,
    ingredients: drinkIngredients,
    instructions: drinkInstructions,
    family: drinkFamily,
    parentId: drinkParentId,
    changes: drinkChanges,
    hidden: z.boolean(),
  })
  .partial();

export const CreateOrderBody = z.object({
  guestName: z.string().trim().min(1).max(60),
  drink: z.string().trim().min(1).max(100),
});

export const UpdateOrderBody = z.object({ status: z.enum(ORDER_STATUSES) });

export const UpdateStatusBody = z.object({ isOpen: z.boolean() });
