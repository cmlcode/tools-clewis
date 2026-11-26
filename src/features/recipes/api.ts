// src/features/recipes/api.ts
import type { RecipeBodyInput, RecipeDto, RecipeSummaryDto } from "./shared/recipes";

/** This feature owns its endpoints, so nothing about recipes needs adding to routes/paths.ts. */
const BASE = "/api/recipes";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers, // a caller-set Content-Type wins
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* not JSON; keep the generic message */
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const one = (slug: string) => `${BASE}/${encodeURIComponent(slug)}`;

export const listRecipes = () => request<RecipeSummaryDto[]>(BASE);
export const getRecipe = (slug: string) => request<RecipeDto>(one(slug));

export const createRecipe = (body: RecipeBodyInput) =>
  request<RecipeDto>(BASE, { method: "POST", body: JSON.stringify(body) });

export const updateRecipe = (slug: string, body: RecipeBodyInput) =>
  request<RecipeDto>(one(slug), { method: "PUT", body: JSON.stringify(body) });

export const deleteRecipe = (slug: string) => request<void>(one(slug), { method: "DELETE" });

/** Uploads the (already shrunk) photo. The server checks size and type again. */
export const uploadPhoto = (slug: string, photo: Blob) =>
  request<{ photoUrl: string }>(`${one(slug)}/photo`, {
    method: "PUT",
    body: photo,
    headers: { "Content-Type": photo.type || "image/jpeg" },
  });

export const deletePhoto = (slug: string) => request<void>(`${one(slug)}/photo`, { method: "DELETE" });
