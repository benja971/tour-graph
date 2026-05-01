<script lang="ts">
  import {
    state as appState,
    activeTripStore, upsertZone, deleteZone, upsertStop, deleteStop,
    importTrip, resetActiveTrip,
    createTrip, renameTrip, duplicateTrip, deleteTrip, setActiveTrip
  } from '../stores/app.svelte'
  import { fireTestNotification, tourState, stopTour } from '../stores/tourMode.svelte'
  import { toastSuccess, toastError } from '../stores/toast.svelte'
  import { importTripFromFile, ImportTripError } from '../lib/importTripFromFile'
  import { getTripColor, DEFAULT_TRIP_COLOR } from '../lib/tripColor'
  import type { Zone, Stop, Suggestion, Trip } from '../lib/types'

  const trip = $derived(activeTripStore())

  type SubTab = 'trips' | 'zones' | 'stops' | 'data'
  let activeSubTab = $state<SubTab>(appState.trips.length === 0 ? 'trips' : 'zones')

  $effect(() => {
    if (appState.trips.length === 0 && activeSubTab !== 'trips') {
      activeSubTab = 'trips'
    }
  })

  function selectSubTab(tab: SubTab) {
    if (tab !== 'trips' && appState.trips.length === 0) {
      toastError('Crée un trip d\'abord')
      return
    }
    activeSubTab = tab
  }

  // Trip form (create / rename)
  let showTripForm = $state(false)
  let editingTripId = $state<string | null>(null)
  let tripFormName = $state('')
  let tripFormColor = $state(DEFAULT_TRIP_COLOR)

  function openTripForm(t?: Trip) {
    editingTripId = t?.id ?? null
    tripFormName = t?.name ?? ''
    tripFormColor = t?.color ?? DEFAULT_TRIP_COLOR
    showTripForm = true
  }

  function saveTripForm() {
    const name = tripFormName.trim()
    if (!name) return
    if (editingTripId) {
      renameTrip(editingTripId, name, tripFormColor)
      toastSuccess(`Trip "${name}" mis à jour`)
    } else {
      const t = createTrip(name, tripFormColor)
      toastSuccess(`Trip "${t.name}" créé`)
    }
    showTripForm = false
  }

  function handleDuplicate(tripId: string) {
    const dup = duplicateTrip(tripId)
    if (dup) toastSuccess(`Trip dupliqué · "${dup.name}"`)
  }

  async function handleDeleteTrip(t: Trip) {
    const stopsTotal = t.zones.reduce((sum, z) => sum + z.stops.length, 0)
    const detail = stopsTotal > 0 ? ` (${t.zones.length} zones, ${stopsTotal} stops)` : ''
    if (!confirm(`Supprimer le trip "${t.name}"${detail} ?`)) return
    if (t.id === appState.activeTrip && tourState.active) {
      await stopTour()
    }
    deleteTrip(t.id)
    toastSuccess(`Trip "${t.name}" supprimé`)
  }

  // Zone form
  let showZoneForm = $state(false)
  let editingZone = $state<Zone | null>(null)
  let zoneFormName = $state('')
  let zoneFormColor = $state('#1D9E75')

  function openZoneForm(zone?: Zone) {
    editingZone = zone ?? null
    zoneFormName = zone?.name ?? ''
    zoneFormColor = zone?.color ?? '#1D9E75'
    showZoneForm = true
  }

  function saveZone() {
    if (!trip || !zoneFormName.trim()) return
    const isNew = !editingZone
    const zone: Zone = {
      id: editingZone?.id ?? zoneFormName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: zoneFormName.trim(),
      color: zoneFormColor,
      stops: editingZone?.stops ?? []
    }
    upsertZone(trip.id, zone)
    showZoneForm = false
    toastSuccess(isNew ? `Zone "${zone.name}" créée` : `Zone "${zone.name}" mise à jour`)
  }

  function removeZone(zoneId: string) {
    if (!trip) return
    const zone = trip.zones.find(z => z.id === zoneId)
    if (!zone) return
    if (zone.stops.length > 0) {
      if (!confirm(`Supprimer "${zone.name}" et ses ${zone.stops.length} stops ?`)) return
    }
    deleteZone(trip.id, zoneId)
    toastSuccess(`Zone "${zone.name}" supprimée`)
  }

  // Stop form
  let selectedEditZoneId = $state<string | null>(null)
  let showStopForm = $state(false)
  let editingStop = $state<Stop | null>(null)
  let stopForm = $state({
    name: '', desc: '', lat: '', lng: '',
    tags: '', estimatedMinutes: '60',
    hoursEnabled: false, open: '09:00', close: '21:00',
    days: '0,1,2,3,4,5,6', connectorToNext: ''
  })

  function openStopForm(zoneId: string, stop?: Stop) {
    selectedEditZoneId = zoneId
    editingStop = stop ?? null
    if (stop) {
      stopForm = {
        name: stop.name, desc: stop.desc,
        lat: String(stop.lat), lng: String(stop.lng),
        tags: stop.tags.join(', '),
        estimatedMinutes: String(stop.estimatedMinutes),
        hoursEnabled: !!stop.hours,
        open: stop.hours?.open ?? '09:00',
        close: stop.hours?.close ?? '21:00',
        days: stop.hours?.days.join(',') ?? '0,1,2,3,4,5,6',
        connectorToNext: stop.connectorToNext ?? ''
      }
    } else {
      stopForm = { name:'', desc:'', lat:'', lng:'', tags:'', estimatedMinutes:'60', hoursEnabled:false, open:'09:00', close:'21:00', days:'0,1,2,3,4,5,6', connectorToNext:'' }
    }
    showStopForm = true
  }

  function saveStop() {
    if (!trip || !selectedEditZoneId || !stopForm.name.trim()) return
    const lat = parseFloat(stopForm.lat)
    const lng = parseFloat(stopForm.lng)
    if (isNaN(lat) || isNaN(lng)) { toastError('Coordonnées invalides'); return }
    const isNew = !editingStop
    const stop: Stop = {
      id: editingStop?.id ?? stopForm.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: stopForm.name.trim(), desc: stopForm.desc.trim(), lat, lng,
      tags: stopForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      hours: stopForm.hoursEnabled ? {
        open: stopForm.open, close: stopForm.close,
        days: stopForm.days.split(',').map(Number).filter(n => !isNaN(n))
      } : null,
      estimatedMinutes: parseInt(stopForm.estimatedMinutes) || 60,
      connectorToNext: stopForm.connectorToNext.trim() || null,
      edges: editingStop?.edges ?? [],
      branches: editingStop?.branches ?? []
    }
    upsertStop(trip.id, selectedEditZoneId, stop)
    showStopForm = false
    toastSuccess(isNew ? `Stop "${stop.name}" créé` : `Stop "${stop.name}" mis à jour`)
  }

  function removeStop(zoneId: string, stopId: string) {
    if (!trip) return
    const stop = trip.zones.find(z => z.id === zoneId)?.stops.find(s => s.id === stopId)
    deleteStop(trip.id, zoneId, stopId)
    if (stop) toastSuccess(`Stop "${stop.name}" supprimé`)
  }

  function exportTrip() {
    if (!trip) return
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${trip.id}-export.json`; a.click()
    URL.revokeObjectURL(url)
    toastSuccess(`Exporté · ${trip.id}-export.json`)
  }

  let testMsg = $state<string | null>(null)
  let testCountdown = $state(0)

  async function testNotif() {
    testMsg = null
    let fakeTop: Suggestion | null = null
    if (trip) {
      const stop = trip.zones.flatMap(z => z.stops).find(s => !trip.visited.includes(s.id))
      const zone = stop ? trip.zones.find(z => z.stops.includes(stop)) : null
      if (stop && zone) {
        fakeTop = {
          stop, zoneId: zone.id, zoneName: zone.name, zoneColor: zone.color,
          distanceKm: 0.42, walkMinutes: 6, openNow: true
        }
      }
    }

    // Countdown so user can switch to another app — notifs are suppressed when tab has focus on Android Chrome
    for (let i = 5; i > 0; i--) {
      testCountdown = i
      testMsg = `Notif dans ${i}s — change d'app maintenant`
      await new Promise(r => setTimeout(r, 1000))
    }
    testCountdown = 0

    const r = await fireTestNotification(fakeTop)
    testMsg = r.ok ? `✓ Notification envoyée (via ${r.via})` : (r.error ?? 'Erreur')
    setTimeout(() => (testMsg = null), 6000)
  }

  async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const trip = await importTripFromFile(file)
      importTrip(trip)
      toastSuccess(`Trip "${trip.name}" importé`)
    } catch (err) {
      toastError(err instanceof ImportTripError ? err.message : 'Erreur d\'import')
    }
  }
</script>

<div class="edit-view">
  <div class="sub-tabs">
    <button class:active={activeSubTab === 'trips'} onclick={() => selectSubTab('trips')}>Trips</button>
    <button class:active={activeSubTab === 'zones'} disabled={appState.trips.length === 0} onclick={() => selectSubTab('zones')}>Zones</button>
    <button class:active={activeSubTab === 'stops'} disabled={appState.trips.length === 0} onclick={() => selectSubTab('stops')}>Stops</button>
    <button class:active={activeSubTab === 'data'} disabled={appState.trips.length === 0} onclick={() => selectSubTab('data')}>Données</button>
  </div>

  <div class="tab-content">
    {#if activeSubTab === 'trips'}
      <div class="trips-actions">
        <button class="btn-add" onclick={() => openTripForm()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Nouveau trip
        </button>
        <label class="btn-add file-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V7M5 12l7-7 7 7M5 3h14"/></svg>
          Importer JSON
          <input type="file" accept=".json" onchange={handleImport} style="display:none" />
        </label>
      </div>
      {#if appState.trips.length === 0}
        <p class="hint">Aucun trip pour le moment. Crée-en un ou importe un fichier JSON.</p>
      {/if}
      {#each appState.trips as t, idx (t.id)}
        {@const isActive = appState.activeTrip === t.id}
        {@const stopsTotal = t.zones.reduce((sum, z) => sum + z.stops.length, 0)}
        <div class="trip-row" class:active={isActive}>
          <button class="trip-row-tap" onclick={() => setActiveTrip(t.id)}>
            <span class="zone-dot" style="background:{getTripColor(t, idx)}"></span>
            <span class="trip-info">
              <span class="item-name">{t.name}</span>
              <span class="item-meta">{stopsTotal} stops · {t.visited.length} visités{isActive ? ' · actif' : ''}</span>
            </span>
          </button>
          <button class="btn-icon" aria-label="Renommer" onclick={() => openTripForm(t)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3 21 8 8 21H3v-5L16 3Z"/><path d="m13 6 5 5"/></svg>
          </button>
          <button class="btn-icon" aria-label="Dupliquer" onclick={() => handleDuplicate(t.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          </button>
          <button class="btn-icon btn-icon-danger" aria-label="Supprimer" onclick={() => handleDeleteTrip(t)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      {/each}
      {#if showTripForm}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="form-overlay" onclick={() => (showTripForm = false)} role="presentation">
          <div class="form-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingTripId ? 'Renommer trip' : 'Nouveau trip'} tabindex="-1">
            <h3>{editingTripId ? 'Renommer trip' : 'Nouveau trip'}</h3>
            <label>Nom<input bind:value={tripFormName} placeholder="Montréal" /></label>
            <label>Couleur d'accent<input type="color" bind:value={tripFormColor} /></label>
            <div class="form-actions">
              <button class="btn-primary" onclick={saveTripForm}>Enregistrer</button>
              <button class="btn-secondary" onclick={() => (showTripForm = false)}>Annuler</button>
            </div>
          </div>
        </div>
      {/if}

    {:else if activeSubTab === 'zones'}
      <button class="btn-add" onclick={() => openZoneForm()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nouvelle zone
      </button>
      {#if trip}
        {#each trip.zones as zone}
          <div class="list-item">
            <span class="zone-dot" style="background:{zone.color}"></span>
            <span class="item-name">{zone.name}</span>
            <span class="item-meta">{zone.stops.length} stops</span>
            <button class="btn-icon" aria-label="Modifier" onclick={() => openZoneForm(zone)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3 21 8 8 21H3v-5L16 3Z"/><path d="m13 6 5 5"/></svg>
            </button>
            <button class="btn-icon btn-icon-danger" aria-label="Supprimer" onclick={() => removeZone(zone.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        {/each}
      {/if}
      {#if showZoneForm}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="form-overlay" onclick={() => (showZoneForm = false)} role="presentation">
          <div class="form-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingZone ? 'Modifier zone' : 'Nouvelle zone'} tabindex="-1">
            <h3>{editingZone ? 'Modifier zone' : 'Nouvelle zone'}</h3>
            <label>Nom<input bind:value={zoneFormName} placeholder="Brooklyn Sud" /></label>
            <label>Couleur<input type="color" bind:value={zoneFormColor} /></label>
            <div class="form-actions">
              <button class="btn-primary" onclick={saveZone}>Enregistrer</button>
              <button class="btn-secondary" onclick={() => (showZoneForm = false)}>Annuler</button>
            </div>
          </div>
        </div>
      {/if}

    {:else if activeSubTab === 'stops'}
      {#if trip}
        <div class="zone-filter">
          {#each trip.zones as zone}
            <button class="zone-chip" class:active={selectedEditZoneId === zone.id} style="--zone-color:{zone.color}" onclick={() => (selectedEditZoneId = zone.id)}>{zone.name}</button>
          {/each}
        </div>
        {#if selectedEditZoneId}
          {@const zone = trip.zones.find(z => z.id === selectedEditZoneId)}
          {#if zone}
            <button class="btn-add" onclick={() => openStopForm(zone.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Nouveau stop
            </button>
            {#each zone.stops as stop}
              <div class="list-item">
                <span class="item-name">{stop.name}</span>
                <span class="item-meta">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</span>
                <button class="btn-icon" aria-label="Modifier" onclick={() => openStopForm(zone.id, stop)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3 21 8 8 21H3v-5L16 3Z"/><path d="m13 6 5 5"/></svg>
                </button>
                <button class="btn-icon btn-icon-danger" aria-label="Supprimer" onclick={() => removeStop(zone.id, stop.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            {/each}
          {/if}
        {:else}
          <p class="hint">Sélectionne une zone ci-dessus.</p>
        {/if}
      {/if}
      {#if showStopForm}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="form-overlay" onclick={() => (showStopForm = false)} role="presentation">
          <div class="form-card form-card-scroll" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingStop ? 'Modifier stop' : 'Nouveau stop'} tabindex="-1">
            <h3>{editingStop ? 'Modifier stop' : 'Nouveau stop'}</h3>
            <label>Nom *<input bind:value={stopForm.name} placeholder="Smorgasburg" /></label>
            <label>Description<textarea bind:value={stopForm.desc} rows="3"></textarea></label>
            <div class="form-row">
              <label>Latitude *<input bind:value={stopForm.lat} placeholder="40.7208" inputmode="decimal" /></label>
              <label>Longitude *<input bind:value={stopForm.lng} placeholder="-73.9612" inputmode="decimal" /></label>
            </div>
            <label>Tags (virgule séparés)<input bind:value={stopForm.tags} placeholder="free, food" /></label>
            <label>Durée estimée (min)<input bind:value={stopForm.estimatedMinutes} inputmode="numeric" /></label>
            <label>Connecteur vers suivant<input bind:value={stopForm.connectorToNext} placeholder="5 min à pied" /></label>
            <label class="checkbox-label"><input type="checkbox" bind:checked={stopForm.hoursEnabled} /> Horaires spécifiques</label>
            {#if stopForm.hoursEnabled}
              <div class="form-row">
                <label>Ouvre<input type="time" bind:value={stopForm.open} /></label>
                <label>Ferme<input type="time" bind:value={stopForm.close} /></label>
              </div>
              <label>Jours (0=dim...6=sam)<input bind:value={stopForm.days} placeholder="0,1,2,3,4,5,6" /></label>
            {/if}
            <div class="form-actions">
              <button class="btn-primary" onclick={saveStop}>Enregistrer</button>
              <button class="btn-secondary" onclick={() => (showStopForm = false)}>Annuler</button>
            </div>
          </div>
        </div>
      {/if}

    {:else}
      <div class="data-section">
        <h3>Export</h3>
        <p>Télécharge le JSON du trip actif pour le modifier sur desktop ou le transférer.</p>
        <button class="btn-primary" onclick={exportTrip}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14M5 12l7 7 7-7M5 21h14"/></svg>
          Exporter trip actif
        </button>
        <h3>Import</h3>
        <p>Remplace le trip actif avec un fichier JSON. Le fichier doit avoir "id" et "zones".</p>
        <label class="btn-secondary file-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V7M5 12l7-7 7 7M5 3h14"/></svg>
          Importer JSON
          <input type="file" accept=".json" onchange={handleImport} style="display:none" />
        </label>
        <h3>Vider les visites</h3>
        <p>Remet à zéro la liste des stops visités du trip actif. Les zones et stops restent intacts.</p>
        <button class="btn-danger" disabled={!trip} onclick={() => { if (trip && confirm(`Vider les visites de "${trip.name}" ?`)) { resetActiveTrip(); toastSuccess('Visites effacées') } }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
          Vider les visites
        </button>

        <h3>Debug</h3>
        <p>Sur Android Chrome, les notifs sont masquées quand l'onglet a le focus. Le test attend 5s pour te laisser passer sur une autre app.</p>
        <button class="btn-secondary" onclick={testNotif} disabled={testCountdown > 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          {testCountdown > 0 ? `Notif dans ${testCountdown}s…` : 'Tester une notification'}
        </button>
        {#if testMsg}<p class="test-msg">{testMsg}</p>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .edit-view {
    height: 100%; display: flex; flex-direction: column;
    padding-bottom: calc(var(--tab-bar-height) + var(--safe-bottom));
    background: var(--paper);
  }
  .sub-tabs {
    display: flex;
    border-bottom: 1px solid var(--line);
    flex-shrink: 0;
  }
  .sub-tabs button {
    flex: 1;
    padding: 14px 8px 12px;
    background: none; border: none;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-faint);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sub-tabs button.active {
    color: var(--ink);
    border-bottom-color: var(--accent);
  }
  .sub-tabs button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .trips-actions {
    display: flex; gap: 10px; margin-bottom: 14px;
  }
  .trips-actions .btn-add {
    margin-bottom: 0;
    flex: 1;
  }
  .file-label { cursor: pointer; }

  .trip-row {
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid var(--line);
    padding-right: 0;
  }
  .trip-row.active {
    background: rgba(22,20,19,0.03);
  }
  .trip-row-tap {
    flex: 1;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 0;
    background: none; border: none;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .trip-info {
    flex: 1;
    display: flex; flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }
  .trip-info .item-name { font-size: 15px; }
  .trip-info .item-meta { font-size: 9px; }
  .tab-content { flex: 1; overflow-y: auto; padding: 16px 18px; }

  .btn-add {
    width: 100%;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px;
    margin-bottom: 14px;
    border: 1px dashed var(--line-strong);
    border-radius: 10px;
    background: transparent;
    color: var(--ink-soft);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-add:hover { color: var(--ink); border-color: var(--ink-soft); background: rgba(22,20,19,0.02); }

  .list-item {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .zone-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
  }
  .item-name {
    flex: 1;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 15px;
    line-height: 1.2;
    color: var(--ink);
  }
  .item-meta {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-faint);
    letter-spacing: 0.04em;
  }

  .btn-icon {
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 8px;
    cursor: pointer;
    padding: 6px;
    color: var(--ink-soft);
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.12s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-icon:hover { color: var(--ink); border-color: var(--line-strong); background: var(--paper-elevated); }
  .btn-icon:active { transform: scale(0.92); }
  .btn-icon-danger:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

  .form-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 12, 10, 0.42);
    backdrop-filter: blur(2px);
    display: flex; align-items: flex-end;
    z-index: 1500;
    animation: fadeIn 0.18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .form-card {
    background: var(--paper);
    border-top: 1px solid var(--line-strong);
    border-radius: 22px 22px 0 0;
    padding: 22px 22px 30px;
    width: 100%;
    padding-bottom: calc(30px + var(--safe-bottom));
    animation: slideUpForm 0.28s cubic-bezier(0.32, 0.72, 0.3, 1);
  }
  @keyframes slideUpForm { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .form-card-scroll { max-height: 85vh; overflow-y: auto; }
  .form-card h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 22px;
    line-height: 1.1;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin-bottom: 18px;
  }
  .form-card label {
    display: flex; flex-direction: column; gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 12px;
  }
  .form-card input, .form-card textarea {
    padding: 11px 12px;
    border: 1px solid var(--line-strong);
    background: var(--paper-elevated);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s;
  }
  .form-card input:focus, .form-card textarea:focus { border-color: var(--ink); }
  .checkbox-label { flex-direction: row !important; align-items: center; gap: 10px !important; }
  .checkbox-label input { width: auto; }
  .form-row { display: flex; gap: 12px; }
  .form-row label { flex: 1; }
  .form-actions { display: flex; gap: 10px; margin-top: 6px; }

  .zone-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .zone-chip {
    padding: 5px 11px 6px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--line-strong);
    cursor: pointer;
    transition: all 0.15s;
  }
  .zone-chip.active { background: var(--zone-color); color: white; border-color: var(--zone-color); }

  .hint {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--ink-faint);
    font-size: 14px;
    padding: 14px 0;
  }

  .data-section h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 18px;
    line-height: 1.1;
    margin: 22px 0 6px;
  }
  .data-section h3:first-child { margin-top: 0; }
  .data-section p { font-size: 13px; color: var(--ink-soft); margin-bottom: 12px; line-height: 1.5; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 12px 18px;
    background: var(--ink); color: var(--paper);
    border: none; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary:active { transform: scale(0.98); }

  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 12px 18px;
    background: var(--paper-elevated); color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-secondary:active { transform: scale(0.98); }

  .btn-danger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 12px 18px;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid rgba(238,53,46,0.22);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-danger:active { transform: scale(0.98); }

  .file-label { cursor: pointer; }
  .test-msg {
    margin-top: 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-soft);
    padding: 8px 12px;
    background: var(--paper-elevated);
    border: 1px solid var(--line);
    border-radius: 8px;
    display: inline-block;
  }
</style>
