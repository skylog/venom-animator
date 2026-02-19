<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import type { VanimParticle, ParticleConfig } from '$lib/types/vanim';

  interface Props {
    particle: VanimParticle;
  }

  let { particle }: Props = $props();

  function updateParticle(updater: (p: VanimParticle) => VanimParticle, label: string) {
    if (!selectionState.particleId) return;
    historyState.push(label);
    const particles = projectState.particles.map((p) =>
      p.id === selectionState.particleId ? updater(p) : p
    );
    projectState.updateDocument((doc) => ({ ...doc, particles }));
  }

  function updateConfig(key: keyof ParticleConfig, value: any) {
    updateParticle((p) => ({
      ...p,
      config: { ...p.config, [key]: value },
    }), `Edit particle ${key}`);
  }

  function handleNumber(key: string, e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(val)) return;

    if (key === 'x' || key === 'y' || key === 'startTime') {
      updateParticle((p) => ({ ...p, [key]: val }), `Edit particle ${key}`);
    }
  }

  function handleConfigNumber(key: keyof ParticleConfig, e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) updateConfig(key, val);
  }

  function handleRange(key: 'speed' | 'size' | 'direction', field: 'min' | 'max', e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(val)) return;
    updateConfig(key, { ...particle.config[key], [field]: val });
  }

  function handleAlpha(field: 'start' | 'end', e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(val)) return;
    updateConfig('alpha', { ...particle.config.alpha, [field]: val });
  }
</script>

<div class="particle-config">
  <div class="section-title">Particle: {particle.id}</div>

  <div class="field">
    <span class="label">Mode</span>
    <select
      value={particle.mode}
      onchange={(e) => updateParticle((p) => ({ ...p, mode: (e.target as HTMLSelectElement).value as 'burst' | 'continuous' }), 'Change mode')}
    >
      <option value="burst">burst</option>
      <option value="continuous">continuous</option>
    </select>
  </div>

  <div class="field">
    <span class="label">X</span>
    <input type="number" value={particle.x} onchange={(e) => handleNumber('x', e)} />
  </div>

  <div class="field">
    <span class="label">Y</span>
    <input type="number" value={particle.y} onchange={(e) => handleNumber('y', e)} />
  </div>

  <div class="field">
    <span class="label">Start (ms)</span>
    <input type="number" value={particle.startTime} onchange={(e) => handleNumber('startTime', e)} />
  </div>

  <div class="sub-title">Config</div>

  <div class="field">
    <span class="label">Count</span>
    <input type="range" min="1" max="100" value={particle.config.count} oninput={(e) => handleConfigNumber('count', e)} />
    <span class="value">{particle.config.count}</span>
  </div>

  <div class="field">
    <span class="label">Lifetime</span>
    <input type="range" min="50" max="3000" step="50" value={particle.config.lifetime} oninput={(e) => handleConfigNumber('lifetime', e)} />
    <span class="value">{particle.config.lifetime}ms</span>
  </div>

  <div class="field">
    <span class="label">Speed</span>
    <input type="number" step="0.5" value={particle.config.speed.min} onchange={(e) => handleRange('speed', 'min', e)} />
    <span class="sep">-</span>
    <input type="number" step="0.5" value={particle.config.speed.max} onchange={(e) => handleRange('speed', 'max', e)} />
  </div>

  <div class="field">
    <span class="label">Size</span>
    <input type="number" step="0.5" value={particle.config.size.min} onchange={(e) => handleRange('size', 'min', e)} />
    <span class="sep">-</span>
    <input type="number" step="0.5" value={particle.config.size.max} onchange={(e) => handleRange('size', 'max', e)} />
  </div>

  <div class="field">
    <span class="label">Color</span>
    <input type="color" value={particle.config.color} onchange={(e) => updateConfig('color', (e.target as HTMLInputElement).value)} />
    <span class="value">{particle.config.color}</span>
  </div>

  <div class="field">
    <span class="label">Alpha</span>
    <input type="number" step="0.1" min="0" max="1" value={particle.config.alpha.start} onchange={(e) => handleAlpha('start', e)} />
    <span class="sep">-</span>
    <input type="number" step="0.1" min="0" max="1" value={particle.config.alpha.end} onchange={(e) => handleAlpha('end', e)} />
  </div>

  <div class="field">
    <span class="label">Gravity</span>
    <input type="range" min="-5" max="5" step="0.1" value={particle.config.gravity ?? 0} oninput={(e) => handleConfigNumber('gravity', e)} />
    <span class="value">{particle.config.gravity ?? 0}</span>
  </div>

  <div class="field">
    <span class="label">Blend</span>
    <select
      value={particle.config.blendMode ?? 'normal'}
      onchange={(e) => updateConfig('blendMode', (e.target as HTMLSelectElement).value)}
    >
      <option value="normal">normal</option>
      <option value="add">add</option>
      <option value="multiply">multiply</option>
      <option value="screen">screen</option>
    </select>
  </div>
</div>

<style>
  .particle-config {
    padding: 4px 10px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    margin-bottom: 4px;
  }

  .sub-title {
    font-size: 10px;
    font-weight: 600;
    color: #666;
    margin: 6px 0 2px;
    text-transform: uppercase;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    font-size: 12px;
  }

  .label {
    width: 60px;
    color: #888;
    font-size: 11px;
    flex-shrink: 0;
  }

  .field input[type='number'] {
    width: 60px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    padding: 2px 4px;
    font-size: 11px;
    font-family: monospace;
  }

  .field input[type='number']:focus {
    outline: none;
    border-color: #007acc;
  }

  .field input[type='range'] {
    flex: 1;
    height: 14px;
    accent-color: #4ec9b0;
  }

  .field input[type='color'] {
    width: 24px;
    height: 20px;
    border: 1px solid #444;
    border-radius: 3px;
    padding: 0;
    cursor: pointer;
    background: none;
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

  .sep {
    color: #555;
    font-size: 10px;
  }

  .value {
    color: #888;
    font-size: 10px;
    font-family: monospace;
    min-width: 40px;
  }
</style>
