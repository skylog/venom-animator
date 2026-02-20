<script lang="ts">
  import { playbackState } from '$lib/state/playback.svelte';
  import { timelineState } from '$lib/state/timeline.svelte';

  const pxPerMs = $derived(timelineState.pxPerMs);
  const offsetLeft = timelineState.labelWidth;

  let rulerEl: HTMLDivElement;

  // Генерируем метки времени
  const ticks = $derived(() => {
    const duration = playbackState.duration;
    const step = getTickStep(duration, pxPerMs);
    const result: { time: number; x: number; label: string; major: boolean }[] = [];

    for (let t = 0; t <= duration; t += step) {
      result.push({
        time: t,
        x: t * pxPerMs + offsetLeft,
        label: `${t}`,
        major: t % (step * 5) === 0 || t === 0,
      });
    }
    return result;
  });

  const playheadX = $derived(playbackState.currentTime * pxPerMs + offsetLeft);

  function getTickStep(duration: number, pxPerMs: number): number {
    const minPxBetweenTicks = 40;
    const steps = [10, 25, 50, 100, 200, 250, 500, 1000];
    for (const s of steps) {
      if (s * pxPerMs >= minPxBetweenTicks) return s;
    }
    return 1000;
  }

  function handleClick(e: MouseEvent) {
    if (!rulerEl) return;
    const rect = rulerEl.getBoundingClientRect();
    const x = e.clientX - rect.left - offsetLeft;
    const time = Math.max(0, x / pxPerMs);
    playbackState.seek(time);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="time-ruler" bind:this={rulerEl} onclick={handleClick}>
  {#each ticks() as tick}
    <div class="tick" class:major={tick.major} style="left: {tick.x}px">
      {#if tick.major}
        <span class="tick-label">{tick.label}</span>
      {/if}
    </div>
  {/each}

  <div class="playhead" style="left: {playheadX}px"></div>
</div>

<style>
  .time-ruler {
    position: relative;
    height: 24px;
    background: #252526;
    border-bottom: 1px solid #333;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }

  .tick {
    position: absolute;
    top: 14px;
    width: 1px;
    height: 10px;
    background: #444;
  }

  .tick.major {
    top: 8px;
    height: 16px;
    background: #555;
  }

  .tick-label {
    position: absolute;
    top: -12px;
    left: 2px;
    font-size: 9px;
    color: #666;
    white-space: nowrap;
  }

  .playhead {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: #e8a848;
    z-index: 5;
    pointer-events: none;
  }
</style>
