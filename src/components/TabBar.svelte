<script lang="ts">
  type Tab = 'map' | 'graph' | 'edit'
  let { active, onChange }: { active: Tab; onChange: (tab: Tab) => void } = $props()

  const tabs: { id: Tab; label: string; icon: string }[] = [
    {
      id: 'map',
      label: 'Carte',
      icon: '<path d="M9 4 3 6v15l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v15M15 6v15"/>'
    },
    {
      id: 'graph',
      label: 'Graphe',
      icon: '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M12 7v3M12 14v3M8 12h2M14 12h2"/>'
    },
    {
      id: 'edit',
      label: 'Éditer',
      icon: '<path d="M16 3 21 8 8 21H3v-5L16 3Z"/><path d="m13 6 5 5"/>'
    }
  ]
</script>

<nav class="tab-bar">
  {#each tabs as tab (tab.id)}
    <button class="tab" class:active={active === tab.id} onclick={() => onChange(tab.id)}>
      <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        {@html tab.icon}
      </svg>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: calc(var(--tab-bar-height) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: rgba(248, 244, 236, 0.92);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
    display: flex; z-index: 1000;
  }
  .tab {
    flex: 1;
    position: relative;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 4px; background: none; border: none;
    cursor: pointer;
    color: var(--ink-faint);
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .tab:hover { color: var(--ink-soft); }
  .tab.active { color: var(--ink); }

  .icon { display: block; }

  .label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .tab.active::before {
    content: '';
    position: absolute;
    top: 0; left: 50%;
    transform: translateX(-50%);
    width: 24px; height: 2px;
    background: var(--accent);
    border-radius: 0 0 2px 2px;
  }
</style>
