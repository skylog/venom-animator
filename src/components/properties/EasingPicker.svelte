<script lang="ts">
  import type { EasingName } from '$lib/types/vanim';
  import { getEasing } from '$lib/types/easing';

  interface Props {
    value: EasingName;
    onchange: (easing: EasingName) => void;
  }

  let { value, onchange }: Props = $props();
  let open = $state(false);

  const easings: EasingName[] = [
    'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
    'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
    'easeOutBack', 'easeInOutSine', 'spring',
  ];

  // Генерация SVG path для кривой easing
  function generateCurvePath(name: EasingName): string {
    const fn = getEasing(name);
    const points: string[] = [];
    const w = 40;
    const h = 28;
    const padding = 2;
    const drawW = w - padding * 2;
    const drawH = h - padding * 2;

    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const v = fn(t);
      const x = padding + t * drawW;
      // Clamp для easeOutBack/spring которые выходят за [0,1]
      const y = padding + (1 - Math.max(-0.2, Math.min(1.2, v))) * drawH;
      points.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
    }

    return points.join(' ');
  }

  function select(name: EasingName) {
    open = false;
    onchange(name);
  }
</script>

<div class="easing-picker">
  <button class="easing-current" onclick={() => open = !open}>
    <svg width="40" height="28" viewBox="0 0 40 28">
      <path d={generateCurvePath(value)} fill="none" stroke="#4ec9b0" stroke-width="1.5" />
    </svg>
    <span class="easing-name">{value}</span>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="easing-dropdown">
      {#each easings as name}
        <button
          class="easing-option"
          class:selected={name === value}
          onclick={() => select(name)}
        >
          <svg width="40" height="28" viewBox="0 0 40 28">
            <path d={generateCurvePath(name)} fill="none" stroke={name === value ? '#4ec9b0' : '#888'} stroke-width="1.5" />
          </svg>
          <span>{name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .easing-picker {
    position: relative;
  }

  .easing-current {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    cursor: pointer;
    font-size: 11px;
  }

  .easing-current:hover {
    border-color: #555;
  }

  .easing-name {
    font-family: monospace;
    font-size: 10px;
  }

  .easing-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px;
    z-index: 100;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    min-width: 280px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }

  .easing-option {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    background: none;
    border: 1px solid transparent;
    border-radius: 3px;
    color: #aaa;
    cursor: pointer;
    font-size: 10px;
    font-family: monospace;
    text-align: left;
  }

  .easing-option:hover {
    background: #3a3a3a;
    border-color: #555;
    color: #fff;
  }

  .easing-option.selected {
    background: #094771;
    border-color: #007acc;
    color: #4ec9b0;
  }

  svg {
    flex-shrink: 0;
    background: rgba(0,0,0,0.2);
    border-radius: 2px;
  }
</style>
