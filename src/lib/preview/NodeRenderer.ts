import { Container, Sprite, Graphics, Text, Texture } from 'pixi.js';
import type {
  VanimNode, VanimDocument, GraphicsShape,
  LineGraphics, CircleGraphics, RectGraphics, RoundRectGraphics,
  VanimTextStyle, BlendMode,
} from '$lib/types/vanim';
import { loadSpritesheet, loadTexture } from './SpritesheetLoader';

export interface RenderedNode {
  id: string;
  node: VanimNode;
  displayObject: Container;
  /** Фреймы спрайтшита (если spritesheet_anim) */
  frames?: Texture[];
}

const BLEND_MODE_MAP: Record<BlendMode, string> = {
  normal: 'normal',
  add: 'add',
  multiply: 'multiply',
  screen: 'screen',
};

/**
 * Создаёт PixiJS display objects из массива .vanim нод.
 * Возвращает Map<id, RenderedNode> и корневой контейнер.
 */
export async function renderNodes(
  doc: VanimDocument,
  basePath: string = '',
): Promise<{ root: Container; nodeMap: Map<string, RenderedNode> }> {
  const nodeMap = new Map<string, RenderedNode>();

  // Загружаем ассеты
  const assetTextures = new Map<string, Texture>();
  const assetFrames = new Map<string, Texture[]>();

  if (doc.assets) {
    const loadPromises: Promise<void>[] = [];
    for (const [key, asset] of Object.entries(doc.assets)) {
      if (asset.type === 'texture') {
        loadPromises.push(
          loadTexture(asset.path, basePath).then((tex) => {
            assetTextures.set(key, tex);
          }).catch(() => { /* ассет не найден — пропускаем */ }),
        );
      } else if (asset.type === 'spritesheet') {
        loadPromises.push(
          loadSpritesheet(asset, basePath).then((frames) => {
            assetFrames.set(key, frames);
          }).catch(() => { /* ассет не найден — пропускаем */ }),
        );
      }
    }
    await Promise.all(loadPromises);
  }

  // Создаём display objects
  for (const node of doc.nodes) {
    const displayObject = createDisplayObject(node, assetTextures, assetFrames);
    applyBaseProperties(displayObject, node);

    const rendered: RenderedNode = { id: node.id, node, displayObject };
    if (node.type === 'spritesheet_anim' && node.asset) {
      rendered.frames = assetFrames.get(node.asset);
    }
    nodeMap.set(node.id, rendered);
  }

  // Строим иерархию
  const root = new Container();
  const childIds = new Set<string>();

  for (const node of doc.nodes) {
    if (node.type === 'container' && node.children) {
      const parentObj = nodeMap.get(node.id)?.displayObject;
      if (!parentObj) continue;
      for (const childId of node.children) {
        const child = nodeMap.get(childId);
        if (child) {
          parentObj.addChild(child.displayObject);
          childIds.add(childId);
        }
      }
    }
  }

  // Ноды без родителя — добавляем в root
  for (const [id, rendered] of nodeMap) {
    if (!childIds.has(id)) {
      root.addChild(rendered.displayObject);
    }
  }

  return { root, nodeMap };
}

function createDisplayObject(
  node: VanimNode,
  textures: Map<string, Texture>,
  frames: Map<string, Texture[]>,
): Container {
  switch (node.type) {
    case 'container':
      return new Container();

    case 'sprite': {
      const tex = textures.get(node.asset) ?? Texture.EMPTY;
      const sprite = new Sprite(tex);
      if (node.anchorX !== undefined) sprite.anchor.x = node.anchorX;
      if (node.anchorY !== undefined) sprite.anchor.y = node.anchorY;
      if (node.width !== undefined) sprite.width = node.width;
      if (node.height !== undefined) sprite.height = node.height;
      return sprite;
    }

    case 'spritesheet_anim': {
      const spriteFrames = frames.get(node.asset);
      const tex = spriteFrames?.[0] ?? Texture.EMPTY;
      const sprite = new Sprite(tex);
      if (node.anchorX !== undefined) sprite.anchor.x = node.anchorX;
      if (node.anchorY !== undefined) sprite.anchor.y = node.anchorY;
      if (node.width !== undefined) sprite.width = node.width;
      if (node.height !== undefined) sprite.height = node.height;
      return sprite;
    }

    case 'graphics': {
      const g = new Graphics();
      drawShape(g, node.graphics);
      return g;
    }

    case 'text': {
      const style = buildTextStyle(node.style);
      const text = new Text({ text: node.text, style });
      if (node.anchorX !== undefined) text.anchor.x = node.anchorX;
      if (node.anchorY !== undefined) text.anchor.y = node.anchorY;
      return text;
    }
  }
}

function applyBaseProperties(obj: Container, node: VanimNode): void {
  if (node.x !== undefined) obj.x = node.x;
  if (node.y !== undefined) obj.y = node.y;
  if (node.scaleX !== undefined) obj.scale.x = node.scaleX;
  if (node.scaleY !== undefined) obj.scale.y = node.scaleY;
  if (node.rotation !== undefined) obj.rotation = node.rotation;
  if (node.alpha !== undefined) obj.alpha = node.alpha;
  if (node.blendMode) {
    obj.blendMode = BLEND_MODE_MAP[node.blendMode] as any;
  }
  // Скрываем ноды, у которых есть startTime (появятся при проигрывании)
  if (node.startTime !== undefined && node.startTime > 0) {
    obj.visible = false;
  }
}

export function drawShape(g: Graphics, shape: GraphicsShape): void {
  g.clear();

  switch (shape.type) {
    case 'line': {
      const s = shape as LineGraphics;
      g.moveTo(s.fromX, s.fromY);
      g.lineTo(s.toX, s.toY);
      g.stroke({
        width: s.stroke.width,
        color: s.stroke.color,
        alpha: s.stroke.alpha ?? 1,
      });
      break;
    }
    case 'circle': {
      const s = shape as CircleGraphics;
      g.circle(s.cx, s.cy, s.radius);
      if (s.fill) g.fill({ color: s.fill.color, alpha: s.fill.alpha ?? 1 });
      if (s.stroke) g.stroke({ width: s.stroke.width, color: s.stroke.color, alpha: s.stroke.alpha ?? 1 });
      break;
    }
    case 'rect': {
      const s = shape as RectGraphics;
      g.rect(s.x, s.y, s.width, s.height);
      if (s.fill) g.fill({ color: s.fill.color, alpha: s.fill.alpha ?? 1 });
      if (s.stroke) g.stroke({ width: s.stroke.width, color: s.stroke.color, alpha: s.stroke.alpha ?? 1 });
      break;
    }
    case 'roundRect': {
      const s = shape as RoundRectGraphics;
      g.roundRect(s.x, s.y, s.width, s.height, s.radius);
      if (s.fill) g.fill({ color: s.fill.color, alpha: s.fill.alpha ?? 1 });
      if (s.stroke) g.stroke({ width: s.stroke.width, color: s.stroke.color, alpha: s.stroke.alpha ?? 1 });
      break;
    }
  }
}

function buildTextStyle(style?: VanimTextStyle): Record<string, any> {
  if (!style) return {};
  return {
    fontFamily: style.fontFamily ?? 'Arial',
    fontWeight: style.fontWeight,
    fontSize: style.fontSize ?? 16,
    fill: style.fill ?? '#ffffff',
    align: style.align ?? 'left',
  };
}
