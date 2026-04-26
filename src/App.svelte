<script lang="ts">
  import TabBar from './components/TabBar.svelte'
  import MapView from './views/MapView.svelte'
  import GraphView from './views/GraphView.svelte'
  import EditView from './views/EditView.svelte'

  let activeTab = $state<'map' | 'graph' | 'edit'>('map')
</script>

<div class="app-shell">
  <main class="view-container">
    {#if activeTab === 'map'}
      <MapView />
    {:else if activeTab === 'graph'}
      <GraphView />
    {:else}
      <EditView />
    {/if}
  </main>
  <TabBar active={activeTab} onChange={(tab) => (activeTab = tab)} />
</div>

<style>
  .app-shell { height: 100%; display: flex; flex-direction: column; }
  .view-container { flex: 1; overflow: hidden; position: relative; }
</style>
