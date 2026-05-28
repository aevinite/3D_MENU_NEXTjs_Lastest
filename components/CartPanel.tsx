"use client";

import { useEffect, useState } from "react";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";

interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  qty: number;
}

const normalize = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it): it is { id: string; title: string; price: string; image: string; qty?: number } =>
      !!it && typeof it === "object" && "id" in it
    )
    .map((it) => ({
      id: it.id,
      title: it.title,
      price: it.price,
      image: it.image,
      qty: typeof it.qty === "number" && it.qty > 0 ? it.qty : 1,
    }));
};

export default function CartPanel() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);

  const loadCart = () => {
    try {
      const saved = localStorage.getItem("lfh_cart");
      setCart(saved ? normalize(JSON.parse(saved)) : []);
    } catch {
      setCart([]);
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    try {
      localStorage.setItem("lfh_cart", JSON.stringify(newCart));
    } catch {}
  };

  const decrement = (idx: number) => {
    const next = [...cart];
    if (next[idx].qty > 1) {
      next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
    } else {
      next.splice(idx, 1);
    }
    setCart(next);
    saveCart(next);
    window.dispatchEvent(new Event("lfh:cart-updated"));
  };

  const increment = (idx: number) => {
    const next = [...cart];
    next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
    setCart(next);
    saveCart(next);
    window.dispatchEvent(new Event("lfh:cart-updated"));
  };

  const removeFromCart = (idx: number) => {
    const next = [...cart];
    next.splice(idx, 1);
    setCart(next);
    saveCart(next);
    window.dispatchEvent(new Event("lfh:cart-updated"));
  };

  const checkout = () => {
    if (cart.length === 0) return;
    const msg = tableNumber.trim()
      ? `Order placed for table ${tableNumber.trim()}! 🎉`
      : "Order placed! 🎉";
    window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: msg } }));
    setCart([]);
    saveCart([]);
    setTableNumber("");
    window.dispatchEvent(new Event("lfh:cart-updated"));
    window.dispatchEvent(new Event("lfh:close-all"));
  };

  useEffect(() => {
    loadCart();
    setCurrencyState(getCurrency());
    const handleOpen = () => {
      setOpen(true);
      loadCart();
    };
    const handleClose = () => setOpen(false);
    const handleCartUpdated = loadCart;
    const handleCurrency = () => setCurrencyState(getCurrency());

    window.addEventListener("lfh:open-cart", handleOpen);
    window.addEventListener("lfh:close-all", handleClose);
    window.addEventListener("lfh:cart-updated", handleCartUpdated);
    window.addEventListener("lfh:currency-changed", handleCurrency);

    return () => {
      window.removeEventListener("lfh:open-cart", handleOpen);
      window.removeEventListener("lfh:close-all", handleClose);
      window.removeEventListener("lfh:cart-updated", handleCartUpdated);
      window.removeEventListener("lfh:currency-changed", handleCurrency);
    };
  }, []);

  const showPrice = (n: number) => (currency ? formatPrice(n, currency) : `$${n.toFixed(2)}`);

  const total = cart.reduce((sum, it) => sum + parseFloat(it.price) * it.qty, 0);

  if (!open) return null;

  return (
    <>
      <div
        className="overlay active"
        onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}
      ></div>
      <div id="cart-panel" className="cart-panel panel open">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h3 className="panel-title" style={{ margin: 0 }}>
            <i className="fas fa-shopping-bag"></i> Your Cart
          </h3>
          <button
            className="nav-btn"
            title="Close"
            aria-label="Close cart"
            onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div id="cart-list" className="cart-list">
          {cart.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--muted)",
                padding: "50px 0",
                fontSize: "15px",
              }}
            >
              Your cart is empty
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.id} className="cart-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cart-item-name">{item.title}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`Decrease ${item.title} quantity`}
                      onClick={() => decrement(idx)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(212,165,116,0.4)",
                        background: "transparent",
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: "16px",
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: "32px",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {item.qty}x
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.title} quantity`}
                      onClick={() => increment(idx)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(212,165,116,0.4)",
                        background: "transparent",
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: "16px",
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className="cart-item-price">
                    {showPrice(parseFloat(item.price) * item.qty)}
                  </div>
                  <button
                    type="button"
                    className="remove-item"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeFromCart(idx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "8px",
                    }}
                  >
                    <i className="fas fa-trash" style={{ fontSize: "18px" }}></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          id="cart-table"
          className="table-input"
          placeholder="Enter Table Number"
          aria-label="Table number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
        <div className="cart-total">
          <span>Total</span>
          <span id="cart-total-val">{showPrice(total)}</span>
        </div>
        <button className="btn btn-gold" onClick={checkout}>
          <i className="fas fa-credit-card"></i> Place Order
        </button>
      </div>
    </>
  );
}
