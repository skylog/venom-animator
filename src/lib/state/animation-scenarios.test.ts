import { describe, it, expect, beforeEach } from 'vitest';
import { projectState } from './project.svelte';
import { selectionState } from './selection.svelte';
import { historyState } from './history.svelte';
import type {
  VanimDocument, VanimNode, ContainerNode, SpriteNode,
  SpritesheetAnimNode, GraphicsNode, TextNode, VanimParticle,
} from '$lib/types/vanim';

describe('Сценарии создания анимаций', () => {
  beforeEach(() => {
    projectState.newDocument();
    selectionState.clear();
    historyState.clear();
  });

  // --- Типы нод ---

  describe('Container нода', () => {
    it('создание пустого контейнера', () => {
      const node: ContainerNode = { id: 'group1', type: 'container', children: [] };
      projectState.addNode(node);

      const found = projectState.getNodeById('group1') as ContainerNode;
      expect(found).toBeTruthy();
      expect(found.type).toBe('container');
      expect(found.children).toEqual([]);
    });

    it('контейнер с вложенными нодами', () => {
      const parent: ContainerNode = { id: 'group1', type: 'container', children: [] };
      const child: SpriteNode = { id: 'hero', type: 'sprite', asset: 'hero.png', x: 0, y: 0 };

      projectState.addNode(parent);
      projectState.addNode(child, 'group1');

      const parentNode = projectState.getNodeById('group1') as ContainerNode;
      expect(parentNode.children).toContain('hero');
    });

    it('многоуровневая вложенность', () => {
      projectState.addNode({ id: 'level1', type: 'container', children: [] });
      projectState.addNode({ id: 'level2', type: 'container', children: [] }, 'level1');
      projectState.addNode({ id: 'leaf', type: 'sprite', asset: '', x: 0, y: 0 }, 'level2');

      const l1 = projectState.getNodeById('level1') as ContainerNode;
      const l2 = projectState.getNodeById('level2') as ContainerNode;
      expect(l1.children).toContain('level2');
      expect(l2.children).toContain('leaf');
    });
  });

  describe('Sprite нода', () => {
    it('создание с ассетом и позицией', () => {
      const node: SpriteNode = {
        id: 'hero',
        type: 'sprite',
        asset: 'hero.png',
        x: 100, y: 200,
        anchorX: 0.5, anchorY: 0.5,
        width: 64, height: 64,
      };
      projectState.addNode(node);

      const found = projectState.getNodeById('hero') as SpriteNode;
      expect(found.type).toBe('sprite');
      expect(found.asset).toBe('hero.png');
      expect(found.x).toBe(100);
      expect(found.y).toBe(200);
    });

    it('sprite с keyframes анимацией', () => {
      const node: SpriteNode = {
        id: 'coin',
        type: 'sprite',
        asset: 'coin.png',
        x: 256, y: 256,
        anchorX: 0.5, anchorY: 0.5,
        keyframes: {
          alpha: [
            { time: 0, value: 0 },
            { time: 200, value: 1, easing: 'easeOutCubic' },
            { time: 500, value: 0 },
          ],
          scale: [
            { time: 0, value: 0.5 },
            { time: 300, value: 1.2, easing: 'easeOutBack' },
            { time: 500, value: 1 },
          ],
        },
      };
      projectState.addNode(node);

      const found = projectState.getNodeById('coin') as SpriteNode;
      expect(found.keyframes!.alpha!.length).toBe(3);
      expect(found.keyframes!.scale!.length).toBe(3);
    });

    it('sprite с blendMode', () => {
      projectState.addNode({
        id: 'glow',
        type: 'sprite',
        asset: 'glow.png',
        x: 0, y: 0,
        blendMode: 'add',
      });
      expect(projectState.getNodeById('glow')!.blendMode).toBe('add');
    });
  });

  describe('SpritesheetAnim нода', () => {
    it('создание покадровой анимации', () => {
      const node: SpritesheetAnimNode = {
        id: 'explosion',
        type: 'spritesheet_anim',
        asset: 'explosion-sheet',
        x: 256, y: 256,
        anchorX: 0.5, anchorY: 0.5,
        width: 128, height: 128,
        startTime: 100,
        duration: 300,
      };
      projectState.addNode(node);

      const found = projectState.getNodeById('explosion') as SpritesheetAnimNode;
      expect(found.type).toBe('spritesheet_anim');
      expect(found.asset).toBe('explosion-sheet');
      expect(found.startTime).toBe(100);
      expect(found.duration).toBe(300);
    });
  });

  describe('Graphics нода', () => {
    it('создание circle', () => {
      const node: GraphicsNode = {
        id: 'dot',
        type: 'graphics',
        graphics: {
          type: 'circle',
          cx: 256, cy: 256,
          radius: 30,
          fill: { color: '#4ec9b0' },
        },
      };
      projectState.addNode(node);

      const found = projectState.getNodeById('dot') as GraphicsNode;
      expect(found.graphics.type).toBe('circle');
      expect((found.graphics as any).radius).toBe(30);
    });

    it('создание rect', () => {
      projectState.addNode({
        id: 'box',
        type: 'graphics',
        graphics: {
          type: 'rect',
          x: 100, y: 100, width: 200, height: 50,
          fill: { color: '#FF0000', alpha: 0.8 },
        },
      });

      const found = projectState.getNodeById('box') as GraphicsNode;
      expect(found.graphics.type).toBe('rect');
    });

    it('создание line с stroke', () => {
      projectState.addNode({
        id: 'beam',
        type: 'graphics',
        blendMode: 'add',
        graphics: {
          type: 'line',
          fromX: 256, fromY: 0, toX: 256, toY: 400,
          stroke: { width: 4, color: '#00C853', alpha: 0.9 },
        },
      });

      const found = projectState.getNodeById('beam') as GraphicsNode;
      expect(found.graphics.type).toBe('line');
      expect(found.blendMode).toBe('add');
    });

    it('создание roundRect', () => {
      projectState.addNode({
        id: 'panel',
        type: 'graphics',
        graphics: {
          type: 'roundRect',
          x: 50, y: 50, width: 300, height: 100, radius: 12,
          fill: { color: '#333', alpha: 0.9 },
        },
      });

      const found = projectState.getNodeById('panel') as GraphicsNode;
      expect(found.graphics.type).toBe('roundRect');
    });
  });

  describe('Text нода', () => {
    it('создание с текстом и стилем', () => {
      const node: TextNode = {
        id: 'title',
        type: 'text',
        text: 'MEGA WIN',
        x: 256, y: 128,
        anchorX: 0.5, anchorY: 0.5,
        style: { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 48, fill: '#FFD600' },
      };
      projectState.addNode(node);

      const found = projectState.getNodeById('title') as TextNode;
      expect(found.text).toBe('MEGA WIN');
      expect(found.style.fontSize).toBe(48);
    });

    it('text с runtime params (template variable)', () => {
      projectState.addNode({
        id: 'multiplier',
        type: 'text',
        text: '{{multiplierText}}',
        x: 256, y: 256,
        anchorX: 0.5, anchorY: 0.5,
        style: { fontSize: 40, fill: '#FFD600' },
      });

      const found = projectState.getNodeById('multiplier') as TextNode;
      expect(found.text).toBe('{{multiplierText}}');
    });
  });

  // --- Частицы ---

  describe('Particle System', () => {
    it('создание burst частиц', () => {
      const particle: VanimParticle = {
        id: 'sparks',
        startTime: 200,
        mode: 'burst',
        x: 256, y: 400,
        config: {
          count: 20,
          lifetime: 400,
          speed: { min: 3, max: 8 },
          size: { min: 1.5, max: 3.5 },
          color: '#FFD700',
          alpha: { start: 1, end: 0 },
          direction: { min: 0, max: 6.283 },
          gravity: 0,
          blendMode: 'add',
        },
      };
      projectState.addParticle(particle);

      const found = projectState.particles.find((p) => p.id === 'sparks');
      expect(found).toBeTruthy();
      expect(found!.mode).toBe('burst');
      expect(found!.config.count).toBe(20);
    });

    it('создание continuous частиц', () => {
      projectState.addParticle({
        id: 'rain',
        startTime: 0,
        mode: 'continuous',
        x: 256, y: 0,
        config: {
          count: 5,
          lifetime: 1000,
          speed: { min: 2, max: 4 },
          size: { min: 1, max: 2 },
          color: '#4488CC',
          alpha: { start: 0.8, end: 0 },
          direction: { min: 1.4, max: 1.7 }, // ~вниз
          gravity: 2,
          blendMode: 'normal',
        },
      });

      expect(projectState.particles[0].mode).toBe('continuous');
    });

    it('удаление частиц', () => {
      projectState.addParticle({
        id: 'temp',
        startTime: 0,
        mode: 'burst',
        x: 0, y: 0,
        config: { count: 1, lifetime: 100, speed: { min: 1, max: 1 }, size: { min: 1, max: 1 }, color: '#fff', alpha: { start: 1, end: 0 }, direction: { min: 0, max: 6.28 }, gravity: 0, blendMode: 'normal' },
      });
      expect(projectState.particles.length).toBe(1);

      projectState.removeParticle('temp');
      expect(projectState.particles.length).toBe(0);
    });
  });

  // --- Сценарии ---

  describe('Сценарий: Snake Strike VFX', () => {
    it('полная сборка анимации как в плане', () => {
      const doc: VanimDocument = {
        version: 1,
        name: 'snake-strike',
        duration: 500,
        width: 512, height: 512,
        assets: {
          'strike-flash': { type: 'spritesheet', path: './vfx/strike-flash.png', cols: 4, rows: 3 },
        },
        nodes: [
          { id: 'root', type: 'container', children: ['beam', 'flash', 'text_popup'] },
          {
            id: 'beam',
            type: 'graphics',
            blendMode: 'add',
            graphics: {
              type: 'line',
              fromX: 256, fromY: 0, toX: 256, toY: 400,
              stroke: { width: 4, color: '#00C853', alpha: 0.9 },
            },
            keyframes: {
              alpha: [{ time: 0, value: 0 }, { time: 200, value: 1, easing: 'easeOutCubic' }, { time: 500, value: 0 }],
              scaleY: [{ time: 0, value: 0 }, { time: 200, value: 1, easing: 'easeOutCubic' }],
            },
          },
          {
            id: 'flash',
            type: 'spritesheet_anim',
            asset: 'strike-flash',
            x: 256, y: 400,
            anchorX: 0.5, anchorY: 0.5,
            width: 140, height: 140,
            startTime: 200,
            duration: 125,
            keyframes: {
              alpha: [{ time: 0, value: 0.9 }, { time: 125, value: 0, easing: 'easeOutQuad' }],
              scale: [{ time: 0, value: 0.6 }, { time: 125, value: 1.0, easing: 'easeOutQuad' }],
            },
          },
          {
            id: 'text_popup',
            type: 'text',
            text: '{{multiplierText}}',
            style: { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 40, fill: '#FFD600' },
            x: 256, y: 350,
            anchorX: 0.5, anchorY: 0.5,
            startTime: 275,
            duration: 225,
            keyframes: {
              alpha: [{ time: 0, value: 0 }, { time: 90, value: 1 }, { time: 225, value: 0 }],
              scale: [{ time: 0, value: 0.3 }, { time: 90, value: 1.0, easing: 'easeOutBack' }],
              y: [{ time: 0, value: 350 }, { time: 225, value: 280 }],
            },
          },
        ],
        particles: [
          {
            id: 'strike_sparks',
            startTime: 200,
            mode: 'burst',
            x: 256, y: 400,
            config: {
              count: 20,
              lifetime: 400,
              speed: { min: 3, max: 8 },
              size: { min: 1.5, max: 3.5 },
              color: '#FFD700',
              alpha: { start: 1, end: 0 },
              direction: { min: 0, max: 6.283 },
              gravity: 0,
              blendMode: 'add',
            },
          },
        ],
        params: {
          beamColor: { type: 'color', default: '#00C853' },
          multiplierText: { type: 'string', default: '5x' },
          targetY: { type: 'number', default: 400 },
        },
      };

      projectState.setDocument(doc, 'snake-strike.vanim');

      // Проверяем что всё загрузилось
      expect(projectState.document.name).toBe('snake-strike');
      expect(projectState.nodes.length).toBe(4); // root + 3
      expect(projectState.particles.length).toBe(1);

      // Проверяем иерархию
      const root = projectState.getNodeById('root') as ContainerNode;
      expect(root.children).toEqual(['beam', 'flash', 'text_popup']);

      // Проверяем keyframes
      const beam = projectState.getNodeById('beam')!;
      expect(beam.keyframes!.alpha!.length).toBe(3);

      // Проверяем params
      expect(projectState.document.params!.multiplierText).toBeTruthy();
    });
  });

  describe('Сценарий: FadeIn + Scale Pop', () => {
    it('типичный popup с scale bounce', () => {
      projectState.addNode({
        id: 'popup',
        type: 'sprite',
        asset: 'popup-bg.png',
        x: 256, y: 256,
        anchorX: 0.5, anchorY: 0.5,
        keyframes: {
          alpha: [
            { time: 0, value: 0 },
            { time: 300, value: 1, easing: 'easeOutCubic' },
          ],
          scale: [
            { time: 0, value: 0 },
            { time: 300, value: 1.1, easing: 'easeOutBack' },
            { time: 400, value: 1, easing: 'easeInOutSine' },
          ],
        },
      });

      const popup = projectState.getNodeById('popup')!;
      expect(popup.keyframes!.alpha!.length).toBe(2);
      expect(popup.keyframes!.scale!.length).toBe(3);
      // easeOutBack для пружинящего эффекта
      expect(popup.keyframes!.scale![1].easing).toBe('easeOutBack');
    });
  });

  describe('Сценарий: Циклическая анимация свечения', () => {
    it('graphics circle с pulse', () => {
      const doc: VanimDocument = {
        version: 1,
        name: 'glow-pulse',
        duration: 1000,
        width: 512, height: 512,
        assets: {},
        nodes: [
          { id: 'root', type: 'container', children: ['glow'] },
          {
            id: 'glow',
            type: 'graphics',
            blendMode: 'add',
            graphics: { type: 'circle', cx: 256, cy: 256, radius: 50, fill: { color: '#00FF88', alpha: 0.5 } },
            keyframes: {
              alpha: [
                { time: 0, value: 0.3 },
                { time: 500, value: 1, easing: 'easeInOutSine' },
                { time: 1000, value: 0.3, easing: 'easeInOutSine' },
              ],
              scale: [
                { time: 0, value: 0.8 },
                { time: 500, value: 1.2, easing: 'easeInOutSine' },
                { time: 1000, value: 0.8, easing: 'easeInOutSine' },
              ],
            },
          },
        ],
        particles: [],
        params: {},
      };

      projectState.setDocument(doc);
      expect(projectState.nodes.length).toBe(2);

      const glow = projectState.getNodeById('glow')!;
      // Циклическая: первое и последнее значение совпадают
      const alphaKfs = glow.keyframes!.alpha!;
      expect(alphaKfs[0].value).toBe(alphaKfs[alphaKfs.length - 1].value);
    });
  });

  describe('Сценарий: Multi-layer VFX с частицами', () => {
    it('несколько слоёв + burst + continuous частицы', () => {
      projectState.addNode({ id: 'bg-flash', type: 'graphics', blendMode: 'add', graphics: { type: 'circle', cx: 256, cy: 256, radius: 200, fill: { color: '#FFFFFF', alpha: 0.1 } } });
      projectState.addNode({ id: 'main-effect', type: 'sprite', asset: 'effect.png', x: 256, y: 256, anchorX: 0.5, anchorY: 0.5 });
      projectState.addNode({ id: 'foreground', type: 'container', children: [] });

      projectState.addParticle({
        id: 'sparks',
        startTime: 0,
        mode: 'burst',
        x: 256, y: 256,
        config: { count: 30, lifetime: 600, speed: { min: 3, max: 10 }, size: { min: 1, max: 4 }, color: '#FFD700', alpha: { start: 1, end: 0 }, direction: { min: 0, max: 6.28 }, gravity: 0, blendMode: 'add' },
      });

      projectState.addParticle({
        id: 'smoke',
        startTime: 100,
        mode: 'continuous',
        x: 256, y: 300,
        config: { count: 3, lifetime: 800, speed: { min: 0.5, max: 2 }, size: { min: 5, max: 15 }, color: '#666666', alpha: { start: 0.4, end: 0 }, direction: { min: 4.5, max: 5 }, gravity: -0.5, blendMode: 'normal' },
      });

      expect(projectState.nodes.length).toBe(4); // root + 3
      expect(projectState.particles.length).toBe(2);
      expect(projectState.particles[0].mode).toBe('burst');
      expect(projectState.particles[1].mode).toBe('continuous');
    });
  });

  // --- Undo/Redo сценарии ---

  describe('Undo/Redo в анимационных сценариях', () => {
    it('undo после добавления ноды', () => {
      historyState.push('Add sprite');
      projectState.addNode({ id: 'temp', type: 'sprite', asset: '', x: 0, y: 0 });

      expect(projectState.nodes.length).toBe(2);
      historyState.undo();
      expect(projectState.nodes.length).toBe(1);
    });

    it('redo восстанавливает ноду', () => {
      historyState.push('Add sprite');
      projectState.addNode({ id: 'temp', type: 'sprite', asset: '', x: 0, y: 0 });

      historyState.undo();
      expect(projectState.nodes.length).toBe(1);

      historyState.redo();
      expect(projectState.nodes.length).toBe(2);
    });

    it('undo после удаления ноды', () => {
      projectState.addNode({ id: 'hero', type: 'sprite', asset: '', x: 0, y: 0 });

      historyState.push('Remove hero');
      projectState.removeNode('hero');

      expect(projectState.getNodeById('hero')).toBeUndefined();
      historyState.undo();
      expect(projectState.getNodeById('hero')).toBeTruthy();
    });

    it('undo после изменения свойства', () => {
      projectState.addNode({ id: 's1', type: 'sprite', asset: 'a.png', x: 100, y: 200 });

      historyState.push('Move');
      projectState.updateNode('s1', (n) => ({ ...n, x: 300 }));

      expect((projectState.getNodeById('s1') as any).x).toBe(300);
      historyState.undo();
      expect((projectState.getNodeById('s1') as any).x).toBe(100);
    });

    it('серия undo — до пустого документа', () => {
      historyState.push('Add 1');
      projectState.addNode({ id: 'n1', type: 'sprite', asset: '', x: 0, y: 0 });

      historyState.push('Add 2');
      projectState.addNode({ id: 'n2', type: 'graphics', graphics: { type: 'circle', cx: 0, cy: 0, radius: 10, fill: { color: '#fff' } } });

      historyState.push('Add 3');
      projectState.addNode({ id: 'n3', type: 'text', text: 'Hi', x: 0, y: 0, anchorX: 0, anchorY: 0, style: { fontSize: 12, fill: '#fff' } });

      expect(projectState.nodes.length).toBe(4); // root + 3
      historyState.undo(); // remove n3
      expect(projectState.nodes.length).toBe(3);
      historyState.undo(); // remove n2
      expect(projectState.nodes.length).toBe(2);
      historyState.undo(); // remove n1
      expect(projectState.nodes.length).toBe(1);
    });
  });

  // --- Selection ---

  describe('Selection', () => {
    it('выделение ноды и частицы взаимоисключающие', () => {
      projectState.addNode({ id: 'n1', type: 'sprite', asset: '', x: 0, y: 0 });
      projectState.addParticle({
        id: 'p1', startTime: 0, mode: 'burst', x: 0, y: 0,
        config: { count: 1, lifetime: 100, speed: { min: 1, max: 1 }, size: { min: 1, max: 1 }, color: '#fff', alpha: { start: 1, end: 0 }, direction: { min: 0, max: 6.28 }, gravity: 0, blendMode: 'normal' },
      });

      selectionState.selectNode('n1');
      expect(selectionState.nodeId).toBe('n1');
      expect(selectionState.particleId).toBeNull();

      selectionState.selectParticle('p1');
      expect(selectionState.nodeId).toBeNull();
      expect(selectionState.particleId).toBe('p1');
    });

    it('выделение keyframe', () => {
      selectionState.selectNode('root');
      selectionState.selectKeyframe('alpha', 2);

      expect(selectionState.keyframeProp).toBe('alpha');
      expect(selectionState.keyframeIndex).toBe(2);
    });

    it('clear сбрасывает всё', () => {
      selectionState.selectNode('root');
      selectionState.selectKeyframe('x', 0);
      selectionState.clear();

      expect(selectionState.nodeId).toBeNull();
      expect(selectionState.keyframeProp).toBeNull();
      expect(selectionState.keyframeIndex).toBeNull();
    });
  });

  // --- Document operations ---

  describe('Операции с документом', () => {
    it('updateDocument через updater', () => {
      projectState.updateDocument((doc) => ({
        ...doc,
        name: 'renamed',
        duration: 2000,
      }));

      expect(projectState.document.name).toBe('renamed');
      expect(projectState.document.duration).toBe(2000);
      expect(projectState.dirty).toBe(true);
    });

    it('newDocument сбрасывает к дефолту', () => {
      projectState.setDocument({
        version: 1, name: 'custom', duration: 5000, width: 1024, height: 768,
        assets: {}, nodes: [{ id: 'root', type: 'container', children: [] }], particles: [], params: {},
      });

      projectState.newDocument();
      expect(projectState.document.name).toBe('untitled');
      expect(projectState.document.duration).toBe(1000);
      expect(projectState.document.width).toBe(512);
    });

    it('setDocument устанавливает filePath', () => {
      const doc: VanimDocument = {
        version: 1, name: 'test', duration: 1000, width: 512, height: 512,
        assets: {}, nodes: [{ id: 'root', type: 'container', children: [] }], particles: [], params: {},
      };
      projectState.setDocument(doc, 'test.vanim');

      expect(projectState.filePath).toBe('test.vanim');
      expect(projectState.dirty).toBe(false);
    });
  });
});
