<script lang="ts">
  import { activeTripStore } from '../stores/app.svelte'
  import type { Stop, Zone } from '../lib/types'
  import GraphStop from '../components/GraphStop.svelte'
  import StopBottomSheet from '../components/StopBottomSheet.svelte'

  const trip = $derived(activeTripStore())
  let selectedZoneId = $state<string | null>(null)
  let selectedStop = $state<Stop | null>(null)
  let selectedZoneColor = $state('#666')
  let selectedZoneName = $state('')

  const activeZone = $derived<Zone | null>(
    trip?.zones.find(z => z.id === (selectedZoneId ?? trip.zones[0]?.id)) ?? null
  )

  $effect(() => {
    if (trip && !selectedZoneId) selectedZoneId = trip.zones[0]?.id ?? null
  })

  function openSheet(stop: Stop, zone: Zone) {
    selectedStop = stop; selectedZoneColor = zone.color; selectedZoneName = zone.name
  }

  function stopById(id: string): Stop | undefined {
    return trip?.zones.flatMap(z => z.stops).find(s => s.id === id)
  }

  function zoneOfStop(id: string): Zone | undefined {
    return trip?.zones.find(z => z.stops.some(s => s.id === id))
  }
</script>

<div class="graph-view">
  {#if trip}
    <div class="zone-picker">
      {#each trip.zones as zone}
        <button
          class="zone-chip"
          class:active={zone.id === (selectedZoneId ?? trip.zones[0]?.id)}
          style="--zone-color:{zone.color}"
          onclick={() => (selectedZoneId = zone.id)}
        >{zone.name}</button>
      {/each}
    </div>
  {/if}

  <div class="graph-body">
    {#if activeZone}
      {#each activeZone.stops as stop, i}
        {@const isLast = i === activeZone.stops.length - 1}
        {@const isVisited = trip?.visited.includes(stop.id) ?? false}
        <GraphStop {stop} zoneColor={activeZone.color} {isVisited} {isLast} onTap={() => openSheet(stop, activeZone)}>
          {#snippet branchStop(stopId: string)}
            {@const bs = stopById(stopId)}
            {@const bz = zoneOfStop(stopId)}
            {#if bs && bz}
              <button class="branch-stop" onclick={() => openSheet(bs, bz)}>
                <span class="branch-stop-name">{bs.name}</span>
                <span class="branch-stop-desc">{bs.desc}</span>
              </button>
            {/if}
          {/snippet}
        </GraphStop>
      {/each}
    {:else}
      <p class="empty">Aucune zone sélectionnée.</p>
    {/if}
  </div>
</div>

{#if selectedStop}
  <StopBottomSheet stop={selectedStop} zoneColor={selectedZoneColor} zoneName={selectedZoneName} userLat={null} userLng={null} onClose={() => (selectedStop = null)} />
{/if}

<style>
  .graph-view { height: 100%; display: flex; flex-direction: column; padding-bottom: var(--tab-bar-height); }
  .zone-picker { display: flex; gap: 6px; padding: 10px 12px; overflow-x: auto; flex-shrink: 0; border-bottom: 1px solid var(--color-border); scrollbar-width: none; }
  .zone-picker::-webkit-scrollbar { display: none; }
  .zone-chip { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; background: var(--color-surface); color: var(--color-text-secondary); border: none; cursor: pointer; flex-shrink: 0; }
  .zone-chip.active { background: var(--zone-color); color: white; }
  .graph-body { flex: 1; overflow-y: auto; padding: 14px 16px; }
  .empty { color: var(--color-text-tertiary); font-size: 14px; padding: 20px 0; }
  .branch-stop { display: block; margin-bottom: 10px; background: none; border: none; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; padding: 0; }
  .branch-stop-name { display: block; font-size: 13px; font-weight: 600; color: var(--color-text); }
  .branch-stop-desc { display: block; font-size: 11px; color: var(--color-text-secondary); line-height: 1.4; margin-top: 2px; }
</style>
