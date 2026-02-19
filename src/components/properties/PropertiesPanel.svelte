<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import KeyframeEditor from './KeyframeEditor.svelte';
  import ParticleConfigurator from './ParticleConfigurator.svelte';

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

  function handleSelectInput(prop: string, e: Event) {
    updateNodeProp(prop, (e.target as HTMLSelectElement).value);
  }

  const numericProps: { key: string; label: string; step?: number }[] = [
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'scaleX', label: 'Scale X', step: 0.1 },
    { key: 'scaleY', label: 'Scale Y', step: 0.1 },
    { key: 'rotation', label: 'Rotation', step: 0.1 },
    { key: 'alpha', label: 'Alpha', step: 0.1 },
    { key: 'anchorX', label: 'Anchor X', step: 0.1 },
    { key: 'anchorY', label: 'Anchor Y', step: 0.1 },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' },
    { key: 'startTime', label: 'Start (ms)' },
    { key: 'duration', label: 'Duration (ms)' },
  ];
</script>

<div class="properties-panel">
  <div class="panel-header">Properties</div>

  <div class="content">
    {#if selectedNode}
      <div class="section">
        <div class="section-title">Node: {selectedNode.id}</div>
        <div class="field">
          <span class="field-label">Type</span>
          <span class="type-badge">{selectedNode.type}</span>
        </div>
        <div class="field">
          <span class="field-label">Blend</span>
          <select
            value={selectedNode.blendMode ?? 'normal'}
            onchange={(e) => handleSelectInput('blendMode', e)}
          >
            <option value="normal">normal</option>
            <option value="add">add</option>
            <option value="multiply">multiply</option>
            <option value="screen">screen</option>
          </select>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Transform</div>
        {#each numericProps as prop}
          {@const value = (selectedNode as any)[prop.key]}
          {#if value !== undefined || ['x', 'y', 'alpha'].includes(prop.key)}
            <div class="field">
              <span class="field-label">{prop.label}</span>
              <input
                type="number"
                step={prop.step ?? 1}
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
            <span class="field-label">Content</span>
            <input
              type="text"
              value={(selectedNode as any).text ?? ''}
              onchange={(e) => handleStringInput('text', e)}
            />
          </div>
        </div>
      {/if}

      <div class="section">
        <KeyframeEditor nodeId={selectedNode.id} keyframes={selectedNode.keyframes ?? {}} />
      </div>

    {:else if selectedParticle}
      <ParticleConfigurator particle={selectedParticle} />

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

  .field-label {
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

  .field select {
    flex: 1;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    padding: 2px 4px;
    font-size: 11px;
  }

  .type-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #333;
    color: #aaa;
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
