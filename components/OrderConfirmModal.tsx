"use client";

import { useEffect, useState } from "react";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";
import type { OptionGroup } from "@/lib/menu";
import { allergenIcon, allergenLabel } from "@/lib/allergens";

interface OrderItem {
  id: string;
  title: string;
  price: string;
  image: string;
}

interface ConfirmDetail {
  item: OrderItem;
  options?: OptionGroup[];
  allergens?: string[];
}

export default function OrderConfirmModal() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<OrderItem | null>(null);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [allergens, setAllergens] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrencyState(getCurrency());
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<ConfirmDetail>).detail;
      if (!detail?.item) return;
      const gs = Array.isArray(detail.options) ? detail.options : [];
      setItem(detail.item);
      setGroups(gs);
      // single-choice groups default to their first option; multi start empty
      const init: Record<number, string[]> = {};
      gs.forEach((g, i) => {
        init[i] = g.type === "single" && g.choices[0] ? [g.choices[0].label] : [];
      });
      setSelected(init);
      setAllergens(Array.isArray(detail.allergens) ? detail.allergens : []);
      setRemoved([]);
      setNote("");
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !item) return null;

  const fmt = (n: number) => (currency ? formatPrice(n, currency) : `$${n.toFixed(2)}`);

  // Chosen options as a flat list + the per-unit price (base + add-ons).
  const chosen: { group: string; label: string; price: number }[] = [];
  groups.forEach((g, i) => {
    (selected[i] || []).forEach((label) => {
      const c = g.choices.find((x) => x.label === label);
      if (c) chosen.push({ group: g.name, label, price: c.price || 0 });
    });
  });
  const unit = parseFloat(item.price) + chosen.reduce((s, c) => s + c.price, 0);
  const total = unit * qty;

  const toggle = (groupIdx: number, label: string, type: "single" | "multi") => {
    setSelected((prev) => {
      const cur = prev[groupIdx] || [];
      if (type === "single") return { ...prev, [groupIdx]: [label] };
      return { ...prev, [groupIdx]: cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label] };
    });
  };

  const toggleRemove = (a: string) =>
    setRemoved((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const confirm = () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const sig = JSON.stringify([
        ...chosen.map((c) => `${c.group}:${c.label}`),
        ...removed.map((r) => `no:${r}`),
        note.trim() ? `note:${note.trim()}` : "",
      ]);
      let cart: { id: string; title: string; price: string; image: string; qty: number; options?: typeof chosen; removed?: string[]; note?: string; sig?: string }[] = [];
      const saved = localStorage.getItem("lfh_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) cart = parsed;
      }
      // Same dish + same options/allergy/note = one line; otherwise a new line.
      const existing = cart.find((it) => it.id === item.id && (it.sig || "[]") === sig);
      if (existing) existing.qty += qty;
      else cart.push({
        id: item.id, title: item.title, price: unit.toFixed(2), image: item.image, qty,
        options: chosen.length ? chosen : undefined,
        removed: removed.length ? removed : undefined,
        note: note.trim() || undefined,
        sig,
      });

      localStorage.setItem("lfh_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("lfh:cart-updated"));
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: `${qty} × ${item.title} added` } }));
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
        <button type="button" className="order-confirm-close" aria-label="Close" onClick={() => setOpen(false)}>
          <i className="fas fa-times"></i>
        </button>

        <img src={item.image} alt={item.title} className="order-confirm-img" />
        <h3 className="order-confirm-title">{item.title}</h3>
        <div className="order-confirm-unit">{fmt(parseFloat(item.price))} base</div>

        {groups.map((g, i) => (
          <div key={i} className="oc-group">
            <div className="oc-group-name">{g.name}{g.type === "multi" ? " (any)" : ""}</div>
            <div className="oc-choices">
              {g.choices.map((c) => {
                const on = (selected[i] || []).includes(c.label);
                return (
                  <button
                    key={c.label}
                    type="button"
                    className={`oc-choice ${on ? "on" : ""}`}
                    onClick={() => toggle(i, c.label, g.type)}
                  >
                    <span>{c.label}</span>
                    {c.price > 0 && <span className="oc-price">+{fmt(c.price)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {allergens.length > 0 && (
          <div className="oc-group">
            <div className="oc-group-name">Contains — tap to remove</div>
            <div className="oc-choices">
              {allergens.map((a) => {
                const off = removed.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    className={`oc-allergen ${off ? "removed" : ""}`}
                    onClick={() => toggleRemove(a)}
                  >
                    {allergenIcon(a)} {allergenLabel(a)}{off ? " — removed" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="oc-note-wrap">
          <input
            type="text"
            className="oc-note"
            placeholder="Anything else? (e.g. less ice, no sugar)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="order-confirm-qty">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
        </div>

        <div className="order-confirm-total">
          <span>Total</span>
          <span className="order-confirm-total-val">{fmt(total)}</span>
        </div>

        <div className="order-confirm-actions">
          <button type="button" className="order-confirm-cancel" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" className="order-confirm-add" onClick={confirm} disabled={submitting}>
            {submitting ? "Adding…" : "Add to Order"}
          </button>
        </div>
      </div>
    </>
  );
}
