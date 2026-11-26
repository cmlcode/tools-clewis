// src/features/recipes/paths.ts
// The main paths.ts only knows where the recipes section starts (paths.recipes).
// Everything below that is decided here.
import { paths } from "@/routes/paths";

const home = paths.recipes;

export const recipePaths = {
  home, // the library
  new: `${home}/new`,
  detail: `${home}/:slug`, // route pattern
  edit: `${home}/:slug/edit`, // route pattern
} as const;

export const recipeLink = (slug: string) => `${home}/${encodeURIComponent(slug)}`;
export const recipeEditLink = (slug: string) => `${recipeLink(slug)}/edit`;
