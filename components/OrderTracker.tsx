"use client";

import { useEffect, useRef, useState } from "react";
import { getOrderStatus, type OrderStatus } from "@/lib/menu";

const KEY = "lfh_active_orders";
const POLL_MS = 8000;
// Stop following an order this long after it was placed (e.g. guest left).
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

interface ActiveOrder {
  id: string;
  tableNumber: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
  placedAt: number;
  dismissed?: boolean;
}

// Friendly copy + a 0-based step for the progress bar (cancelled has no step).
const STEPS: OrderStatus[] = ["received", "preparing", "served"];
const COPY: Record<OrderStatus, { label: string; sub: string; icon: string }> = {
  received: { label: "Order received", sub: "Waiting for the kitchen to confirm…", icon: "fa-receipt" },
  preparing: { label: "Preparing your order", sub: "The kitchen is on it 👨‍🍳", icon: "fa-fire-burner" },
  served: { label: "Served — enjoy!", sub: "Bon appétit 🍽️", icon: "fa-utensils" },
  cancelled: { label: "Order cancelled", sub: "Please ask a member of staff.", icon: "fa-circle-xmark" },
};

const read = (): ActiveOrder[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
const write = (list: ActiveOrder[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
};

export default function OrderTracker() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const lastStatus = useRef<Record<string, OrderStatus>>({});

  // Pull current state from storage into React.
  const refresh = () => setOrders(read());

  useEffect(() => {
    refresh();
    const onPlaced = () => refresh();
    window.addEventListener("lfh:order-placed", onPlaced);
    window.addEventListener("storage", onPlaced); // other tabs
    return () => {
      window.removeEventListener("lfh:order-placed", onPlaced);
      window.removeEventListener("storage", onPlaced);
    };
  }, []);

  // Poll the kitchen for each order we're still following.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const list = read();
      const live = list.filter(
        (o) =>
          !o.dismissed &&
          o.status !== "served" &&
          o.status !== "cancelled" &&
          Date.now() - o.placedAt < MAX_AGE_MS
      );
      if (live.length === 0) return;

      let changed = false;
      for (const o of live) {
        const res = await getOrderStatus(o.id);
        if (!res || cancelled) continue;
        if (res.status !== o.status) {
          o.status = res.status;
          changed = true;
          const prev = lastStatus.current[o.id];
          if (prev !== res.status) {
            lastStatus.current[o.id] = res.status;
            const c = COPY[res.status];
            window.dispatchEvent(
              new CustomEvent("lfh:toast", { detail: { message: `${c.icon ? "🔔 " : ""}${c.label}` } })
            );
          }
        }
      }
      if (changed && !cancelled) {
        write(list);
        refresh();
      }
    };

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [orders.length]);

  const dismiss = (id: string) => {
    const list = read().map((o) => (o.id === id ? { ...o, dismissed: true } : o));
    write(list);
    refresh();
  };

  // Show the most recent order we haven't dismissed and that isn't stale.
  const visible = orders
    .filter((o) => !o.dismissed && Date.now() - o.placedAt < MAX_AGE_MS)
    .sort((a, b) => b.placedAt - a.placedAt);
  const order = visible[0];
  if (!order) return null;

  const c = COPY[order.status];
  const stepIndex = STEPS.indexOf(order.status); // -1 for cancelled
  const canDismiss = order.status === "served" || order.status === "cancelled";

  return (
    <div className={`order-tracker status-${order.status}`} role="status" aria-live="polite">
      <div className="ot-icon" aria-hidden="true">
        <i className={`fas ${c.icon}`}></i>
      </div>
      <div className="ot-body">
        <div className="ot-top">
          <span className="ot-label">{c.label}</span>
          {order.tableNumber && <span className="ot-table">Table {order.tableNumber}</span>}
        </div>
        <div className="ot-sub">{c.sub}</div>
        {stepIndex >= 0 && (
          <div className="ot-steps" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className={`ot-step ${i <= stepIndex ? "done" : ""} ${i === stepIndex ? "active" : ""}`} />
            ))}
          </div>
        )}
      </div>
      {canDismiss && (
        <button className="ot-close" aria-label="Dismiss" onClick={() => dismiss(order.id)}>
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
}
