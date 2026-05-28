// Seed the Supabase `menu_items` table from public/content/menu.json.
//
// What it does, in order:
//   1. Runs supabase/migrations/001_menu_items.sql via the Supabase
//      Management API (uses the personal access token / PAT).
//   2. Upserts all menu items using the SERVICE ROLE key (server-side only).
//   3. Reads them back using the ANON key to prove public-read RLS works.
//
// No secrets live in this file — they are read at runtime from .env.local,
// which is gitignored.
//
// Run with:  node scripts/seed-supabase.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- tiny .env parser (avoids adding a dotenv dependency) ---
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const pat = env.SUPABASE_ACCESS_TOKEN;

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

if (!SUPABASE_URL || !ANON || !SERVICE) throw new Error("Missing keys in .env.local");
if (!pat) throw new Error("Missing SUPABASE_ACCESS_TOKEN in .env.local");

// Run arbitrary SQL through the Management API (uses the PAT).
async function runSql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${body}`);
  return body;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- step 1: create the table via the Management API ---
async function runMigration() {
  const sql = readFileSync(
    join(root, "supabase", "migrations", "001_menu_items.sql"),
    "utf8"
  );
  await runSql(sql);
  // PostgREST caches the schema; nudge it so the JS client sees the new table.
  await runSql("NOTIFY pgrst, 'reload schema';");
  console.log("✓ migration ran — menu_items table is ready");
}

// --- step 2: map camelCase JSON -> snake_case DB rows, then upsert ---
function toRow(item, index) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    price: item.price,
    image: item.image,
    category: item.category,
    veg: item.veg ?? false,
    is4d: item.is4d ?? false,
    model_folder: item.modelFolder ?? null,
    model_small_url: item.modelSmallUrl ?? null,
    model_optimized_url: item.modelOptimizedUrl ?? null,
    description: item.description ?? null,
    long_description: item.longDescription ?? null,
    rating: item.rating ?? null,
    time: item.time ?? null,
    nutrition: item.nutrition ?? null,
    ingredients: item.ingredients ?? null,
    reviews: item.reviews ?? null,
    related_slugs: item.relatedSlugs ?? null,
    sort_order: index,
  };
}

async function seed() {
  const menu = JSON.parse(
    readFileSync(join(root, "public", "content", "menu.json"), "utf8")
  );
  const rows = menu.items.map(toRow);

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  // Schema-cache reload can lag a few seconds, so retry briefly.
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const { error } = await admin.from("menu_items").upsert(rows, { onConflict: "id" });
    if (!error) {
      console.log(`✓ upserted ${rows.length} menu items (service role)`);
      return;
    }
    lastErr = error;
    if (!/schema cache/i.test(error.message)) break;
    console.log(`  …waiting for schema cache (attempt ${attempt})`);
    await sleep(2000);
  }
  throw new Error(`Seed failed: ${lastErr.message}`);
}

// --- step 3: read back via the anon key to prove public RLS read works ---
async function verifyAnonRead() {
  const pub = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await pub
    .from("menu_items")
    .select("id, slug, title")
    .order("sort_order");
  if (error) throw new Error(`Anon read failed: ${error.message}`);
  console.log(`✓ anon key can read ${data.length} items:`);
  for (const r of data) console.log(`    ${r.sort_order ?? ""} ${r.slug} — ${r.title}`);
}

await runMigration();
await seed();
await verifyAnonRead();
console.log("\nDone.");
