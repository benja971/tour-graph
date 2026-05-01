<script lang="ts">
  import { state as appState, setActiveTrip } from '../stores/app.svelte'
  import { getTripColor } from '../lib/tripColor'

  let { onClose }: { onClose: () => void } = $props()

  function pick(id: string) {
    setActiveTrip(id)
    onClose()
  }

  function visitedCount(tripId: string): number {
    const t = appState.trips.find(t => t.id === tripId)
    return t?.visited.length ?? 0
  }

  function stopsCount(tripId: string): number {
    const t = appState.trips.find(t => t.id === tripId)
    return t?.zones.reduce((sum, z) => sum + z.stops.length, 0) ?? 0
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose() }} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" onclick={onClose} role="presentation">
  <div class="sheet" onclick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Choisir un trip" tabindex="-1">
    <h3>Choisir un trip</h3>
    <ul class="list">
      {#each appState.trips as trip, idx (trip.id)}
        {@const isActive = appState.activeTrip === trip.id}
        <li>
          <button class="row" class:active={isActive} onclick={() => pick(trip.id)}>
            <span class="dot" style="background:{getTripColor(trip, idx)}"></span>
            <span class="info">
              <span class="name">{trip.name}</span>
              <span class="meta">{stopsCount(trip.id)} stops · {visitedCount(trip.id)} visités</span>
            </span>
            {#if isActive}
              <svg class="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(15, 12, 10, 0.42);
    backdrop-filter: blur(2px);
    display: flex; align-items: flex-end;
    z-index: 1500;
    animation: fadeIn 0.18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .sheet {
    background: var(--paper);
    border-top: 1px solid var(--line-strong);
    border-radius: 22px 22px 0 0;
    padding: 22px 22px 30px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    padding-bottom: calc(30px + var(--safe-bottom));
    animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0.3, 1);
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 22px;
    line-height: 1.1;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin-bottom: 14px;
  }
  .list { list-style: none; }
  .row {
    display: flex; align-items: center; gap: 12px;
    width: 100%;
    padding: 12px 4px;
    background: none;
    border: none;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .row:active { background: var(--paper-elevated); }
  .row.active { background: rgba(22,20,19,0.03); }
  .dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
  }
  .info {
    flex: 1;
    display: flex; flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }
  .name {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 16px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--ink-faint);
  }
  .check { color: var(--ink); flex-shrink: 0; }
</style>
