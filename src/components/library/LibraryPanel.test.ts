// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LibraryPanel from './LibraryPanel.svelte';

// Мокаем sql.js — не нужен WASM в тестах
vi.mock('$lib/library/db', () => ({
  initDB: vi.fn().mockResolvedValue({}),
}));

vi.mock('$lib/library/library-manager', () => ({
  searchAnimations: vi.fn().mockReturnValue([]),
  searchTemplates: vi.fn().mockReturnValue([]),
  searchAssets: vi.fn().mockReturnValue([]),
  saveAnimation: vi.fn(),
  deleteAnimation: vi.fn(),
  updateAnimation: vi.fn(),
  deleteTemplate: vi.fn(),
  deleteAsset: vi.fn(),
  getLibraryStats: vi.fn().mockReturnValue({ animations: 0, assets: 0, templates: 0, tags: 0 }),
  getAllTags: vi.fn().mockReturnValue([]),
}));

describe('LibraryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('рендерится с заголовком Library', () => {
    render(LibraryPanel);
    expect(screen.getByText('Library')).toBeTruthy();
  });

  it('показывает кнопку + Save', () => {
    render(LibraryPanel);
    expect(screen.getByText('+ Save')).toBeTruthy();
  });

  it('показывает поле поиска', () => {
    render(LibraryPanel);
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('показывает табы Animations, Templates, Assets', () => {
    render(LibraryPanel);
    expect(screen.getByText(/Animations/)).toBeTruthy();
    expect(screen.getByText(/Templates/)).toBeTruthy();
    expect(screen.getByText(/Assets/)).toBeTruthy();
  });

  it('переключение на Templates таб', async () => {
    render(LibraryPanel);
    const templatesTab = screen.getByText(/Templates/);
    await fireEvent.click(templatesTab);

    // После initDB загрузится пустой список
    await new Promise((r) => setTimeout(r, 50));
  });

  it('переключение на Assets таб', async () => {
    render(LibraryPanel);
    const assetsTab = screen.getByText(/Assets/);
    await fireEvent.click(assetsTab);
    await new Promise((r) => setTimeout(r, 50));
  });
});
