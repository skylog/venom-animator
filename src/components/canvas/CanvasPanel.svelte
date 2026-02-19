<script lang="ts">
  import { PreviewApp } from '$lib/preview/PreviewApp';
  import { projectState } from '$lib/state/project.svelte';
  import { playbackState } from '$lib/state/playback.svelte';

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;
  let preview: PreviewApp | null = null;

  // Инициализация PixiJS
  $effect(() => {
    if (!canvasEl || !containerEl) return;

    const app = new PreviewApp();
    preview = app;

    const rect = containerEl.getBoundingClientRect();
    app.init(canvasEl, rect.width, rect.height).then(() => {
      // Загружаем документ
      app.loadDocument(projectState.document);
      playbackState.setDuration(projectState.document.duration);

      // Callback для playback
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
</script>

<div class="canvas-panel" bind:this={containerEl}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .canvas-panel {
    width: 100%;
    height: 100%;
    position: relative;
    background: #1a1a2e;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
