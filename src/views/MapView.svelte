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
  let map: L.Map | undefined
  let userLat = $state<number | null>(null)
  let userLng = $state<number | null>(null)
  let selectedStop = $state<Stop | null>(null)
  let selectedZoneColor = $state('#666')
  let selectedZoneName = $state('')
  let watchId: number | null = null

  const trip = $derived(activeTripStore())
  const suggestions = $derived(
    trip && userLat != null && userLng != null
      ? computeSuggestions(trip, userLat, userLng, 3)
      : []
  )

  let markers: L.Marker[] = []
  let userMarker: L.CircleMarker | undefined

  $effect(() => {
    if (!mapEl) return
    const defaultCenter: [number, number] = [40.7308, -73.9972]
    map = L.map(mapEl, { zoomControl: false }).setView(defaultCenter, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map)
    return () => { map?.remove(); map = undefined }
  })

  $effect(() => {
    if (!map || !trip) return
    markers.forEach(m => m.remove())
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

  $effect(() => {
    if (!navigator.geolocation) return
    watchId = navigator.geolocation.watchPosition(
      pos => {
        userLat = pos.coords.latitude
        userLng = pos.coords.longitude
        if (!map) return
        if (userMarker) {
          userMarker.setLatLng([userLat, userLng])
        } else {
          userMarker = L.circleMarker([userLat, userLng], {
            radius: 7, fillColor: '#2563EB', fillOpacity: 1, color: 'white', weight: 2
          }).addTo(map)
          map.setView([userLat, userLng], 15)
        }
      },
      () => {},
      { enableHighAccuracy: true }
    )
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId) }
  })

  function openSheet(stop: Stop, color: string, zoneName: string) {
    selectedStop = stop; selectedZoneColor = color; selectedZoneName = zoneName
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
</style>
