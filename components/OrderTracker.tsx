"use client";

import { useEffect, useRef, useState } from "react";
import { getOrderStatus, updateOrderTableNumber, type OrderStatus } from "@/lib/menu";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";
import {
  STEPS,
  STATUS_COPY as COPY,
  POLL_MS,
  SERVED_LINGER_MS,
  MAX_AGE_MS,
  type ActiveOrder,
  isFinalStatus as isFinal,
  readActiveOrders as read,
  writeActiveOrders as write,
  liveActiveOrders,
} from "@/lib/orderStatus";

// Tell the open cart (same tab) that an order's status changed, so its
// "Live now" section can re-read. The browser's native `storage` event only
// fires in OTHER tabs, so we need our own in-tab signal.
const broadcast = () => window.dispatchEvent(new Event("lfh:orders-updated"));

export default function OrderTracker() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tableDraft, setTableDraft] = useState("");
  const [savingTable, setSavingTable] = useState(false);
  const [currency, setCurrency] = useState<CurrencyMeta | null>(null);
  const lastStatus = useRef<Record<string, OrderStatus>>({});

  const refresh = () => {
    // Backfill a finalize time for any already-final order missing one (e.g. it was
    // cancelled in a past session) so it auto-clears instead of getting stuck.
    const list = read();
    let changed = false;
    list.forEach((o) => {
      if (isFinal(o.status) && !o.finalizedAt) {
        o.finalizedAt = Date.now();
        changed = true;
      }
    });
    if (changed) write(list);
    setOrders(list);
  };

  useEffect(() => {
    refresh();
    setCurrency(getCurrency());
    const onPlaced = () => refresh();
    const onCur = () => setCurrency(getCurrency());
    window.addEventListener("lfh:order-placed", onPlaced);
    window.addEventListener("storage", onPlaced);
    window.addEventListener("lfh:currency-changed", onCur);
    return () => {
      window.removeEventListener("lfh:order-placed", onPlaced);
      window.removeEventListener("storage", onPlaced);
      window.removeEventListener("lfh:currency-changed", onCur);
    };
  }, []);

  // Poll the kitchen for each order we're still following.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const list = read();
      const live = list.filter(
        (o) => !o.dismissed && !isFinal(o.status) && Date.now() - o.placedAt < MAX_AGE_MS
      );
      if (live.length === 0) return;
      let changed = false;
      for (const o of live) {
        const res = await getOrderStatus(o.id);
        if (!res || cancelled) continue;
        if (res.status !== o.status) {
          o.status = res.status;
          if (isFinal(res.status) && !o.finalizedAt) o.finalizedAt = Date.now();
          changed = true;
          if (lastStatus.current[o.id] !== res.status) {
            lastStatus.current[o.id] = res.status;
            window.dispatchEvent(
              new CustomEvent("lfh:toast", { detail: {
                message: COPY[res.status].label,
                subtitle: o.tableNumber ? `table ${o.tableNumber}` : "your order",
                kicker: "order update",
                variant: res.status === "cancelled" ? "error" : "success",
                icon: res.status === "cancelled" ? "✕" : "🛎",
              } })
            );
          }
        }
      }
      if (changed && !cancelled) {
        write(list);
        refresh();
        broadcast();
      }
    };
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [orders.length]);

  // Auto-hide a served/cancelled strip one minute after it finishes.
  useEffect(() => {
    const finals = orders.filter((o) => isFinal(o.status) && o.finalizedAt && !o.dismissed);
    if (finals.length === 0) return;
    const soonest = Math.min(...finals.map((o) => (o.finalizedAt as number) + SERVED_LINGER_MS));
    const delay = Math.max(0, soonest - Date.now());
    const t = setTimeout(refresh, delay + 100);
    return () => clearTimeout(t);
  }, [orders]);

  const dismiss = (id: string) => {
    write(read().map((o) => (o.id === id ? { ...o, dismissed: true } : o)));
    setDetailOpen(false);
    refresh();
    broadcast();
  };

  const visible = liveActiveOrders(orders);
  const order = visible[0];
  if (!order) return null;

  const c = COPY[order.status];
  const stepIndex = STEPS.indexOf(order.status);
  const canEditTable = order.status === "received" || order.status === "preparing";
  const showPrice = (n: number) => (currency ? formatPrice(n, currency) : `$${n.toFixed(2)}`);

  const openDetail = () => {
    setTableDraft(order.tableNumber || "");
    setDetailOpen(true);
  };

  const saveTable = async () => {
    if (savingTable) return;
    setSavingTable(true);
    const ok = await updateOrderTableNumber(order.id, tableDraft);
    setSavingTable(false);
    if (ok) {
      write(read().map((o) => (o.id === order.id ? { ...o, tableNumber: tableDraft.trim() } : o)));
      refresh();
      broadcast();
      window.dispatchEvent(
        new CustomEvent("lfh:toast", { detail: { message: "Table updated", subtitle: "saved", kicker: "table", variant: "success" } })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("lfh:toast", { detail: { message: "Couldn't update table", subtitle: "it may already be served", kicker: "table", variant: "error" } })
      );
    }
  };

  return (
    <>
      <button
        type="button"
        className={`order-tracker status-${order.status}`}
        onClick={openDetail}
        aria-label="View order status"
      >
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
        <span
          className="ot-close"
          role="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            dismiss(order.id);
          }}
        >
          <i className="fas fa-times"></i>
        </span>
      </button>

      {detailOpen && (
        <>
          <div className="overlay active" onClick={() => setDetailOpen(false)} />
          <div className="ot-sheet" role="dialog" aria-modal="true" aria-label="Order status">
            <button className="ot-sheet-close" aria-label="Close" onClick={() => setDetailOpen(false)}>
              <i className="fas fa-times"></i>
            </button>

            <div className={`ot-sheet-head status-${order.status}`}>
              <div className="ot-icon" aria-hidden="true">
                <i className={`fas ${c.icon}`}></i>
              </div>
              <div>
                <div className="ot-label">{c.label}</div>
                <div className="ot-sub">{c.sub}</div>
              </div>
            </div>

            {stepIndex >= 0 && (
              <div className="ot-steps big" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span key={s} className={`ot-step ${i <= stepIndex ? "done" : ""} ${i === stepIndex ? "active" : ""}`} />
                ))}
              </div>
            )}

            {order.items && order.items.length > 0 && (
              <div className="ot-items">
                {order.items.map((it, i) => (
                  <div key={i} className="ot-item-line">
                    <span>{it.title}</span>
                    <span>×{it.qty}</span>
                  </div>
                ))}
                <div className="ot-item-line total">
                  <span>Total</span>
                  <span>{showPrice(order.total)}</span>
                </div>
              </div>
            )}

            <div className="ot-table-edit">
              <label htmlFor="ot-table-input">Table number</label>
              <div className="ot-table-row">
                <input
                  id="ot-table-input"
                  type="text"
                  inputMode="numeric"
                  value={tableDraft}
                  disabled={!canEditTable}
                  placeholder="e.g. 7"
                  onChange={(e) => setTableDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="ot-save"
                  disabled={!canEditTable || savingTable || tableDraft.trim() === (order.tableNumber || "").trim()}
                  onClick={saveTable}
                >
                  {savingTable ? "Saving…" : "Save"}
                </button>
              </div>
              <p className="ot-note">
                {canEditTable
                  ? "Got the table wrong? Fix it here — the kitchen sees the change. You can't change the dishes."
                  : "This order is already served, so the table number is locked."}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
