<script lang="ts">
  import { state as appState, activeTripStore } from '../stores/app.svelte'
  import { getTripColor } from '../lib/tripColor'
  import TripSwitcherSheet from './TripSwitcherSheet.svelte'

  let sheetOpen = $state(false)
  const trip = $derived(activeTripStore())
  const tripIdx = $derived(appState.trips.findIndex(t => t.id === appState.activeTrip))
  const accent = $derived(trip ? getTripColor(trip, Math.max(tripIdx, 0)) : '')

  function open() {
    if (appState.trips.length === 0) return
    sheetOpen = true
  }
</script>

<button class="trip-switcher" disabled={appState.trips.length === 0} onclick={open}>
  {#if trip}
    <span class="dot" style="background:{accent}"></span>
    <span class="name">{trip.name}</span>
    <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  {:else}
    <span class="empty">Aucun trip</span>
  {/if}
</button>

{#if sheetOpen}
  <TripSwitcherSheet onClose={() => (sheetOpen = false)} />
{/if}

<style>
  .trip-switcher {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px;
    background: var(--paper);
    border: none;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    width: 100%;
    text-align: left;
    height: 38px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .trip-switcher:disabled { cursor: default; }
  .trip-switcher:not(:disabled):active { background: var(--paper-elevated); }

  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
  }
  .name {
    flex: 1;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 14px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .chev { color: var(--ink-faint); flex-shrink: 0; }
</style>
