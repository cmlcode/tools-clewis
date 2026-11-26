// src/features/bar/types/index.ts
// API response shapes come from the shared file so the Worker and the UI can't drift apart.
import type { OrderDto } from "@/shared/bar";

export type {
  BarStatusDto as BarStatus,
  OrderDto as Order,           // full order, only returned to managers/admins (has guestName)
  PublicOrderDto as PublicOrder, // what a guest gets back: { id, drink, status }
  DrinkDto as Drink,
} from "@/shared/bar";

export type OrderStatus = OrderDto["status"];
