// src/routes/paths.ts

export const paths = {
  launcher: "/",
  bar: "/bar",
} as const;

export const api = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    status: "/auth/status",
  },

  bar: {
    orders: "/api/bar/orders",
    recipes: "/api/bar/recipes",
  },
} as const;
