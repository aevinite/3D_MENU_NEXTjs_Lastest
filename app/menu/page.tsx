"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FoodCard from "@/components/FoodCard";
import { modelLoader } from "@/lib/modelLoader";

const categories = [
  { id: "all",     name: "All",     icon: "fa-utensils",   color: "#D4A574", glow: "rgba(212,165,116,0.35)" },
  { id: "burgers", name: "Burgers", icon: "fa-burger",     color: "#EF4444", glow: "rgba(239,68,68,0.35)" },
  { id: "pizza",   name: "Pizza",   icon: "fa-pizza-slice",color: "#F97316", glow: "rgba(249,115,22,0.35)" },
  { id: "sushi",   name: "Sushi",   icon: "fa-fish",       color: "#F472B6", glow: "rgba(244,114,182,0.35)" },
  { id: "pasta",   name: "Pasta",   icon: "fa-bowl-food",  color: "#EAB308", glow: "rgba(234,179,8,0.35)" },
  { id: "salads",  name: "Salads",  icon: "fa-leaf",       color: "#22C55E", glow: "rgba(34,197,94,0.35)" },
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
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [currentCategory, setCurrentCategory] = useState("all");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [layout, setLayout] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");

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
          <span className="greet-badge">BONSOIR</span>
          <h2 className="hero-title">Authentic French Cuisine</h2>
        </div>

        <div className="section-header">
          <span className="section-title">CATEGORIES</span>
          <span className="browse-hint" aria-hidden="true">
            Browse <i className="fas fa-arrow-right"></i>
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
              style={{ ["--cat-color" as string]: cat.color, ["--cat-glow" as string]: cat.glow }}
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
              placeholder="Search dishes..."
              aria-label="Search dishes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-controls">
            <div className="current-cat" id="current-cat">
              {categories.find((c) => c.id === currentCategory)?.name || "All Items"}
            </div>
            <div className="controls-group">
              <div className="filter-row" role="group" aria-label="Dietary filter">
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "all" ? "active" : ""}`}
                  aria-pressed={currentFilter === "all"}
                  onClick={() => setCurrentFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "veg" ? "active" : ""}`}
                  aria-pressed={currentFilter === "veg"}
                  onClick={() => setCurrentFilter("veg")}
                >
                  🌿 Veg
                </button>
                <button
                  type="button"
                  className={`filter-chip ${currentFilter === "non-veg" ? "active" : ""}`}
                  aria-pressed={currentFilter === "non-veg"}
                  onClick={() => setCurrentFilter("non-veg")}
                >
                  🍖 Non-Veg
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
            <FoodCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
