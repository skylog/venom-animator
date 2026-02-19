<script lang="ts">
  import type { VanimNode, ContainerNode } from '$lib/types/vanim';
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import NodeItem from './NodeItem.svelte';

  interface Props {
    node: VanimNode;
    depth?: number;
  }

  let { node, depth = 0 }: Props = $props();

  let expanded = $state(true);

  const isSelected = $derived(selectionState.nodeId === node.id);

  const children = $derived(
    node.type === 'container' && (node as ContainerNode).children
      ? (node as ContainerNode).children!
          .map((id) => projectState.getNodeById(id))
          .filter((n): n is VanimNode => n !== undefined)
      : []
  );

  const typeIcons: Record<string, string> = {
    container: '\u25B8',  // ▸
    sprite: '\u25A0',     // ■
    spritesheet_anim: '\u25A3', // ▣
    graphics: '\u25C6',   // ◆
    text: 'T',
  };

  function handleClick() {
    selectionState.selectNode(node.id);
  }

  function toggleExpand(e: MouseEvent) {
    e.stopPropagation();
    expanded = !expanded;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="node-item" class:selected={isSelected} style="padding-left: {depth * 16 + 4}px" onclick={handleClick}>
  {#if children.length > 0}
    <button class="expand-btn" class:expanded onclick={toggleExpand}>
      {expanded ? '\u25BE' : '\u25B8'}
    </button>
  {:else}
    <span class="expand-spacer"></span>
  {/if}

  <span class="type-icon">{typeIcons[node.type] ?? '?'}</span>
  <span class="node-name">{node.id}</span>
</div>

{#if expanded && children.length > 0}
  {#each children as child (child.id)}
    <NodeItem node={child} depth={depth + 1} />
  {/each}
{/if}

<style>
  .node-item {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    cursor: pointer;
    font-size: 12px;
    color: #ccc;
    border-left: 2px solid transparent;
  }

  .node-item:hover {
    background: #2a2d2e;
  }

  .node-item.selected {
    background: #094771;
    border-left-color: #007acc;
  }

  .expand-btn {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 10px;
    padding: 0;
    flex-shrink: 0;
  }

  .expand-btn:hover {
    color: #ccc;
  }

  .expand-spacer {
    width: 16px;
    flex-shrink: 0;
  }

  .type-icon {
    color: #888;
    font-size: 10px;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .node-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
