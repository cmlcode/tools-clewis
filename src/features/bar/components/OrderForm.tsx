import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import { placeOrder } from "../services/barService";
import { useMyOrder } from "../hooks/useMyOrder";
import { OrderStatus } from "./OrderStatus";
import "./order-form.css";

export function OrderForm() {
  const { name, setName } = useUser();
  const [drink, setDrink] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const { order, setOrderId } = useMyOrder();

  async function submitOrder(guestName: string, drinkName: string) {
    setStatus("submitting");
    try {
      const placed = await placeOrder(guestName, drinkName);
      setOrderId(placed.id);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !drink.trim()) return;

    await submitOrder(name, drink);
    setDrink("");
  }

  function handleReorder() {
    if (!order) return;
    submitOrder(order.guest_name, order.drink);
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
								document.getElementById("drink-input")?.focus();
							}
						}}
					/>
        </label>

        <label>
          Drink
          <input
            value={drink}
            onChange={(e) => setDrink(e.target.value)}
          />
        </label>

        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Placing…" : "Place Order"}
        </button>
        {status === "error" && <p role="alert">Couldn't place order, try again.</p>}
      </form>

      {order && <OrderStatus order={order} onReorder={handleReorder} />}
    </Panel>
  );
}
