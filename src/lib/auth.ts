// src/lib/auth.ts
// Client-side auth helpers. The session cookie is HttpOnly, so the browser can't read it;
// we ask the Worker who we are via /api/auth/status instead.
import { redirect } from "react-router-dom";
import { api, paths } from "@/routes/paths";
import type { Role } from "@/shared/auth";

export type { Role };
export interface AuthStatus {
  loggedIn: boolean;
  email?: string;
  role?: Role;
}

export const isManager = (role?: Role) => role === "admin" || role === "manager";

export async function fetchStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch(api.auth.status, { credentials: "same-origin" });
    return res.ok ? ((await res.json()) as AuthStatus) : { loggedIn: false };
  } catch {
    return { loggedIn: false };
  }
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(api.auth.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) return { ok: true };
    // Same message for every failure (wrong password, unknown email, disabled, locked)
    return { ok: false, error: "Invalid email or password." };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(api.auth.logout, { method: "POST", credentials: "same-origin" });
  } catch {
    /* the cookie expires on its own; nothing more to do */
  }
}

/** Route loader. No roles = any logged-in user. Returns the status so pages can use it. */
export function guard(...roles: Role[]) {
  return async (): Promise<AuthStatus> => {
    const status = await fetchStatus();
    if (!status.loggedIn) throw redirect(paths.login);
    if (roles.length > 0 && !roles.includes(status.role!)) throw redirect(paths.launcher);
    return status;
  };
}
