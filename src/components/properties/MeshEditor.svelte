<script lang="ts">
  import type { MeshNode, MeshVertex } from '$lib/types/vanim';
  import { projectState } from '$lib/state/project.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { generateGrid, applyPreset, type MeshPreset } from '$lib/preview/MeshUtils';

  interface Props {
    node: MeshNode;
  }
  let { node }: Props = $props();

  let gridCols = $state(4);
  let gridRows = $state(4);

  function updateVertices(vertices: MeshVertex[], indices?: number[]) {
    historyState.push('Edit mesh vertices');
    projectState.updateNode(node.id, (n) => ({
      ...n,
      vertices,
      ...(indices !== undefined ? { indices } : {}),
    }));
  }

  function handleRegenerate() {
    const w = node.width ?? 128;
    const h = node.height ?? 128;
    const grid = generateGrid(gridCols, gridRows, w, h);
    updateVertices(grid.vertices, grid.indices);
  }

  function handlePreset(preset: MeshPreset) {
    const w = node.width ?? 128;
    const h = node.height ?? 128;
    const defaults: Record<MeshPreset, any> = {
      wave: { amplitude: 15, frequency: 2, phase: 0 },
      bulge: { strength: 0.3, radius: 0.8 },
      twist: { angle: 0.5 },
      bend: { amount: 30 },
    };
    const deformed = applyPreset(preset, node.vertices, w, h, defaults[preset]);
    updateVertices(deformed);
  }

  function handleVertexChange(index: number, axis: 'x' | 'y', e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(val)) return;
    const newVertices = node.vertices.map((v, i) =>
      i === index ? { ...v, [axis]: val } : v,
    );
    updateVertices(newVertices);
  }
</script>

<div class="mesh-editor">
  <div class="section-title">Mesh ({node.vertices.length} vertices)</div>

  <div class="field">
    <span class="field-label">Asset</span>
    <span class="asset-id">{node.asset || '(none)'}</span>
  </div>

  <div class="subsection">
    <div class="sub-label">Grid Generator</div>
    <div class="grid-controls">
      <label>
        Cols
        <input type="number" min="1" max="20" bind:value={gridCols} />
      </label>
      <label>
        Rows
        <input type="number" min="1" max="20" bind:value={gridRows} />
      </label>
      <button class="action-btn" onclick={handleRegenerate}>Generate</button>
    </div>
  </div>

  <div class="subsection">
    <div class="sub-label">Presets</div>
    <div class="preset-btns">
      <button class="preset-btn" onclick={() => handlePreset('wave')}>Wave</button>
      <button class="preset-btn" onclick={() => handlePreset('bulge')}>Bulge</button>
      <button class="preset-btn" onclick={() => handlePreset('twist')}>Twist</button>
      <button class="preset-btn" onclick={() => handlePreset('bend')}>Bend</button>
    </div>
  </div>

  <div class="subsection">
    <div class="sub-label">Vertices</div>
    <div class="vertex-list">
      {#each node.vertices.slice(0, 25) as v, i}
        <div class="vertex-row">
          <span class="v-idx">{i}</span>
          <input
            type="number"
            step="1"
            value={v.x.toFixed(1)}
            onchange={(e) => handleVertexChange(i, 'x', e)}
            title="X"
          />
          <input
            type="number"
            step="1"
            value={v.y.toFixed(1)}
            onchange={(e) => handleVertexChange(i, 'y', e)}
            title="Y"
          />
        </div>
      {/each}
      {#if node.vertices.length > 25}
        <div class="more-vertices">...{node.vertices.length - 25} more</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .mesh-editor {
    padding: 0;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    margin-bottom: 4px;
    padding: 2px 0;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    font-size: 12px;
  }

  .field-label {
    width: 70px;
    color: #888;
    font-size: 11px;
    flex-shrink: 0;
  }

  .asset-id {
    color: #666;
    font-size: 11px;
    font-style: italic;
  }

  .subsection {
    margin-top: 6px;
  }

  .sub-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
    margin-bottom: 4px;
  }

  .grid-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .grid-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #888;
  }

  .grid-controls input {
    width: 40px;
    padding: 2px 4px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
    font-family: monospace;
  }

  .grid-controls input:focus {
    outline: none;
    border-color: #007acc;
  }

  .action-btn {
    padding: 2px 8px;
    background: #094771;
    border: 1px solid #007acc;
    border-radius: 3px;
    color: #4ec9b0;
    font-size: 10px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: #0d5a8f;
  }

  .preset-btns {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .preset-btn {
    padding: 2px 8px;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 3px;
    color: #ccc;
    font-size: 10px;
    cursor: pointer;
  }

  .preset-btn:hover {
    background: #3a3a3a;
    color: #fff;
  }

  .vertex-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .vertex-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 0;
  }

  .v-idx {
    width: 20px;
    font-size: 9px;
    color: #555;
    text-align: right;
    font-family: monospace;
  }

  .vertex-row input {
    width: 50px;
    padding: 1px 4px;
    background: #2d2d2d;
    border: 1px solid #333;
    border-radius: 2px;
    color: #aaa;
    font-size: 10px;
    font-family: monospace;
  }

  .vertex-row input:focus {
    outline: none;
    border-color: #007acc;
    color: #ccc;
  }

  .more-vertices {
    font-size: 10px;
    color: #555;
    padding: 2px 0;
    text-align: center;
  }
</style>
