<script lang="ts">
  import type { Keyframe, KeyframeProperty, EasingName } from '$lib/types/vanim';
  import { selectionState } from '$lib/state/selection.svelte';
  import { playbackState } from '$lib/state/playback.svelte';
  import { projectState } from '$lib/state/project.svelte';
  import { historyState } from '$lib/state/history.svelte';

  interface Props {
    nodeId: string;
    property: KeyframeProperty;
    keyframes: Keyframe[];
    pxPerMs?: number;
    offsetLeft?: number;
  }

  let { nodeId, property, keyframes, pxPerMs = 0.5, offsetLeft = 120 }: Props = $props();

  const isSelectedTrack = $derived(selectionState.keyframeProp === property);

  let draggingIndex = $state<number | null>(null);
  let dragStartX = $state(0);
  let dragStartTime = $state(0);

  function handleKeyframeClick(index: number, e: MouseEvent) {
    e.stopPropagation();
    selectionState.selectKeyframe(property, index);
  }

  function handleKeyframePointerDown(index: number, e: PointerEvent) {
    e.stopPropagation();
    draggingIndex = index;
    dragStartX = e.clientX;
    dragStartTime = keyframes[index].time;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    selectionState.selectKeyframe(property, index);
  }

  function handlePointerMove(e: PointerEvent) {
    if (draggingIndex === null) return;

    const dx = e.clientX - dragStartX;
    const dt = dx / pxPerMs;
    const newTime = Math.max(0, Math.round(dragStartTime + dt));

    // Обновляем в реальном времени
    projectState.updateNode(nodeId, (node) => {
      const kfMap = { ...node.keyframes };
      const track = [...(kfMap[property] ?? [])];
      track[draggingIndex!] = { ...track[draggingIndex!], time: newTime };
      kfMap[property] = track;
      return { ...node, keyframes: kfMap };
    });
  }

  function handlePointerUp() {
    if (draggingIndex !== null) {
      historyState.push(`Move kf ${property}[${draggingIndex}]`);
      draggingIndex = null;
    }
  }

  function handleTrackClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - offsetLeft;
    const time = Math.max(0, x / pxPerMs);
    playbackState.seek(time);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="track"
  class:selected={isSelectedTrack}
  onclick={handleTrackClick}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
  <div class="track-label">{property}</div>
  <div class="track-area">
    {#each keyframes as kf, i}
      {@const x = kf.time * pxPerMs + offsetLeft}
      {@const isSelected = isSelectedTrack && selectionState.keyframeIndex === i}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="keyframe-diamond"
        class:selected={isSelected}
        class:dragging={draggingIndex === i}
        style="left: {x}px"
        title="{kf.time}ms: {kf.value}{kf.easing ? ` (${kf.easing})` : ''}"
        onclick={(e) => handleKeyframeClick(i, e)}
        onpointerdown={(e) => handleKeyframePointerDown(i, e)}
      >
        <span class="diamond">&#x25C6;</span>
      </div>
    {/each}

    {#if keyframes.length >= 2}
      {@const firstX = keyframes[0].time * pxPerMs + offsetLeft}
      {@const lastX = keyframes[keyframes.length - 1].time * pxPerMs + offsetLeft}
      <div class="track-line" style="left: {firstX}px; width: {lastX - firstX}px"></div>
    {/if}
  </div>
</div>

<style>
  .track {
    display: flex;
    align-items: center;
    height: 24px;
    border-bottom: 1px solid #2a2a2a;
    cursor: pointer;
    position: relative;
  }

  .track:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .track.selected {
    background: rgba(0, 122, 204, 0.1);
  }

  .track-label {
    width: 120px;
    padding: 0 8px;
    font-size: 11px;
    font-family: monospace;
    color: #888;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-area {
    flex: 1;
    position: relative;
    height: 100%;
  }

  .track-line {
    position: absolute;
    top: 50%;
    height: 2px;
    background: #444;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .keyframe-diamond {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    cursor: grab;
    z-index: 2;
    line-height: 1;
    padding: 4px;
  }

  .keyframe-diamond.dragging {
    cursor: grabbing;
  }

  .diamond {
    font-size: 10px;
    color: #e8a848;
  }

  .keyframe-diamond.selected .diamond {
    color: #fff;
    text-shadow: 0 0 4px #e8a848;
  }

  .keyframe-diamond:hover .diamond {
    color: #ffd080;
  }
</style>
