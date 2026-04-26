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
  const distLabel = $derived(
    distanceKm == null ? null
      : distanceKm < 1 ? Math.round(distanceKm * 1000) + ' m'
      : distanceKm.toFixed(1) + ' km'
  )

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
    free:  { bg: '#E5F0E8', text: '#2D6E48' },
    food:  { bg: '#F5E6F7', text: '#6E2C7A' },
    night: { bg: '#161413', text: '#F7F4EF' },
    sport: { bg: '#E0E8F5', text: '#2A4790' },
    tip:   { bg: '#F7E9D0', text: '#8A6010' }
  }

  function handleVisited() {
    if (trip) markVisited(stop.id)
    onClose()
  }
</script>

<button class="backdrop" onclick={onClose} aria-label="Fermer"></button>

<div class="sheet" role="dialog" aria-label={stop.name}>
  <div class="handle"></div>

  <div class="zone-tag">
    <span class="zone-dot" style="background:{zoneColor}"></span>
    <span class="zone-name">{zoneName}</span>
  </div>

  <h2 class="title">{stop.name}</h2>

  {#if distLabel != null}
    <div class="meta-row">
      <span class="meta-num">{distLabel}</span>
      <span class="meta-sep"></span>
      <span class="meta-walk">{mins} min à pied</span>
    </div>
  {/if}

  <p class="desc">{stop.desc}</p>

  <div class="tags">
    {#each stop.tags as tag}
      {#if tagColors[tag]}
        <span class="tag" style="background:{tagColors[tag].bg};color:{tagColors[tag].text}">
          {tagLabels[tag] ?? tag}
        </span>
      {/if}
    {/each}
    <span class="tag tag-time">~{stop.estimatedMinutes} min sur place</span>
  </div>

  {#if stop.hours}
    <p class="hours" class:open={openNow} class:closed={!openNow}>
      <span class="hours-dot"></span>
      {#if openNow}
        Ouvert maintenant <span class="hours-range">· {stop.hours.open}–{stop.hours.close}</span>
      {:else}
        Fermé <span class="hours-range">· ouvre à {stop.hours.open}</span>
      {/if}
    </p>
  {/if}

  <div class="actions">
    {#if !isVisited}
      <button class="btn-primary" onclick={handleVisited}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>
        Marquer visité
      </button>
    {:else}
      <span class="visited-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>
        Déjà visité
      </span>
    {/if}
    <a class="btn-secondary" href={navigateUrl(stop.lat, stop.lng)} target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
      Naviguer
    </a>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(15, 12, 10, 0.42);
    backdrop-filter: blur(2px);
    z-index: 1500; border: none; cursor: pointer;
    animation: fadeIn 0.18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .sheet {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--paper);
    border-top: 1px solid var(--line-strong);
    border-radius: 22px 22px 0 0;
    padding: 10px 22px 26px;
    padding-bottom: calc(26px + var(--safe-bottom));
    z-index: 1501;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.18), 0 -1px 0 rgba(0,0,0,0.04);
    animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0.3, 1);
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

  .handle {
    width: 40px; height: 4px;
    background: var(--line-strong);
    border-radius: 2px;
    margin: 0 auto 16px;
  }

  .zone-tag {
    display: inline-flex; align-items: center; gap: 6px;
    margin-bottom: 8px;
  }
  .zone-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
  }
  .zone-name {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: var(--ink-faint);
    text-transform: uppercase;
  }

  .title {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 28px;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin-bottom: 10px;
  }

  .meta-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px;
  }
  .meta-num {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    background: var(--paper-elevated);
    border: 1px solid var(--line);
    padding: 3px 8px;
    border-radius: 4px;
  }
  .meta-sep {
    width: 12px; height: 1px;
    background: var(--line-strong);
  }
  .meta-walk {
    font-size: 12px;
    color: var(--ink-soft);
  }

  .desc {
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin-bottom: 14px;
  }

  .tags {
    display: flex; gap: 5px; flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 9px;
    border-radius: 4px;
  }
  .tag-time {
    background: transparent;
    color: var(--ink-faint);
    border: 1px solid var(--line-strong);
  }

  .hours {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 12px;
    margin-bottom: 18px;
    font-weight: 500;
  }
  .hours-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .hours.open { color: #2D6E48; }
  .hours.open .hours-dot { background: #2D6E48; box-shadow: 0 0 0 3px rgba(45,110,72,0.18); }
  .hours.closed { color: var(--accent); }
  .hours.closed .hours-dot { background: var(--accent); }
  .hours-range {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .actions { display: flex; gap: 8px; }
  .btn-primary {
    flex: 1;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px;
    background: var(--ink); color: var(--paper);
    border: none; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: transform 0.1s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-primary:active { transform: scale(0.98); background: #2A2520; }

  .btn-secondary {
    flex: 1;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px;
    background: var(--paper-elevated); color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
    text-decoration: none;
    transition: transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-secondary:active { transform: scale(0.98); }

  .visited-badge {
    flex: 1;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 13px;
    background: rgba(45,110,72,0.10); color: #2D6E48;
    border: 1px solid rgba(45,110,72,0.22);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
  }
</style>
