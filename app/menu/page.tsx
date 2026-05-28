"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FoodCard from "@/components/FoodCard";
import { modelLoader } from "@/lib/modelLoader";
import { useTranslation } from "@/lib/i18n";

const CAT_META = [
  { id: "all",     icon: "fa-utensils", color: "#d4a574" },
  { id: "burgers", icon: "fa-burger",   color: "#f97316" },
  { id: "pizza",   icon: "fa-pizza-slice", color: "#ef4444" },
  { id: "sushi",   icon: "fa-fish",     color: "#06b6d4" },
  { id: "pasta",   icon: "fa-bowl-food", color: "#f59e0b" },
  { id: "salads",  icon: "fa-leaf",     color: "#22c55e" },
];

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
  modelSmallUrl?: string;
  modelOptimizedUrl?: string;
  description?: string;
  rating?: string;
  time?: string;
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
  };
}

export default function MenuPage() {
  const t = useTranslation();
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [currentCategory, setCurrentCategory] = useState("all");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [layout, setLayout] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");

  const catNameMap: Record<string, string> = {
    all: t.catAll,
    burgers: t.catBurgers,
    pizza: t.catPizza,
    sushi: t.catSushi,
    pasta: t.catPasta,
    salads: t.catSalads,
  };

  const categories = CAT_META.map((c) => ({ ...c, name: catNameMap[c.id] || c.id }));

  useEffect(() => {
    fetch("/content/menu.json")
      .then((res) => res.json())
      .then((data) => setMenuData(data.items))
      .catch((err) => console.error("Error loading menu data:", err));
  }, []);

  useEffect(() => {
    if (!menuData.length) return;

    const fourD = menuData.filter(
      (i) => i.is4d && i.modelSmallUrl && i.modelOptimizedUrl
    );

    const inCat =
      currentCategory === "all"
        ? fourD
        : fourD.filter((i) => i.category === currentCategory);
    const outCat =
      currentCategory === "all"
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
    if (currentCategory !== "all" && item.category !== currentCategory) {
      return false;
    }
    if (currentFilter === "veg" && !item.veg) {
      return false;
    }
    if (currentFilter === "non-veg" && item.veg) {
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
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={cat.id === currentCategory}
              className={`cat-card ${cat.id === currentCategory ? "active" : ""}`}
              onClick={() => setCurrentCategory(cat.id)}
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
            <i className="fas fa-search search-icon" aria-hidden="true"></i>
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
            <div className="current-cat" id="current-cat">
              {categories.find((c) => c.id === currentCategory)?.name || t.catAll}
            </div>
            <div className="controls-group">
              <div className="filter-row" role="group" aria-label="Dietary filter">
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "all" ? "active" : ""}`}
                  aria-pressed={currentFilter === "all"}
                  onClick={() => setCurrentFilter("all")}
                >
                  {t.filterAll}
                </button>
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "veg" ? "active" : ""}`}
                  aria-pressed={currentFilter === "veg"}
                  onClick={() => setCurrentFilter("veg")}
                >
                  {t.filterVeg}
                </button>
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "non-veg" ? "active" : ""}`}
                  aria-pressed={currentFilter === "non-veg"}
                  onClick={() => setCurrentFilter("non-veg")}
                >
                  {t.filterNonVeg}
                </button>
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
