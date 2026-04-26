<script lang="ts">
  import { state, activeTripStore, upsertZone, deleteZone, upsertStop, deleteStop, importTrip } from '../stores/app.svelte'
  import type { Zone, Stop } from '../lib/types'

  const trip = $derived(activeTripStore())

  type SubTab = 'zones' | 'stops' | 'data'
  let activeSubTab = $state<SubTab>('zones')

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
    const zone: Zone = {
      id: editingZone?.id ?? zoneFormName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: zoneFormName.trim(),
      color: zoneFormColor,
      stops: editingZone?.stops ?? []
    }
    upsertZone(trip.id, zone)
    showZoneForm = false
  }

  function removeZone(zoneId: string) {
    if (!trip) return
    const zone = trip.zones.find(z => z.id === zoneId)
    if (zone && zone.stops.length > 0) {
      if (!confirm(`Supprimer "${zone.name}" et ses ${zone.stops.length} stops ?`)) return
    }
    deleteZone(trip.id, zoneId)
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
    if (isNaN(lat) || isNaN(lng)) { alert('Coordonnées invalides'); return }
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
  }

  function removeStop(zoneId: string, stopId: string) {
    if (!trip) return
    deleteStop(trip.id, zoneId, stopId)
  }

  function exportTrip() {
    if (!trip) return
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${trip.id}-export.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target!.result as string)
        if (!data.id || !data.zones) { alert('JSON invalide — il manque "id" ou "zones"'); return }
        importTrip(data)
        alert(`Trip "${data.name}" importé.`)
      } catch { alert('Impossible de lire le fichier JSON.') }
    }
    reader.readAsText(file)
  }
</script>

<div class="edit-view">
  <div class="sub-tabs">
    <button class:active={activeSubTab === 'zones'} onclick={() => (activeSubTab = 'zones')}>Zones</button>
    <button class:active={activeSubTab === 'stops'} onclick={() => (activeSubTab = 'stops')}>Stops</button>
    <button class:active={activeSubTab === 'data'} onclick={() => (activeSubTab = 'data')}>Données</button>
  </div>

  <div class="tab-content">
    {#if activeSubTab === 'zones'}
      <button class="btn-add" onclick={() => openZoneForm()}>+ Nouvelle zone</button>
      {#if trip}
        {#each trip.zones as zone}
          <div class="list-item">
            <span class="zone-dot" style="background:{zone.color}"></span>
            <span class="item-name">{zone.name}</span>
            <span class="item-meta">{zone.stops.length} stops</span>
            <button class="btn-icon" onclick={() => openZoneForm(zone)}>✏️</button>
            <button class="btn-icon" onclick={() => removeZone(zone.id)}>🗑</button>
          </div>
        {/each}
      {/if}
      {#if showZoneForm}
        <div class="form-overlay">
          <div class="form-card">
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
            <button class="btn-add" onclick={() => openStopForm(zone.id)}>+ Nouveau stop</button>
            {#each zone.stops as stop}
              <div class="list-item">
                <span class="item-name">{stop.name}</span>
                <span class="item-meta">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</span>
                <button class="btn-icon" onclick={() => openStopForm(zone.id, stop)}>✏️</button>
                <button class="btn-icon" onclick={() => removeStop(zone.id, stop.id)}>🗑</button>
              </div>
            {/each}
          {/if}
        {:else}
          <p class="hint">Sélectionne une zone ci-dessus.</p>
        {/if}
      {/if}
      {#if showStopForm}
        <div class="form-overlay">
          <div class="form-card form-card-scroll">
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
        <button class="btn-primary" onclick={exportTrip}>⬇ Exporter trip actif</button>
        <h3>Import</h3>
        <p>Remplace le trip actif avec un fichier JSON. Le fichier doit avoir "id" et "zones".</p>
        <label class="btn-secondary file-label">⬆ Importer JSON<input type="file" accept=".json" onchange={handleImport} style="display:none" /></label>
      </div>
    {/if}
  </div>
</div>

<style>
  .edit-view { height: 100%; display: flex; flex-direction: column; padding-bottom: var(--tab-bar-height); }
  .sub-tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
  .sub-tabs button { flex: 1; padding: 12px; background: none; border: none; font-size: 13px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; }
  .sub-tabs button.active { color: var(--color-text); border-bottom-color: var(--color-text); }
  .tab-content { flex: 1; overflow-y: auto; padding: 12px 16px; }
  .btn-add { width: 100%; padding: 10px; margin-bottom: 10px; border: 1.5px dashed var(--color-border); border-radius: 10px; background: none; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; }
  .list-item { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
  .zone-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .item-name { flex: 1; font-size: 14px; font-weight: 500; }
  .item-meta { font-size: 11px; color: var(--color-text-tertiary); }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }
  .form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 300; }
  .form-card { background: #fff; border-radius: 20px 20px 0 0; padding: 20px 20px 32px; width: 100%; padding-bottom: calc(32px + var(--safe-bottom)); }
  .form-card-scroll { max-height: 85vh; overflow-y: auto; }
  .form-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
  .form-card label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 12px; }
  .form-card input, .form-card textarea { padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font-size: 14px; outline: none; }
  .form-card input:focus, .form-card textarea:focus { border-color: var(--color-accent); }
  .checkbox-label { flex-direction: row !important; align-items: center; gap: 8px !important; }
  .form-row { display: flex; gap: 12px; }
  .form-row label { flex: 1; }
  .form-actions { display: flex; gap: 10px; margin-top: 4px; }
  .zone-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .zone-chip { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: var(--color-surface); color: var(--color-text-secondary); border: none; cursor: pointer; }
  .zone-chip.active { background: var(--zone-color); color: white; }
  .hint { font-size: 13px; color: var(--color-text-tertiary); padding: 12px 0; }
  .data-section h3 { font-size: 15px; font-weight: 700; margin: 16px 0 6px; }
  .data-section p { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 10px; }
  .btn-primary { padding: 12px 20px; background: #111; color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-block; }
  .btn-secondary { padding: 12px 20px; background: var(--color-surface); color: var(--color-text); border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-block; }
  .file-label { cursor: pointer; }
</style>
