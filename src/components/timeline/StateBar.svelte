<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { playbackState } from '$lib/state/playback.svelte';
  import { timelineState } from '$lib/state/timeline.svelte';
  import type { VanimState } from '$lib/types/vanim';

  const states = $derived(projectState.document.states ?? []);

  function handleClick(state: VanimState) {
    playbackState.setRegion(state.startTime, state.endTime);
  }

  function handleDblClick() {
    playbackState.clearRegion();
  }
</script>

{#if states.length > 0}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="state-bar" ondblclick={handleDblClick}>
    {#each states as state}
      {@const x = state.startTime * timelineState.pxPerMs + timelineState.labelWidth}
      {@const w = (state.endTime - state.startTime) * timelineState.pxPerMs}
      {@const color = state.color ?? '#555'}
      {@const isActive = playbackState.regionStart === state.startTime && playbackState.regionEnd === state.endTime}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="state-segment"
        class:active={isActive}
        style="left: {x}px; width: {w}px; --state-color: {color}"
        onclick={(e) => { e.stopPropagation(); handleClick(state); }}
        title="{state.label}: {state.startTime}ms – {state.endTime}ms"
      >
        <span class="state-label">{state.label}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .state-bar {
    position: relative;
    height: 20px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    user-select: none;
  }

  .state-segment {
    position: absolute;
    top: 2px;
    height: 16px;
    background: color-mix(in srgb, var(--state-color) 25%, transparent);
    border: 1px solid color-mix(in srgb, var(--state-color) 60%, transparent);
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: background 0.15s;
  }

  .state-segment:hover {
    background: color-mix(in srgb, var(--state-color) 40%, transparent);
  }

  .state-segment.active {
    background: color-mix(in srgb, var(--state-color) 45%, transparent);
    border-color: var(--state-color);
    box-shadow: 0 0 4px color-mix(in srgb, var(--state-color) 50%, transparent);
  }

  .state-label {
    font-size: 9px;
    font-weight: 600;
    color: #ccc;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    padding: 0 4px;
  }
</style>
