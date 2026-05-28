"use client";

import { useEffect, useState } from "react";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";

interface OrderItem {
  id: string;
  title: string;
  price: string;
  image: string;
}

interface ConfirmDetail {
  item: OrderItem;
}

export default function OrderConfirmModal() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<OrderItem | null>(null);
  const [qty, setQty] = useState(1);
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrencyState(getCurrency());
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<ConfirmDetail>).detail;
      if (!detail?.item) return;
      setItem(detail.item);
      setQty(1);
      setOpen(true);
    };
    const onClose = () => setOpen(false);
    const onCurrency = () => setCurrencyState(getCurrency());

    window.addEventListener("lfh:open-order-confirm", onOpen);
    window.addEventListener("lfh:close-all", onClose);
    window.addEventListener("lfh:currency-changed", onCurrency);

    return () => {
      window.removeEventListener("lfh:open-order-confirm", onOpen);
      window.removeEventListener("lfh:close-all", onClose);
      window.removeEventListener("lfh:currency-changed", onCurrency);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !item) return null;

  const unit = parseFloat(item.price);
  const total = unit * qty;
  const fmt = (n: number) => (currency ? formatPrice(n, currency) : `$${n.toFixed(2)}`);

  const confirm = () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let cart: { id: string; title: string; price: string; image: string; qty: number }[] = [];
      const saved = localStorage.getItem("lfh_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          cart = parsed.map((it: { id: string; title: string; price: string; image: string; qty?: number }) => ({
            id: it.id,
            title: it.title,
            price: it.price,
            image: it.image,
            qty: typeof it.qty === "number" && it.qty > 0 ? it.qty : 1,
          }));
        }
      }
      const existing = cart.find((it) => it.id === item.id);
      if (existing) existing.qty += qty;
      else cart.push({ ...item, qty });

      localStorage.setItem("lfh_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("lfh:cart-updated"));
      window.dispatchEvent(
        new CustomEvent("lfh:toast", { detail: { message: `${qty} × ${item.title} added` } })
      );
      setOpen(false);
    } catch (e) {
      console.error("Failed to add to cart", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="overlay active" onClick={() => setOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Confirm order" className="order-confirm">
        <button
          type="button"
          className="order-confirm-close"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <i className="fas fa-times"></i>
        </button>

        <img src={item.image} alt={item.title} className="order-confirm-img" />
        <h3 className="order-confirm-title">{item.title}</h3>
        <div className="order-confirm-unit">{fmt(unit)} each</div>

        <div className="order-confirm-qty">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
          >
            −
          </button>
          <span aria-live="polite">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
          >
            +
          </button>
        </div>

        <div className="order-confirm-total">
          <span>Total</span>
          <span className="order-confirm-total-val">{fmt(total)}</span>
        </div>

        <div className="order-confirm-actions">
          <button
            type="button"
            className="order-confirm-cancel"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="order-confirm-add"
            onClick={confirm}
            disabled={submitting}
          >
            {submitting ? "Adding…" : "Confirm Order"}
          </button>
        </div>
      </div>
    </>
  );
}
