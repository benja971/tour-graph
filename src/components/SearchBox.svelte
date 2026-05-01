<script lang="ts">
  import { onDestroy } from 'svelte'
  import { searchPlaces, PhotonError, type PhotonResult } from '../lib/photon'
  import { toastError } from '../stores/toast.svelte'

  type Props = {
    placeholder?: string
    biasLat?: number | null
    biasLng?: number | null
    onSelect: (result: PhotonResult) => void
  }

  let { placeholder = 'Cherche un lieu — nom, adresse…', biasLat = null, biasLng = null, onSelect }: Props = $props()

  let query = $state('')
  let results = $state<PhotonResult[]>([])
  let loading = $state(false)
  let open = $state(false)
  let wrapper: HTMLDivElement | undefined = $state()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortCtrl: AbortController | null = null

  const MIN_CHARS = 3
  const DEBOUNCE_MS = 200

  function resetTimer() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function abortInflight() {
    if (abortCtrl) {
      abortCtrl.abort()
      abortCtrl = null
    }
  }

  function onInput() {
    resetTimer()
    abortInflight()
    if (query.trim().length < MIN_CHARS) {
      results = []
      loading = false
      open = false
      return
    }
    open = true
    loading = true
    debounceTimer = setTimeout(runSearch, DEBOUNCE_MS)
  }

  async function runSearch() {
    abortInflight()
    const ctrl = new AbortController()
    abortCtrl = ctrl
    try {
      const out = await searchPlaces(query.trim(), {
        biasLat: biasLat ?? undefined,
        biasLng: biasLng ?? undefined,
        signal: ctrl.signal
      })
      if (ctrl.signal.aborted) return
      results = out
      loading = false
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof PhotonError) {
        toastError('Recherche indisponible')
      }
      loading = false
      results = []
    }
  }

  function pick(r: PhotonResult) {
    onSelect(r)
    query = r.shortName
    results = []
    open = false
  }

  function handleClickOutside(e: MouseEvent) {
    if (!wrapper) return
    if (!wrapper.contains(e.target as Node)) open = false
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }

  onDestroy(() => {
    resetTimer()
    abortInflight()
  })
</script>

<svelte:window onmousedown={handleClickOutside} onkeydown={handleKey} />

<div class="search-box" bind:this={wrapper}>
  <div class="input-row">
    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input
      type="text"
      bind:value={query}
      oninput={onInput}
      onfocus={() => { if (results.length > 0) open = true }}
      {placeholder}
      autocomplete="off"
      spellcheck="false"
    />
    {#if loading}
      <span class="spinner" aria-label="Recherche en cours"></span>
    {/if}
  </div>

  {#if open && query.trim().length >= MIN_CHARS}
    <ul class="dropdown" role="listbox">
      {#if results.length === 0 && !loading}
        <li class="empty">Aucun résultat</li>
      {:else}
        {#each results as r (r.lat + '|' + r.lng + '|' + r.name)}
          <li>
            <button type="button" class="row" onclick={() => pick(r)} role="option" aria-selected="false">
              <span class="row-name">{r.shortName}</span>
              <span class="row-meta">{r.name === r.shortName ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : r.name}</span>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .search-box {
    position: relative;
    width: 100%;
  }
  .input-row {
    display: flex; align-items: center; gap: 8px;
    padding: 0 12px;
    border: 1px solid var(--line-strong);
    background: var(--paper-elevated);
    border-radius: 8px;
    transition: border-color 0.15s;
  }
  .input-row:focus-within { border-color: var(--ink); }
  .icon { color: var(--ink-faint); flex-shrink: 0; }
  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    padding: 11px 0;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    text-transform: none;
    letter-spacing: 0;
  }
  input::placeholder { color: var(--ink-faint); }

  .spinner {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 2px solid var(--line-strong);
    border-top-color: var(--ink);
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    list-style: none;
    background: var(--paper-elevated);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    overflow: hidden;
    z-index: 1200;
    max-height: 280px;
    overflow-y: auto;
  }
  .empty {
    padding: 12px;
    font-size: 13px;
    font-family: var(--font-mono);
    color: var(--ink-faint);
    text-align: center;
  }
  .row {
    display: flex; flex-direction: column; gap: 2px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: none;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .row:last-child { border-bottom: none; }
  .row:hover { background: rgba(22,20,19,0.03); }
  .row:active { background: rgba(22,20,19,0.06); }
  .row-name {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    font-size: 14px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-meta {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
