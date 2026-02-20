export type EasingName =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeInOutSine'
  | 'spring';

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';

export type NodeType = 'container' | 'sprite' | 'spritesheet_anim' | 'graphics' | 'text' | 'mesh';

// --- Keyframes ---

export interface Keyframe {
  time: number;
  value: number | string;
  easing?: EasingName;
}

export type KeyframeProperty =
  | 'x' | 'y'
  | 'scaleX' | 'scaleY' | 'scale'
  | 'rotation' | 'alpha' | 'tint'
  // graphics-specific
  | 'fromX' | 'fromY' | 'toX' | 'toY'
  | 'radius' | 'width' | 'height'
  // mesh-specific (Phase 6) — анимация вершин по индексу: vertex0_x, vertex0_y, ...
  | `vertex${number}_x` | `vertex${number}_y`;

export type KeyframeMap = Partial<Record<KeyframeProperty, Keyframe[]>>;

// --- Assets ---

export interface SpritesheetAsset {
  type: 'spritesheet';
  path: string;
  cols: number;
  rows: number;
}

export interface TextureAsset {
  type: 'texture';
  path: string;
}

export type VanimAsset = SpritesheetAsset | TextureAsset;

// --- Graphics ---

export interface StrokeStyle {
  width: number;
  color: string;
  alpha?: number;
}

export interface FillStyle {
  color: string;
  alpha?: number;
}

export interface LineGraphics {
  type: 'line';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  stroke: StrokeStyle;
}

export interface CircleGraphics {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
  fill?: FillStyle;
  stroke?: StrokeStyle;
}

export interface RectGraphics {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: FillStyle;
  stroke?: StrokeStyle;
}

export interface RoundRectGraphics {
  type: 'roundRect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill?: FillStyle;
  stroke?: StrokeStyle;
}

export type GraphicsShape = LineGraphics | CircleGraphics | RectGraphics | RoundRectGraphics;

// --- Text Style ---

export interface VanimTextStyle {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  fill?: string;
  stroke?: StrokeStyle;
  align?: 'left' | 'center' | 'right';
}

// --- Nodes ---

export interface VanimNodeBase {
  id: string;
  type: NodeType;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  alpha?: number;
  anchorX?: number;
  anchorY?: number;
  width?: number;
  height?: number;
  blendMode?: BlendMode;
  startTime?: number;
  duration?: number;
  keyframes?: KeyframeMap;
}

export interface ContainerNode extends VanimNodeBase {
  type: 'container';
  children?: string[];
}

export interface SpriteNode extends VanimNodeBase {
  type: 'sprite';
  asset: string;
}

export interface SpritesheetAnimNode extends VanimNodeBase {
  type: 'spritesheet_anim';
  asset: string;
}

export interface GraphicsNode extends VanimNodeBase {
  type: 'graphics';
  graphics: GraphicsShape;
}

export interface TextNode extends VanimNodeBase {
  type: 'text';
  text: string;
  style?: VanimTextStyle;
}

// --- Mesh (Phase 6) ---

export interface MeshVertex {
  x: number;
  y: number;
  u: number;  // UV координата 0-1
  v: number;  // UV координата 0-1
}

export interface MeshNode extends VanimNodeBase {
  type: 'mesh';
  asset: string;
  vertices: MeshVertex[];
  indices: number[];   // треугольники (тройки индексов)
}

export type VanimNode = ContainerNode | SpriteNode | SpritesheetAnimNode | GraphicsNode | TextNode | MeshNode;

// --- Particles ---

export interface RangeValue {
  min: number;
  max: number;
}

export interface AlphaRange {
  start: number;
  end: number;
}

export interface ParticleConfig {
  count: number;
  lifetime: number;
  speed: RangeValue;
  size: RangeValue;
  color: string;
  alpha: AlphaRange;
  direction: RangeValue;
  gravity?: number;
  blendMode?: BlendMode;
}

export interface VanimParticle {
  id: string;
  startTime: number;
  mode: 'burst' | 'continuous';
  x: number;
  y: number;
  config: ParticleConfig;
  duration?: number;
}

// --- Params ---

export interface ColorParam {
  type: 'color';
  default: string;
}

export interface StringParam {
  type: 'string';
  default: string;
}

export interface NumberParam {
  type: 'number';
  default: number;
}

export type VanimParam = ColorParam | StringParam | NumberParam;

// --- States (named time regions) ---

export interface VanimState {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
  color?: string;
}

// --- Document ---

export interface VanimDocument {
  version: number;
  name: string;
  duration: number;
  width: number;
  height: number;
  assets?: Record<string, VanimAsset>;
  nodes: VanimNode[];
  particles?: VanimParticle[];
  states?: VanimState[];
  params?: Record<string, VanimParam>;
}
