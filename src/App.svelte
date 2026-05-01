<script lang="ts">
  import TabBar from './components/TabBar.svelte'
  import Toaster from './components/Toaster.svelte'
  import TripSwitcher from './components/TripSwitcher.svelte'
  import MapView from './views/MapView.svelte'
  import GraphView from './views/GraphView.svelte'
  import EditView from './views/EditView.svelte'

  let activeTab = $state<'map' | 'graph' | 'edit'>('map')
</script>

<div class="app-shell">
  <TripSwitcher />
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
  <Toaster />
</div>

<style>
  .app-shell { height: 100%; display: flex; flex-direction: column; }
  .view-container { flex: 1; overflow: hidden; position: relative; }
</style>
