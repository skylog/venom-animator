// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import PropertiesPanel from './PropertiesPanel.svelte';
import { projectState } from '$lib/state/project.svelte';
import { selectionState } from '$lib/state/selection.svelte';
import { historyState } from '$lib/state/history.svelte';

describe('PropertiesPanel', () => {
  beforeEach(() => {
    projectState.newDocument();
    selectionState.clear();
    historyState.clear();
  });

  it('рендерится с заголовком', () => {
    render(PropertiesPanel);
    expect(screen.getByText('Properties')).toBeTruthy();
  });

  it('показывает пустое состояние без выделения', () => {
    render(PropertiesPanel);
    expect(screen.getByText('Выберите ноду или частицу')).toBeTruthy();
  });

  it('показывает свойства выделенной container-ноды', async () => {
    selectionState.selectNode('root');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Node: root')).toBeTruthy();
    expect(screen.getByText('container')).toBeTruthy();
  });

  it('показывает свойства sprite-ноды', async () => {
    projectState.addNode({ id: 'hero', type: 'sprite', asset: 'hero.png', x: 100, y: 200 });
    selectionState.selectNode('hero');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Node: hero')).toBeTruthy();
    expect(screen.getByText('sprite')).toBeTruthy();
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('Y')).toBeTruthy();
  });

  it('показывает text content для text-ноды', async () => {
    projectState.addNode({
      id: 'label',
      type: 'text',
      text: 'Hello',
      x: 0, y: 0,
      anchorX: 0.5, anchorY: 0.5,
      style: { fontSize: 24, fill: '#fff' },
    });
    selectionState.selectNode('label');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('text')).toBeTruthy();
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('показывает transform поля', async () => {
    projectState.addNode({ id: 's1', type: 'sprite', asset: '', x: 50, y: 75 });
    selectionState.selectNode('s1');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Transform')).toBeTruthy();
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('Y')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });

  it('показывает blendMode select', async () => {
    projectState.addNode({ id: 'g1', type: 'graphics', graphics: { type: 'circle', cx: 0, cy: 0, radius: 50, fill: { color: '#fff' } } });
    selectionState.selectNode('g1');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText('Blend')).toBeTruthy();
  });

  it('показывает ParticleConfigurator для частицы', async () => {
    projectState.addParticle({
      id: 'p1',
      startTime: 0,
      mode: 'burst',
      x: 256,
      y: 256,
      config: {
        count: 10,
        lifetime: 500,
        speed: { min: 1, max: 5 },
        size: { min: 1, max: 3 },
        color: '#FFD700',
        alpha: { start: 1, end: 0 },
        direction: { min: 0, max: 6.28 },
        gravity: 0,
        blendMode: 'add',
      },
    });
    selectionState.selectParticle('p1');
    render(PropertiesPanel);
    await new Promise((r) => setTimeout(r, 0));

    // ParticleConfigurator должен рендериться
    expect(screen.queryByText('Выберите ноду или частицу')).toBeNull();
  });
});
