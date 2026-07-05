import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { listOrders, updateOrderStatus } from "../services/barService";
import type { Order, OrderStatus } from "../types";
import "./orders-widget.css";

const POLL_INTERVAL_MS = 5000;

export function OrdersWidget() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listOrders();
      setOrders(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleStatusChange(id: number, status: OrderStatus) {
    const previous = orders;
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));

    try {
      await updateOrderStatus(id, status);
    } catch {
      setOrders(previous);
    }
  }

  return (
    <Panel className="orders-widget">
      <h2>Orders</h2>

      {error && <p role="alert">Couldn't load orders.</p>}
      {!error && orders.length === 0 && <p className="orders-widget-empty">No orders yet.</p>}
			<ul className="orders-widget-list">
				{orders
					.filter((order) => order.status !== "served")
					.map((order) => (
						<li key={order.id} className="orders-widget-item">
							<div className="orders-widget-info">
								<span className="orders-widget-name">{order.guest_name}</span>
								<span className="orders-widget-drink">{order.drink}</span>
							</div>

							<div className="orders-widget-actions">
								<span
									className={`orders-widget-status orders-widget-status--${order.status}`}
								>
									{order.status}
								</span>

								{order.status === "pending" && (
									<button
										type="button"
										onClick={() => handleStatusChange(order.id, "made")}
									>
										Mark Made
									</button>
								)}

								{order.status === "made" && (
									<button
										type="button"
										onClick={() => handleStatusChange(order.id, "served")}
									>
										Mark Delivered
									</button>
								)}
							</div>
						</li>
					))}
			</ul>
    </Panel>
  );
}
