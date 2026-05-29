"use client";

import { useEffect, useState } from "react";
import { callWaiter } from "@/lib/menu";

export default function ChefPopup() {
  const [open, setOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    window.addEventListener("lfh:chef-call", handleOpen);
    window.addEventListener("lfh:close-all", handleClose);

    return () => {
      window.removeEventListener("lfh:chef-call", handleOpen);
      window.removeEventListener("lfh:close-all", handleClose);
    };
  }, []);

  const REASONS = [
    { icon: "🙋", label: "Call waiter" },
    { icon: "💧", label: "Water" },
    { icon: "🍴", label: "Cutlery" },
    { icon: "🧻", label: "Napkins" },
    { icon: "🧹", label: "Clean table" },
    { icon: "🧾", label: "Bring the bill" },
  ];

  const handleSend = async (reason: string) => {
    if (sending) return;
    if (!tableNumber.trim()) {
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Please enter your table number first." } }));
      const el = document.getElementById("chef-table") as HTMLInputElement | null;
      el?.focus();
      el?.classList.add("table-input-error");
      setTimeout(() => el?.classList.remove("table-input-error"), 1500);
      return;
    }
    setSending(true);
    try {
      await callWaiter(tableNumber.trim(), reason);
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: `Sent: ${reason} — someone's on the way! 👨‍🍳` } }));
      window.dispatchEvent(new Event("lfh:close-all"));
      setTableNumber("");
    } catch {
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Couldn't reach the staff — please try again." } }));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="overlay active" onClick={() => window.dispatchEvent(new Event("lfh:close-all"))}></div>
      <div id="chef-popup" className="popup active">
        <i className="fas fa-bell-concierge" style={{ fontSize: "48px", color: "var(--accent)" }}></i>
        <h2 style={{ fontFamily: "Playfair Display", color: "var(--text)", margin: "18px 0 8px", fontSize: "24px", fontWeight: 700 }}>
          Need something?
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 16px" }}>
          Enter your table number, then tap what you need
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          id="chef-table"
          className="table-input"
          placeholder="Table No."
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
        <div className="chef-reasons">
          {REASONS.map((r) => (
            <button
              key={r.label}
              type="button"
              className="chef-reason"
              disabled={sending}
              onClick={() => handleSend(r.label)}
            >
              <span className="chef-reason-icon">{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
