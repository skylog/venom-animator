<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import type { VanimNode, VanimParticle, KeyframeProperty } from '$lib/types/vanim';

  const selectedNode = $derived(
    selectionState.nodeId ? projectState.getNodeById(selectionState.nodeId) : undefined
  );

  const selectedParticle = $derived(
    selectionState.particleId
      ? projectState.particles.find((p) => p.id === selectionState.particleId)
      : undefined
  );

  function updateNodeProp(prop: string, value: number | string) {
    if (!selectionState.nodeId) return;
    historyState.push(`Edit ${prop}`);
    projectState.updateNode(selectionState.nodeId, (node) => ({
      ...node,
      [prop]: value,
    }));
  }

  function handleNumberInput(prop: string, e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) updateNodeProp(prop, val);
  }

  function handleStringInput(prop: string, e: Event) {
    updateNodeProp(prop, (e.target as HTMLInputElement).value);
  }

  // Свойства для отображения в зависимости от типа ноды
  const numericProps: { key: string; label: string }[] = [
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'scaleX', label: 'Scale X' },
    { key: 'scaleY', label: 'Scale Y' },
    { key: 'rotation', label: 'Rotation' },
    { key: 'alpha', label: 'Alpha' },
    { key: 'anchorX', label: 'Anchor X' },
    { key: 'anchorY', label: 'Anchor Y' },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'startTime', label: 'Start (ms)' },
    { key: 'duration', label: 'Duration (ms)' },
  ];

  const keyframeProps = $derived(
    selectedNode?.keyframes ? Object.keys(selectedNode.keyframes) as KeyframeProperty[] : []
  );
</script>

<div class="properties-panel">
  <div class="panel-header">Properties</div>

  <div class="content">
    {#if selectedNode}
      <div class="section">
        <div class="section-title">Node: {selectedNode.id}</div>
        <div class="field">
          <label>Type</label>
          <span class="type-badge">{selectedNode.type}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Transform</div>
        {#each numericProps as prop}
          {@const value = (selectedNode as any)[prop.key]}
          {#if value !== undefined || ['x', 'y', 'alpha'].includes(prop.key)}
            <div class="field">
              <label>{prop.label}</label>
              <input
                type="number"
                step={prop.key.includes('scale') || prop.key.includes('alpha') || prop.key.includes('anchor') ? '0.1' : '1'}
                value={value ?? (prop.key === 'alpha' ? 1 : 0)}
                onchange={(e) => handleNumberInput(prop.key, e)}
              />
            </div>
          {/if}
        {/each}
      </div>

      {#if selectedNode.type === 'text'}
        <div class="section">
          <div class="section-title">Text</div>
          <div class="field">
            <label>Content</label>
            <input
              type="text"
              value={(selectedNode as any).text ?? ''}
              onchange={(e) => handleStringInput('text', e)}
            />
          </div>
        </div>
      {/if}

      {#if keyframeProps.length > 0}
        <div class="section">
          <div class="section-title">Keyframes</div>
          {#each keyframeProps as prop}
            {@const kfs = selectedNode!.keyframes![prop]!}
            <div class="keyframe-track">
              <span class="kf-prop">{prop}</span>
              <span class="kf-count">{kfs.length} kf</span>
            </div>
          {/each}
        </div>
      {/if}

    {:else if selectedParticle}
      <div class="section">
        <div class="section-title">Particle: {selectedParticle.id}</div>
        <div class="field">
          <label>Mode</label>
          <span class="type-badge">{selectedParticle.mode}</span>
        </div>
        <div class="field">
          <label>X</label>
          <span>{selectedParticle.x}</span>
        </div>
        <div class="field">
          <label>Y</label>
          <span>{selectedParticle.y}</span>
        </div>
        <div class="field">
          <label>Start</label>
          <span>{selectedParticle.startTime}ms</span>
        </div>
        <div class="field">
          <label>Count</label>
          <span>{selectedParticle.config.count}</span>
        </div>
        <div class="field">
          <label>Lifetime</label>
          <span>{selectedParticle.config.lifetime}ms</span>
        </div>
        <div class="field">
          <label>Color</label>
          <span class="color-swatch" style="background: {selectedParticle.config.color}"></span>
          <span>{selectedParticle.config.color}</span>
        </div>
      </div>

    {:else}
      <div class="empty-state">
        Выберите ноду или частицу
      </div>
    {/if}
  </div>
</div>

<style>
  .properties-panel {
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

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .section {
    padding: 4px 10px;
    border-bottom: 1px solid #2a2a2a;
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

  .field label {
    width: 70px;
    color: #888;
    font-size: 11px;
    flex-shrink: 0;
  }

  .field input[type='number'],
  .field input[type='text'] {
    flex: 1;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    padding: 2px 6px;
    font-size: 12px;
    font-family: monospace;
  }

  .field input:focus {
    outline: none;
    border-color: #007acc;
  }

  .type-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #333;
    color: #aaa;
  }

  .keyframe-track {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    font-size: 12px;
  }

  .kf-prop {
    color: #ccc;
    font-family: monospace;
    font-size: 11px;
  }

  .kf-count {
    margin-left: auto;
    color: #666;
    font-size: 10px;
  }

  .color-swatch {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid #555;
    flex-shrink: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #555;
    font-size: 12px;
  }
</style>
