import type { VanimDocument, VanimNode, NodeType, EasingName, BlendMode } from '$lib/types/vanim';

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

const VALID_NODE_TYPES: NodeType[] = ['container', 'sprite', 'spritesheet_anim', 'graphics', 'text', 'mesh'];
const VALID_EASING: EasingName[] = [
  'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeOutBack', 'easeInOutSine', 'spring',
];
const VALID_BLEND_MODES: BlendMode[] = ['normal', 'add', 'multiply', 'screen'];
const VALID_GRAPHICS_TYPES = ['line', 'circle', 'rect', 'roundRect'];
const VALID_KEYFRAME_PROPS = ['x', 'y', 'scaleX', 'scaleY', 'scale', 'rotation', 'alpha', 'tint', 'fromX', 'fromY', 'toX', 'toY', 'radius', 'width', 'height'];

/**
 * Валидирует .vanim JSON. Возвращает массив ошибок с понятными описаниями.
 * Designed для LLM-генерированных файлов — ошибки описывают что исправить.
 */
export function validateVanim(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({ path: '$', message: 'Документ должен быть JSON объектом', severity: 'error' });
    return errors;
  }

  const doc = data as Record<string, unknown>;

  // Required fields
  if (doc.version !== 1) {
    errors.push({ path: '$.version', message: 'version должен быть 1', severity: 'error' });
  }
  if (typeof doc.name !== 'string' || doc.name.length === 0) {
    errors.push({ path: '$.name', message: 'name должен быть непустой строкой (kebab-case, например "snake-strike")', severity: 'error' });
  }
  if (typeof doc.duration !== 'number' || doc.duration <= 0) {
    errors.push({ path: '$.duration', message: 'duration должен быть положительным числом (миллисекунды)', severity: 'error' });
  }
  if (typeof doc.width !== 'number' || doc.width <= 0) {
    errors.push({ path: '$.width', message: 'width должен быть положительным числом', severity: 'error' });
  }
  if (typeof doc.height !== 'number' || doc.height <= 0) {
    errors.push({ path: '$.height', message: 'height должен быть положительным числом', severity: 'error' });
  }

  // Nodes
  if (!Array.isArray(doc.nodes)) {
    errors.push({ path: '$.nodes', message: 'nodes должен быть массивом', severity: 'error' });
    return errors;
  }

  const nodeIds = new Set<string>();
  const allChildRefs = new Set<string>();

  for (let i = 0; i < (doc.nodes as unknown[]).length; i++) {
    const node = (doc.nodes as unknown[])[i] as Record<string, unknown>;
    const path = `$.nodes[${i}]`;

    if (typeof node !== 'object' || node === null) {
      errors.push({ path, message: 'Нода должна быть объектом', severity: 'error' });
      continue;
    }

    // id
    if (typeof node.id !== 'string' || node.id.length === 0) {
      errors.push({ path: `${path}.id`, message: 'id должен быть непустой строкой', severity: 'error' });
    } else if (nodeIds.has(node.id as string)) {
      errors.push({ path: `${path}.id`, message: `Дублирующийся id: "${node.id}". Каждая нода должна иметь уникальный id`, severity: 'error' });
    } else {
      nodeIds.add(node.id as string);
    }

    // type
    if (!VALID_NODE_TYPES.includes(node.type as NodeType)) {
      errors.push({ path: `${path}.type`, message: `Неизвестный тип ноды: "${node.type}". Допустимые: ${VALID_NODE_TYPES.join(', ')}`, severity: 'error' });
    }

    // children (только для container)
    if (node.type === 'container' && node.children) {
      if (!Array.isArray(node.children)) {
        errors.push({ path: `${path}.children`, message: 'children должен быть массивом строк (id дочерних нод)', severity: 'error' });
      } else {
        for (const childId of node.children as unknown[]) {
          if (typeof childId !== 'string') {
            errors.push({ path: `${path}.children`, message: 'Каждый элемент children должен быть строкой (id ноды)', severity: 'error' });
          } else {
            allChildRefs.add(childId);
          }
        }
      }
    }

    // asset (для sprite/spritesheet_anim/mesh)
    if ((node.type === 'sprite' || node.type === 'spritesheet_anim' || node.type === 'mesh') && typeof node.asset !== 'string') {
      errors.push({ path: `${path}.asset`, message: `Нода типа ${node.type} должна иметь поле asset (id ассета из assets)`, severity: 'error' });
    }

    // text
    if (node.type === 'text' && typeof node.text !== 'string') {
      errors.push({ path: `${path}.text`, message: 'Нода типа text должна иметь поле text (строка)', severity: 'error' });
    }

    // graphics
    if (node.type === 'graphics') {
      if (typeof node.graphics !== 'object' || node.graphics === null) {
        errors.push({ path: `${path}.graphics`, message: 'Нода типа graphics должна иметь объект graphics с полем type (line/circle/rect/roundRect)', severity: 'error' });
      } else {
        const gfx = node.graphics as Record<string, unknown>;
        if (!VALID_GRAPHICS_TYPES.includes(gfx.type as string)) {
          errors.push({ path: `${path}.graphics.type`, message: `Неизвестный тип графики: "${gfx.type}". Допустимые: ${VALID_GRAPHICS_TYPES.join(', ')}`, severity: 'error' });
        }
      }
    }

    // mesh
    if (node.type === 'mesh') {
      if (!Array.isArray(node.vertices) || (node.vertices as unknown[]).length === 0) {
        errors.push({ path: `${path}.vertices`, message: 'Нода типа mesh должна иметь непустой массив vertices [{x, y, u, v}]', severity: 'error' });
      } else {
        for (let vi = 0; vi < (node.vertices as unknown[]).length; vi++) {
          const v = (node.vertices as unknown[])[vi] as Record<string, unknown>;
          if (typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.u !== 'number' || typeof v.v !== 'number') {
            errors.push({ path: `${path}.vertices[${vi}]`, message: 'Каждая вершина должна иметь числовые поля x, y, u, v', severity: 'error' });
            break;
          }
        }
      }
      if (!Array.isArray(node.indices) || (node.indices as unknown[]).length === 0) {
        errors.push({ path: `${path}.indices`, message: 'Нода типа mesh должна иметь непустой массив indices (тройки индексов треугольников)', severity: 'error' });
      } else if ((node.indices as unknown[]).length % 3 !== 0) {
        errors.push({ path: `${path}.indices`, message: 'indices должен содержать тройки индексов (длина кратна 3)', severity: 'warning' });
      }
    }

    // blendMode
    if (node.blendMode !== undefined && !VALID_BLEND_MODES.includes(node.blendMode as BlendMode)) {
      errors.push({ path: `${path}.blendMode`, message: `Неизвестный blendMode: "${node.blendMode}". Допустимые: ${VALID_BLEND_MODES.join(', ')}`, severity: 'error' });
    }

    // keyframes
    if (node.keyframes && typeof node.keyframes === 'object') {
      const kfMap = node.keyframes as Record<string, unknown>;
      for (const [prop, kfs] of Object.entries(kfMap)) {
        const isVertexProp = /^vertex\d+_(x|y)$/.test(prop);
        if (!VALID_KEYFRAME_PROPS.includes(prop) && !isVertexProp) {
          errors.push({ path: `${path}.keyframes.${prop}`, message: `Неизвестное keyframe-свойство: "${prop}". Допустимые: ${VALID_KEYFRAME_PROPS.join(', ')}, vertex0_x, vertex0_y, ...`, severity: 'warning' });
        }
        if (!Array.isArray(kfs)) {
          errors.push({ path: `${path}.keyframes.${prop}`, message: 'Значение должно быть массивом keyframes [{time, value, easing?}]', severity: 'error' });
          continue;
        }
        for (let k = 0; k < (kfs as unknown[]).length; k++) {
          const kf = (kfs as unknown[])[k] as Record<string, unknown>;
          if (typeof kf.time !== 'number') {
            errors.push({ path: `${path}.keyframes.${prop}[${k}].time`, message: 'time должен быть числом (мс)', severity: 'error' });
          }
          if (kf.value === undefined) {
            errors.push({ path: `${path}.keyframes.${prop}[${k}].value`, message: 'value обязателен (число или строка)', severity: 'error' });
          }
          if (kf.easing !== undefined && !VALID_EASING.includes(kf.easing as EasingName)) {
            errors.push({ path: `${path}.keyframes.${prop}[${k}].easing`, message: `Неизвестный easing: "${kf.easing}". Допустимые: ${VALID_EASING.join(', ')}`, severity: 'error' });
          }
        }
      }
    }
  }

  // Проверяем ссылки children
  for (const childId of allChildRefs) {
    if (!nodeIds.has(childId)) {
      errors.push({ path: '$.nodes', message: `children ссылается на несуществующую ноду: "${childId}". Добавьте ноду с таким id в nodes[]`, severity: 'error' });
    }
  }

  // Проверяем asset ссылки
  const assetIds = new Set(doc.assets ? Object.keys(doc.assets as object) : []);
  for (let i = 0; i < (doc.nodes as unknown[]).length; i++) {
    const node = (doc.nodes as unknown[])[i] as Record<string, unknown>;
    if ((node.type === 'sprite' || node.type === 'spritesheet_anim' || node.type === 'mesh') && typeof node.asset === 'string') {
      if (!assetIds.has(node.asset)) {
        errors.push({ path: `$.nodes[${i}].asset`, message: `Ассет "${node.asset}" не найден в assets. Добавьте его в assets: { "${node.asset}": { type: "texture", path: "..." } }`, severity: 'warning' });
      }
    }
  }

  // Particles
  if (doc.particles && Array.isArray(doc.particles)) {
    for (let i = 0; i < (doc.particles as unknown[]).length; i++) {
      const p = (doc.particles as unknown[])[i] as Record<string, unknown>;
      const path = `$.particles[${i}]`;

      if (typeof p.id !== 'string') errors.push({ path: `${path}.id`, message: 'id обязателен', severity: 'error' });
      if (typeof p.startTime !== 'number') errors.push({ path: `${path}.startTime`, message: 'startTime обязателен (число, мс)', severity: 'error' });
      if (p.mode !== 'burst' && p.mode !== 'continuous') errors.push({ path: `${path}.mode`, message: 'mode должен быть "burst" или "continuous"', severity: 'error' });
      if (typeof p.x !== 'number') errors.push({ path: `${path}.x`, message: 'x обязателен', severity: 'error' });
      if (typeof p.y !== 'number') errors.push({ path: `${path}.y`, message: 'y обязателен', severity: 'error' });

      if (typeof p.config !== 'object' || p.config === null) {
        errors.push({ path: `${path}.config`, message: 'config обязателен (объект с count, lifetime, speed, size, color, alpha, direction)', severity: 'error' });
      }
    }
  }

  return errors;
}

/**
 * Форматирует ошибки валидации в читаемую строку.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'OK';
  return errors
    .map((e) => `[${e.severity.toUpperCase()}] ${e.path}: ${e.message}`)
    .join('\n');
}

/**
 * Пытается распарсить JSON и провалидировать как .vanim.
 * Возвращает документ или массив ошибок.
 */
export function parseAndValidateVanim(jsonString: string): { ok: true; document: VanimDocument } | { ok: false; errors: ValidationError[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      ok: false,
      errors: [{ path: '$', message: `Невалидный JSON: ${(e as Error).message}`, severity: 'error' }],
    };
  }

  const errors = validateVanim(parsed);
  const hasErrors = errors.some((e) => e.severity === 'error');

  if (hasErrors) {
    return { ok: false, errors };
  }

  return { ok: true, document: parsed as VanimDocument };
}
