// src/features/recipes/routes.tsx
// The recipes section's routes. The main router just spreads this in:  ...recipeRoutes
import type { RouteObject } from "react-router-dom";
import { guard } from "@/lib/auth";
import { recipePaths } from "./paths";
import { RecipesPage } from "./RecipesPage";
import { RecipePage } from "./RecipePage";
import { RecipeFormPage } from "./RecipeFormPage";

export const recipeRoutes: RouteObject[] = [
  { path: recipePaths.home, element: <RecipesPage /> },
  { path: recipePaths.new, loader: guard("admin", "manager"), element: <RecipeFormPage /> },
  { path: recipePaths.edit, loader: guard("admin", "manager"), element: <RecipeFormPage /> },
  { path: recipePaths.detail, element: <RecipePage /> },
];
