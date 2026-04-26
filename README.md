# TourGraph

PWA offline-first pour naviguer dans un parcours touristique organisé en **zones** et en **graphe de stops** — avec géolocalisation, suggestions classées par proximité, et notifications de proximité en mode tour.

Bootstrap inclus : un parcours complet à New York (`src/data/nyc.json`).

## Fonctionnalités

- **Map** — carte Leaflet avec marqueurs par zone, bottom sheet de suggestions, contrôles du mode tour.
- **Graph** — vue verticale du parcours zone par zone : stops, branches (forks nommés) et connecteurs textuels entre stops.
- **Edit** — CRUD complet (trips, zones, stops), import/export JSON, reset au bootstrap.
- **Mode Tour** — wake lock + notifications throttlées (3 min) quand le top stop change. Notifications passent par le service worker (obligatoire sur Android Chrome).
- **PWA** — installable, cache des tuiles OSM (CacheFirst, 30 jours), fonctionne offline une fois la zone visitée.

## Stack

- **Svelte 5** (runes) + TypeScript + Vite 8
- **Leaflet** pour la carte
- **vite-plugin-pwa** (Workbox) — service worker et manifest
- **Vitest** + jsdom pour les tests

## Démarrage

```bash
npm install
npm run dev
```

Le serveur dev tourne en HTTPS (`@vitejs/plugin-basic-ssl`) car la Geolocation API et les notifications SW exigent un secure context. Le navigateur affichera un avertissement de certificat auto-signé — accepte-le.

### Autres commandes

```bash
npm run build       # build production
npm run preview     # prévisualise le build
npm run check       # svelte-check + tsc
npx vitest          # lance les tests
```

## Modèle de données

```
AppState
└─ trips: Trip[]
   └─ zones: Zone[]      (couleur, ordre)
      └─ stops: Stop[]   (lat/lng, hours, tags, edges, branches)
```

- `Trip.visited[]` — IDs des stops visités, dans l'ordre.
- `Stop.edges[]` — IDs de stops accessibles depuis ce stop (cross-zone autorisé) — utilisé pour booster le score des suggestions.
- `Stop.branches[]` — forks nommés affichés dans la vue graph.
- `Stop.hours` — `null` = ouvert tout le temps, sinon `{ open, close, days[] }`.

État persisté dans `localStorage` (clé `tourapp`). Au premier lancement, `src/data/nyc.json` est chargé. **Le localStorage prend le pas sur le bootstrap** — pour récupérer les mises à jour de `nyc.json`, utiliser le bouton Reset dans la vue Edit.

## Algorithme de suggestion

Pour chaque stop non visité et ouvert aujourd'hui :

```
score = 1 / (distanceKm + 0.01)
       × 1.2 si edge depuis le dernier stop visité
       × 1.1 si même zone que le dernier stop visité
```

Les stops ouverts maintenant passent avant les fermés. Implémentation : `src/lib/suggestions.ts`.

## Structure

```
src/
├─ App.svelte              # shell + tabs (map / graph / edit)
├─ main.ts                 # mount + enregistrement SW
├─ components/             # TabBar, GraphStop, StopBottomSheet, SuggestionChip
├─ views/                  # MapView, GraphView, EditView
├─ stores/
│  ├─ app.svelte.ts        # state global ($state) + helpers de mutation
│  └─ tourMode.svelte.ts   # mode tour, notifs SW, wake lock
├─ lib/
│  ├─ types.ts
│  ├─ geo.ts               # haversine, walkMinutes
│  ├─ suggestions.ts
│  └─ storage.ts           # load/save localStorage
└─ data/nyc.json           # parcours bootstrap
```

## Notes Android

Sur Android Chrome, `new Notification()` lève "Illegal constructor" quand l'app tourne dans un onglet. Toutes les notifications passent par `registration.showNotification()`. L'enregistrement SW est pré-chauffé au load du module pour que `serviceWorker.ready` soit déjà résolu au moment où l'utilisateur interagit. Voir `src/stores/tourMode.svelte.ts`.

## Scripts utilitaires

`scripts/geocode-stops.mjs` — script Node one-shot pour remplir les `lat/lng` manquants sur les stops via Nominatim. Hors build.
