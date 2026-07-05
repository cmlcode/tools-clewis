export type OrderStatus = "pending" | "made" | "served";

export interface Order {
  id: number;
  guest_name: string;
  drink: string;
  status: OrderStatus;
  created_at: string;
}

export interface BarStatus {
  isOpen: boolean;
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: string;
  instructions: string;
  created_at: string;
}
