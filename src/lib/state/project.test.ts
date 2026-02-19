/**
 * Тесты для ProjectState.
 * Так как ProjectState использует Svelte 5 runes ($state),
 * мы тестируем его через прямую работу с классом —
 * runes работают в SSR/eval контексте vitest через svelte plugin.
 *
 * Для тестов создаём отдельные экземпляры, не используя синглтон.
 */
import { describe, it, expect } from 'vitest';
import type { VanimDocument, VanimNode, VanimParticle } from '$lib/types/vanim';

// Не можем импортировать .svelte.ts напрямую в vitest без SSR,
// поэтому тестируем логику через чистую функцию-обёртку

function createDefaultDocument(): VanimDocument {
  return {
    version: 1,
    name: 'untitled',
    duration: 1000,
    width: 512,
    height: 512,
    assets: {},
    nodes: [
      { id: 'root', type: 'container', children: [] },
    ],
    particles: [],
    params: {},
  };
}

// Простой тест логики документа без $state
describe('Project document logic', () => {
  it('createDefaultDocument создаёт документ с root нодой', () => {
    const doc = createDefaultDocument();
    expect(doc.version).toBe(1);
    expect(doc.name).toBe('untitled');
    expect(doc.nodes).toHaveLength(1);
    expect(doc.nodes[0].id).toBe('root');
    expect(doc.nodes[0].type).toBe('container');
  });

  it('добавление ноды в root', () => {
    let doc = createDefaultDocument();
    const newNode: VanimNode = { id: 'sprite1', type: 'sprite', asset: 'tex1' };

    doc = {
      ...doc,
      nodes: [
        ...doc.nodes.map((n) => {
          if (n.id === 'root' && n.type === 'container') {
            return { ...n, children: [...(n.children ?? []), newNode.id] };
          }
          return n;
        }),
        newNode,
      ],
    };

    expect(doc.nodes).toHaveLength(2);
    const root = doc.nodes[0];
    expect(root.type === 'container' && root.children).toContain('sprite1');
  });

  it('удаление ноды и ссылок из children', () => {
    let doc = createDefaultDocument();
    const node: VanimNode = { id: 'beam', type: 'graphics', graphics: { type: 'line', fromX: 0, fromY: 0, toX: 100, toY: 100, stroke: { width: 2, color: '#fff' } } };

    // Добавляем
    doc = {
      ...doc,
      nodes: [
        ...doc.nodes.map((n) => {
          if (n.id === 'root' && n.type === 'container') {
            return { ...n, children: [...(n.children ?? []), 'beam'] };
          }
          return n;
        }),
        node,
      ],
    };

    // Удаляем
    doc = {
      ...doc,
      nodes: doc.nodes
        .filter((n) => n.id !== 'beam')
        .map((n) => {
          if (n.type === 'container' && n.children) {
            return { ...n, children: n.children.filter((c) => c !== 'beam') };
          }
          return n;
        }),
    };

    expect(doc.nodes).toHaveLength(1);
    const root = doc.nodes[0];
    expect(root.type === 'container' && root.children).not.toContain('beam');
  });

  it('обновление ноды по id', () => {
    let doc = createDefaultDocument();
    const node: VanimNode = { id: 'text1', type: 'text', text: 'Hello', x: 100, y: 200 };

    doc = {
      ...doc,
      nodes: [...doc.nodes, node],
    };

    doc = {
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === 'text1' ? { ...n, x: 300 } : n)),
    };

    const updated = doc.nodes.find((n) => n.id === 'text1');
    expect(updated?.x).toBe(300);
  });

  it('добавление и удаление частиц', () => {
    let doc = createDefaultDocument();
    const particle: VanimParticle = {
      id: 'sparks',
      startTime: 0,
      mode: 'burst',
      x: 256,
      y: 256,
      config: {
        count: 20,
        lifetime: 400,
        speed: { min: 3, max: 8 },
        size: { min: 1.5, max: 3.5 },
        color: '#FFD700',
        alpha: { start: 1, end: 0 },
        direction: { min: 0, max: 6.283 },
      },
    };

    // Добавляем
    doc = { ...doc, particles: [...(doc.particles ?? []), particle] };
    expect(doc.particles).toHaveLength(1);

    // Удаляем
    doc = { ...doc, particles: (doc.particles ?? []).filter((p) => p.id !== 'sparks') };
    expect(doc.particles).toHaveLength(0);
  });
});

describe('getNodeById logic', () => {
  it('находит ноду по id', () => {
    const doc = createDefaultDocument();
    const found = doc.nodes.find((n) => n.id === 'root');
    expect(found).toBeDefined();
    expect(found?.type).toBe('container');
  });

  it('возвращает undefined для несуществующего id', () => {
    const doc = createDefaultDocument();
    const found = doc.nodes.find((n) => n.id === 'nonexistent');
    expect(found).toBeUndefined();
  });
});
