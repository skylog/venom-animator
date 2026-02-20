import { describe, it, expect } from 'vitest';

// Тестируем zoom-логику напрямую (без $state)
describe('Timeline zoom logic', () => {
  const MIN = 0.05;
  const MAX = 5.0;
  const FACTOR = 1.2;

  function zoomIn(current: number): number {
    return Math.min(current * FACTOR, MAX);
  }

  function zoomOut(current: number): number {
    return Math.max(current / FACTOR, MIN);
  }

  it('zoomIn увеличивает pxPerMs', () => {
    expect(zoomIn(0.5)).toBeCloseTo(0.6);
  });

  it('zoomOut уменьшает pxPerMs', () => {
    expect(zoomOut(0.5)).toBeCloseTo(0.5 / 1.2);
  });

  it('zoomIn не превышает MAX', () => {
    expect(zoomIn(4.5)).toBeCloseTo(5.0);
    expect(zoomIn(5.0)).toBe(5.0);
  });

  it('zoomOut не ниже MIN', () => {
    expect(zoomOut(0.06)).toBeCloseTo(0.05);
    expect(zoomOut(0.05)).toBe(0.05);
  });

  it('10 зумов in/out возвращают примерно к исходному', () => {
    let val = 0.5;
    for (let i = 0; i < 10; i++) val = zoomIn(val);
    for (let i = 0; i < 10; i++) val = zoomOut(val);
    expect(val).toBeCloseTo(0.5, 5);
  });
});
