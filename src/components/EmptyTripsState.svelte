<script lang="ts">
  import { createTrip, importTrip } from '../stores/app.svelte'
  import { importTripFromFile, ImportTripError } from '../lib/importTripFromFile'
  import { toastSuccess, toastError } from '../stores/toast.svelte'
  import { DEFAULT_TRIP_COLOR } from '../lib/tripColor'

  let showForm = $state(false)
  let formName = $state('')
  let formColor = $state(DEFAULT_TRIP_COLOR)

  function openForm() {
    formName = ''
    formColor = DEFAULT_TRIP_COLOR
    showForm = true
  }

  function saveForm() {
    const name = formName.trim()
    if (!name) return
    const trip = createTrip(name, formColor)
    showForm = false
    toastSuccess(`Trip "${trip.name}" créé`)
  }

  async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const trip = await importTripFromFile(file)
      importTrip(trip)
      toastSuccess(`Trip "${trip.name}" importé`)
    } catch (err) {
      toastError(err instanceof ImportTripError ? err.message : 'Erreur d\'import')
    }
  }
</script>

<div class="empty">
  <div class="empty-card">
    <h2>Aucun trip</h2>
    <p>Crée un trip pour commencer, ou importe un fichier JSON existant.</p>
    <div class="actions">
      <button class="btn-primary" onclick={openForm}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Créer un trip
      </button>
      <label class="btn-secondary file-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V7M5 12l7-7 7 7M5 3h14"/></svg>
        Importer JSON
        <input type="file" accept=".json" onchange={handleImport} style="display:none" />
      </label>
    </div>
  </div>
</div>

{#if showForm}
  <div class="form-overlay">
    <div class="form-card">
      <h3>Nouveau trip</h3>
      <label>Nom<input bind:value={formName} placeholder="Montréal" /></label>
      <label>Couleur d'accent<input type="color" bind:value={formColor} /></label>
      <div class="form-actions">
        <button class="btn-primary" onclick={saveForm}>Créer</button>
        <button class="btn-secondary" onclick={() => (showForm = false)}>Annuler</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .empty {
    height: 100%;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    background: var(--paper);
  }
  .empty-card {
    max-width: 360px;
    text-align: center;
  }
  h2 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 28px;
    line-height: 1.1;
    color: var(--ink);
    margin-bottom: 8px;
  }
  .empty-card p {
    font-size: 14px;
    color: var(--ink-soft);
    line-height: 1.5;
    margin-bottom: 22px;
  }
  .actions {
    display: flex; flex-direction: column; gap: 10px;
  }

  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 18px;
    background: var(--ink); color: var(--paper);
    border: none; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-secondary {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 18px;
    background: var(--paper-elevated); color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .file-label { cursor: pointer; }

  .form-overlay {
    position: fixed; inset: 0;
    background: rgba(15, 12, 10, 0.42);
    backdrop-filter: blur(2px);
    display: flex; align-items: flex-end;
    z-index: 1500;
    animation: fadeIn 0.18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .form-card {
    background: var(--paper);
    border-top: 1px solid var(--line-strong);
    border-radius: 22px 22px 0 0;
    padding: 22px 22px 30px;
    width: 100%;
    padding-bottom: calc(30px + var(--safe-bottom));
    animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0.3, 1);
  }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .form-card h3 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 22px;
    margin-bottom: 18px;
    color: var(--ink);
  }
  .form-card label {
    display: flex; flex-direction: column; gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 12px;
  }
  .form-card input {
    padding: 11px 12px;
    border: 1px solid var(--line-strong);
    background: var(--paper-elevated);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s;
    text-transform: none;
    letter-spacing: 0;
  }
  .form-card input:focus { border-color: var(--ink); }
  .form-actions { display: flex; gap: 10px; margin-top: 6px; }
</style>
