import { describe, it, expect } from 'vitest';
import { getEasing, EASING_MAP } from './easing';
import type { EasingName } from './vanim';

describe('easing functions', () => {
  const allNames: EasingName[] = [
    'linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
    'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
    'easeOutBack', 'easeInOutSine', 'spring',
  ];

  it('все 10 easing-функций зарегистрированы', () => {
    expect(Object.keys(EASING_MAP)).toHaveLength(10);
    for (const name of allNames) {
      expect(EASING_MAP[name]).toBeDefined();
    }
  });

  for (const name of allNames) {
    describe(name, () => {
      const fn = getEasing(name);

      it('f(0) === 0', () => {
        expect(fn(0)).toBeCloseTo(0, 5);
      });

      it('f(1) === 1', () => {
        expect(fn(1)).toBeCloseTo(1, 5);
      });

      it('возвращает число для промежуточных значений', () => {
        for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
          const result = fn(t);
          expect(typeof result).toBe('number');
          expect(isNaN(result)).toBe(false);
        }
      });
    });
  }

  it('linear возвращает t без изменений', () => {
    const fn = getEasing('linear');
    expect(fn(0.3)).toBeCloseTo(0.3, 10);
    expect(fn(0.7)).toBeCloseTo(0.7, 10);
  });

  it('easeOutBack overshoot — значение > 1 в середине', () => {
    const fn = getEasing('easeOutBack');
    // easeOutBack должен «перелететь» за 1 перед t=1
    const mid = fn(0.6);
    expect(mid).toBeGreaterThan(1);
  });

  it('getEasing возвращает linear для неизвестного имени', () => {
    const fn = getEasing('unknown' as EasingName);
    expect(fn(0.5)).toBeCloseTo(0.5, 10);
  });
});
