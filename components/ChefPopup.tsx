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

  const handleSend = async () => {
    if (sending) return;
    if (!tableNumber.trim()) {
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Please enter your table number." } }));
      const el = document.getElementById("chef-table") as HTMLInputElement | null;
      el?.focus();
      el?.classList.add("table-input-error");
      setTimeout(() => el?.classList.remove("table-input-error"), 1500);
      return;
    }
    setSending(true);
    try {
      await callWaiter(tableNumber.trim());
      window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Waiter called — someone's on the way! 👨‍🍳" } }));
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
          Call a Waiter?
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 24px" }}>
          Please enter your table number
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
        <button className="btn btn-gold" onClick={handleSend} disabled={sending}>
          {sending ? "Sending…" : "Send Request"}
        </button>
      </div>
    </>
  );
}
