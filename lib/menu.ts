// Shared data layer for the menu.
//
// Reads come from the Supabase `menu_items` table using the ANON (public) key
// — the same client in lib/supabase.ts. The table's RLS policy allows public
// SELECT, so no auth is needed. The service-role key is NEVER used here; it
// stays server-side only (see scripts/seed-supabase.mjs).
//
// The DB stores columns in snake_case; the app works in camelCase. The mapping
// happens in `mapRow` so the rest of the app doesn't change shape.

import { supabase } from "./supabase";

export interface MenuItem {
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
  description: string;
  longDescription: string;
  rating: string;
  time: string;
  nutrition: { calories: string; protein: string; carbs: string; sugar?: string };
  ingredients: { emoji: string; name: string }[];
  reviews: { name: string; rating: number; text: string }[];
  relatedSlugs: string[];
  tags: string[];
  allergens: string[];
}

// A label that exists in several languages, e.g. { en: "Burgers", de: "Burger" }.
export type LocalizedText = Record<string, string>;

export interface Category {
  slug: string;
  name: LocalizedText;
  icon?: string;   // FontAwesome class, e.g. "fa-burger"
  color?: string;  // hex accent
  sortOrder: number;
  active: boolean;
}

export interface Filter {
  slug: string;
  name: LocalizedText;
  icon?: string;   // emoji or icon
  sortOrder: number;
  active: boolean;
}

// Pick the label for a language, falling back to English, then to whatever
// exists, so the UI never shows a blank.
export function localized(text: LocalizedText | undefined, lang: string): string {
  if (!text) return "";
  return text[lang] || text.en || Object.values(text)[0] || "";
}

// One DB row (snake_case) -> one app object (camelCase).
function mapRow(row: any): MenuItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    image: row.image,
    category: row.category,
    veg: !!row.veg,
    is4d: !!row.is4d,
    modelFolder: row.model_folder ?? undefined,
    modelSmallUrl: row.model_small_url ?? undefined,
    modelOptimizedUrl: row.model_optimized_url ?? undefined,
    description: row.description ?? "",
    longDescription: row.long_description ?? "",
    rating: row.rating ?? "0",
    time: row.time ?? "",
    nutrition: row.nutrition ?? { calories: "", protein: "", carbs: "", sugar: "" },
    ingredients: row.ingredients ?? [],
    reviews: row.reviews ?? [],
    relatedSlugs: row.related_slugs ?? [],
    tags: row.tags ?? [],
    allergens: row.allergens ?? [],
  };
}

// Record a placed order. Public (anon) insert is allowed by RLS; the order is
// write-only for the public — only the owner (service role) can read orders back.
export interface OrderInput {
  tableNumber: string;
  items: { id: string; title: string; price: string; qty: number }[];
  subtotal: number;
  tax: number;
  total: number;
  allergies: string[];
}
export async function createOrder(o: OrderInput): Promise<void> {
  const { error } = await supabase.from("orders").insert({
    table_number: o.tableNumber || null,
    items: o.items,
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    allergies: o.allergies,
  });
  if (error) throw new Error(`Order failed: ${error.message}`);
}

// All menu items, in the order set by `sort_order`.
export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`Failed to load menu: ${error.message}`);
  return (data ?? []).map(mapRow);
}

// A single item by slug, or null if it doesn't exist.
export async function getMenuItem(slug: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load item "${slug}": ${error.message}`);
  return data ? mapRow(data) : null;
}

// Active categories, in display order. The virtual "All" tab is added by the UI.
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name ?? {},
    icon: r.icon ?? undefined,
    color: r.color ?? undefined,
    sortOrder: r.sort_order ?? 0,
    active: !!r.active,
  }));
}

// Site-wide settings (single 'site' row). Defaults to bubbles on if missing.
export interface Settings {
  bubblesEnabled: boolean;
  serviceMode: boolean;
}
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "site")
    .maybeSingle();
  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  return {
    bubblesEnabled: data ? data.bubbles_enabled !== false : true,
    serviceMode: data ? data.service_mode === true : false,
  };
}

// Active filter chips, in display order. The virtual "All" chip is added by the UI.
export async function getFilters(): Promise<Filter[]> {
  const { data, error } = await supabase
    .from("filters")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(`Failed to load filters: ${error.message}`);
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name ?? {},
    icon: r.icon ?? undefined,
    sortOrder: r.sort_order ?? 0,
    active: !!r.active,
  }));
}
