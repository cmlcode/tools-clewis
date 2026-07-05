import { useCallback, useEffect, useState } from "react";
import { getOrder } from "../services/barService";
import type { Order } from "../types";

const KEY = "bar_my_order_id";
const POLL_INTERVAL_MS = 5000;

export function useMyOrder() {
  const [orderId, setOrderIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem(KEY);
    return saved ? Number(saved) : null;
  });
  const [order, setOrder] = useState<Order | null>(null);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setOrderIdState(null);
    setOrder(null);
  }, []);

  const setOrderId = useCallback((id: number) => {
    localStorage.setItem(KEY, String(id));
    setOrderIdState(id);
  }, []);

  useEffect(() => {
    if (orderId === null) return;

    let cancelled = false;

    async function refresh() {
      try {
        const data = await getOrder(orderId!);
        if (!cancelled) setOrder(data);
      } catch {
        // Order no longer exists (e.g. cleared by the owner) — stop tracking it.
        if (!cancelled) clear();
      }
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, clear]);

  return { order, setOrderId, clear };
}
