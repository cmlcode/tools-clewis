import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { placeOrder } from "../services/barService";
import { useMyOrder } from "../hooks/useMyOrder";
import { BarClosedError } from "../errors";
import { OrderStatus } from "./OrderStatus";
import "./order-form.css";

interface OrderFormProps {
  isOpen: boolean | null;
}

export function OrderForm({ isOpen }: OrderFormProps) {
  const { name, setName } = useUser();
  const [drink, setDrink] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "closed">("idle");
  const { order, setOrderId } = useMyOrder();

  // Returns true if the order was placed
  async function submitOrder(guestName: string, drinkName: string): Promise<boolean> {
    setStatus("submitting");
    try {
      const placed = await placeOrder(guestName, drinkName);
      setOrderId(placed.id);
      setStatus("idle");
      return true;
    } catch (e) {
      setStatus(e instanceof BarClosedError ? "closed" : "error");
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !drink.trim()) return;

    const placed = await submitOrder(name.trim(), drink.trim());
    if (placed) setDrink(""); // keep what they typed if the order failed
  }

  function handleReorder() {
    // The order lookup no longer returns the guest's name, so use the name in the form.
    if (!order || !name.trim()) return;
    void submitOrder(name.trim(), order.drink);
  }

  if (isOpen === false) {
    return (
      <Panel className="order-form">
        <h2>Bar Order</h2>
        <p>The bar is closed right now — check back later.</p>
      </Panel>
    );
  }

  return (
    <Panel className="order-form">
      <form onSubmit={handleSubmit}>
        <h2>Bar Order</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // move to the drink field instead of submitting early
                document.getElementById("drink-input")?.focus();
              }
            }}
          />
        </label>

        <label>
          Drink
          <input
            id="drink-input"
            value={drink}
            onChange={(e) => setDrink(e.target.value)}
          />
        </label>

        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Placing…" : "Place Order"}
        </button>
        {status === "error" && <p role="alert">Couldn't place order, try again.</p>}
        {status === "closed" && <p role="alert">The bar just closed — check back later.</p>}
      </form>

      {order && <OrderStatus order={order} onReorder={handleReorder} />}
    </Panel>
  );
}
