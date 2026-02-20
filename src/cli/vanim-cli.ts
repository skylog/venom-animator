/**
 * CLI утилита для работы с .vanim файлами.
 * Запуск: npx vite-node src/cli/vanim-cli.ts -- <command> [args]
 *
 * Команды:
 *   create <name>                       — создать .vanim из шаблона
 *   validate <file>                     — валидация
 *   info <file>                         — мета-информация
 *   list-nodes <file>                   — дерево нод
 *   add-node <file> --type --id [opts]  — добавить ноду
 *   add-keyframe <file> --node --prop --time --value [--easing]
 *   add-particle <file> --id --mode --x --y
 *   merge <base> <overlay>              — объединить два файла
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { validateVanim, formatValidationErrors } from '$lib/ai/vanim-validator';
import type {
  VanimDocument, VanimNode, NodeType, EasingName,
  ContainerNode, SpriteNode, GraphicsNode, TextNode, MeshNode,
  VanimParticle,
} from '$lib/types/vanim';

// --- Helpers ---

function loadDoc(filePath: string): VanimDocument {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    console.error(`Файл не найден: ${abs}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, 'utf8'));
}

function saveDoc(filePath: string, doc: VanimDocument): void {
  writeFileSync(resolve(filePath), JSON.stringify(doc, null, 2) + '\n');
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      result[key] = val;
      if (val !== 'true') i++;
    }
  }
  return result;
}

// --- Commands ---

function cmdCreate(name: string): void {
  const fileName = `${name}.vanim`;
  if (existsSync(fileName)) {
    console.error(`Файл ${fileName} уже существует`);
    process.exit(1);
  }

  const doc: VanimDocument = {
    version: 1,
    name,
    duration: 1000,
    width: 512,
    height: 512,
    assets: {},
    nodes: [
      { id: 'root', type: 'container', children: [] } as ContainerNode,
    ],
    particles: [],
    params: {},
  };

  saveDoc(fileName, doc);
  console.log(`Создан: ${fileName}`);
  console.log(`  name: ${name}, duration: 1000ms, 512x512`);
}

function cmdValidate(filePath: string): void {
  const doc = loadDoc(filePath);
  const errors = validateVanim(doc);
  if (errors.length === 0) {
    console.log('OK — валидация пройдена');
  } else {
    console.log(formatValidationErrors(errors));
    const criticalCount = errors.filter((e) => e.severity === 'error').length;
    if (criticalCount > 0) process.exit(1);
  }
}

function cmdInfo(filePath: string): void {
  const doc = loadDoc(filePath);
  console.log(`name: ${doc.name}`);
  console.log(`duration: ${doc.duration}ms`);
  console.log(`size: ${doc.width}x${doc.height}`);
  console.log(`nodes: ${doc.nodes.length}`);
  console.log(`particles: ${doc.particles?.length ?? 0}`);
  console.log(`assets: ${doc.assets ? Object.keys(doc.assets).length : 0}`);
  console.log(`params: ${doc.params ? Object.keys(doc.params).join(', ') || '(none)' : '(none)'}`);

  // Keyframe stats
  let totalKf = 0;
  for (const node of doc.nodes) {
    if (node.keyframes) {
      for (const kfs of Object.values(node.keyframes)) {
        if (kfs) totalKf += kfs.length;
      }
    }
  }
  console.log(`keyframes: ${totalKf}`);
}

function cmdListNodes(filePath: string): void {
  const doc = loadDoc(filePath);
  const childMap = new Map<string, string[]>();

  for (const node of doc.nodes) {
    if (node.type === 'container' && (node as ContainerNode).children) {
      childMap.set(node.id, (node as ContainerNode).children!);
    }
  }

  const nodeById = new Map(doc.nodes.map((n) => [n.id, n]));
  const printed = new Set<string>();

  function printTree(id: string, indent: string): void {
    const node = nodeById.get(id);
    if (!node || printed.has(id)) return;
    printed.add(id);

    const kfCount = node.keyframes ? Object.keys(node.keyframes).length : 0;
    const kfStr = kfCount > 0 ? ` [${kfCount} tracks]` : '';
    const timeStr = node.startTime !== undefined ? ` @${node.startTime}ms` : '';
    console.log(`${indent}${node.id} (${node.type})${kfStr}${timeStr}`);

    const children = childMap.get(id);
    if (children) {
      for (const childId of children) {
        printTree(childId, indent + '  ');
      }
    }
  }

  // Находим корневые ноды
  const allChildIds = new Set<string>();
  for (const children of childMap.values()) {
    for (const id of children) allChildIds.add(id);
  }

  for (const node of doc.nodes) {
    if (!allChildIds.has(node.id)) {
      printTree(node.id, '');
    }
  }

  if (doc.particles && doc.particles.length > 0) {
    console.log('\nParticles:');
    for (const p of doc.particles) {
      console.log(`  ${p.id} (${p.mode}) @${p.startTime}ms [${p.x},${p.y}]`);
    }
  }
}

function cmdAddNode(filePath: string, args: string[]): void {
  const opts = parseArgs(args);
  const doc = loadDoc(filePath);

  const type = (opts.type ?? 'container') as NodeType;
  const id = opts.id ?? `${type}-${doc.nodes.length}`;
  const parentId = opts.parent ?? 'root';

  if (doc.nodes.find((n) => n.id === id)) {
    console.error(`Нода с id="${id}" уже существует`);
    process.exit(1);
  }

  let node: VanimNode;
  switch (type) {
    case 'container':
      node = { id, type: 'container', children: [] } as ContainerNode;
      break;
    case 'sprite':
      node = { id, type: 'sprite', asset: opts.asset ?? '' } as SpriteNode;
      break;
    case 'spritesheet_anim':
      node = { id, type: 'spritesheet_anim', asset: opts.asset ?? '' } as any;
      break;
    case 'graphics':
      node = {
        id, type: 'graphics',
        graphics: { type: 'circle', cx: 128, cy: 128, radius: 30, fill: { color: '#4ec9b0' } },
      } as GraphicsNode;
      break;
    case 'text':
      node = {
        id, type: 'text', text: opts.text ?? 'Text',
        x: parseFloat(opts.x ?? '128'), y: parseFloat(opts.y ?? '128'),
        style: { fontSize: 24, fill: '#ffffff' },
      } as TextNode;
      break;
    case 'mesh':
      node = { id, type: 'mesh', asset: opts.asset ?? '', vertices: [], indices: [] } as MeshNode;
      break;
    default:
      console.error(`Неизвестный тип: ${type}`);
      process.exit(1);
  }

  if (opts.x) (node as any).x = parseFloat(opts.x);
  if (opts.y) (node as any).y = parseFloat(opts.y);
  if (opts.startTime) (node as any).startTime = parseFloat(opts.startTime);
  if (opts.duration) (node as any).duration = parseFloat(opts.duration);

  doc.nodes.push(node);

  // Добавляем в children родителя
  const parent = doc.nodes.find((n) => n.id === parentId);
  if (parent && parent.type === 'container') {
    if (!(parent as ContainerNode).children) (parent as ContainerNode).children = [];
    (parent as ContainerNode).children!.push(id);
  }

  saveDoc(filePath, doc);
  console.log(`Добавлена нода: ${id} (${type}) → parent: ${parentId}`);
}

function cmdAddKeyframe(filePath: string, args: string[]): void {
  const opts = parseArgs(args);
  const doc = loadDoc(filePath);

  const nodeId = opts.node;
  const prop = opts.prop;
  const time = parseFloat(opts.time);
  const value = opts.value.includes('.') ? parseFloat(opts.value) : (isNaN(Number(opts.value)) ? opts.value : Number(opts.value));
  const easing = opts.easing as EasingName | undefined;

  if (!nodeId || !prop || isNaN(time)) {
    console.error('Обязательные параметры: --node, --prop, --time, --value');
    process.exit(1);
  }

  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) {
    console.error(`Нода "${nodeId}" не найдена`);
    process.exit(1);
  }

  if (!node.keyframes) node.keyframes = {};
  const track = (node.keyframes as any)[prop] ?? [];
  const kf: any = { time, value };
  if (easing) kf.easing = easing;
  track.push(kf);
  track.sort((a: any, b: any) => a.time - b.time);
  (node.keyframes as any)[prop] = track;

  saveDoc(filePath, doc);
  console.log(`Keyframe: ${nodeId}.${prop} @ ${time}ms = ${value}${easing ? ` (${easing})` : ''}`);
}

function cmdAddParticle(filePath: string, args: string[]): void {
  const opts = parseArgs(args);
  const doc = loadDoc(filePath);

  const id = opts.id ?? `particle-${(doc.particles?.length ?? 0) + 1}`;
  const mode = (opts.mode ?? 'burst') as 'burst' | 'continuous';
  const x = parseFloat(opts.x ?? String(doc.width / 2));
  const y = parseFloat(opts.y ?? String(doc.height / 2));

  const particle: VanimParticle = {
    id,
    startTime: parseFloat(opts.startTime ?? '0'),
    mode,
    x, y,
    config: {
      count: parseInt(opts.count ?? '15'),
      lifetime: parseFloat(opts.lifetime ?? '500'),
      speed: { min: 2, max: 6 },
      size: { min: 1, max: 3 },
      color: opts.color ?? '#FFD700',
      alpha: { start: 1, end: 0 },
      direction: { min: 0, max: 6.283 },
      gravity: 0,
      blendMode: 'add',
    },
  };

  if (mode === 'continuous' && opts.duration) {
    particle.duration = parseFloat(opts.duration);
  }

  if (!doc.particles) doc.particles = [];
  doc.particles.push(particle);

  saveDoc(filePath, doc);
  console.log(`Добавлена частица: ${id} (${mode}) [${x},${y}]`);
}

function cmdMerge(basePath: string, overlayPath: string): void {
  const base = loadDoc(basePath);
  const overlay = loadDoc(overlayPath);

  const existingIds = new Set(base.nodes.map((n) => n.id));

  // Добавляем ноды из overlay (кроме дубликатов)
  for (const node of overlay.nodes) {
    if (!existingIds.has(node.id)) {
      base.nodes.push(node);
    }
  }

  // Объединяем частицы
  const existingParticleIds = new Set((base.particles ?? []).map((p) => p.id));
  for (const p of overlay.particles ?? []) {
    if (!existingParticleIds.has(p.id)) {
      if (!base.particles) base.particles = [];
      base.particles.push(p);
    }
  }

  // Объединяем ассеты
  if (overlay.assets) {
    if (!base.assets) base.assets = {};
    for (const [key, asset] of Object.entries(overlay.assets)) {
      if (!(key in base.assets)) {
        base.assets[key] = asset;
      }
    }
  }

  // Объединяем params
  if (overlay.params) {
    if (!base.params) base.params = {};
    for (const [key, param] of Object.entries(overlay.params)) {
      if (!(key in base.params)) {
        base.params[key] = param;
      }
    }
  }

  // Duration = max
  base.duration = Math.max(base.duration, overlay.duration);

  saveDoc(basePath, base);
  console.log(`Merged: ${overlayPath} → ${basePath}`);
  console.log(`  nodes: ${base.nodes.length}, particles: ${base.particles?.length ?? 0}`);
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create':
    if (!args[1]) { console.error('Usage: vanim create <name>'); process.exit(1); }
    cmdCreate(args[1]);
    break;
  case 'validate':
    if (!args[1]) { console.error('Usage: vanim validate <file>'); process.exit(1); }
    cmdValidate(args[1]);
    break;
  case 'info':
    if (!args[1]) { console.error('Usage: vanim info <file>'); process.exit(1); }
    cmdInfo(args[1]);
    break;
  case 'list-nodes':
    if (!args[1]) { console.error('Usage: vanim list-nodes <file>'); process.exit(1); }
    cmdListNodes(args[1]);
    break;
  case 'add-node':
    if (!args[1]) { console.error('Usage: vanim add-node <file> --type <type> --id <id>'); process.exit(1); }
    cmdAddNode(args[1], args.slice(2));
    break;
  case 'add-keyframe':
    if (!args[1]) { console.error('Usage: vanim add-keyframe <file> --node <id> --prop <prop> --time <ms> --value <val>'); process.exit(1); }
    cmdAddKeyframe(args[1], args.slice(2));
    break;
  case 'add-particle':
    if (!args[1]) { console.error('Usage: vanim add-particle <file> --id <id> --mode burst --x 256 --y 256'); process.exit(1); }
    cmdAddParticle(args[1], args.slice(2));
    break;
  case 'merge':
    if (!args[1] || !args[2]) { console.error('Usage: vanim merge <base.vanim> <overlay.vanim>'); process.exit(1); }
    cmdMerge(args[1], args[2]);
    break;
  default:
    console.log(`VenomAnimator CLI

Команды:
  create <name>                                     Создать .vanim из шаблона
  validate <file>                                   Валидация файла
  info <file>                                       Мета-информация
  list-nodes <file>                                 Дерево нод
  add-node <file> --type <type> --id <id> [opts]    Добавить ноду
  add-keyframe <file> --node <id> --prop <p> --time <ms> --value <v> [--easing <e>]
  add-particle <file> --id <id> --mode <mode> --x <x> --y <y>
  merge <base.vanim> <overlay.vanim>                Объединить файлы

Запуск: npx vite-node src/cli/vanim-cli.ts -- <command> [args]`);
}
