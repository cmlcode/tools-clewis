// src/features/admin/adminApi.ts
import { api } from "@/routes/paths";
import { call } from "@/lib/http";
import type { UserDto } from "@/shared/auth";

export const listUsers = () => call<UserDto[]>(api.admin.users, "GET");

export const createManager = (email: string, password: string) =>
  call<{ ok: true }>(api.admin.users, "POST", { email, password, role: "manager" });

export const updateUser = (id: number, patch: { disabled?: boolean; password?: string }) =>
  call<{ ok: true }>(`${api.admin.users}/${id}`, "PATCH", patch);

export const deleteUser = (id: number) => call<void>(`${api.admin.users}/${id}`, "DELETE");
