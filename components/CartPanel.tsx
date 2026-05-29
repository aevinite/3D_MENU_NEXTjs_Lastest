"use client";

import { useEffect, useState } from "react";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";
import { getMenuItems, createOrder } from "@/lib/menu";
import { ALLERGENS, allergenIcon, allergenLabel } from "@/lib/allergens";

interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  qty: number;
}

const TAX_RATE = 0.05; // 5% — shown as a line on the bill

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
  const [allergenMap, setAllergenMap] = useState<Record<string, string[]>>({});
  const [declared, setDeclared] = useState<string[]>([]); // allergens the diner avoids
  const [otherAllergy, setOtherAllergy] = useState(""); // free-text allergy not in the list
  const [placing, setPlacing] = useState(false);

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
  const commit = (next: CartItem[]) => {
    setCart(next);
    saveCart(next);
    window.dispatchEvent(new Event("lfh:cart-updated"));
  };
  const decrement = (idx: number) => {
    const next = [...cart];
    if (next[idx].qty > 1) next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
    else next.splice(idx, 1);
    commit(next);
  };
  const increment = (idx: number) => {
    const next = [...cart];
    next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
    commit(next);
  };
  const removeFromCart = (idx: number) => {
    const next = [...cart];
    next.splice(idx, 1);
    commit(next);
  };

  useEffect(() => {
    loadCart();
    setCurrencyState(getCurrency());
    // allergen lookup by dish id (so the bill can warn)
    getMenuItems()
      .then((items) => {
        const m: Record<string, string[]> = {};
        items.forEach((i) => (m[i.id] = i.allergens || []));
        setAllergenMap(m);
      })
      .catch(() => {});

    const handleOpen = () => { setOpen(true); loadCart(); };
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
  const subtotal = cart.reduce((sum, it) => sum + parseFloat(it.price) * it.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const itemAllergens = (id: string) => allergenMap[id] || [];
  const conflicts = (id: string) => itemAllergens(id).filter((a) => declared.includes(a));
  const orderDeclaredHits = [...new Set(cart.flatMap((it) => conflicts(it.id)))];
  const toggleDeclared = (slug: string) =>
    setDeclared((d) => (d.includes(slug) ? d.filter((x) => x !== slug) : [...d, slug]));

  const placeOrder = async () => {
    if (cart.length === 0 || placing) return;
    setPlacing(true);
    try {
      const allergies = [...declared, ...(otherAllergy.trim() ? [otherAllergy.trim()] : [])];
      await createOrder({
        tableNumber,
        items: cart.map((it) => ({ id: it.id, title: it.title, price: it.price, qty: it.qty })),
        subtotal,
        tax,
        total,
        allergies,
      });
      const msg = tableNumber.trim() ? `Order placed for table ${tableNumber.trim()}! 🎉` : "Order placed! 🎉";
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: msg } }));
      setCart([]); saveCart([]); setTableNumber(""); setDeclared([]); setOtherAllergy("");
      window.dispatchEvent(new Event("lfh:cart-updated"));
      window.dispatchEvent(new Event("lfh:close-all"));
    } catch {
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Couldn't place the order — please try again." } }));
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  const qtyBtn = {
    width: "28px", height: "28px", borderRadius: "50%",
    border: "1px solid rgba(212,165,116,0.4)", background: "transparent",
    color: "var(--text)", cursor: "pointer", fontSize: "16px", lineHeight: 1, fontWeight: 700,
  } as const;

  return (
    <>
      <div className="overlay active" onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}></div>
      <div id="cart-panel" className="cart-panel panel open">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 className="panel-title" style={{ margin: 0 }}>
            <i className="fas fa-receipt"></i> Your Bill
          </h3>
          <button className="nav-btn" title="Close" aria-label="Close cart" onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div id="cart-list" className="cart-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "50px 0", fontSize: "15px" }}>
              Your cart is empty
            </div>
          ) : (
            cart.map((item, idx) => {
              const c = conflicts(item.id);
              return (
                <div key={item.id} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cart-item-name">{item.title}</div>
                    {c.length > 0 && (
                      <div className="cart-item-warn">
                        <i className="fas fa-triangle-exclamation"></i> contains {c.map(allergenLabel).join(", ").toLowerCase()}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                      <button type="button" aria-label={`Decrease ${item.title}`} onClick={() => decrement(idx)} style={qtyBtn}>−</button>
                      <span style={{ minWidth: "32px", textAlign: "center", fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{item.qty}x</span>
                      <button type="button" aria-label={`Increase ${item.title}`} onClick={() => increment(idx)} style={qtyBtn}>+</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div className="cart-item-price">{showPrice(parseFloat(item.price) * item.qty)}</div>
                    <button type="button" className="remove-item" aria-label={`Remove ${item.title}`} onClick={() => removeFromCart(idx)} style={{ background: "transparent", border: "none", padding: "8px" }}>
                      <i className="fas fa-trash" style={{ fontSize: "18px" }}></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="allergy-section">
              <h4><i className="fas fa-shield-heart"></i> Any allergies? Tap what you avoid</h4>
              <div className="allergy-chips">
                {ALLERGENS.map((a) => (
                  <button
                    key={a.slug}
                    type="button"
                    className={`allergy-toggle ${declared.includes(a.slug) ? "on" : ""}`}
                    aria-pressed={declared.includes(a.slug)}
                    onClick={() => toggleDeclared(a.slug)}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="table-input"
                style={{ marginTop: "10px", marginBottom: 0 }}
                placeholder="Other? Type any allergy not listed"
                aria-label="Other allergy"
                value={otherAllergy}
                onChange={(e) => setOtherAllergy(e.target.value)}
              />
              {orderDeclaredHits.length > 0 && (
                <div className="allergy-warning">
                  <i className="fas fa-triangle-exclamation"></i> Heads up — your order contains{" "}
                  <b>{orderDeclaredHits.map(allergenLabel).join(", ").toLowerCase()}</b>. Flagged dishes are marked above.
                </div>
              )}
            </div>

            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              id="cart-table" className="table-input" placeholder="Enter Table Number"
              aria-label="Table number" value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />

            <div className="bill-rows">
              <div className="bill-line"><span>Subtotal</span><span>{showPrice(subtotal)}</span></div>
              <div className="bill-line"><span>Tax (5%)</span><span>{showPrice(tax)}</span></div>
              <div className="bill-line grand"><span>Total</span><span>{showPrice(total)}</span></div>
            </div>

            <button className="btn btn-gold" onClick={placeOrder} disabled={placing}>
              <i className="fas fa-circle-check"></i> {placing ? "Placing…" : "Place Order"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
