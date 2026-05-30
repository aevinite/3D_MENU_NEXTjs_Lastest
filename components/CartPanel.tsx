"use client";

import { useEffect, useState } from "react";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";
import { getMenuItems, createOrder, type MenuItem } from "@/lib/menu";
import { ALLERGENS, allergenIcon, allergenLabel } from "@/lib/allergens";

interface CartOption { group: string; label: string; price: number }
interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  qty: number;
  options?: CartOption[];
  sig?: string;
}

interface HistoryOrder {
  id: string;
  tableNumber: string;
  total: number;
  items: { title: string; qty: number; price: string }[];
  placedAt: number;
}

const TAX_RATE = 0.05; // 5% — shown as a line on the bill

const normalize = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it): it is { id: string; title: string; price: string; image: string; qty?: number; options?: CartOption[]; sig?: string } =>
      !!it && typeof it === "object" && "id" in it
    )
    .map((it) => ({
      id: it.id,
      title: it.title,
      price: it.price,
      image: it.image,
      qty: typeof it.qty === "number" && it.qty > 0 ? it.qty : 1,
      options: Array.isArray(it.options) ? it.options : undefined,
      sig: it.sig,
    }));
};

export default function CartPanel() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);
  const [allergenMap, setAllergenMap] = useState<Record<string, string[]>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [declared, setDeclared] = useState<string[]>([]); // allergens the diner avoids
  const [otherAllergy, setOtherAllergy] = useState(""); // free-text allergy not in the list
  const [otherOpen, setOtherOpen] = useState(false); // reveal the free-text field
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
        setMenuItems(items);
      })
      .catch(() => {});

    const loadHistory = () => {
      try {
        const r = localStorage.getItem("lfh_order_history");
        const p = r ? JSON.parse(r) : [];
        setHistory(Array.isArray(p) ? p : []);
      } catch { setHistory([]); }
    };
    loadHistory();
    const handleOpen = () => { setOpen(true); loadCart(); loadHistory(); setShowHistory(false); };
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
  const itemCount = cart.reduce((sum, it) => sum + it.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const itemAllergens = (id: string) => allergenMap[id] || [];
  const conflicts = (id: string) => itemAllergens(id).filter((a) => declared.includes(a));
  const orderDeclaredHits = [...new Set(cart.flatMap((it) => conflicts(it.id)))];
  const toggleDeclared = (slug: string) =>
    setDeclared((d) => (d.includes(slug) ? d.filter((x) => x !== slug) : [...d, slug]));

  // Gentle pairing upsell: the top-rated drink/dessert not already on the bill.
  const cartIds = new Set(cart.map((c) => c.id));
  const PAIR_CATS = ["coffee", "beverages", "desserts"];
  const pairing =
    cart.length > 0
      ? menuItems
          .filter((i) => !cartIds.has(i.id) && PAIR_CATS.includes(i.category))
          .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))[0] || null
      : null;
  const addPairing = (it: MenuItem) => {
    const next = [...cart];
    const idx = next.findIndex((c) => c.id === it.id);
    if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
    else next.push({ id: it.id, title: it.title, price: it.price, image: it.image, qty: 1 });
    commit(next);
    window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: `${it.title} added` } }));
  };

  const placeOrder = async () => {
    if (cart.length === 0 || placing) return;
    // Table number is required — the kitchen needs to know where to serve.
    if (!tableNumber.trim()) {
      window.dispatchEvent(
        new CustomEvent("lfh:toast", { detail: { message: "Please enter your table number first." } })
      );
      const input = document.getElementById("cart-table") as HTMLInputElement | null;
      input?.focus();
      input?.classList.add("table-input-error");
      setTimeout(() => input?.classList.remove("table-input-error"), 1500);
      return;
    }
    setPlacing(true);
    try {
      const allergies = [...declared, ...(otherAllergy.trim() ? [otherAllergy.trim()] : [])];
      const orderId = await createOrder({
        tableNumber,
        items: cart.map((it) => ({ id: it.id, title: it.title, price: it.price, qty: it.qty, options: it.options })),
        subtotal,
        tax,
        total,
        allergies,
      });
      // Remember this order on THIS device so the guest can follow its status.
      try {
        const raw = localStorage.getItem("lfh_active_orders");
        const list = raw ? JSON.parse(raw) : [];
        const active = Array.isArray(list) ? list : [];
        active.push({
          id: orderId,
          tableNumber: tableNumber.trim(),
          total,
          itemCount,
          items: cart.map((it) => ({ title: it.title, qty: it.qty })),
          status: "received",
          placedAt: Date.now(),
        });
        localStorage.setItem("lfh_active_orders", JSON.stringify(active));
        window.dispatchEvent(new Event("lfh:order-placed"));
      } catch {}
      // Also keep a permanent history this device can browse later.
      try {
        const rawH = localStorage.getItem("lfh_order_history");
        const hist = (() => { const p = rawH ? JSON.parse(rawH) : []; return Array.isArray(p) ? p : []; })();
        hist.unshift({
          id: orderId,
          tableNumber: tableNumber.trim(),
          total,
          items: cart.map((it) => ({ title: it.title, qty: it.qty, price: it.price })),
          placedAt: Date.now(),
        });
        // Kept only in the guest's own browser (never Supabase); persists across visits.
        localStorage.setItem("lfh_order_history", JSON.stringify(hist.slice(0, 50)));
        setHistory(hist.slice(0, 50));
      } catch {}
      const msg = tableNumber.trim() ? `Order placed for table ${tableNumber.trim()}! 🎉` : "Order placed! 🎉";
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: msg } }));
      setCart([]); saveCart([]); setTableNumber(""); setDeclared([]); setOtherAllergy(""); setOtherOpen(false);
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
        <div className="cart-topbar">
          <button
            type="button"
            className="cart-back"
            onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button className="nav-btn" title="Close" aria-label="Close cart" onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <h3 className="panel-title" style={{ margin: "0 0 20px", textAlign: "left" }}>
          <i className="fas fa-receipt"></i> Your Bill
          {cart.length > 0 && (
            <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 500 }}>
              {" "}· {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
          )}
        </h3>

        {history.length > 0 && (
          <div className="cart-tabs">
            <button type="button" className={!showHistory ? "active" : ""} onClick={() => setShowHistory(false)}>Current bill</button>
            <button type="button" className={showHistory ? "active" : ""} onClick={() => setShowHistory(true)}>Previous orders ({history.length})</button>
          </div>
        )}

        {showHistory ? (
          <div className="order-history">
            {history.map((h) => (
              <div key={h.id} className="hist-order">
                <div className="hist-top">
                  <span className="hist-table">{h.tableNumber ? `Table ${h.tableNumber}` : "Order"}</span>
                  <span className="hist-when">{new Date(h.placedAt).toLocaleString()}</span>
                </div>
                <div className="hist-items">
                  {h.items.map((it, i) => (
                    <span key={i}>{it.title} ×{it.qty}{i < h.items.length - 1 ? ", " : ""}</span>
                  ))}
                </div>
                <div className="hist-total"><span>Total</span><span>{showPrice(h.total)}</span></div>
              </div>
            ))}
          </div>
        ) : (
        <>
        <div id="cart-list" className="cart-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "50px 0", fontSize: "15px" }}>
              Your cart is empty
            </div>
          ) : (
            cart.map((item, idx) => {
              const c = conflicts(item.id);
              return (
                <div key={`${item.id}-${item.sig || ""}-${idx}`} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cart-item-name">{item.title}</div>
                    {item.options && item.options.length > 0 && (
                      <div className="cart-item-opts">
                        {item.options.map((o) => o.label).join(", ")}
                      </div>
                    )}
                    {itemAllergens(item.id).length > 0 && (
                      <div className="cart-item-allergens">
                        {itemAllergens(item.id).map((a) => (
                          <span
                            key={a}
                            className={`allergen-dot ${declared.includes(a) ? "flag" : ""}`}
                            title={`Contains ${allergenLabel(a).toLowerCase()}`}
                          >
                            {allergenIcon(a)}
                          </span>
                        ))}
                      </div>
                    )}
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
            {pairing && (
              <div className="pairing">
                <div className="pairing-label">✨ Goes well with</div>
                <div className="pairing-card">
                  {pairing.image && <img src={pairing.image} alt="" className="pairing-img" />}
                  <div className="pairing-info">
                    <div className="pairing-name">{pairing.title}</div>
                    <div className="pairing-price">{showPrice(parseFloat(pairing.price))}</div>
                  </div>
                  <button type="button" className="pairing-add" onClick={() => addPairing(pairing)}>
                    + Add
                  </button>
                </div>
              </div>
            )}

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
                <button
                  type="button"
                  className={`allergy-toggle ${otherOpen ? "on" : ""}`}
                  aria-pressed={otherOpen}
                  onClick={() => setOtherOpen((o) => !o)}
                >
                  ✏️ Other
                </button>
              </div>
              {otherOpen && (
                <input
                  type="text"
                  className="table-input"
                  style={{ marginTop: "10px", marginBottom: 0 }}
                  placeholder="Type your allergy…"
                  aria-label="Other allergy"
                  value={otherAllergy}
                  onChange={(e) => setOtherAllergy(e.target.value)}
                  autoFocus
                />
              )}
              {orderDeclaredHits.length > 0 && (
                <div className="allergy-warning">
                  <i className="fas fa-triangle-exclamation"></i> Heads up — your order contains{" "}
                  <b>{orderDeclaredHits.map(allergenLabel).join(", ").toLowerCase()}</b>. Flagged dishes are marked above.
                </div>
              )}
            </div>

            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              id="cart-table" className="table-input" placeholder="Enter Table Number (required)"
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
        </>
        )}
      </div>
    </>
  );
}
