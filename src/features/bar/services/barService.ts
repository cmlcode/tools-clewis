/* src/components/bar/services/barService.ts */
import { api } from "@/routes/paths";
import type { BarStatus, Order, OrderStatus, PublicOrder, Drink} from "../types";
import { BarClosedError } from "../errors";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    const message = body?.error ?? `Request to ${url} failed with ${res.status}`;

    // Only the "bar is closed" refusal is a BarClosedError. Other 403s (not allowed) are real errors.
    if (body?.code === "bar_closed") {
      throw new BarClosedError(message);
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Guests: placing an order and checking on it return only { id, drink, status }.
export function placeOrder(guestName: string, drink: string): Promise<PublicOrder> {
  return request<PublicOrder>(api.bar.orders, {
    method: "POST",
    body: JSON.stringify({ guestName, drink }),
  });
}

export function getOrder(id: number): Promise<PublicOrder> {
  return request<PublicOrder>(`${api.bar.orders}/${id}`);
}

// Managers and admins: full orders, including the guest's name.
export function listOrders(): Promise<Order[]> {
  return request<Order[]>(api.bar.orders);
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

export function listDrinks(): Promise<Drink[]> {
  return request<Drink[]>(api.bar.drinks);
}

export function createDrink(drink: Omit<Drink, "id" | "createdAt">): Promise<Drink> {
  return request<Drink>(api.bar.drinks, {
    method: "POST",
    body: JSON.stringify(drink),
  });
}

export function updateDrink(
  id: number,
  drink: Partial<Omit<Drink, "id" | "createdAt">>
): Promise<Drink> {
  return request<Drink>(`${api.bar.drinks}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(drink),
  });
}

export function deleteDrink(id: number): Promise<void> {
  return request<void>(`${api.bar.drinks}/${id}`, { method: "DELETE" });
}

export function getBarStatus(): Promise<BarStatus> {
  return request<BarStatus>(api.bar.status);
}

export function setBarStatus(isOpen: boolean): Promise<BarStatus> {
  return request<BarStatus>(api.bar.status, {
    method: "PATCH",
    body: JSON.stringify({ isOpen }),
  });
}
