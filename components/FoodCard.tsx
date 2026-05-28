"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, getCurrency, type CurrencyMeta } from "@/lib/format";

interface FoodItem {
  id: string;
  slug: string;
  title: string;
  price: string;
  image: string;
  category: string;
  veg: boolean;
  is4d: boolean;
  modelFolder?: string;
  rating?: string;
  time?: string;
}

const FAV_KEY = "lfh-favorites";

const readFavorites = (): string[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFavorites = (ids: string[]) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {}
};

export default function FoodCard({ item, index }: { item: FoodItem; index: number }) {
  const [favorited, setFavorited] = useState(false);
  const [currency, setCurrencyState] = useState<CurrencyMeta | null>(null);

  useEffect(() => {
    setFavorited(readFavorites().includes(item.id));
    setCurrencyState(getCurrency());
    const onFav = () => setFavorited(readFavorites().includes(item.id));
    const onCur = () => setCurrencyState(getCurrency());
    window.addEventListener("lfh:favorites-updated", onFav);
    window.addEventListener("lfh:currency-changed", onCur);
    return () => {
      window.removeEventListener("lfh:favorites-updated", onFav);
      window.removeEventListener("lfh:currency-changed", onCur);
    };
  }, [item.id]);

  const toggleFavorite = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const current = readFavorites();
    const next = current.includes(item.id)
      ? current.filter((id) => id !== item.id)
      : [...current, item.id];
    writeFavorites(next);
    setFavorited(next.includes(item.id));
    window.dispatchEvent(new Event("lfh:favorites-updated"));
  };

  return (
    <Link href={`/item/${item.slug}`} className="item-card-link">
      <div
        className={`item-card fade-in ${item.is4d ? "is-4d" : ""}`}
        style={{ animationDelay: `${index * 0.06}s` }}
      >
        <div className="diet-badge" aria-hidden="true">
          {item.veg ? "🌿" : "🥩"}
        </div>
        <div className="thumb-wrapper">
          <Image
            className="dish-thumb"
            src={item.image}
            alt={item.title}
            width={110}
            height={110}
            sizes="(max-width: 600px) 86px, 110px"
            unoptimized
          />
          {item.is4d ? (
            <div className="badge-4d">
              <i className="fas fa-cube"></i> 4D
            </div>
          ) : null}
        </div>
        <div className="dish-info">
          <div className="dish-name">
            {item.title}
            {item.is4d ? (
              <i
                className="fas fa-cube"
                style={{ fontSize: "11px", color: "var(--accent)" }}
              ></i>
            ) : null}
          </div>
          <div className="dish-meta">
            {item.rating || "4.8"} ★ • {item.time || "25-30 min"}
          </div>
          <div className="dish-price">{currency ? formatPrice(item.price, currency) : `$${item.price}`}</div>
        </div>
        <button
          type="button"
          className={`favorite-btn ${favorited ? "active" : ""}`}
          aria-label={favorited ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
          aria-pressed={favorited}
          onClick={toggleFavorite}
        >
          <i className={`${favorited ? "fas" : "far"} fa-heart`}></i>
        </button>
      </div>
    </Link>
  );
}
