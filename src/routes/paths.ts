// src/routes/paths.ts

export const paths = {
  launcher: "/",
  bar: "/bar",
  login: "/login",
  account: "/account",
  admin: "/admin",
	addDrink: "/bar/drinks/new",
	editDrink: "/bar/drinks/:id/edit",
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
    drinks: "/api/bar/drinks",
    status: "/api/bar/status",
  },
} as const;
