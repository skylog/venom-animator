<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import type { VanimNode, NodeType, MeshNode } from '$lib/types/vanim';
  import { generateGrid } from '$lib/preview/MeshUtils';
  import NodeItem from './NodeItem.svelte';

  let showAddMenu = $state(false);

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

  // Генерация уникального id
  function generateId(prefix: string): string {
    let i = 1;
    while (projectState.getNodeById(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  }

  function addNode(type: NodeType) {
    showAddMenu = false;
    const parentId = selectionState.nodeId ?? 'root';

    // Проверяем что parent — container
    const parent = projectState.getNodeById(parentId);
    const actualParent = (parent?.type === 'container') ? parentId : 'root';

    let node: VanimNode;
    const id = generateId(type + '-');

    switch (type) {
      case 'container':
        node = { id, type: 'container', children: [] };
        break;
      case 'sprite':
        node = { id, type: 'sprite', asset: '', x: 0, y: 0 };
        break;
      case 'spritesheet_anim':
        node = { id, type: 'spritesheet_anim', asset: '', x: 0, y: 0 };
        break;
      case 'graphics':
        node = {
          id, type: 'graphics',
          graphics: { type: 'circle', cx: 128, cy: 128, radius: 30, fill: { color: '#4ec9b0' } },
        };
        break;
      case 'text':
        node = {
          id, type: 'text', text: 'Text',
          x: 128, y: 128, anchorX: 0.5, anchorY: 0.5,
          style: { fontSize: 24, fill: '#ffffff' },
        };
        break;
      case 'mesh': {
        const grid = generateGrid(4, 4, 128, 128);
        node = {
          id, type: 'mesh', asset: '',
          x: 64, y: 64,
          vertices: grid.vertices,
          indices: grid.indices,
        } as MeshNode;
        break;
      }
      default:
        return;
    }

    historyState.push(`Add ${type}`);
    projectState.addNode(node, actualParent);
    selectionState.selectNode(id);
  }

  function removeSelected() {
    if (selectionState.nodeId && selectionState.nodeId !== 'root') {
      historyState.push(`Remove ${selectionState.nodeId}`);
      projectState.removeNode(selectionState.nodeId);
      selectionState.clear();
    } else if (selectionState.particleId) {
      historyState.push(`Remove particle ${selectionState.particleId}`);
      projectState.removeParticle(selectionState.particleId);
      selectionState.clear();
    }
  }

  function addParticle() {
    const id = generateId('particle-');
    historyState.push('Add particle');
    projectState.addParticle({
      id,
      startTime: 0,
      mode: 'burst',
      x: projectState.document.width / 2,
      y: projectState.document.height / 2,
      config: {
        count: 15,
        lifetime: 500,
        speed: { min: 2, max: 6 },
        size: { min: 1, max: 3 },
        color: '#FFD700',
        alpha: { start: 1, end: 0 },
        direction: { min: 0, max: 6.283 },
        gravity: 0,
        blendMode: 'add',
      },
    });
    selectionState.selectParticle(id);
  }

  const canRemove = $derived(
    (selectionState.nodeId && selectionState.nodeId !== 'root') ||
    selectionState.particleId !== null
  );
</script>

<div class="hierarchy-panel">
  <div class="panel-header">
    <span>Hierarchy</span>
    <div class="header-actions">
      <div class="add-menu-wrapper">
        <button class="header-btn" onclick={() => showAddMenu = !showAddMenu} title="Добавить ноду">+</button>
        {#if showAddMenu}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="add-menu">
            <button class="menu-item" onclick={() => addNode('container')}>Container</button>
            <button class="menu-item" onclick={() => addNode('sprite')}>Sprite</button>
            <button class="menu-item" onclick={() => addNode('spritesheet_anim')}>Spritesheet</button>
            <button class="menu-item" onclick={() => addNode('graphics')}>Graphics</button>
            <button class="menu-item" onclick={() => addNode('text')}>Text</button>
            <button class="menu-item" onclick={() => addNode('mesh')}>Mesh</button>
            <div class="menu-divider"></div>
            <button class="menu-item" onclick={addParticle}>Particle System</button>
          </div>
        {/if}
      </div>
      <button class="header-btn danger" disabled={!canRemove} onclick={removeSelected} title="Удалить выбранное">-</button>
    </div>
  </div>

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
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .header-actions {
    display: flex;
    gap: 2px;
  }

  .header-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: #aaa;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    padding: 0;
  }

  .header-btn:hover:not(:disabled) {
    background: #3a3a3a;
    border-color: #555;
    color: #fff;
  }

  .header-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .header-btn.danger:hover:not(:disabled) {
    background: #5a1d1d;
    border-color: #8b3333;
    color: #ff6b6b;
  }

  .add-menu-wrapper {
    position: relative;
  }

  .add-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 0;
    z-index: 100;
    min-width: 140px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 4px 12px;
    background: none;
    border: none;
    color: #ccc;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .menu-item:hover {
    background: #094771;
    color: #fff;
  }

  .menu-divider {
    height: 1px;
    background: #444;
    margin: 4px 0;
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
