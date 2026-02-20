import { Application, Container, Sprite, Graphics, Texture, MeshSimple } from 'pixi.js';
import type {
  VanimDocument, VanimNode, KeyframeProperty, GraphicsNode, MeshNode,
} from '$lib/types/vanim';
import { renderNodes, drawShape, type RenderedNode } from './NodeRenderer';
import { evaluateAllKeyframes, getNodeLocalTime } from './KeyframeEvaluator';
import { ParticleSystem } from './ParticleRenderer';

export interface PlayOptions {
  params?: Record<string, string | number>;
  speed?: number;
  loop?: boolean;
  onComplete?: () => void;
}

export class VanimPlayer {
  private app: Application;
  private parent: Container;
  readonly container: Container;

  private doc: VanimDocument | null = null;
  private nodeMap = new Map<string, RenderedNode>();
  private particleSystems: ParticleSystem[] = [];
  private sceneRoot: Container | null = null;

  private _playing = false;
  private _currentTime = 0;
  private _speed = 1;
  private _loop = false;
  private _lastTimestamp = 0;
  private _params: Record<string, string | number> = {};
  private _resolveComplete: (() => void) | null = null;
  private _onComplete: (() => void) | null = null;
  private _tickerCallback: (() => void) | null = null;

  constructor(app: Application, parent: Container) {
    this.app = app;
    this.parent = parent;
    this.container = new Container();
    this.parent.addChild(this.container);
  }

  get playing(): boolean { return this._playing; }
  get currentTime(): number { return this._currentTime; }

  async load(data: VanimDocument | string, basePath: string = ''): Promise<void> {
    this.cleanup();

    if (typeof data === 'string') {
      data = JSON.parse(data) as VanimDocument;
    }

    this.doc = data;

    const { root, nodeMap } = await renderNodes(data, basePath);
    this.sceneRoot = root;
    this.nodeMap = nodeMap;
    this.container.addChild(root);

    // Создаём системы частиц
    if (data.particles) {
      for (const particleDef of data.particles) {
        const system = new ParticleSystem(particleDef);
        this.particleSystems.push(system);
        this.container.addChild(system.container);
      }
    }

    // Применяем начальное состояние (time=0)
    this.applyFrame(0);
  }

  play(options?: PlayOptions): Promise<void> {
    if (!this.doc) return Promise.resolve();

    this._speed = options?.speed ?? 1;
    this._loop = options?.loop ?? false;
    this._onComplete = options?.onComplete ?? null;

    if (options?.params) {
      this._params = { ...options.params };
      this.applyParams();
    }

    this._currentTime = 0;
    this._playing = true;
    this._lastTimestamp = performance.now();

    return new Promise<void>((resolve) => {
      this._resolveComplete = resolve;
      this.startTicker();
    });
  }

  pause(): void {
    this._playing = false;
    this.stopTicker();
  }

  resume(): void {
    if (!this.doc || this._playing) return;
    this._playing = true;
    this._lastTimestamp = performance.now();
    this.startTicker();
  }

  stop(): void {
    this._playing = false;
    this._currentTime = 0;
    this.stopTicker();
    this.applyFrame(0);
    this.resetParticles();
  }

  seek(timeMs: number): void {
    this._currentTime = Math.max(0, Math.min(timeMs, this.doc?.duration ?? 0));
    this.applyFrame(this._currentTime);
  }

  destroy(): void {
    this.cleanup();
    this.container.destroy({ children: true });
    this.parent.removeChild(this.container);
  }

  private startTicker(): void {
    if (this._tickerCallback) return;
    this._tickerCallback = () => this.tick();
    this.app.ticker.add(this._tickerCallback);
  }

  private stopTicker(): void {
    if (this._tickerCallback) {
      this.app.ticker.remove(this._tickerCallback);
      this._tickerCallback = null;
    }
  }

  private tick(): void {
    if (!this._playing || !this.doc) return;

    const now = performance.now();
    const delta = (now - this._lastTimestamp) * this._speed;
    this._lastTimestamp = now;
    this._currentTime += delta;

    if (this._currentTime >= this.doc.duration) {
      if (this._loop) {
        this._currentTime = this._currentTime % this.doc.duration;
        this.resetParticles();
      } else {
        this._currentTime = this.doc.duration;
        this.applyFrame(this._currentTime);
        this._playing = false;
        this.stopTicker();
        this._onComplete?.();
        this._resolveComplete?.();
        this._resolveComplete = null;
        return;
      }
    }

    this.applyFrame(this._currentTime);
  }

  private applyFrame(globalTime: number): void {
    if (!this.doc) return;

    for (const rendered of this.nodeMap.values()) {
      const node = rendered.node;
      const obj = rendered.displayObject;
      const localTime = getNodeLocalTime(globalTime, node.startTime, node.duration);

      // Visibility на основе startTime/duration
      if (localTime === null) {
        if (node.startTime !== undefined && globalTime < node.startTime) {
          obj.visible = false;
        } else if (node.duration !== undefined) {
          // Анимация завершилась — показываем последний кадр
          obj.visible = true;
          this.applyKeyframes(rendered, node.duration);
        }
        continue;
      }

      obj.visible = true;
      this.applyKeyframes(rendered, localTime);

      // Spritesheet animation — выбираем фрейм по времени
      if (node.type === 'spritesheet_anim' && rendered.frames && rendered.frames.length > 0) {
        const duration = node.duration ?? this.doc.duration;
        const frameIndex = Math.min(
          Math.floor((localTime / duration) * rendered.frames.length),
          rendered.frames.length - 1,
        );
        (obj as Sprite).texture = rendered.frames[frameIndex];
      }
    }

    // Обновляем частицы
    for (const system of this.particleSystems) {
      system.update(globalTime);
    }
  }

  private applyKeyframes(rendered: RenderedNode, localTime: number): void {
    const values = evaluateAllKeyframes(rendered.node.keyframes, localTime);
    const obj = rendered.displayObject;

    for (const [prop, value] of Object.entries(values)) {
      if (typeof value !== 'number') continue;

      switch (prop as KeyframeProperty) {
        case 'x': obj.x = value; break;
        case 'y': obj.y = value; break;
        case 'scaleX': obj.scale.x = value; break;
        case 'scaleY': obj.scale.y = value; break;
        case 'scale': obj.scale.set(value); break;
        case 'rotation': obj.rotation = value; break;
        case 'alpha': obj.alpha = value; break;
        case 'tint':
          if ('tint' in obj) (obj as any).tint = value;
          break;
        // Graphics-specific keyframes: перерисовываем shape
        case 'fromX': case 'fromY': case 'toX': case 'toY':
        case 'radius': case 'width': case 'height':
          this.applyGraphicsKeyframe(rendered, values);
          return; // Обрабатываем все graphics-keyframes за один вызов
        default:
          // Mesh vertex keyframes: vertex0_x, vertex0_y, ...
          if (typeof prop === 'string' && prop.startsWith('vertex')) {
            this.applyMeshVertexKeyframes(rendered, values);
            return; // Обрабатываем все vertex-keyframes за один вызов
          }
      }
    }
  }

  private applyMeshVertexKeyframes(
    rendered: RenderedNode,
    values: Partial<Record<KeyframeProperty, number | string>>,
  ): void {
    if (rendered.node.type !== 'mesh') return;
    const mesh = rendered.displayObject as MeshSimple;
    const vertices = mesh.vertices as Float32Array;

    for (const [prop, value] of Object.entries(values)) {
      if (typeof value !== 'number') continue;
      const match = prop.match(/^vertex(\d+)_(x|y)$/);
      if (!match) continue;
      const idx = parseInt(match[1], 10);
      const axis = match[2] === 'x' ? 0 : 1;
      const bufIdx = idx * 2 + axis;
      if (bufIdx < vertices.length) {
        vertices[bufIdx] = value;
      }
    }
    mesh.vertices = vertices;
  }

  private applyGraphicsKeyframe(
    rendered: RenderedNode,
    values: Partial<Record<KeyframeProperty, number | string>>,
  ): void {
    if (rendered.node.type !== 'graphics') return;
    const graphicsNode = rendered.node as GraphicsNode;
    const g = rendered.displayObject as Graphics;

    // Клонируем shape и переопределяем анимируемые свойства
    const shape = { ...graphicsNode.graphics } as any;
    for (const [prop, value] of Object.entries(values)) {
      if (prop in shape) {
        shape[prop] = value;
      }
    }

    drawShape(g, shape);
  }

  private applyParams(): void {
    if (!this.doc) return;

    for (const rendered of this.nodeMap.values()) {
      const node = rendered.node;
      if (node.type === 'text') {
        let text = node.text;
        for (const [key, value] of Object.entries(this._params)) {
          text = text.replace(`{{${key}}}`, String(value));
        }
        (rendered.displayObject as any).text = text;
      }
    }
  }

  private resetParticles(): void {
    for (const system of this.particleSystems) {
      system.reset();
    }
  }

  private cleanup(): void {
    this.stopTicker();
    this._playing = false;
    this._currentTime = 0;

    for (const system of this.particleSystems) {
      system.destroy();
    }
    this.particleSystems = [];

    if (this.sceneRoot) {
      this.container.removeChild(this.sceneRoot);
      this.sceneRoot.destroy({ children: true });
      this.sceneRoot = null;
    }

    this.nodeMap.clear();
    this.doc = null;
  }
}
