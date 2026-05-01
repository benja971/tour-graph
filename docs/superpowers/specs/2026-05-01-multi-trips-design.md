# Multi-trips management — Design

**Date:** 2026-05-01
**Status:** Spec — pending implementation

## Goal

Permettre à l'utilisateur de gérer plusieurs trips en parallèle (ex. NYC + Montréal, ou plusieurs variantes pour la même ville comme "tour samedi") via une UI explicite : sélection rapide depuis le header, création/duplication/renommage/suppression depuis un onglet dédié dans EditView. Aujourd'hui le data model supporte déjà N trips mais aucune UI ne l'expose ; on ne peut ni créer un nouveau trip from scratch, ni switcher entre trips, ni en supprimer un.

## Constraints & decisions

- **Une seule notion de "trip actif"** (`AppState.activeTrip`). Le header switcher et l'onglet Trips agissent sur la même variable. Pas de contexte d'édition séparé.
- **Aucun cas particulier pour NYC dans le code.** `nyc.json` reste bundled pour le moment (l'utilisateur le retirera lui-même), mais aucune logique de bootstrap automatique : au premier lancement, l'app affiche un état vide. Le fichier peut être vidé/supprimé plus tard sans rien casser.
- **Persistence inchangée** : un seul blob `tourapp` dans `localStorage`. Pas de migration nécessaire (`Trip.color` lu avec fallback si absent).
- **TDD** : tests écrits avant implémentation.

## Data model

Modification dans `src/lib/types.ts` :

```ts
export interface Trip {
  id: string
  name: string
  color: string         // ← AJOUT — couleur d'accent (#hex)
  visited: string[]
  zones: Zone[]
}
```

Lecture rétro-compatible : si un Trip chargé n'a pas de `color` (ancien JSON, nyc.json bundled non patché), on substitue un fallback déterministe (palette par défaut, rotation par index dans le tableau de trips).

`AppState` inchangé.

## State / store changes (`src/stores/app.svelte.ts`)

### Modifications existantes

- `buildInitialState()` simplifié : retourne directement `loadState()`. Plus de bootstrap NYC, plus d'import de `nyc.json`. Peut retourner `{ trips: [], activeTrip: '' }`.
- `resetToBootstrap()` **supprimé**. Son bouton ("Réinitialiser NYC") aussi.
- `importTrip()` inchangé : continue à set `activeTrip = trip.id` après import (l'utilisateur veut voir ce qu'il vient d'importer).

### Nouvelles fonctions

```ts
export function createTrip(name: string, color: string): Trip
```
Génère un id unique (`name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()`), crée `{ id, name, color, visited: [], zones: [] }`, push dans `state.trips`, set `activeTrip = id`, save, retourne le trip.

```ts
export function renameTrip(tripId: string, name: string, color: string): void
```
Patch `name` et `color` du trip. No-op si trip absent.

```ts
export function duplicateTrip(tripId: string): Trip | null
```
Clone profond (`structuredClone` ou JSON round-trip) des `zones` (+ leurs `stops`, `branches`, `edges`). Conserve les IDs internes des zones/stops (les `edges` continuent à référencer les bons stops). Nouveau `id` au niveau trip, nom = `${original.name} (copie)`, `color` copié, `visited = []`. Push, set actif, save, retourne. Retourne `null` si tripId absent.

```ts
export function deleteTrip(tripId: string): void
```
Splice du tableau. Si le trip supprimé était actif et qu'il en reste : `state.activeTrip = state.trips[0].id`. Sinon (liste vide) : `state.activeTrip = ''`. Save.

**Effet de bord** : si le trip à supprimer est actif et que le tour mode est ON (`tourState.active === true`), `deleteTrip` appelle `stopTour()` (importé de `../stores/tourMode.svelte`) avant de muter le tableau, pour éviter qu'une notif de proximité se déclenche pour un trip qui n'existe plus. Note : ça crée une dépendance `app.svelte.ts → tourMode.svelte.ts` (aujourd'hui zéro). Si on veut garder le store app pur, alternative : dispatcher cet appel depuis le composant qui supprime (Trips list dans EditView). Décision : **dispatch côté composant** pour préserver la pureté du store et la testabilité.

```ts
export function resetActiveTrip(): void
```
Vide `visited[]` du trip actif. No-op si pas de trip actif.

### Helpers

`getTripColor(trip, fallbackIdx)` — lit `trip.color` avec fallback déterministe sur palette par index. Utilisé partout où on affiche la couleur d'un trip (switcher, liste).

## UI components

### Nouveau : `src/components/TripSwitcher.svelte`

Bandeau fin (~40px) tout en haut du shell, **au-dessus de la zone de view**, visible sur les 3 vues. Contenu : pastille couleur (8px ronde) + nom du trip actif (font-display italic) + chevron à droite. Tap → ouvre `TripSwitcherSheet`. Si `trips.length === 0`, le bandeau affiche "Aucun trip" en grisé et n'est pas tappable.

Le switcher est un bandeau dans le flow normal au-dessus de `<main>` (pas un overlay) — pas de z-index spécifique nécessaire. `TripSwitcherSheet` en revanche est un overlay : z-index ≥ 1500 (cohérent avec `.form-overlay` existant).

### Nouveau : `src/components/TripSwitcherSheet.svelte`

Bottom sheet (réutilise les styles `.form-overlay` + `.form-card` existants). Liste des trips, chacun avec : pastille + nom + meta "N stops · M visités". Le trip actif a une bordure colorée à gauche ou un check à droite. Click sur une ligne → `setActiveTrip(id)` + close. Pas d'actions de management ici (pour ça → onglet Trips).

### Modifications : `src/App.svelte`

Insère `<TripSwitcher />` au-dessus de `<main class="view-container">`. La hauteur du `view-container` se réduit de la hauteur du switcher.

### Modifications : `src/views/EditView.svelte`

Ajoute un nouveau sub-tab **"Trips"** en première position : `trips | zones | stops | données`.

**Quand `trips.length === 0`** : à l'init du composant, `activeSubTab` est forcé à `'trips'` si `trips.length === 0`. Les boutons Zones / Stops / Données sont rendus avec `disabled` (et un toast "Crée un trip d'abord" si on tente de cliquer). Sub-section Trips affiche un EmptyTripsState.

**Quand au moins un trip existe** :

- Bouton "Nouveau trip" en haut (style `.btn-add` existant).
- Liste : chaque ligne = `<div class="list-item">` avec :
  - Pastille couleur (8-10px)
  - Nom du trip (`.item-name`)
  - Meta : `N stops · M visités` (`.item-meta`)
  - Trois icônes : ✏️ Renommer, 📋 Dupliquer, 🗑️ Supprimer
  - Tap sur la ligne (hors icônes) → `setActiveTrip(id)`
  - Le trip actif est marqué visuellement (bordure colorée ou fond léger).
- Form overlay create/rename : nom (text input) + couleur (`<input type="color">`).
- Suppression : `confirm("Supprimer le trip \"X\" ? ...")`. Si trip a des stops, lister le nombre.
- Duplication : pas de confirm, clone immédiat.

### Nouveau : `src/components/EmptyTripsState.svelte`

Composant affiché dans Map/Graph (et dans Edit > sub-tab Trips) quand `trips.length === 0`. Centré dans le viewport, contient :
- Titre type "Aucun trip"
- Petit texte explicatif
- Bouton "Créer un trip" — délégué via prop `onCreate?: () => void`. Dans Map/Graph, le callback fait switch onglet vers Edit + sub-tab Trips + ouvre le form. Dans Edit > Trips, il ouvre directement le form local.
- Bouton "Importer JSON" — file picker local au composant, réutilise la même logique de parsing que `EditView.handleImport` (factorisée dans un helper `src/lib/importTripFromFile.ts` qui retourne le trip parsé ou throw une erreur typée).

### Modifications : `src/views/MapView.svelte`

Si `!trip` (pas de trip actif) → render `<EmptyTripsState onCreate={...} />` au lieu de la map. Le wrapper qui appelle `deleteTrip` (dans la sub-tab Trips d'EditView) est responsable d'appeler `stopTour()` au préalable si on supprime le trip actif et que `tourState.active` est true (voir section store ci-dessus).

### Modifications : `src/views/GraphView.svelte`

Si `!trip` → render `<EmptyTripsState />`.

### Suppressions / déplacements dans `EditView.svelte > sub-tab "données"`

- Supprimer le bouton "Réinitialiser NYC" et son handler (`resetToBootstrap`).
- Garder Export et Import (inchangés).
- Ajouter dans la section "Données" un bouton **"Vider les visites de ce trip"** (rouge léger) appelant `resetActiveTrip()`. Désactivé si pas de trip actif.

## Empty state behavior summary

| `trips.length` | `activeTrip` | Map | Graph | Edit |
|---|---|---|---|---|
| 0 | `''` | EmptyTripsState | EmptyTripsState | sub-tab Trips forcé, autres disabled |
| ≥1 | id valide | Map normale | Graph normal | tous sub-tabs OK |
| ≥1 | id invalide (corrupt) | placeholder + auto-fix : `activeTrip = trips[0].id` au load | idem | idem |

L'auto-fix de `activeTrip` invalide se fait dans une fn `sanitizeActiveTrip()` appelée après `loadState()` dans `buildInitialState`.

## Tests (TDD — écrits avant le code)

Stack : Vitest jsdom, déjà en place dans `tests/`.

### `tests/store-trips.test.ts` (nouveau)

- `createTrip(name, color)` :
  - retourne un Trip avec id non-vide, name/color comme passés, visited vide, zones vide
  - push dans `state.trips`
  - set `state.activeTrip` au nouvel id
  - persiste en localStorage (mock ou inspect)
- `duplicateTrip(id)` :
  - retourne un nouveau Trip avec id ≠ original
  - zones clonées en deep (modifier le clone n'affecte pas l'original)
  - visited vide même si l'original avait des visités
  - name suffixé " (copie)"
  - color copié
  - devient activeTrip
  - retourne null si id inconnu
- `deleteTrip(id)` :
  - retire du tableau
  - si actif et autres restent → activeTrip = trips[0].id
  - si actif et plus rien → activeTrip = ''
  - si non-actif → activeTrip inchangé
- `renameTrip(id, name, color)` :
  - patch name + color
  - no-op si id inconnu
- `resetActiveTrip()` :
  - visited[] vidé sur le trip actif
  - zones intactes
  - no-op si pas de trip actif
- `setActiveTrip(id)` (existant — ajouter test si manquant) :
  - met à jour activeTrip
  - persiste

### `tests/storage.test.ts` (créer si absent)

- `loadState()` retourne `{ trips: [], activeTrip: '' }` si localStorage vide
- `saveState` + `loadState` round-trip préserve les trips et leurs nested data
- JSON corrompu → fallback `{ trips: [], activeTrip: '' }` (essai dans le try existant)

### `tests/build-initial-state.test.ts` (nouveau, optionnel)

- avec localStorage vide → `{ trips: [], activeTrip: '' }`
- avec activeTrip pointant vers un id absent → activeTrip rétabli sur trips[0].id, ou '' si trips vide

## Implementation order (TDD-friendly)

1. Écrire tous les tests (rouges) pour le store et la storage
2. Modifier `Trip` type + ajouter helper `getTripColor`
3. Implémenter `createTrip`, `renameTrip`, `duplicateTrip`, `deleteTrip`, `resetActiveTrip` ; supprimer `resetToBootstrap`
4. Simplifier `buildInitialState` + ajouter sanitization de `activeTrip`
5. Tests passent (verts)
6. Composant `TripSwitcher` + `TripSwitcherSheet` ; intégrer dans `App.svelte`
7. Sub-tab "Trips" dans `EditView` (liste, forms, actions)
8. `EmptyTripsState` ; intégrer dans `MapView` et `GraphView`
9. Supprimer le bouton "Réinitialiser NYC" + ajouter "Réinitialiser ce trip"
10. Test manuel : créer un trip, dupliquer, switcher, supprimer, vider localStorage et vérifier l'empty state
11. `npm run check` + `npx vitest run` verts

## Out of scope

- Import depuis URL (mentionné par l'utilisateur, à faire plus tard)
- Marketplace de trips publics
- Retrait définitif de `nyc.json` du bundle (l'utilisateur le fera lui-même quand il aura importé sa version perso)
- Tests UI Svelte (pas dans la stack actuelle)
- Multi-device sync / cloud
