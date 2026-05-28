# Project: My Little French House (4D Menu)

This is a Next.js 16 / React 19 restaurant menu app with a 3D-model viewer for
selected dishes. The user is a beginner who vibe-codes; teach as you build,
keep chat in plain language, explain why before how. See user/feedback
memory for tone and preferences.

## Stack at a glance

- Next 16.2.6, App Router, async `params`. React 19.2.4. TS strict.
- Tailwind 4 (postcss). GSAP (npm + CDN — duplication is a known bug).
- `<model-viewer>` web component loaded from CDN in `app/layout.tsx`.
- GLB models on Supabase Storage; two tiers per dish (small ~2 MB, optimized ~9 MB).
- Dev: `npm run dev` (port 3003). Playwright: `node scripts/verify-cache.mjs`.

## Architecture cheat sheet

- `lib/modelLoader.ts` — SINGLETON on `globalThis.__lfh_modelLoader`. Downloads
  GLBs into in-memory blobs, hands `blob:` URLs to `<model-viewer>`. This is
  what makes "no re-fetch on navigation" work.
- `lib/modelWatchlist.ts` — sibling singleton; tracks who tried to view 3D
  before it loaded so toasts only fire for them.
- `components/ModelToastHost.tsx` — mounted globally in `app/layout.tsx`;
  listens for `lfh:model-loaded` / `lfh:model-failed` and shows clickable toasts.
- Event bus pattern: components talk via `window.dispatchEvent(new CustomEvent(...))`.
  Names: `lfh:open-cart`, `lfh:close-all`, `lfh:chef-call`, `lfh:cart-updated`,
  `lfh:toast`.
- Persistence: `localStorage` keys `lfh_cart`, `lfh-favorites`; session theme
  in `lfh_theme_session` (read-side currently broken — see bug B2).

## Routes

- `/` — homepage menu (`app/page.tsx`). DUPLICATE of `/menu`, missing the model preloader.
- `/menu` — menu with 3D preload (`app/menu/page.tsx`).
- `/item/[slug]` — dish detail.
- `/view/[folder]` — 3D viewer.
- `/3d/[folder]` — broken stub (old sync `params` API). Likely safe to delete.

## Skills and tools to reach for

Use the right skill the moment the task fits — don't ask permission.

- **Verifying anything visual or runtime** (network requests, cache headers,
  state values, theme behaviour): launch Chrome via MCP tools
  (`mcp__chrome-devtools__new_page`, `navigate_page`, `list_network_requests`,
  `evaluate_script`). Don't speculate from source code alone.
- **Confirming a 3D-cache change didn't regress**: run
  `node scripts/verify-cache.mjs` (Playwright; checks zero re-fetch on
  navigation) and/or `verify-slow-load.mjs` (slow-network toast behaviour).
- **Reducing permission prompts**: run the `fewer-permission-prompts` skill.
- **Verifying a new feature actually works end-to-end**: use the `verify` skill.
- **Reviewing the current diff before committing**: use `code-review` skill
  (low/medium effort for routine work).
- **Settings / hooks / allowlist edits**: use the `update-config` skill —
  do not hand-edit `.claude/settings.json` blindly.
- **Migrating Claude API or Anthropic SDK code**: use the `claude-api` skill.
- **Running or screenshotting the app**: use the `run` skill.

When a deferred tool is needed (e.g. `TaskCreate`, MCP browser tools), load it
via `ToolSearch` BEFORE planning around it.

## Known gotchas (read before editing)

- **Supabase HEAD lies about Cache-Control.** Use GET with `Range: bytes=0-0`
  for header checks. `scripts/set-glb-cache.mjs` has this bug.
- **`/` and `/menu` are near-duplicate files.** Any menu UI change must be
  mirrored in both until they're merged.
- **`Header.tsx` force-resets theme to dark on mount.** Light-mode CSS is
  currently unreachable from the UI.
- **Don't re-suggest Draco compression.** Already done. See model-pipeline memory.
- **GSAP appears twice in the page** — once npm-imported, once CDN-loaded. Pick one.
- **Service-role Supabase keys must never be committed or echoed.** If the user
  pastes one in chat, warn them loudly and treat it as compromised.

## Definition of done for code changes

- Type-check passes (`npm run lint` or Next's built-in checker).
- If the change touches 3D model loading, `verify-cache.mjs` still passes.
- If the change touches UI, run the page in Chrome MCP and screenshot or
  describe what's now visible. Don't claim "it works" from source alone.
