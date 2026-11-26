// src/routes/paths.ts

export const paths = {
  launcher: "/",
  bar: "/bar",
  login: "/login",
  account: "/account",
  admin: "/admin",
	addRecipe: "/bar/recipes/new",
	editRecipe: "/bar/recipes/:id/edit",
	drink: "/bar/drinks/:id",
} as const;

export const api = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    status: "/api/auth/status",
		changePassword: "/api/auth/change-password",   // new`
  },

  admin: {
    users: "/api/admin/users",
  },

  bar: {
    orders: "/api/bar/orders",
    recipes: "/api/bar/recipes",
    status: "/api/bar/status",
  },
} as const;
