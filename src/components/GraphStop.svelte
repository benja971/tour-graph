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
  .left { display: flex; flex-direction: column; align-items: center; width: 28px; flex-shrink: 0; }
  .dot {
    width: 13px; height: 13px;
    border-radius: 50%;
    border: 2.5px solid;
    flex-shrink: 0;
    margin-top: 6px;
    box-shadow: 0 0 0 2px var(--paper);
  }
  .line { width: 2px; flex: 1; margin: 4px 0; opacity: 0.25; }
  .content {
    flex: 1;
    padding: 0 0 22px 14px;
    background: none; border: none;
    text-align: left; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.12s;
  }
  .content:active { opacity: 0.7; }
  .name-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .name {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 18px;
    line-height: 1.15;
    letter-spacing: -0.015em;
    color: var(--ink);
  }
  .visited-tag {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    background: rgba(45,110,72,0.10);
    color: #2D6E48;
    border-radius: 4px;
  }
  .desc { font-size: 13px; color: var(--ink-soft); line-height: 1.55; margin-top: 5px; }
  .tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
  .tag {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 7px;
    border-radius: 4px;
  }
  .tag-free  { background: #E5F0E8; color: #2D6E48; }
  .tag-food  { background: #F5E6F7; color: #6E2C7A; }
  .tag-night { background: #161413; color: #F7F4EF; }
  .tag-sport { background: #E0E8F5; color: #2A4790; }
  .tag-tip   { background: #F7E9D0; color: #8A6010; }
  .tag-pop   { background: #FFE3F0; color: #A8225C; }
  .branch {
    margin-left: 28px;
    border-left: 2px dashed var(--line-strong);
    padding-left: 14px;
    margin-top: -10px;
    margin-bottom: 10px;
  }
  .branch-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faint);
    padding: 6px 0 8px;
  }
  .connector {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--ink-faint);
    padding: 0 0 10px 32px;
    margin-top: -14px;
  }
  .connector-line { display: block; width: 18px; height: 1px; background: var(--line-strong); }
</style>
