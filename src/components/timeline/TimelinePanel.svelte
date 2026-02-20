<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { playbackState } from '$lib/state/playback.svelte';
  import { timelineState } from '$lib/state/timeline.svelte';
  import type { KeyframeProperty, VanimNode } from '$lib/types/vanim';
  import PlaybackControls from './PlaybackControls.svelte';
  import TimeRuler from './TimeRuler.svelte';
  import Track from './Track.svelte';
  import StateBar from './StateBar.svelte';

  // Все ноды с keyframes
  const tracksData = $derived(() => {
    const result: { nodeId: string; property: KeyframeProperty; keyframes: any[] }[] = [];

    for (const node of projectState.nodes) {
      if (!node.keyframes) continue;
      for (const [prop, kfs] of Object.entries(node.keyframes)) {
        if (kfs && kfs.length > 0) {
          result.push({
            nodeId: node.id,
            property: prop as KeyframeProperty,
            keyframes: kfs,
          });
        }
      }
    }
    return result;
  });

  // Playhead position
  const playheadX = $derived(playbackState.currentTime * timelineState.pxPerMs + timelineState.labelWidth);

  // Группируем треки по ноде
  const groupedTracks = $derived(() => {
    const groups = new Map<string, { nodeId: string; property: KeyframeProperty; keyframes: any[] }[]>();
    for (const track of tracksData()) {
      const group = groups.get(track.nodeId) ?? [];
      group.push(track);
      groups.set(track.nodeId, group);
    }
    return groups;
  });

  function handleWheel(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      timelineState.zoomIn();
    } else {
      timelineState.zoomOut();
    }
  }
</script>

<div class="timeline-panel">
  <div class="timeline-header">
    <PlaybackControls />
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="timeline-content" onwheel={handleWheel}>
    <TimeRuler />
    <StateBar />

    <div class="tracks-container">
      {#each [...groupedTracks().entries()] as [nodeId, tracks]}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="node-group">
          <div
            class="node-group-header"
            class:selected={selectionState.nodeId === nodeId}
            onclick={() => selectionState.selectNode(nodeId)}
          >
            {nodeId}
          </div>
          {#each tracks as track}
            <Track
              nodeId={track.nodeId}
              property={track.property}
              keyframes={track.keyframes}
            />
          {/each}
        </div>
      {/each}

      {#if tracksData().length === 0}
        <div class="empty-state">Нет keyframes</div>
      {/if}

      <!-- Playhead вертикальная линия -->
      <div class="playhead-line" style="left: {playheadX}px"></div>
    </div>
  </div>
</div>

<style>
  .timeline-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    overflow: hidden;
  }

  .timeline-header {
    display: flex;
    align-items: center;
    background: #252526;
    border-bottom: 1px solid #333;
  }

  .timeline-content {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .tracks-container {
    position: relative;
    min-width: 100%;
  }

  .node-group {
    border-bottom: 1px solid #333;
  }

  .node-group-header {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    background: #252526;
    cursor: pointer;
    user-select: none;
  }

  .node-group-header:hover {
    background: #2a2d2e;
  }

  .node-group-header.selected {
    background: #094771;
    color: #fff;
  }

  .playhead-line {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: #e8a848;
    z-index: 10;
    pointer-events: none;
  }

  .empty-state {
    padding: 16px;
    text-align: center;
    color: #555;
    font-size: 12px;
  }
</style>
