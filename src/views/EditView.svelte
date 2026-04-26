<script lang="ts">
  import { activeTripStore, upsertZone, deleteZone, upsertStop, deleteStop, importTrip, resetToBootstrap } from '../stores/app.svelte'
  import { fireTestNotification } from '../stores/tourMode.svelte'
  import type { Zone, Stop, Suggestion } from '../lib/types'

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

  let testMsg = $state<string | null>(null)
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
    const r = await fireTestNotification(fakeTop)
    testMsg = r.ok ? '✓ Notification envoyée' : (r.error ?? 'Erreur')
    setTimeout(() => (testMsg = null), 4000)
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
        <h3>Réinitialiser</h3>
        <p>Recharge les données NYC livrées avec l'app. Efface tes modifications et tes stops visités.</p>
        <button class="btn-danger" onclick={() => { if (confirm('Effacer toutes les données et recharger NYC par défaut ?')) resetToBootstrap() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
          Réinitialiser NYC
        </button>

        <h3>Debug</h3>
        <p>Envoie une fausse notification immédiate, sans attendre un changement de position.</p>
        <button class="btn-secondary" onclick={testNotif}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          Tester une notification
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
