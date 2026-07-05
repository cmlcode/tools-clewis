import type { Order } from "../types";
import "./order-status.css";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  made: "Made",
  served: "Delivered",
};

interface OrderStatusProps {
  order: Order;
  onReorder: () => void;
}

export function OrderStatus({ order, onReorder }: OrderStatusProps) {
  return (
    <div className="order-status">
      <div className="order-status-info">
        <span className="order-status-label">Your order</span>
        <span className="order-status-drink">{order.drink}</span>
      </div>

      <span className={`order-status-badge order-status-badge--${order.status}`}>
        {STATUS_LABEL[order.status]}
      </span>

      {order.status === "served" && (
        <button type="button" onClick={onReorder}>
          Order Again
        </button>
      )}
    </div>
  );
}
