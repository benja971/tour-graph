<script lang="ts">
  import { onDestroy } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { activeTripStore } from '../stores/app.svelte'
  import { computeSuggestions } from '../lib/suggestions'
  import type { Stop } from '../lib/types'
  import SuggestionChip from '../components/SuggestionChip.svelte'
  import StopBottomSheet from '../components/StopBottomSheet.svelte'

  let mapEl: HTMLDivElement | undefined = $state()
  let map = $state<L.Map | undefined>(undefined)
  let userLat = $state<number | null>(null)
  let userLng = $state<number | null>(null)
  let selectedStop = $state<Stop | null>(null)
  let selectedZoneColor = $state('#666')
  let selectedZoneName = $state('')
  let gpsError = $state<string | null>(null)
  let watchId: number | null = null
  let firstFix = true

  const trip = $derived(activeTripStore())
  const suggestions = $derived(
    trip && userLat != null && userLng != null
      ? computeSuggestions(trip, userLat, userLng, 3)
      : []
  )

  let markers: L.Marker[] = []
  let userMarker: L.Marker | undefined
  let userAccuracy: L.Circle | undefined

  $effect(() => {
    if (!mapEl) return
    const defaultCenter: [number, number] = [40.7308, -73.9972]
    const m = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView(defaultCenter, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(m)
    L.control.attribution({ position: 'topright' }).addTo(m)
    map = m
    return () => { m.remove(); map = undefined }
  })

  // Zone stop markers — refined teardrop pins
  $effect(() => {
    if (!map || !trip) return
    markers.forEach(mk => mk.remove())
    markers = []
    for (const zone of trip.zones) {
      for (const stop of zone.stops) {
        const visited = trip.visited.includes(stop.id)
        const icon = L.divIcon({
          html: `<div class="zone-pin${visited ? ' visited' : ''}" style="--zc:${zone.color}"></div>`,
          className: 'zone-pin-wrap',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
        const marker = L.marker([stop.lat, stop.lng], { icon })
          .addTo(map!)
          .on('click', () => openSheet(stop, zone.color, zone.name))
        markers.push(marker)
      }
    }
  })

  // GPS watch
  $effect(() => {
    if (!navigator.geolocation) {
      gpsError = 'GPS non disponible'
      return
    }
    watchId = navigator.geolocation.watchPosition(
      pos => {
        userLat = pos.coords.latitude
        userLng = pos.coords.longitude
        gpsError = null
      },
      err => {
        const reasons: Record<number, string> = {
          1: 'Permission GPS refusée',
          2: 'Position indisponible',
          3: 'Timeout GPS'
        }
        gpsError = reasons[err.code] ?? 'Erreur GPS'
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId) }
  })

  // User marker — distinct pulsing blue dot
  $effect(() => {
    if (!map || userLat == null || userLng == null) return

    if (!userMarker) {
      const icon = L.divIcon({
        html: '<div class="user-marker"><div class="pulse"></div><div class="core"></div></div>',
        className: 'user-marker-wrap',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
      userMarker = L.marker([userLat, userLng], { icon, zIndexOffset: 1000 }).addTo(map)
      userAccuracy = L.circle([userLat, userLng], {
        radius: 30,
        color: '#1454FF', fillColor: '#1454FF',
        fillOpacity: 0.06, weight: 1, opacity: 0.4
      }).addTo(map)
    } else {
      userMarker.setLatLng([userLat, userLng])
      userAccuracy?.setLatLng([userLat, userLng])
    }

    if (firstFix) {
      map.setView([userLat, userLng], 15)
      firstFix = false
    }
  })

  function openSheet(stop: Stop, color: string, zoneName: string) {
    selectedStop = stop; selectedZoneColor = color; selectedZoneName = zoneName
  }

  function recenter() {
    if (map && userLat != null && userLng != null) {
      map.setView([userLat, userLng], 16, { animate: true })
    }
  }

  onDestroy(() => { if (watchId != null) navigator.geolocation.clearWatch(watchId) })
</script>

<div class="map-container">
  <div bind:this={mapEl} class="map"></div>

  <!-- Header bar -->
  <header class="hdr">
    <div class="hdr-mark">●</div>
    <div class="hdr-text">
      <div class="hdr-eyebrow">{trip?.name ?? '—'}</div>
      <div class="hdr-title">À proximité</div>
    </div>
  </header>

  {#if suggestions.length > 0}
    <div class="chips">
      {#each suggestions as s (s.stop.id)}
        <SuggestionChip suggestion={s} onClick={() => openSheet(s.stop, s.zoneColor, s.zoneName)} />
      {/each}
    </div>
  {/if}

  {#if gpsError}
    <div class="gps-error">{gpsError}</div>
  {/if}

  <button
    class="recenter-btn"
    class:disabled={userLat == null}
    onclick={recenter}
    aria-label="Recentrer"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
    </svg>
  </button>

  {#if selectedStop}
    <StopBottomSheet
      stop={selectedStop}
      zoneColor={selectedZoneColor}
      zoneName={selectedZoneName}
      {userLat}
      {userLng}
      onClose={() => (selectedStop = null)}
    />
  {/if}
</div>

<style>
  .map-container { position: relative; width: 100%; height: 100%; }
  .map { width: 100%; height: 100%; }

  /* Header — editorial label that floats over the map */
  .hdr {
    position: absolute; top: 12px; left: 12px;
    z-index: 1100;
    display: flex; align-items: center; gap: 10px;
    background: rgba(248, 244, 236, 0.92);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 8px 14px 8px 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .hdr-mark {
    color: var(--accent);
    font-size: 8px;
    line-height: 1;
  }
  .hdr-eyebrow {
    font-family: var(--font-mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-faint);
  }
  .hdr-title {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 16px;
    line-height: 1.1;
    color: var(--ink);
    letter-spacing: -0.01em;
  }

  /* Suggestion chip stack */
  .chips {
    position: absolute; top: 64px; left: 12px; right: 12px;
    z-index: 1100; display: flex; flex-direction: column; gap: 8px;
    pointer-events: none;
  }
  .chips > :global(*) { pointer-events: auto; }

  .gps-error {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: var(--accent-soft); color: var(--accent);
    padding: 7px 14px; border-radius: 999px;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 12px rgba(238,53,46,0.15);
    z-index: 1200;
    border: 1px solid rgba(238,53,46,0.2);
  }

  /* Recenter — refined floating action */
  .recenter-btn {
    position: absolute;
    bottom: calc(var(--tab-bar-height) + 18px + var(--safe-bottom));
    right: 14px;
    width: 46px; height: 46px;
    border-radius: 50%;
    background: var(--paper-elevated);
    color: var(--ink);
    border: 1px solid var(--line);
    box-shadow: 0 6px 18px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06);
    cursor: pointer; z-index: 1100;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .recenter-btn:active {
    transform: scale(0.94);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .recenter-btn.disabled { color: var(--ink-faint); }
  .recenter-btn:not(.disabled) { color: var(--user-blue); }

  /* Leaflet attribution refinement */
  :global(.leaflet-control-attribution) {
    font-family: var(--font-mono) !important;
    font-size: 8px !important;
    padding: 2px 6px !important;
    background: rgba(248,244,236,0.85) !important;
    color: var(--ink-faint) !important;
    border-radius: 4px;
    margin: 8px !important;
    letter-spacing: 0.04em;
  }
  :global(.leaflet-control-attribution a) {
    color: var(--ink-soft) !important;
    text-decoration: none !important;
  }

  /* Zone pin styles (referenced by Leaflet divIcon HTML) */
  :global(.zone-pin-wrap) { background: none !important; border: none !important; }
  :global(.zone-pin) {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--zc);
    border: 2.5px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06);
    transition: transform 0.15s;
  }
  :global(.zone-pin.visited) {
    background: var(--paper-elevated);
    border-color: var(--zc);
    border-width: 3px;
  }

  :global(.user-marker-wrap) { background: none !important; border: none !important; }
</style>
