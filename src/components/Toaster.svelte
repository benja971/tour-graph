<script lang="ts">
  import { toasts } from '../stores/toast.svelte'
</script>

<div class="toaster" aria-live="polite">
  {#each toasts.list as t (t.id)}
    <div class="toast toast-{t.variant}">
      <span class="icon">
        {#if t.variant === 'success'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>
        {:else if t.variant === 'error'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M5 19h14a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0L3.3 16A2 2 0 0 0 5 19Z"/></svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>
        {/if}
      </span>
      <span class="msg">{t.message}</span>
    </div>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    top: calc(12px + var(--safe-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    max-width: calc(100vw - 24px);
  }
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1);
    pointer-events: auto;
    animation: toast-in 0.22s cubic-bezier(0.32, 0.72, 0.3, 1);
    max-width: 100%;
  }
  .toast .msg {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toast .icon { display: inline-flex; flex-shrink: 0; }

  .toast-success { background: #134E2D; color: #F0FAF3; }
  .toast-error   { background: var(--accent); color: #FFFFFF; }

  @keyframes toast-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
