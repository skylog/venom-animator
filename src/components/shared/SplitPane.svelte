<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    initialSplit?: number; // 0-100, процент первой панели
    minFirst?: number;     // мин. размер первой панели в px
    minSecond?: number;    // мин. размер второй панели в px
    first: Snippet;
    second: Snippet;
  }

  let {
    direction = 'horizontal',
    initialSplit = 50,
    minFirst = 100,
    minSecond = 100,
    first,
    second,
  }: Props = $props();

  let split = $state(initialSplit);
  let dragging = $state(false);
  let containerEl: HTMLDivElement;

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    let ratio: number;

    if (direction === 'horizontal') {
      const x = e.clientX - rect.left;
      ratio = (x / rect.width) * 100;
    } else {
      const y = e.clientY - rect.top;
      ratio = (y / rect.height) * 100;
    }

    // Ограничиваем min-размерами
    const totalSize = direction === 'horizontal' ? rect.width : rect.height;
    const minFirstPct = (minFirst / totalSize) * 100;
    const minSecondPct = (minSecond / totalSize) * 100;

    split = Math.max(minFirstPct, Math.min(100 - minSecondPct, ratio));
  }

  function onPointerUp() {
    dragging = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="split-pane {direction}"
  bind:this={containerEl}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
>
  <div class="pane first" style="{direction === 'horizontal' ? 'width' : 'height'}: {split}%">
    {@render first()}
  </div>

  <div
    class="divider"
    role="separator"
    tabindex="-1"
    onpointerdown={onPointerDown}
  ></div>

  <div class="pane second" style="{direction === 'horizontal' ? 'width' : 'height'}: {100 - split}%">
    {@render second()}
  </div>
</div>

<style>
  .split-pane {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .split-pane.horizontal {
    flex-direction: row;
  }

  .split-pane.vertical {
    flex-direction: column;
  }

  .pane {
    overflow: hidden;
    position: relative;
  }

  .divider {
    flex-shrink: 0;
    background: #333;
    z-index: 10;
  }

  .horizontal > .divider {
    width: 4px;
    cursor: col-resize;
  }

  .vertical > .divider {
    height: 4px;
    cursor: row-resize;
  }

  .divider:hover {
    background: #555;
  }
</style>
