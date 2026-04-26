<script lang="ts">
  import type { Suggestion } from '../lib/types'
  let { suggestion, onClick }: { suggestion: Suggestion; onClick: () => void } = $props()

  const distLabel = $derived(
    suggestion.distanceKm < 1
      ? Math.round(suggestion.distanceKm * 1000) + ' m'
      : suggestion.distanceKm.toFixed(1) + ' km'
  )
</script>

<button class="chip" class:dimmed={!suggestion.openNow} onclick={onClick}>
  <span class="bar" style="background:{suggestion.zoneColor}"></span>
  <span class="info">
    <span class="zone">{suggestion.zoneName}</span>
    <span class="name">{suggestion.stop.name}</span>
    <span class="meta">
      {#if !suggestion.openNow}<span class="closed-flag">FERMÉ</span>{/if}
      <span class="dist">{distLabel}</span>
      <span class="sep">·</span>
      <span class="walk">{suggestion.walkMinutes} min à pied</span>
    </span>
  </span>
  <span class="arrow">→</span>
</button>

<style>
  .chip {
    position: relative;
    display: flex; align-items: stretch; gap: 0;
    background: rgba(255, 253, 248, 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    cursor: pointer; text-align: left; width: 100%;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .chip:active {
    transform: scale(0.985);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .bar { width: 4px; flex-shrink: 0; }

  .info {
    flex: 1; min-width: 0;
    padding: 8px 10px 9px 12px;
    display: flex; flex-direction: column; gap: 1px;
  }

  .zone {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    color: var(--ink-faint);
    line-height: 1.2;
  }

  .name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15px;
    line-height: 1.15;
    color: var(--ink);
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .closed-flag {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .dist {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--ink);
  }
  .sep { color: var(--ink-faint); }
  .walk { font-size: 11px; color: var(--ink-soft); }

  .arrow {
    align-self: center;
    padding: 0 14px 0 6px;
    font-size: 16px;
    color: var(--ink-faint);
    transition: transform 0.15s, color 0.15s;
  }
  .chip:hover .arrow { color: var(--ink); transform: translateX(2px); }

  .dimmed { opacity: 0.78; }
  .dimmed .name { color: var(--ink-soft); }
</style>
