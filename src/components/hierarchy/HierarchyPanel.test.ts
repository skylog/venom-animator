// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HierarchyPanel from './HierarchyPanel.svelte';
import { projectState } from '$lib/state/project.svelte';
import { selectionState } from '$lib/state/selection.svelte';
import { historyState } from '$lib/state/history.svelte';

describe('HierarchyPanel', () => {
  beforeEach(() => {
    projectState.newDocument();
    selectionState.clear();
    historyState.clear();
  });

  it('рендерится с заголовком', () => {
    render(HierarchyPanel);
    expect(screen.getByText('Hierarchy')).toBeTruthy();
  });

  it('показывает root-ноду', () => {
    render(HierarchyPanel);
    expect(screen.getByText('root')).toBeTruthy();
  });

  it('показывает кнопку добавления (+)', () => {
    render(HierarchyPanel);
    expect(screen.getByTitle('Добавить ноду')).toBeTruthy();
  });

  it('кнопка удаления отключена без выделения', () => {
    render(HierarchyPanel);
    const delBtn = screen.getByTitle('Удалить выбранное');
    expect(delBtn.hasAttribute('disabled')).toBe(true);
  });

  it('клик по + открывает меню добавления', async () => {
    render(HierarchyPanel);
    const addBtn = screen.getByTitle('Добавить ноду');
    await fireEvent.click(addBtn);

    expect(screen.getByText('Container')).toBeTruthy();
    expect(screen.getByText('Sprite')).toBeTruthy();
    expect(screen.getByText('Spritesheet')).toBeTruthy();
    expect(screen.getByText('Graphics')).toBeTruthy();
    expect(screen.getByText('Text')).toBeTruthy();
    expect(screen.getByText('Particle System')).toBeTruthy();
  });

  it('добавление Container ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Container'));

    const nodes = projectState.nodes;
    const containerNode = nodes.find((n) => n.type === 'container' && n.id !== 'root');
    expect(containerNode).toBeTruthy();
    expect(containerNode!.id).toContain('container-');
  });

  it('добавление Sprite ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Sprite'));

    const spriteNode = projectState.nodes.find((n) => n.type === 'sprite');
    expect(spriteNode).toBeTruthy();
    expect(spriteNode!.id).toContain('sprite-');
  });

  it('добавление Graphics ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Graphics'));

    const gfxNode = projectState.nodes.find((n) => n.type === 'graphics');
    expect(gfxNode).toBeTruthy();
  });

  it('добавление Text ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Text'));

    const textNode = projectState.nodes.find((n) => n.type === 'text');
    expect(textNode).toBeTruthy();
  });

  it('добавление Spritesheet ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Spritesheet'));

    const sheetNode = projectState.nodes.find((n) => n.type === 'spritesheet_anim');
    expect(sheetNode).toBeTruthy();
  });

  it('добавление Particle System', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Particle System'));

    const particles = projectState.particles;
    expect(particles.length).toBe(1);
    expect(particles[0].mode).toBe('burst');
  });

  it('выделение ноды через клик', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByText('root'));
    expect(selectionState.nodeId).toBe('root');
  });

  it('удаление выделенной ноды', async () => {
    // Добавим спрайт
    projectState.addNode({ id: 'test-sprite', type: 'sprite', asset: '', x: 0, y: 0 });
    selectionState.selectNode('test-sprite');

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(HierarchyPanel);
    await new Promise((r) => setTimeout(r, 0));

    const delBtn = screen.getByTitle('Удалить выбранное');
    expect(delBtn.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(delBtn);

    expect(projectState.getNodeById('test-sprite')).toBeUndefined();
    expect(selectionState.nodeId).toBeNull();
  });

  it('новая нода добавляется в children root', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    await fireEvent.click(screen.getByText('Sprite'));

    const root = projectState.getNodeById('root')!;
    expect(root.type).toBe('container');
    expect((root as any).children.length).toBeGreaterThan(0);
  });

  it('меню закрывается после выбора типа ноды', async () => {
    render(HierarchyPanel);
    await fireEvent.click(screen.getByTitle('Добавить ноду'));
    expect(screen.getByText('Container')).toBeTruthy();

    await fireEvent.click(screen.getByText('Sprite'));
    // Меню должно закрыться — Container не должен быть видимым
    expect(screen.queryByText('Container')).toBeNull();
  });
});
