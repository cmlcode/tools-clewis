// src/routes/paths.ts

export const paths = {

	// Router/Admin Pages
  account: "/account",
  admin: "/admin",
  launcher: "/",
  login: "/login",

	// Bar Pages
	addDrink: "/bar/drinks/new",
  bar: "/bar",
	drink: "/bar/drinks/:id",
	editDrink: "/bar/drinks/:id/edit",

	recipes: "/recipes",
} as const;

export const api = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    status: "/api/auth/status",
		changePassword: "/api/auth/change-password",
  },

  admin: {
    users: "/api/admin/users",
  },

  bar: {
    orders: "/api/bar/orders",
    drinks: "/api/bar/drinks",
    status: "/api/bar/status",
  },

	recipes: { list: "/api/recipes" }
} as const;
