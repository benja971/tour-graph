<script lang="ts">
  import type { Suggestion } from '../lib/types'
  let { suggestion, onClick }: { suggestion: Suggestion; onClick: () => void } = $props()
</script>

<button class="chip" class:dimmed={!suggestion.openNow} onclick={onClick}>
  <span class="dot" style="background:{suggestion.zoneColor}"></span>
  <span class="info">
    <span class="name">{suggestion.stop.name}</span>
    <span class="meta">
      {suggestion.openNow ? '' : 'Fermé · '}
      {suggestion.distanceKm < 1
        ? Math.round(suggestion.distanceKm * 1000) + 'm'
        : suggestion.distanceKm.toFixed(1) + 'km'}
      · ~{suggestion.walkMinutes} min
    </span>
  </span>
</button>

<style>
  .chip {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
    border: none; border-radius: 14px; padding: 8px 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    cursor: pointer; text-align: left; width: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  .chip:active { transform: scale(0.98); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .info { flex: 1; min-width: 0; }
  .name { display: block; font-size: 12px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { display: block; font-size: 10px; color: #888; }
  .dimmed .name { color: #999; }
  .dimmed .dot { opacity: 0.4; }
</style>
