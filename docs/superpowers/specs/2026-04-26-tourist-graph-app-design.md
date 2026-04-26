# Tourist Graph App — Design Spec

**Date:** 2026-04-26  
**Status:** Approved

## Overview

PWA mobile (Svelte + Vite) qui affiche un graphe de destinations touristiques sur une carte OpenStreetMap. L'utilisateur choisit une zone, parcourt le graphe à pied en temps réel, et reçoit des suggestions contextuelles basées sur sa position GPS, l'heure, et les stops déjà visités.

---

## Stack

| Composant | Choix |
|-----------|-------|
| Framework | Svelte + Vite |
| Carte | Leaflet + OpenStreetMap tiles |
| PWA | vite-plugin-pwa (service worker + manifest) |
| GPS | `navigator.geolocation` (browser natif) |
| Données | `localStorage` (JSON, pas de backend) |
| Deploy | Serveur statique (ou `npx serve dist`) |

---

## Modèle de données

Tout est stocké dans `localStorage` sous la clé `tourapp`.

```ts
interface AppState {
  trips: Trip[]
  activeTrip: string        // trip id
}

interface Trip {
  id: string
  name: string
  zones: Zone[]
  visited: string[]         // stop ids visités pour CE trip
}

interface Zone {
  id: string
  name: string
  color: string             // hex — utilisé pour les markers et pills
  stops: Stop[]
}

interface Stop {
  id: string
  name: string
  lat: number
  lng: number
  desc: string
  tags: string[]            // "free" | "food" | "night" | "sport" | "tip"
  hours: {
    open: string            // "HH:MM"
    close: string           // "HH:MM"
    days: number[]          // 0=dim ... 6=sam, [0,1,2,3,4,5,6] = tous les jours
  } | null                  // null = toujours ouvert (pas de contrainte horaire)
  estimatedMinutes: number
  connectorToNext: string | null  // texte affiché entre ce stop et le suivant ("5 min à pied · Bedford Ave")
  edges: string[]           // ids des stops suivants dans le graphe (cross-zone autorisé)
  branches: Branch[]
}

interface Branch {
  label: string
  stopIds: string[]         // ids de stops existants dans zone.stops[] — chemins alternatifs dans le graphe
}
```

**Bootstrap :** le fichier `src/data/nyc.json` est généré à partir de `nyc_zone_graph.html` et livré avec l'app. Chargé automatiquement si `localStorage` est vide.

---

## Écrans & Navigation

3 onglets dans une tab bar flottante (bas de l'écran) :

### 1. Carte (défaut)

- Carte Leaflet **plein écran**
- Marker coloré par zone pour chaque stop (couleur = `zone.color`) — tap sur marker → bottom sheet du stop
- Point bleu = position GPS (via `watchPosition` — mise à jour événementielle, meilleure autonomie batterie)
- **Suggestions flottantes en haut** : 3 chips superposées à la carte
  - Chip normale : stop ouvert maintenant, trié par score
  - Chip grisée : stop fermé à cette heure (maintenu visible pour planification)
  - Tap sur un chip → **bottom sheet** du stop
- Bottom sheet :
  - Mini-carte avec ligne de distance depuis la position
  - Nom, zone, distance + temps de marche estimé
  - Description, tags/pills
  - Horaires (badge vert "Ouvert maintenant" ou rouge "Ouvre à XXh")
  - Bouton **"✓ Marquer visité"** → ajoute l'id à `visited`, ferme la sheet, recalcule suggestions
  - Bouton **"↗ Naviguer"** → ouvre l'app maps native : iOS → `maps.apple.com/?daddr=lat,lng`, Android → `maps.google.com/?daddr=lat,lng`, fallback → OpenStreetMap (détection via user-agent)

### 2. Graphe

- Picker horizontal de zones en haut (chips scrollables)
- Graphe déroulable verticalement (même structure visuelle que `nyc_zone_graph.html`)
  - Stop visité : badge vert "✓ visité", dot rempli
  - Stop courant suggéré : dot pulsant
  - Bifurcations : indent avec tirets
  - Connecteurs entre stops : texte de distance/transport
- Tap sur un stop → même bottom sheet que la vue Carte

### 3. Éditer

3 sous-onglets :

**Zones**
- Liste des zones avec leur couleur
- Bouton "+" → form : nom + color picker
- Swipe ou bouton poubelle → suppression (avec confirmation si la zone a des stops)

**Stops**
- Liste filtrée par zone (picker en haut)
- Bouton "+" → form :
  - Nom, description
  - Position : tap sur mini-carte pour placer le pin (lat/lng remplis automatiquement)
  - Horaires (toggle "toujours ouvert" ou saisie open/close/jours)
  - Durée estimée (minutes)
  - Edges : multiselect de tous les stops du trip (cross-zone autorisé)
- Tap sur un stop existant → même form en mode édition

**Import/Export**
- **Exporter** : télécharge `trip-export.json` (le JSON du trip actif)
- **Importer** : input file → parse JSON → remplace le trip actif (pas de merge, l'import écrase)
- Permet de préparer les données sur desktop et transférer via mail/AirDrop

---

## Algorithme de suggestions

Déclenché à chaque événement `watchPosition` et à chaque "Marquer visité".

```
// zoneOf(stopId) = cherche la zone parente par itération sur trip.zones[].stops[]

stops_candidates = tous les stops du trip actif
  → exclure : id dans visited[]
  → exclure : hours != null && hours.days ne contient pas aujourd'hui
  → marquer "hors horaire" si hours != null && heure actuelle hors [open, close]

pour chaque candidat :
  score = 1 / distance_km          // plus proche = meilleur
  si stop.id dans edges du dernier stop visité → score *= 1.2
  si zoneOf(stop.id) == zoneOf(dernier stop visité) → score *= 1.1

trier par score DESC
retourner : d'abord les stops ouverts (top N), puis compléter jusqu'à 3 avec les hors-horaire les mieux scorés
```

Le "dernier stop visité" = dernier élément de `visited[]`. S'il est vide, pas de bonus zone/edge — juste la distance.

---

## PWA & Offline

- **Service worker** (via vite-plugin-pwa, stratégie `CacheFirst`) : met en cache les tiles OSM visitées + l'app complète
- **Manifest** : icône + `display: standalone` → installable via "Ajouter à l'écran d'accueil"
- L'app fonctionne entièrement hors ligne une fois les tiles de la zone visitée chargées

---

## Structure de fichiers

```
src/
  App.svelte
  stores/
    appState.ts         // store Svelte writable + persistance localStorage
  views/
    MapView.svelte
    GraphView.svelte
    EditView.svelte
  components/
    SuggestionChip.svelte
    StopBottomSheet.svelte
    StopMarker.svelte
    GraphStop.svelte
  lib/
    suggestions.ts      // algorithme de score
    geo.ts              // distance haversine, temps de marche estimé
    storage.ts          // lecture/écriture localStorage
  data/
    nyc.json            // bootstrap NYC depuis nyc_zone_graph.html
```

---

## Hors scope

- Authentification ou sync cloud
- Routing GPS turn-by-turn (on ouvre l'app maps native)
- Notifications push
- Multi-utilisateurs
