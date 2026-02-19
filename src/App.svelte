<script lang="ts">
  import SplitPane from './components/shared/SplitPane.svelte';
  import Toolbar from './components/toolbar/Toolbar.svelte';
  import HierarchyPanel from './components/hierarchy/HierarchyPanel.svelte';
  import CanvasPanel from './components/canvas/CanvasPanel.svelte';
  import PropertiesPanel from './components/properties/PropertiesPanel.svelte';
  import TimelinePanel from './components/timeline/TimelinePanel.svelte';
  import { historyState } from '$lib/state/history.svelte';

  // Горячие клавиши
  function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      historyState.undo();
    } else if (ctrl && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      historyState.redo();
    } else if (ctrl && e.key === 'y') {
      e.preventDefault();
      historyState.redo();
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
