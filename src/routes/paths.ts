// src/routes/paths.ts

export const paths = {
  launcher: "/",
  bar: "/bar",
  login: "/login",
  admin: "/admin",
} as const;

export const api = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    status: "/api/auth/status",
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
