"use client";

import { useEffect, useState } from "react";

export default function ToastHost() {
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleToast = (e: any) => {
      setMessage(e.detail.message);
      setShow(true);
      setTimeout(() => setShow(false), 2200);
    };

    window.addEventListener("lfh:toast", handleToast);

    return () => window.removeEventListener("lfh:toast", handleToast);
  }, []);

  return (
    <div id="toast" className={show ? "show" : ""}>
      {message}
    </div>
  );
}
