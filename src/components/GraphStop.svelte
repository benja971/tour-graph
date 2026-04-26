<script lang="ts">
  import type { Stop } from '../lib/types'
  let { stop, zoneColor, isVisited, isLast, onTap }: {
    stop: Stop; zoneColor: string; isVisited: boolean; isLast: boolean; onTap: () => void
  } = $props()
</script>

<div class="stop-row">
  <div class="left">
    <div class="dot" style="border-color:{zoneColor};background:{isVisited ? zoneColor : '#fff'}"></div>
    {#if !isLast}<div class="line" style="background:{zoneColor}"></div>{/if}
  </div>
  <button class="content" onclick={onTap}>
    <div class="name-row">
      <span class="name">{stop.name}</span>
      {#if isVisited}<span class="visited-tag">✓ visité</span>{/if}
    </div>
    <p class="desc">{stop.desc}</p>
    {#if stop.tags.length}
      <div class="tags">
        {#each stop.tags as tag}<span class="tag tag-{tag}">{tag}</span>{/each}
      </div>
    {/if}
  </button>
</div>

{#each stop.branches as branch}
  <div class="branch">
    <div class="branch-label">{branch.label}</div>
    {#each branch.stopIds as bId}
      {@render branchStop?.(bId)}
    {/each}
  </div>
{/each}

{#if stop.connectorToNext && !isLast}
  <div class="connector"><span class="connector-line"></span>{stop.connectorToNext}</div>
{/if}

{#snippet branchStop(_id: string)}{/snippet}

<style>
  .stop-row { display: flex; gap: 0; align-items: stretch; }
  .left { display: flex; flex-direction: column; align-items: center; width: 24px; flex-shrink: 0; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid; flex-shrink: 0; margin-top: 4px; }
  .line { width: 2px; flex: 1; margin: 3px 0; opacity: 0.3; }
  .content { flex: 1; padding: 4px 0 16px 12px; background: none; border: none; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .content:active { opacity: 0.7; }
  .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .name { font-size: 14px; font-weight: 600; color: var(--color-text); }
  .visited-tag { font-size: 10px; font-weight: 600; padding: 2px 6px; background: #dcfce7; color: #16a34a; border-radius: 10px; }
  .desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; margin-top: 3px; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .tag { font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 600; }
  .tag-free  { background: #e8f4ed; color: #2d7a4f; }
  .tag-food  { background: #fce8ff; color: #7a2d8a; }
  .tag-night { background: #1a1714; color: #f7f4ef; }
  .tag-sport { background: #e6eeff; color: #2d48aa; }
  .tag-tip   { background: #fdf0e0; color: #9a6a10; }
  .branch { margin-left: 24px; border-left: 2px dashed var(--color-border); padding-left: 12px; margin-top: -8px; margin-bottom: 8px; }
  .branch-label { font-size: 10px; color: var(--color-text-tertiary); padding: 4px 0 6px; }
  .connector { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--color-text-tertiary); padding: 2px 0 6px 27px; }
  .connector-line { display: block; width: 20px; height: 1px; background: var(--color-border); }
</style>
