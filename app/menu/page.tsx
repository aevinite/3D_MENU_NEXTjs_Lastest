"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FoodCard from "@/components/FoodCard";
import HeroTitle from "@/components/HeroTitle";
import { modelLoader } from "@/lib/modelLoader";
import {
  getMenuItems,
  getCategories,
  localized,
  type MenuItem,
  type Category,
} from "@/lib/menu";
import { useTranslation, useLanguage } from "@/lib/i18n";

// The card list works with the full MenuItem shape from the data layer.
type FoodItem = MenuItem;

// Sort options (replace the old dietary filters). Each re-orders the list rather
// than hiding dishes. Spice level is derived from the dish name/tags.
const SORTS = [
  { slug: "popular", label: "🔥 Popular" },
  { slug: "top-rated", label: "⭐ Top Rated" },
  { slug: "spicy", label: "🌶️ Spiciest" },
  { slug: "price", label: "💲 Price" },
];

// Veg / Non-Veg are FILTERS (show only matching), driven by the dish veg flag.
const DIETS = [
  { slug: "veg", label: "🌿 Veg" },
  { slug: "non-veg", label: "🍖 Non-Veg" },
];

const spiceLevel = (it: FoodItem) => {
  const n = it.title.toLowerCase();
  if (/tri chilli|piri|buffalo|jalape/.test(n)) return 3;
  if (it.tags.includes("spicy")) return 2;
  if (/spiced|chilli|pepper|hot/.test(n)) return 1;
  return 0;
};
const ratingOf = (it: FoodItem) => parseFloat(it.rating) || 0;

export default function MenuPage() {
  const t = useTranslation();
  const lang = useLanguage();
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState("");
  const [currentSort, setCurrentSort] = useState(""); // "" = recommended (menu order)
  const [currentDiet, setCurrentDiet] = useState(""); // "" | "veg" | "non-veg"
  const [layout, setLayout] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Category bar — DB categories plus a curated "Chef's Special" tab (backed by
  // the chef-special tag, not a real category). One category is ALWAYS selected.
  const categories = [
    ...dbCategories.map((c) => ({
      slug: c.slug,
      name: localized(c.name, lang),
      icon: c.icon || "fa-utensils",
      color: c.color || "#d4a574",
    })),
    { slug: "chef-special", name: "Chef's Special", icon: "fa-star", color: "#e8b884" },
  ];

  // A category is ALWAYS selected — clicking just switches, never clears.
  const selectCategory = (slug: string) => setCurrentCategory(slug);
  // Sort DOES toggle: clicking the active sort returns to the recommended order.
  const toggleSort = (slug: string) =>
    setCurrentSort((cur) => (cur === slug ? "" : slug));
  // Diet filter toggles too (veg / non-veg are mutually exclusive).
  const toggleDiet = (slug: string) =>
    setCurrentDiet((cur) => (cur === slug ? "" : slug));

  useEffect(() => {
    getMenuItems()
      .then((items) => setMenuData(items))
      .catch((err) => console.error("Error loading menu data:", err));
    getCategories()
      .then((cats) => {
        setDbCategories(cats);
        // Default to the first category so one is always selected.
        setCurrentCategory((cur) => cur || cats[0]?.slug || "");
      })
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  useEffect(() => {
    if (!menuData.length) return;

    const fourD = menuData.filter(
      (i) => i.is4d && i.modelSmallUrl && i.modelOptimizedUrl
    );

    const inCat = !currentCategory
      ? fourD
      : fourD.filter((i) => i.category === currentCategory);
    const outCat = !currentCategory
      ? []
      : fourD.filter((i) => i.category !== currentCategory);

    const smallIfNeeded = (i: FoodItem) =>
      modelLoader.isLoaded(i.modelOptimizedUrl) ? null : i.modelSmallUrl!;

    modelLoader.setQueue(
      inCat.map(smallIfNeeded).filter((u): u is string => !!u),
      outCat.map(smallIfNeeded).filter((u): u is string => !!u),
      inCat.map((i) => i.modelOptimizedUrl!),
      outCat.map((i) => i.modelOptimizedUrl!)
    );
  }, [menuData, currentCategory]);

  const visibleItems = menuData.filter((item) => {
    if (currentCategory === "chef-special") {
      if (!item.tags.includes("chef-special")) return false;
    } else if (currentCategory && item.category !== currentCategory) {
      return false;
    }
    if (currentDiet === "veg" && !item.veg) return false;
    if (currentDiet === "non-veg" && item.veg) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Apply the chosen sort (a stable copy so the menu order stays the default).
  const filteredItems = [...visibleItems].sort((a, b) => {
    switch (currentSort) {
      case "popular": {
        const pa = a.tags.includes("bestseller") ? 1 : 0;
        const pb = b.tags.includes("bestseller") ? 1 : 0;
        return pb - pa || ratingOf(b) - ratingOf(a);
      }
      case "top-rated":
        return ratingOf(b) - ratingOf(a);
      case "spicy":
        return spiceLevel(b) - spiceLevel(a) || ratingOf(b) - ratingOf(a);
      case "price":
        return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      default:
        return 0; // recommended = original menu order
    }
  });

  return (
    <AppShell>
      <div id="main-scroll">
        <div className="hero">
          <HeroTitle greeting={t.greeting} title={t.heroTitle} />
        </div>

        <div className="section-header">
          <span className="section-title">{t.categories}</span>
          <span className="browse-hint" aria-hidden="true">
            {t.slide} <i className="fas fa-arrow-right"></i>
          </span>
        </div>
        <div className="cat-scroller" id="cat-scroller" role="tablist" aria-label="Menu categories">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              aria-selected={cat.slug === currentCategory}
              className={`cat-card ${cat.slug === currentCategory ? "active" : ""}`}
              style={{ ["--cat-color" as string]: cat.color }}
              onClick={() => selectCategory(cat.slug)}
            >
              <div className="cat-icon" aria-hidden="true">
                <i className={`fas ${cat.icon}`}></i>
              </div>
              <div className="cat-name">{cat.name}</div>
            </button>
          ))}
        </div>

        <div className="items-header" id="sticky-header">
          <div className="search-container">
            <img
              className="search-logo"
              src="https://littlefrenchhouse.in/restaurant/wp-content/uploads/2021/01/LFH-Logo_200x200-e1612862168838.png"
              alt=""
              aria-hidden="true"
            />
            <input
              type="search"
              id="search-input"
              className="search-input"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-controls">
            <div className="controls-group">
              <div className="filter-row" role="group" aria-label="Filter and sort dishes">
                {SORTS.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    className={`filter-chip ${currentSort === s.slug ? "active" : ""}`}
                    aria-pressed={currentSort === s.slug}
                    onClick={() => toggleSort(s.slug)}
                  >
                    {s.label}
                  </button>
                ))}
                <span className="chip-divider" aria-hidden="true"></span>
                {DIETS.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    className={`filter-chip ${currentDiet === d.slug ? "active" : ""}`}
                    aria-pressed={currentDiet === d.slug}
                    onClick={() => toggleDiet(d.slug)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="layout-switch" role="group" aria-label="Layout">
                <button
                  type="button"
                  className={`switch-opt ${layout === "list" ? "active" : ""}`}
                  aria-pressed={layout === "list"}
                  aria-label="List view"
                  onClick={() => setLayout("list")}
                >
                  <i className="fas fa-list" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className={`switch-opt ${layout === "gallery" ? "active" : ""}`}
                  aria-pressed={layout === "gallery"}
                  aria-label="Gallery view"
                  onClick={() => setLayout("gallery")}
                >
                  <i className="fas fa-th-large" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          id="items-container"
          className={`items-container ${layout === "gallery" ? "gallery-mode" : ""}`}
        >
          {filteredItems.map((item, index) => (
            <FoodCard key={item.id} item={item} index={index} viewingCategory={currentCategory} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
