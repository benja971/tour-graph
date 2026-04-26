<script lang="ts">
  let { active, onChange }: { active: 'map' | 'graph' | 'edit'; onChange: (tab: 'map' | 'graph' | 'edit') => void } = $props()

  const tabs = [
    { id: 'map' as const, icon: '🗺️', label: 'Carte' },
    { id: 'graph' as const, icon: '🔗', label: 'Graphe' },
    { id: 'edit' as const, icon: '✏️', label: 'Éditer' }
  ]
</script>

<nav class="tab-bar">
  {#each tabs as tab}
    <button class="tab" class:active={active === tab.id} onclick={() => onChange(tab.id)}>
      <span class="icon">{tab.icon}</span>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tab-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--tab-bar-height); padding-bottom: var(--safe-bottom);
    background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border); display: flex; z-index: 100;
  }
  .tab {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 2px; background: none; border: none;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .icon { font-size: 18px; }
  .label { font-size: 10px; color: var(--color-text-tertiary); font-weight: 500; }
  .tab.active .label { color: var(--color-text); font-weight: 700; }
</style>
