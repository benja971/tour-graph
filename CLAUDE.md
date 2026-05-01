# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Vite dev server with HTTPS (geolocation requires it)
npm run build         # Production build
npm run preview       # Preview built output
npm run check         # svelte-check + tsc on tsconfig.node.json
npx vitest            # Run all tests (jsdom env, globals enabled)
npx vitest run tests/geo.test.ts   # Run a single test file
```

The dev server uses `@vitejs/plugin-basic-ssl` because the Geolocation API and SW notifications require a secure context. Browsers will warn about the self-signed cert — accept it.

## Architecture

**TourGraph** is an offline-first PWA that helps a user navigate a curated set of touristic stops grouped into "zones" with a graph of edges. Single-page app, no router — `App.svelte` switches between three views via local `$state`.

### State model (`src/lib/types.ts`)

`AppState → Trip[] → Zone[] → Stop[]`. Each `Stop` has `lat/lng`, optional `hours`, `tags`, `edges` (cross-zone reachable stop IDs), and `branches` (named forks shown in graph view). `Trip.visited` is the per-trip list of visited stop IDs (ordered).

### Stores (`src/stores/`)

- `app.svelte.ts` exports `state` as a top-level `$state` rune. All mutations go through helper functions (`markVisited`, `upsertStop`, `createTrip`, `duplicateTrip`, `deleteTrip`, `resetActiveTrip`, …) that call `saveState(state)` after mutating.
- `tourMode.svelte.ts` owns "tour mode": notification permissions, wake lock, throttled proximity notifications. **Notifications must go through the service worker** (`registration.showNotification`), not `new Notification()` — Android Chrome throws on the latter when running in a tab. The SW registration is pre-warmed at module load (see `swReadyPromise`) with a timeout fallback.

State persists to `localStorage` under key `tourapp`. On first run with no saved state, `state.trips` is empty and the UI shows an empty state with "Créer un trip" / "Importer JSON" CTAs. `src/data/nyc.json` is still bundled but is no longer loaded automatically — it can be imported manually (or removed entirely from the bundle).

### Views (`src/views/`)

- `MapView.svelte` — Leaflet map with markers per stop, suggestion bottom sheet, tour-mode controls.
- `GraphView.svelte` — Vertical graph rendering of zones → stops with branches and connectors.
- `EditView.svelte` — CRUD UI for trips/zones/stops; import/export JSON.

### Suggestions (`src/lib/suggestions.ts`)

`computeSuggestions(trip, lat, lng, limit)` ranks unvisited stops by `1/(distanceKm + 0.01)`, boosted by edge connectivity (×1.2) and same-zone bonus (×1.1) relative to the last visited stop. Open stops are returned before closed ones. Pure function — used by `MapView` and `tourMode.maybeNotify`.

### PWA / Service Worker

`vite-plugin-pwa` with `registerType: 'autoUpdate'` and `devOptions.enabled: true` (SW runs in dev too). OSM tiles are cached `CacheFirst` (`osm-tiles` cache, 30-day TTL). The SW is registered explicitly from `src/main.ts` via `virtual:pwa-register`.

## Conventions

- **Svelte 5 runes only**: `$state`, `$derived`, `$effect`. Any variable read inside `$effect` that should trigger re-runs must itself be `$state` — non-reactive locals cause silent races.
- **Leaflet z-index**: Leaflet panes go up to 700. Sibling overlay UI must be ≥ 1000 (≥ 1500 for modals).
- **Geocoding helper**: `scripts/geocode-stops.mjs` is a one-off Node script for filling lat/lng on stops, not part of the build.

## Tests

Vitest with `environment: 'jsdom'` and `globals: true` (no `import` of `describe`/`it` needed). Tests live in `tests/` and target pure modules in `src/lib/` (`geo.ts`, `suggestions.ts`).
