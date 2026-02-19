<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import NodeItem from './NodeItem.svelte';

  // Корневые ноды — те, у которых нет родителя
  const rootNodes = $derived(() => {
    const childIds = new Set<string>();
    for (const node of projectState.nodes) {
      if (node.type === 'container' && node.children) {
        for (const id of node.children) {
          childIds.add(id);
        }
      }
    }
    return projectState.nodes.filter((n) => !childIds.has(n.id));
  });

  const particles = $derived(projectState.particles);

  function selectParticle(id: string) {
    selectionState.selectParticle(id);
  }
</script>

<div class="hierarchy-panel">
  <div class="panel-header">Hierarchy</div>

  <div class="tree">
    {#each rootNodes() as node (node.id)}
      <NodeItem {node} />
    {/each}
  </div>

  {#if particles.length > 0}
    <div class="panel-header sub">Particles</div>
    <div class="tree">
      {#each particles as particle (particle.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="particle-item"
          class:selected={selectionState.particleId === particle.id}
          onclick={() => selectParticle(particle.id)}
        >
          <span class="particle-icon">*</span>
          <span class="particle-name">{particle.id}</span>
          <span class="particle-mode">{particle.mode}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .hierarchy-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    overflow: hidden;
  }

  .panel-header {
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    background: #252526;
    border-bottom: 1px solid #333;
    user-select: none;
  }

  .panel-header.sub {
    border-top: 1px solid #333;
  }

  .tree {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0;
  }

  .particle-item {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    cursor: pointer;
    font-size: 12px;
    color: #ccc;
    border-left: 2px solid transparent;
  }

  .particle-item:hover {
    background: #2a2d2e;
  }

  .particle-item.selected {
    background: #094771;
    border-left-color: #007acc;
  }

  .particle-icon {
    color: #e8a848;
    font-size: 14px;
    width: 14px;
    text-align: center;
  }

  .particle-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .particle-mode {
    margin-left: auto;
    font-size: 10px;
    color: #666;
  }
</style>
