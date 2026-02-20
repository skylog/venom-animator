import { Application, Container } from 'pixi.js';
import type { VanimDocument } from '$lib/types/vanim';
import { renderNodes, type RenderedNode } from './NodeRenderer';
import { evaluateAllKeyframes, getNodeLocalTime } from './KeyframeEvaluator';
import { ParticleSystem } from './ParticleRenderer';
import { drawShape } from './NodeRenderer';
import { Sprite, Graphics } from 'pixi.js';
import type { KeyframeProperty, GraphicsNode } from '$lib/types/vanim';

/**
 * Обёртка PixiJS 8 Application для превью в редакторе.
 * В отличие от VanimPlayer, поддерживает seek без play и
 * перестроение сцены при изменении документа.
 */
export class PreviewApp {
  app: Application;
  private viewport: Container;
  private sceneRoot: Container | null = null;
  private nodeMap = new Map<string, RenderedNode>();
  private particleSystems: ParticleSystem[] = [];
  private doc: VanimDocument | null = null;
  private _initialized = false;
  private _cssWidth = 0;
  private _cssHeight = 0;

  constructor() {
    this.app = new Application();
    this.viewport = new Container();
  }

  async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    this._cssWidth = width;
    this._cssHeight = height;
    await this.app.init({
      canvas,
      width,
      height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.app.stage.addChild(this.viewport);
    this._initialized = true;
  }

  get initialized(): boolean { return this._initialized; }

  async loadDocument(doc: VanimDocument): Promise<void> {
    this.clearScene();
    this.doc = doc;

    const { root, nodeMap } = await renderNodes(doc);
    this.sceneRoot = root;
    this.nodeMap = nodeMap;
    this.viewport.addChild(root);

    if (doc.particles) {
      for (const pDef of doc.particles) {
        const system = new ParticleSystem(pDef);
        this.particleSystems.push(system);
        this.viewport.addChild(system.container);
      }
    }

    this.centerViewport();
    this.renderAtTime(0);
  }

  /**
   * Перестраивает сцену при изменении документа (edit).
   */
  async rebuildScene(doc: VanimDocument): Promise<void> {
    await this.loadDocument(doc);
  }

  /**
   * Рендерит сцену в заданный момент времени (для scrubbing в таймлайне).
   */
  renderAtTime(globalTime: number): void {
    if (!this.doc) return;

    for (const rendered of this.nodeMap.values()) {
      const node = rendered.node;
      const obj = rendered.displayObject;
      const localTime = getNodeLocalTime(globalTime, node.startTime, node.duration);

      if (localTime === null) {
        if (node.startTime !== undefined && globalTime < node.startTime) {
          obj.visible = false;
        } else if (node.duration !== undefined) {
          obj.visible = true;
          this.applyKeyframesToObject(rendered, node.duration);
        }
        continue;
      }

      obj.visible = true;
      this.applyKeyframesToObject(rendered, localTime);

      if (node.type === 'spritesheet_anim' && rendered.frames && rendered.frames.length > 0) {
        const dur = node.duration ?? this.doc.duration;
        const fi = Math.min(
          Math.floor((localTime / dur) * rendered.frames.length),
          rendered.frames.length - 1,
        );
        (obj as Sprite).texture = rendered.frames[fi];
      }
    }

    for (const system of this.particleSystems) {
      system.update(globalTime);
    }
  }

  resize(width: number, height: number): void {
    if (!this._initialized) return;
    this._cssWidth = width;
    this._cssHeight = height;
    this.app.renderer.resize(width, height);
    this.centerViewport();
  }

  /** Центрирует и масштабирует viewport чтобы анимация вписалась в канвас */
  private centerViewport(): void {
    if (!this.doc) return;
    const docW = this.doc.width;
    const docH = this.doc.height;
    const padding = 20;
    const availW = this._cssWidth - padding * 2;
    const availH = this._cssHeight - padding * 2;
    const scaleX = availW / docW;
    const scaleY = availH / docH;
    const fit = Math.min(scaleX, scaleY, 1); // не увеличивать больше 1x
    this.viewport.scale.set(fit);
    this.viewport.x = Math.round((this._cssWidth - docW * fit) / 2);
    this.viewport.y = Math.round((this._cssHeight - docH * fit) / 2);
  }

  getRenderedNode(id: string): RenderedNode | undefined {
    return this.nodeMap.get(id);
  }

  private applyKeyframesToObject(rendered: RenderedNode, localTime: number): void {
    const values = evaluateAllKeyframes(rendered.node.keyframes, localTime);
    const obj = rendered.displayObject;

    let hasGraphicsProps = false;

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
        case 'fromX': case 'fromY': case 'toX': case 'toY':
        case 'radius': case 'width': case 'height':
          hasGraphicsProps = true;
          break;
      }
    }

    if (hasGraphicsProps && rendered.node.type === 'graphics') {
      const gNode = rendered.node as GraphicsNode;
      const g = obj as Graphics;
      const shape = { ...gNode.graphics } as any;
      for (const [prop, value] of Object.entries(values)) {
        if (prop in shape) shape[prop] = value;
      }
      drawShape(g, shape);
    }
  }

  private clearScene(): void {
    for (const system of this.particleSystems) {
      system.destroy();
    }
    this.particleSystems = [];

    if (this.sceneRoot) {
      this.viewport.removeChild(this.sceneRoot);
      this.sceneRoot.destroy({ children: true });
      this.sceneRoot = null;
    }

    this.nodeMap.clear();
    this.doc = null;
  }

  destroy(): void {
    this.clearScene();
    this.app.destroy(true);
    this._initialized = false;
  }
}
