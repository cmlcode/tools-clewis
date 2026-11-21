// src/shared/auth.ts
// Request schemas + response types for auth and user management,
// shared by the Worker and the React app.
import { z } from "zod";

export const ROLES = ["admin", "manager", "user"] as const;
export type Role = (typeof ROLES)[number];

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 200;

// Passwords are never trimmed: leading/trailing spaces are part of the password.
const newPassword = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

// ---- Response types ---------------------------------------------------------

export type UserDto = {
  id: number;
  email: string;
  role: Role;
  disabled: boolean;
  createdAt: number; // unix seconds
};

// ---- Request schemas --------------------------------------------------------

export const LoginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

// The admin can create managers and regular users, never another admin.
export const CreateUserBody = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  password: newPassword,
  role: z.enum(["manager", "user"]),
});

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword,
});

// Admin editing someone else's account: enable/disable and/or reset the password.
export const UpdateUserBody = z
  .object({
    disabled: z.boolean().optional(),
    password: newPassword.optional(),
  })
  .refine((b) => b.disabled !== undefined || b.password !== undefined, {
    message: "Nothing to update",
  });
