// src/routes/router.tsx  (React router: lives in a .tsx file, NOT in the Worker)

// React imports
import { createBrowserRouter } from "react-router-dom";
import { paths } from "./paths";
import { guard } from "@/lib/auth";

// Router/Admin Pages
import { LoginPage } from "@/features/auth/LoginPage";
import { LauncherPage } from "@/features/launcher/LauncherPage";
import { AccountPage } from "@/features/account/AccountPage";
import { AdminPage } from "@/features/admin/AdminPage";

// Bar Pages
import { BarPage } from "@/features/bar/BarPage";
import { AddDrinkPage } from "@/features/bar/AddDrinkPage";
import { DrinkPage } from "@/features/bar/DrinkPage";

// Recipes Pages
import { recipeRoutes } from "@/features/recipes/routes";


export const router = createBrowserRouter([
  { path: paths.login, element: <LoginPage /> },

  // Public pages: they show or hide owner-only parts based on the logged-in role.
  // The Worker still enforces who may call the private API endpoints.
  { path: paths.launcher, element: <LauncherPage /> },
  { path: paths.bar, element: <BarPage /> },
	{ path: paths.drink, element: <DrinkPage /> },

  // Pages that need a login
  { path: paths.account, loader: guard(), element: <AccountPage /> },
  { path: paths.admin, loader: guard("admin"), element: <AdminPage /> },
	{ path: paths.addDrink, loader: guard("admin", "manager"), element: <AddDrinkPage /> },
	{ path: paths.editDrink, loader: guard("admin", "manager"), element: <AddDrinkPage /> },
	...recipeRoutes,
]);
