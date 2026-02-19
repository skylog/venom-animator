import { describe, it, expect } from 'vitest';
import { validateVanim, parseAndValidateVanim, formatValidationErrors } from './vanim-validator';

const VALID_DOC = {
  version: 1,
  name: 'test-anim',
  duration: 500,
  width: 256,
  height: 256,
  assets: {},
  nodes: [
    { id: 'root', type: 'container', children: ['glow'] },
    {
      id: 'glow',
      type: 'graphics',
      graphics: { type: 'circle', cx: 128, cy: 128, radius: 40, fill: { color: '#00FF00' } },
      keyframes: {
        alpha: [{ time: 0, value: 0 }, { time: 250, value: 1, easing: 'easeOutQuad' }, { time: 500, value: 0 }],
      },
    },
  ],
  particles: [],
  params: {},
};

describe('validateVanim', () => {
  it('валидный документ — 0 ошибок', () => {
    const errors = validateVanim(VALID_DOC);
    const criticalErrors = errors.filter((e) => e.severity === 'error');
    expect(criticalErrors).toHaveLength(0);
  });

  it('не объект — ошибка', () => {
    expect(validateVanim(null)).toHaveLength(1);
    expect(validateVanim([])).toHaveLength(1);
    expect(validateVanim('string')).toHaveLength(1);
  });

  it('отсутствующие обязательные поля', () => {
    const errors = validateVanim({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.path === '$.version')).toBe(true);
    expect(errors.some((e) => e.path === '$.name')).toBe(true);
    expect(errors.some((e) => e.path === '$.nodes')).toBe(true);
  });

  it('дублирующийся node id', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: [] },
        { id: 'root', type: 'container', children: [] },
      ],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('Дублирующийся id'))).toBe(true);
  });

  it('неизвестный тип ноды', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [{ id: 'root', type: 'unknown_type' }],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('Неизвестный тип ноды'))).toBe(true);
  });

  it('невалидный easing', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: ['n1'] },
        { id: 'n1', type: 'graphics', graphics: { type: 'circle', cx: 0, cy: 0, radius: 10 }, keyframes: { alpha: [{ time: 0, value: 0 }, { time: 100, value: 1, easing: 'easeBounce' }] } },
      ],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('Неизвестный easing'))).toBe(true);
  });

  it('children ссылается на несуществующую ноду', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [{ id: 'root', type: 'container', children: ['missing'] }],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('несуществующую ноду'))).toBe(true);
  });

  it('sprite без asset — ошибка', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: ['s1'] },
        { id: 's1', type: 'sprite' },
      ],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('asset'))).toBe(true);
  });

  it('text без text поля — ошибка', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: ['t1'] },
        { id: 't1', type: 'text' },
      ],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('поле text'))).toBe(true);
  });

  it('graphics без graphics объекта — ошибка', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: ['g1'] },
        { id: 'g1', type: 'graphics' },
      ],
    };
    const errors = validateVanim(doc);
    expect(errors.some((e) => e.message.includes('graphics'))).toBe(true);
  });

  it('asset ссылка на несуществующий ассет — warning', () => {
    const doc = {
      ...VALID_DOC,
      nodes: [
        { id: 'root', type: 'container', children: ['s1'] },
        { id: 's1', type: 'sprite', asset: 'nonexistent' },
      ],
    };
    const errors = validateVanim(doc);
    const warnings = errors.filter((e) => e.severity === 'warning');
    expect(warnings.some((e) => e.message.includes('nonexistent'))).toBe(true);
  });
});

describe('parseAndValidateVanim', () => {
  it('валидный JSON строка', () => {
    const result = parseAndValidateVanim(JSON.stringify(VALID_DOC));
    expect(result.ok).toBe(true);
  });

  it('невалидный JSON — ошибка парсинга', () => {
    const result = parseAndValidateVanim('{broken json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toContain('Невалидный JSON');
    }
  });

  it('валидный JSON но невалидный документ', () => {
    const result = parseAndValidateVanim('{}');
    expect(result.ok).toBe(false);
  });
});

describe('formatValidationErrors', () => {
  it('пустой массив -> OK', () => {
    expect(formatValidationErrors([])).toBe('OK');
  });

  it('форматирует ошибки', () => {
    const errors = [
      { path: '$.name', message: 'name обязателен', severity: 'error' as const },
      { path: '$.nodes[0].type', message: 'неизвестный тип', severity: 'warning' as const },
    ];
    const result = formatValidationErrors(errors);
    expect(result).toContain('[ERROR]');
    expect(result).toContain('[WARNING]');
    expect(result).toContain('$.name');
  });
});
