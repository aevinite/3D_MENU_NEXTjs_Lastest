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
  nutrition: { calories: string; protein: string; carbs: string };
  ingredients: { emoji: string; name: string }[];
  reviews: { name: string; rating: number; text: string }[];
  relatedSlugs: string[];
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
    nutrition: row.nutrition ?? { calories: "", protein: "", carbs: "" },
    ingredients: row.ingredients ?? [],
    reviews: row.reviews ?? [],
    relatedSlugs: row.related_slugs ?? [],
  };
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
