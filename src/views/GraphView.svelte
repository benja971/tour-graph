<script lang="ts">
  import { activeTripStore } from '../stores/app.svelte'
  import type { Stop, Zone } from '../lib/types'
  import GraphStop from '../components/GraphStop.svelte'
  import StopBottomSheet from '../components/StopBottomSheet.svelte'
  import EmptyTripsState from '../components/EmptyTripsState.svelte'

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

{#if !trip}
  <EmptyTripsState />
{:else}
<div class="graph-view">
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
{/if}

{#if selectedStop}
  <StopBottomSheet stop={selectedStop} zoneColor={selectedZoneColor} zoneName={selectedZoneName} userLat={null} userLng={null} onClose={() => (selectedStop = null)} />
{/if}

<style>
  .graph-view {
    height: 100%; display: flex; flex-direction: column;
    padding-bottom: calc(var(--tab-bar-height) + var(--safe-bottom));
    background: var(--paper);
  }
  .zone-picker {
    display: flex; gap: 6px;
    padding: 14px 14px 12px;
    overflow-x: auto; flex-shrink: 0;
    border-bottom: 1px solid var(--line);
    scrollbar-width: none;
    background: var(--paper);
  }
  .zone-picker::-webkit-scrollbar { display: none; }
  .zone-chip {
    position: relative;
    padding: 6px 12px 7px;
    border-radius: 999px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    background: transparent;
    color: var(--ink-soft);
    border: 1px solid var(--line-strong);
    cursor: pointer; flex-shrink: 0;
    transition: all 0.15s;
  }
  .zone-chip.active {
    background: var(--zone-color);
    color: white;
    border-color: var(--zone-color);
  }
  .graph-body { flex: 1; overflow-y: auto; padding: 18px 18px 32px; }
  .empty {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--ink-faint);
    font-size: 16px; padding: 32px 0;
    text-align: center;
  }
  .branch-stop {
    display: block;
    margin-bottom: 12px;
    background: none; border: none;
    text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    padding: 0;
  }
  .branch-stop-name {
    display: block;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 15px;
    color: var(--ink);
    line-height: 1.2;
  }
  .branch-stop-desc {
    display: block;
    font-size: 12px;
    color: var(--ink-soft);
    line-height: 1.5;
    margin-top: 3px;
  }
</style>
