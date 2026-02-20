<script lang="ts">
  import { playbackState } from '$lib/state/playback.svelte';

  function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const remainder = Math.floor(ms % 1000);
    return `${s}.${String(remainder).padStart(3, '0')}`;
  }
</script>

<div class="playback-controls">
  <button class="ctrl-btn" onclick={() => playbackState.stop()} title="Stop">
    &#9632;
  </button>
  <button class="ctrl-btn play" onclick={() => playbackState.togglePlay()} title={playbackState.playing ? 'Pause' : 'Play'}>
    {playbackState.playing ? '\u23F8' : '\u25B6'}
  </button>
  <button
    class="ctrl-btn"
    class:active={playbackState.loop}
    onclick={() => playbackState.loop = !playbackState.loop}
    title="Loop"
  >
    &#x21BB;
  </button>

  <div class="time-display">
    <span class="time-current">{formatTime(playbackState.currentTime)}</span>
    <span class="time-sep">/</span>
    <span class="time-total">{formatTime(playbackState.duration)}</span>
  </div>

  {#if playbackState.hasRegion}
    <button
      class="ctrl-btn region-btn"
      onclick={() => playbackState.clearRegion()}
      title="Clear region"
    >
      <span class="region-indicator">{formatTime(playbackState.regionStart!)}–{formatTime(playbackState.regionEnd!)}</span>
    </button>
  {/if}
</div>

<style>
  .playback-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    height: 28px;
    flex-shrink: 0;
  }

  .ctrl-btn {
    width: 26px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 3px;
    color: #ccc;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }

  .ctrl-btn:hover {
    background: #3a3a3a;
    border-color: #555;
  }

  .ctrl-btn.play {
    width: 32px;
    color: #4ec9b0;
  }

  .ctrl-btn.active {
    background: #094771;
    border-color: #007acc;
    color: #4ec9b0;
  }

  .time-display {
    margin-left: 8px;
    font-family: monospace;
    font-size: 11px;
    color: #888;
    display: flex;
    gap: 2px;
  }

  .time-current {
    color: #ccc;
  }

  .time-sep {
    color: #555;
  }

  .region-btn {
    width: auto;
    padding: 0 6px;
    margin-left: 4px;
    background: rgba(78, 201, 176, 0.15);
    border-color: rgba(78, 201, 176, 0.4);
  }

  .region-btn:hover {
    background: rgba(78, 201, 176, 0.25);
  }

  .region-indicator {
    font-family: monospace;
    font-size: 9px;
    color: #4ec9b0;
    white-space: nowrap;
  }
</style>
