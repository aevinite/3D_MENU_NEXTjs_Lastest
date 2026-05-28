"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { modelWatchlist } from "@/lib/modelWatchlist";

interface Toast {
  id: number;
  message: string;
  kind: "loaded" | "failed";
  folder?: string;
  slug?: string;
}

export default function ModelToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const announcedRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const push = (toast: Omit<Toast, "id">) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { ...toast, id }]);
      const ttl = toast.kind === "failed" ? 7000 : 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, ttl);
    };

    const onLoaded = (e: Event) => {
      const url = (e as CustomEvent).detail?.url as string | undefined;
      if (!url) return;
      const entry = modelWatchlist.findByUrl(url);
      if (!entry) return;
      const key = `loaded:${entry.folder}`;
      if (announcedRef.current.has(key)) return;
      announcedRef.current.add(key);
      modelWatchlist.unwatchByFolder(entry.folder);
      push({
        message: `${entry.title} 3D is ready — tap to view`,
        kind: "loaded",
        folder: entry.folder,
        slug: entry.slug,
      });
    };

    const onFailed = (e: Event) => {
      const url = (e as CustomEvent).detail?.url as string | undefined;
      if (!url) return;
      const entry = modelWatchlist.findByUrl(url);
      if (!entry) return;
      const key = `failed:${entry.folder}`;
      if (announcedRef.current.has(key)) return;
      announcedRef.current.add(key);
      push({
        message: `Could not load ${entry.title} 3D model`,
        kind: "failed",
      });
    };

    window.addEventListener("lfh:model-loaded", onLoaded);
    window.addEventListener("lfh:model-failed", onFailed);
    return () => {
      window.removeEventListener("lfh:model-loaded", onLoaded);
      window.removeEventListener("lfh:model-failed", onFailed);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="model-toast-stack">
      {toasts.map((t) => {
        const clickable = t.kind === "loaded" && !!t.folder;
        const onClick = () => {
          if (!clickable) return;
          const qs = t.slug ? `?from=${encodeURIComponent(t.slug)}` : "";
          router.push(`/view/${t.folder}${qs}`);
        };
        return (
          <div
            key={t.id}
            className={`model-toast model-toast-${t.kind}${
              clickable ? " model-toast-clickable" : ""
            }`}
            onClick={onClick}
            role={clickable ? "button" : undefined}
          >
            <i
              className={
                t.kind === "loaded"
                  ? "fas fa-cube model-toast-icon"
                  : "fas fa-exclamation-triangle model-toast-icon"
              }
            ></i>
            <span className="model-toast-text">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
