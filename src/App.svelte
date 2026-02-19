<script lang="ts">
  import SplitPane from './components/shared/SplitPane.svelte';
  import Toolbar from './components/toolbar/Toolbar.svelte';
  import HierarchyPanel from './components/hierarchy/HierarchyPanel.svelte';
  import CanvasPanel from './components/canvas/CanvasPanel.svelte';
  import PropertiesPanel from './components/properties/PropertiesPanel.svelte';
  import TimelinePanel from './components/timeline/TimelinePanel.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { playbackState } from '$lib/state/playback.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { projectState } from '$lib/state/project.svelte';
  import { openVanimFile, saveVanimFile } from '$lib/io/save-load';

  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;

    // Не перехватываем, если фокус в input
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      historyState.undo();
    } else if (ctrl && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      historyState.redo();
    } else if (ctrl && e.key === 'y') {
      e.preventDefault();
      historyState.redo();
    } else if (ctrl && e.key === 's') {
      e.preventDefault();
      saveVanimFile(projectState.document, projectState.filePath ?? undefined).then((name) => {
        if (name) { projectState.filePath = name; projectState.dirty = false; }
      });
    } else if (ctrl && e.key === 'o') {
      e.preventDefault();
      openVanimFile().then((result) => {
        if (result) { projectState.setDocument(result.doc, result.fileName); selectionState.clear(); historyState.clear(); }
      });
    } else if (e.key === ' ') {
      e.preventDefault();
      playbackState.togglePlay();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectionState.nodeId && selectionState.nodeId !== 'root') {
        historyState.push(`Delete ${selectionState.nodeId}`);
        projectState.removeNode(selectionState.nodeId);
        selectionState.clear();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-layout">
  <Toolbar />

  <div class="main-area">
    <SplitPane direction="vertical" initialSplit={70} minFirst={200} minSecond={120}>
      {#snippet first()}
        <SplitPane direction="horizontal" initialSplit={18} minFirst={150} minSecond={300}>
          {#snippet first()}
            <HierarchyPanel />
          {/snippet}
          {#snippet second()}
            <SplitPane direction="horizontal" initialSplit={75} minFirst={300} minSecond={200}>
              {#snippet first()}
                <CanvasPanel />
              {/snippet}
              {#snippet second()}
                <PropertiesPanel />
              {/snippet}
            </SplitPane>
          {/snippet}
        </SplitPane>
      {/snippet}
      {#snippet second()}
        <TimelinePanel />
      {/snippet}
    </SplitPane>
  </div>
</div>

<style>
  .app-layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #1e1e1e;
  }

  .main-area {
    flex: 1;
    overflow: hidden;
  }
</style>
