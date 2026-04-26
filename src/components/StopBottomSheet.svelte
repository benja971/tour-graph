<script lang="ts">
  import type { Stop } from '../lib/types'
  import { navigateUrl, walkMinutes, haversineKm } from '../lib/geo'
  import { markVisited, activeTripStore } from '../stores/app.svelte'

  let {
    stop,
    zoneColor = '#666',
    zoneName = '',
    userLat,
    userLng,
    onClose
  }: {
    stop: Stop
    zoneColor?: string
    zoneName?: string
    userLat: number | null
    userLng: number | null
    onClose: () => void
  } = $props()

  const trip = $derived(activeTripStore())
  const isVisited = $derived(trip?.visited.includes(stop.id) ?? false)

  const distanceKm = $derived(
    userLat != null && userLng != null ? haversineKm(userLat, userLng, stop.lat, stop.lng) : null
  )
  const mins = $derived(distanceKm != null ? walkMinutes(distanceKm) : null)

  function isOpenNow(): boolean {
    if (!stop.hours) return true
    const now = new Date()
    const current = now.getHours() * 60 + now.getMinutes()
    const [oh, om] = stop.hours.open.split(':').map(Number)
    const [ch, cm] = stop.hours.close.split(':').map(Number)
    const openMin = oh * 60 + om
    const closeMin = ch * 60 + cm
    if (closeMin < openMin) return current >= openMin || current <= closeMin
    return current >= openMin && current <= closeMin
  }

  const openNow = $derived(isOpenNow())

  const tagLabels: Record<string, string> = {
    free: 'Gratuit', food: 'Food', night: 'Soirée', sport: 'Sport', tip: 'Tip'
  }
  const tagColors: Record<string, { bg: string; text: string }> = {
    free:  { bg: '#e8f4ed', text: '#2d7a4f' },
    food:  { bg: '#fce8ff', text: '#7a2d8a' },
    night: { bg: '#1a1714', text: '#f7f4ef' },
    sport: { bg: '#e6eeff', text: '#2d48aa' },
    tip:   { bg: '#fdf0e0', text: '#9a6a10' }
  }

  function handleVisited() {
    if (trip) markVisited(stop.id)
    onClose()
  }
</script>

<button class="backdrop" onclick={onClose} aria-label="Fermer"></button>

<div class="sheet" role="dialog" aria-label={stop.name}>
  <div class="handle"></div>

  <div class="header">
    <div class="dot" style="background:{zoneColor}"></div>
    <div>
      <h2 class="title">{stop.name}</h2>
      <p class="meta">
        {zoneName}
        {#if distanceKm != null}
          · {distanceKm < 1 ? Math.round(distanceKm * 1000) + 'm' : distanceKm.toFixed(1) + 'km'}
          · ~{mins} min à pied
        {/if}
      </p>
    </div>
  </div>

  <p class="desc">{stop.desc}</p>

  <div class="tags">
    {#each stop.tags as tag}
      {#if tagColors[tag]}
        <span class="tag" style="background:{tagColors[tag].bg};color:{tagColors[tag].text}">
          {tagLabels[tag] ?? tag}
        </span>
      {/if}
    {/each}
    <span class="tag" style="background:{tagColors.tip.bg};color:{tagColors.tip.text}">
      ~{stop.estimatedMinutes} min
    </span>
  </div>

  {#if stop.hours}
    <p class="hours" class:open={openNow} class:closed={!openNow}>
      {openNow ? '● Ouvert maintenant' : '● Fermé'}
      {#if !openNow} · Ouvre à {stop.hours.open}{/if}
    </p>
  {/if}

  <div class="actions">
    {#if !isVisited}
      <button class="btn-primary" onclick={handleVisited}>✓ Marquer visité</button>
    {:else}
      <span class="visited-badge">✓ Déjà visité</span>
    {/if}
    <a class="btn-secondary" href={navigateUrl(stop.lat, stop.lng)} target="_blank" rel="noopener">
      ↗ Naviguer
    </a>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    z-index: 1500; border: none; cursor: pointer;
  }
  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #fff; border-radius: 20px 20px 0 0;
    padding: 10px 20px 24px;
    padding-bottom: calc(24px + var(--safe-bottom));
    z-index: 1501; box-shadow: 0 -4px 32px rgba(0,0,0,0.15);
    animation: slideUp 0.25s ease;
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .handle { width: 36px; height: 4px; background: #e0e0e0; border-radius: 2px; margin: 0 auto 14px; }
  .header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .title { font-size: 17px; font-weight: 700; }
  .meta { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
  .desc { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 12px; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .tag { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
  .hours { font-size: 12px; margin-bottom: 16px; }
  .hours.open { color: #16a34a; }
  .hours.closed { color: #dc2626; }
  .actions { display: flex; gap: 10px; }
  .btn-primary {
    flex: 1; padding: 12px; background: #111; color: #fff;
    border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .btn-secondary {
    flex: 1; padding: 12px; background: var(--color-surface); color: var(--color-text);
    border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center;
    text-decoration: none; display: flex; align-items: center; justify-content: center;
  }
  .visited-badge {
    flex: 1; padding: 12px; text-align: center;
    font-size: 14px; font-weight: 600; color: #16a34a;
  }
</style>
