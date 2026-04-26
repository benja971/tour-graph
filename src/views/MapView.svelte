<script lang="ts">
  import { onDestroy } from 'svelte'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { activeTripStore } from '../stores/app.svelte'
  import { computeSuggestions } from '../lib/suggestions'
  import type { Stop, Suggestion } from '../lib/types'
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
  let userMarker: L.CircleMarker | undefined
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

  // Render zone stop markers
  $effect(() => {
    if (!map || !trip) return
    markers.forEach(mk => mk.remove())
    markers = []
    for (const zone of trip.zones) {
      for (const stop of zone.stops) {
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${zone.color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
          className: '', iconSize: [14, 14], iconAnchor: [7, 7]
        })
        const marker = L.marker([stop.lat, stop.lng], { icon })
          .addTo(map!)
          .on('click', () => openSheet(stop, zone.color, zone.name))
        markers.push(marker)
      }
    }
  })

  // Start GPS watch (separate from marker rendering — runs once)
  $effect(() => {
    if (!navigator.geolocation) {
      gpsError = 'GPS non disponible dans ce navigateur'
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

  // Render/update user marker — reacts to map availability AND position
  $effect(() => {
    if (!map || userLat == null || userLng == null) return

    if (!userMarker) {
      userMarker = L.circleMarker([userLat, userLng], {
        radius: 8, fillColor: '#2563EB', fillOpacity: 1, color: 'white', weight: 3
      }).addTo(map)
      userAccuracy = L.circle([userLat, userLng], {
        radius: 30, color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.1, weight: 1
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
    aria-label="Recentrer sur ma position"
  >
    {#if userLat == null}⌖{:else}📍{/if}
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

  .chips {
    position: absolute; top: 12px; left: 12px; right: 12px;
    z-index: 50; display: flex; flex-direction: column; gap: 6px; pointer-events: none;
  }
  .chips > :global(*) { pointer-events: auto; }

  .gps-error {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: #fee2e2; color: #991b1b;
    padding: 6px 14px; border-radius: 14px; font-size: 12px; font-weight: 600;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12); z-index: 60;
  }

  .recenter-btn {
    position: absolute;
    bottom: calc(var(--tab-bar-height) + 16px + var(--safe-bottom));
    right: 16px;
    width: 48px; height: 48px;
    border-radius: 50%;
    background: #fff; border: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    font-size: 20px; cursor: pointer; z-index: 60;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s;
  }
  .recenter-btn:active { transform: scale(0.92); }
  .recenter-btn.disabled { color: #aaa; }

  /* Move Leaflet attribution off the bottom so the tab bar isn't covered */
  :global(.leaflet-control-attribution) {
    font-size: 9px !important;
    padding: 1px 5px !important;
    background: rgba(255,255,255,0.7) !important;
  }
</style>
