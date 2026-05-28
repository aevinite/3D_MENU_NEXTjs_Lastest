"use client";

import { useEffect, useState } from "react";

export default function ChefPopup() {
  const [open, setOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");

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

  const handleSend = () => {
    window.dispatchEvent(new CustomEvent("lfh:toast", { detail: { message: "Waiter called! 👨‍💼" } }));
    window.dispatchEvent(new Event("lfh:close-all"));
    setTableNumber("");
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
        <button className="btn btn-gold" onClick={handleSend}>
          Send Request
        </button>
      </div>
    </>
  );
}
