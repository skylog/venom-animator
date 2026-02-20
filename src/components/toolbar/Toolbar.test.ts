// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Toolbar from './Toolbar.svelte';
import { projectState } from '$lib/state/project.svelte';
import { historyState } from '$lib/state/history.svelte';

// Мокаем io модуль (File System Access API не доступен в тестах)
vi.mock('$lib/io/save-load', () => ({
  openVanimFile: vi.fn().mockResolvedValue(null),
  saveVanimFile: vi.fn().mockResolvedValue(null),
}));

describe('Toolbar', () => {
  beforeEach(() => {
    projectState.newDocument();
    historyState.clear();
  });

  it('рендерится с кнопками', () => {
    render(Toolbar);
    expect(screen.getByTitle('Новый документ')).toBeTruthy();
    expect(screen.getByTitle('Открыть .vanim')).toBeTruthy();
    expect(screen.getByTitle('Сохранить .vanim')).toBeTruthy();
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.getByText('Redo')).toBeTruthy();
  });

  it('показывает имя проекта', () => {
    render(Toolbar);
    expect(screen.getByText('untitled')).toBeTruthy();
  });

  it('показывает мета-информацию (duration, size)', () => {
    render(Toolbar);
    expect(screen.getByText('1000ms | 512x512')).toBeTruthy();
  });

  it('Undo/Redo отключены без истории', () => {
    render(Toolbar);
    const undoBtn = screen.getByText('Undo');
    const redoBtn = screen.getByText('Redo');
    expect(undoBtn.hasAttribute('disabled')).toBe(true);
    expect(redoBtn.hasAttribute('disabled')).toBe(true);
  });

  it('Undo становится активным после push в историю', async () => {
    render(Toolbar);
    historyState.push('test action');
    projectState.updateNode('root', (n) => ({ ...n, id: 'root' }));

    // Svelte реактивность — ждём следующий тик
    await new Promise((r) => setTimeout(r, 0));
    const undoBtn = screen.getByText('Undo');
    expect(undoBtn.hasAttribute('disabled')).toBe(false);
  });

  it('клик "Новый" сбрасывает документ', async () => {
    // Сначала поменяем имя
    projectState.setDocument({ ...projectState.document, name: 'changed' });

    // Мокаем confirm чтобы не заблокировало
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(Toolbar);
    const newBtn = screen.getByTitle('Новый документ');
    await fireEvent.click(newBtn);

    expect(projectState.document.name).toBe('untitled');
  });

  it('показывает индикатор dirty', async () => {
    render(Toolbar);
    projectState.dirty = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('*')).toBeTruthy();
  });
});
