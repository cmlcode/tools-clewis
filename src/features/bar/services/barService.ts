import { api } from "@/routes/paths";
import type { Order, OrderStatus, Recipe } from "../types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request to ${url} failed with ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function placeOrder(guestName: string, drink: string): Promise<Order> {
  return request<Order>(api.bar.orders, {
    method: "POST",
    body: JSON.stringify({ guestName, drink }),
  });
}

export function listOrders(): Promise<Order[]> {
  return request<Order[]>(api.bar.orders);
}

export function getOrder(id: number): Promise<Order> {
  return request<Order>(`${api.bar.orders}/${id}`);
}

export function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  return request<Order>(`${api.bar.orders}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteOrder(id: number): Promise<void> {
  return request<void>(`${api.bar.orders}/${id}`, { method: "DELETE" });
}

export function listRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>(api.bar.recipes);
}

export function createRecipe(recipe: Omit<Recipe, "id" | "created_at">): Promise<Recipe> {
  return request<Recipe>(api.bar.recipes, {
    method: "POST",
    body: JSON.stringify(recipe),
  });
}

export function updateRecipe(
  id: number,
  recipe: Partial<Omit<Recipe, "id" | "created_at">>
): Promise<Recipe> {
  return request<Recipe>(`${api.bar.recipes}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(recipe),
  });
}

export function deleteRecipe(id: number): Promise<void> {
  return request<void>(`${api.bar.recipes}/${id}`, { method: "DELETE" });
}
