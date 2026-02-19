<script lang="ts">
  import type { Keyframe, KeyframeProperty, EasingName, KeyframeMap } from '$lib/types/vanim';
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import EasingPicker from './EasingPicker.svelte';

  interface Props {
    nodeId: string;
    keyframes: KeyframeMap;
  }

  let { nodeId, keyframes }: Props = $props();

  const ANIMATABLE_PROPS: KeyframeProperty[] = ['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotation', 'alpha', 'tint'];

  const tracks = $derived(
    Object.entries(keyframes)
      .filter(([_, kfs]) => kfs && kfs.length > 0)
      .map(([prop, kfs]) => ({ prop: prop as KeyframeProperty, kfs: kfs! }))
  );

  function updateKeyframe(prop: KeyframeProperty, index: number, updates: Partial<Keyframe>) {
    historyState.push(`Edit kf ${prop}[${index}]`);
    projectState.updateNode(nodeId, (node) => {
      const kfMap = { ...node.keyframes };
      const track = [...(kfMap[prop] ?? [])];
      track[index] = { ...track[index], ...updates };
      kfMap[prop] = track;
      return { ...node, keyframes: kfMap };
    });
  }

  function removeKeyframe(prop: KeyframeProperty, index: number) {
    historyState.push(`Remove kf ${prop}[${index}]`);
    projectState.updateNode(nodeId, (node) => {
      const kfMap = { ...node.keyframes };
      const track = [...(kfMap[prop] ?? [])];
      track.splice(index, 1);
      if (track.length === 0) {
        delete kfMap[prop];
      } else {
        kfMap[prop] = track;
      }
      return { ...node, keyframes: kfMap };
    });
  }

  function addKeyframe(prop: KeyframeProperty) {
    const existing = keyframes[prop] ?? [];
    const lastTime = existing.length > 0 ? existing[existing.length - 1].time : 0;
    const lastValue = existing.length > 0 ? existing[existing.length - 1].value : 0;
    const newTime = lastTime + 100;
    const newKf: Keyframe = { time: newTime, value: lastValue };

    historyState.push(`Add kf ${prop}`);
    projectState.updateNode(nodeId, (node) => {
      const kfMap = { ...node.keyframes };
      kfMap[prop] = [...(kfMap[prop] ?? []), newKf];
      return { ...node, keyframes: kfMap };
    });
  }

  function addTrack(prop: KeyframeProperty) {
    historyState.push(`Add track ${prop}`);
    projectState.updateNode(nodeId, (node) => {
      const kfMap = { ...(node.keyframes ?? {}) };
      kfMap[prop] = [{ time: 0, value: 0 }];
      return { ...node, keyframes: kfMap };
    });
  }

  // Свойства, для которых ещё нет треков
  const availableProps = $derived(
    ANIMATABLE_PROPS.filter((p) => !keyframes[p] || keyframes[p]!.length === 0)
  );

  let showAddTrack = $state(false);
</script>

<div class="keyframe-editor">
  <div class="section-header">
    <span>Keyframes</span>
    <div class="add-track-wrapper">
      <button class="small-btn" onclick={() => showAddTrack = !showAddTrack}>+ Track</button>
      {#if showAddTrack && availableProps.length > 0}
        <div class="dropdown">
          {#each availableProps as prop}
            <button class="dropdown-item" onclick={() => { addTrack(prop); showAddTrack = false; }}>{prop}</button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#each tracks as { prop, kfs }}
    <div class="track-section">
      <div class="track-header">
        <span class="track-name">{prop}</span>
        <button class="small-btn" onclick={() => addKeyframe(prop)}>+ kf</button>
      </div>

      {#each kfs as kf, i}
        <div class="kf-row" class:selected={selectionState.keyframeProp === prop && selectionState.keyframeIndex === i}>
          <div class="kf-fields">
            <span class="kf-label">t:</span>
            <input
              type="number"
              class="kf-input"
              value={kf.time}
              onchange={(e) => updateKeyframe(prop, i, { time: parseFloat((e.target as HTMLInputElement).value) || 0 })}
            />
            <span class="kf-label">v:</span>
            <input
              type={typeof kf.value === 'string' ? 'text' : 'number'}
              class="kf-input"
              step="0.1"
              value={kf.value}
              onchange={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                const val = typeof kf.value === 'string' ? raw : (parseFloat(raw) || 0);
                updateKeyframe(prop, i, { value: val });
              }}
            />
          </div>
          <div class="kf-actions">
            <EasingPicker
              value={kf.easing ?? 'linear'}
              onchange={(easing) => updateKeyframe(prop, i, { easing })}
            />
            <button class="remove-btn" onclick={() => removeKeyframe(prop, i)} title="Удалить keyframe">x</button>
          </div>
        </div>
      {/each}
    </div>
  {/each}

  {#if tracks.length === 0}
    <div class="empty">Нет keyframes. Нажмите "+ Track" чтобы добавить.</div>
  {/if}
</div>

<style>
  .keyframe-editor {
    padding: 4px 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
  }

  .add-track-wrapper {
    position: relative;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 0;
    z-index: 100;
    min-width: 100px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 3px 10px;
    background: none;
    border: none;
    color: #ccc;
    font-size: 11px;
    font-family: monospace;
    text-align: left;
    cursor: pointer;
  }

  .dropdown-item:hover {
    background: #094771;
    color: #fff;
  }

  .small-btn {
    padding: 1px 6px;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 3px;
    color: #aaa;
    font-size: 10px;
    cursor: pointer;
  }

  .small-btn:hover {
    background: #3a3a3a;
    border-color: #555;
    color: #fff;
  }

  .track-section {
    border-top: 1px solid #2a2a2a;
    padding: 2px 0;
  }

  .track-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 10px;
  }

  .track-name {
    font-size: 11px;
    font-family: monospace;
    color: #4ec9b0;
    font-weight: 600;
  }

  .kf-row {
    padding: 2px 10px 2px 20px;
    border-left: 2px solid transparent;
  }

  .kf-row.selected {
    border-left-color: #e8a848;
    background: rgba(232, 168, 72, 0.05);
  }

  .kf-fields {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }

  .kf-label {
    font-size: 10px;
    color: #666;
    font-family: monospace;
  }

  .kf-input {
    width: 60px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    padding: 1px 4px;
    font-size: 11px;
    font-family: monospace;
  }

  .kf-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .kf-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .remove-btn {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid transparent;
    border-radius: 3px;
    color: #666;
    cursor: pointer;
    font-size: 10px;
    padding: 0;
  }

  .remove-btn:hover {
    background: #5a1d1d;
    border-color: #8b3333;
    color: #ff6b6b;
  }

  .empty {
    padding: 8px 10px;
    font-size: 11px;
    color: #555;
  }
</style>
