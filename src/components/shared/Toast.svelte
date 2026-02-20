<script lang="ts">
  import { toastState } from '$lib/state/toast.svelte';

  const typeColors: Record<string, string> = {
    success: '#4ec9b0',
    error: '#ff6b6b',
    info: '#007acc',
    warning: '#e8a848',
  };
</script>

{#if toastState.items.length > 0}
  <div class="toast-container">
    {#each toastState.items as toast (toast.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="toast toast-{toast.type}"
        style="border-left-color: {typeColors[toast.type]}"
        onclick={() => toastState.dismiss(toast.id)}
      >
        <div class="toast-message">{toast.message}</div>
        {#if toast.detail}
          <div class="toast-detail">{toast.detail}</div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 380px;
    pointer-events: none;
  }

  .toast {
    background: #2d2d2d;
    border: 1px solid #444;
    border-left: 4px solid;
    border-radius: 4px;
    padding: 10px 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    pointer-events: auto;
    animation: toast-in 0.25s ease-out;
  }

  .toast:hover {
    background: #333;
  }

  .toast-message {
    color: #ccc;
    font-size: 12px;
    line-height: 1.4;
  }

  .toast-detail {
    color: #888;
    font-size: 11px;
    margin-top: 4px;
    line-height: 1.3;
    white-space: pre-line;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
