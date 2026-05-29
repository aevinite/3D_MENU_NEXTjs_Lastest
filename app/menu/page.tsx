"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FoodCard from "@/components/FoodCard";
import { modelLoader } from "@/lib/modelLoader";
import {
  getMenuItems,
  getCategories,
  getFilters,
  localized,
  type MenuItem,
  type Category,
  type Filter,
} from "@/lib/menu";
import { useTranslation, useLanguage } from "@/lib/i18n";

// The card list works with the full MenuItem shape from the data layer.
type FoodItem = MenuItem;

export default function MenuPage() {
  const t = useTranslation();
  const lang = useLanguage();
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbFilters, setDbFilters] = useState<Filter[]>([]);
  const [currentCategory, setCurrentCategory] = useState("");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [layout, setLayout] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Category bar — straight from the DB. One category is ALWAYS selected
  // (no "All" option); clicking a category just switches to it.
  const categories = dbCategories.map((c) => ({
    slug: c.slug,
    name: localized(c.name, lang),
    icon: c.icon || "fa-utensils",
    color: c.color || "#d4a574",
  }));

  // Filter chips — same idea, no "All" chip. Click the active one to clear it.
  const filterChips = dbFilters.map((f) => ({
    slug: f.slug,
    label: `${f.icon ? f.icon + " " : ""}${localized(f.name, lang)}`,
  }));

  // A category is ALWAYS selected — clicking just switches, never clears.
  const selectCategory = (slug: string) => setCurrentCategory(slug);
  // Filters DO toggle: "all" is the sentinel for "no filter"; clicking the
  // active filter clears back to all.
  const toggleFilter = (slug: string) =>
    setCurrentFilter((cur) => (cur === slug ? "all" : slug));

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
    getFilters()
      .then(setDbFilters)
      .catch((err) => console.error("Error loading filters:", err));
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

  const filteredItems = menuData.filter((item) => {
    if (currentCategory && item.category !== currentCategory) {
      return false;
    }
    if (currentFilter !== "all" && !item.tags.includes(currentFilter)) {
      return false;
    }
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div id="main-scroll">
        <div className="hero">
          <span className="greet-badge">{t.greeting}</span>
          <h2 className="hero-title">{t.heroTitle}</h2>
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
              <div className="filter-row" role="group" aria-label="Dietary filter">
                {filterChips.map((chip) => (
                  <button
                    key={chip.slug}
                    type="button"
                    className={`filter-chip ${currentFilter === chip.slug ? "active" : ""}`}
                    aria-pressed={currentFilter === chip.slug}
                    onClick={() => toggleFilter(chip.slug)}
                  >
                    {chip.label}
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
