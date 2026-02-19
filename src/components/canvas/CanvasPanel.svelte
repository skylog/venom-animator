<script lang="ts">
  import { PreviewApp } from '$lib/preview/PreviewApp';
  import { projectState } from '$lib/state/project.svelte';
  import { playbackState } from '$lib/state/playback.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { handleDroppedFiles } from '$lib/io/import-assets';

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;
  let preview: PreviewApp | null = null;
  let dragOver = $state(false);

  // Инициализация PixiJS
  $effect(() => {
    if (!canvasEl || !containerEl) return;

    const app = new PreviewApp();
    preview = app;

    const rect = containerEl.getBoundingClientRect();
    app.init(canvasEl, rect.width, rect.height).then(() => {
      app.loadDocument(projectState.document);
      playbackState.setDuration(projectState.document.duration);

      playbackState.setFrameCallback((time) => {
        app.renderAtTime(time);
      });
    });

    return () => {
      playbackState.setFrameCallback(() => {});
      app.destroy();
      preview = null;
    };
  });

  // Перестраиваем сцену при изменении документа
  let prevDocJson = $state('');
  $effect(() => {
    const json = JSON.stringify(projectState.document);
    if (json !== prevDocJson && preview?.initialized) {
      prevDocJson = json;
      preview.rebuildScene(projectState.document);
      playbackState.setDuration(projectState.document.duration);
      if (!playbackState.playing) {
        preview.renderAtTime(playbackState.currentTime);
      }
    }
  });

  // Ресайз
  $effect(() => {
    if (!containerEl || !preview?.initialized) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && preview?.initialized) {
        preview.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(containerEl);
    return () => observer.disconnect();
  });

  // Drag-n-drop ассетов
  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    if (!e.dataTransfer?.files.length) return;

    const imported = handleDroppedFiles(e.dataTransfer.files);
    if (imported.length === 0) return;

    historyState.push('Import assets');
    for (const item of imported) {
      // Добавляем ассет
      projectState.updateDocument((doc) => ({
        ...doc,
        assets: { ...(doc.assets ?? {}), [item.id]: item.asset },
      }));

      // Создаём sprite ноду
      const nodeId = `sprite-${item.id}`;
      projectState.addNode({
        id: nodeId,
        type: 'sprite',
        asset: item.id,
        x: projectState.document.width / 2,
        y: projectState.document.height / 2,
        anchorX: 0.5,
        anchorY: 0.5,
      });
      selectionState.selectNode(nodeId);
    }
  }
</script>

<div
  class="canvas-panel"
  class:drag-over={dragOver}
  bind:this={containerEl}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  role="application"
>
  <canvas bind:this={canvasEl}></canvas>
  {#if dragOver}
    <div class="drop-overlay">
      Drop image to import
    </div>
  {/if}
</div>

<style>
  .canvas-panel {
    width: 100%;
    height: 100%;
    position: relative;
    background: #1a1a2e;
    overflow: hidden;
  }

  .canvas-panel.drag-over {
    outline: 2px dashed #4ec9b0;
    outline-offset: -2px;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    color: #4ec9b0;
    font-size: 16px;
    font-weight: 600;
    pointer-events: none;
  }
</style>
