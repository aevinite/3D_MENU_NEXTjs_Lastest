"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Stops an accidental "swipe / press Back and you're gone" exit from the menu.
// SCOPED to /menu only, so in-app Back (item detail -> menu) is never touched.
//
// How it works: while on /menu we push a harmless history "trap" entry. Pressing
// Back lands on that trap (URL stays /menu) instead of leaving the site; we
// re-arm the trap and show a confirm. Only the "Exit" button actually leaves —
// pressing Back again just re-shows the confirm, it can never slip out by itself.
//
// We spread the existing history.state so Next's own router bookkeeping is kept
// intact (clobbering it would break Next navigation).
export default function ExitGuard() {
  const pathname = usePathname();
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (pathname !== "/menu") return;
    let leaving = false;

    const arm = () => {
      try {
        window.history.pushState({ ...window.history.state, __lfhExit: true }, "");
      } catch {}
    };

    arm();

    const onPop = () => {
      if (leaving) return;
      arm(); // re-trap immediately so a stray Back can't escape
      setAsking(true);
    };

    const onExit = () => {
      leaving = true;
      window.removeEventListener("popstate", onPop);
      setAsking(false);
      // Past our trap + the menu entry → leaves to wherever they came from.
      // (If the menu was the very first tab entry there's nothing before it to
      // go to, so the browser simply stays — nothing to exit to.)
      try { window.history.go(-2); } catch {}
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("lfh:do-exit", onExit);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("lfh:do-exit", onExit);
    };
  }, [pathname]);

  if (!asking) return null;

  return (
    <div className="exit-overlay" onClick={() => setAsking(false)}>
      <div className="exit-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="exit-emoji" aria-hidden="true">👋</div>
        <div className="exit-title">Leave the menu?</div>
        <div className="exit-msg">You&apos;re about to exit Little French House.</div>
        <div className="exit-actions">
          <button type="button" className="exit-stay" onClick={() => setAsking(false)}>
            Stay
          </button>
          <button
            type="button"
            className="exit-leave"
            onClick={() => window.dispatchEvent(new Event("lfh:do-exit"))}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
