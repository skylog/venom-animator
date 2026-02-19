import { describe, it, expect } from 'vitest';
import { evaluateKeyframes, evaluateAllKeyframes, getNodeLocalTime } from './KeyframeEvaluator';
import type { Keyframe, KeyframeMap } from '$lib/types/vanim';

describe('evaluateKeyframes', () => {
  it('пустой массив -> 0', () => {
    expect(evaluateKeyframes([], 100)).toBe(0);
  });

  it('один keyframe -> его значение', () => {
    const kfs: Keyframe[] = [{ time: 0, value: 42 }];
    expect(evaluateKeyframes(kfs, 0)).toBe(42);
    expect(evaluateKeyframes(kfs, 999)).toBe(42);
  });

  it('до первого keyframe -> первое значение', () => {
    const kfs: Keyframe[] = [
      { time: 100, value: 10 },
      { time: 200, value: 20 },
    ];
    expect(evaluateKeyframes(kfs, 0)).toBe(10);
    expect(evaluateKeyframes(kfs, 50)).toBe(10);
  });

  it('после последнего keyframe -> последнее значение', () => {
    const kfs: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 100, value: 50 },
    ];
    expect(evaluateKeyframes(kfs, 100)).toBe(50);
    expect(evaluateKeyframes(kfs, 999)).toBe(50);
  });

  it('линейная интерполяция между keyframes', () => {
    const kfs: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 100, value: 100 },
    ];
    expect(evaluateKeyframes(kfs, 50)).toBeCloseTo(50, 5);
    expect(evaluateKeyframes(kfs, 25)).toBeCloseTo(25, 5);
    expect(evaluateKeyframes(kfs, 75)).toBeCloseTo(75, 5);
  });

  it('easing применяется к интерполяции', () => {
    const kfs: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 100, value: 100, easing: 'easeInQuad' },
    ];
    // easeInQuad(0.5) = 0.25, поэтому value = 25
    const result = evaluateKeyframes(kfs, 50);
    expect(result).toBeCloseTo(25, 1);
  });

  it('три keyframe — интерполяция в правильном сегменте', () => {
    const kfs: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 100, value: 100 },
      { time: 200, value: 50 },
    ];
    expect(evaluateKeyframes(kfs, 50)).toBeCloseTo(50, 5);
    expect(evaluateKeyframes(kfs, 150)).toBeCloseTo(75, 5);
  });

  it('строковые значения — snap к ближайшему', () => {
    const kfs: Keyframe[] = [
      { time: 0, value: '#FF0000' },
      { time: 100, value: '#00FF00' },
    ];
    expect(evaluateKeyframes(kfs, 40)).toBe('#FF0000');
    expect(evaluateKeyframes(kfs, 60)).toBe('#00FF00');
  });

  it('нулевая длительность сегмента — первый keyframe при совпадении time', () => {
    const kfs: Keyframe[] = [
      { time: 50, value: 10 },
      { time: 50, value: 20 },
    ];
    // Когда time === keyframes[0].time, возвращает первое значение
    expect(evaluateKeyframes(kfs, 50)).toBe(10);
    // После этого времени — последнее значение
    expect(evaluateKeyframes(kfs, 51)).toBe(20);
  });
});

describe('evaluateAllKeyframes', () => {
  it('undefined -> пустой объект', () => {
    expect(evaluateAllKeyframes(undefined, 50)).toEqual({});
  });

  it('возвращает интерполированные значения для всех свойств', () => {
    const map: KeyframeMap = {
      x: [{ time: 0, value: 0 }, { time: 100, value: 200 }],
      alpha: [{ time: 0, value: 1 }, { time: 100, value: 0 }],
    };
    const result = evaluateAllKeyframes(map, 50);
    expect(result.x).toBeCloseTo(100, 5);
    expect(result.alpha).toBeCloseTo(0.5, 5);
  });

  it('пропускает пустые треки', () => {
    const map: KeyframeMap = {
      x: [],
      y: [{ time: 0, value: 10 }],
    };
    const result = evaluateAllKeyframes(map, 0);
    expect(result.x).toBeUndefined();
    expect(result.y).toBe(10);
  });
});

describe('getNodeLocalTime', () => {
  it('без startTime — globalTime === localTime', () => {
    expect(getNodeLocalTime(100)).toBe(100);
    expect(getNodeLocalTime(0)).toBe(0);
  });

  it('с startTime — сдвиг', () => {
    expect(getNodeLocalTime(150, 100)).toBe(50);
    expect(getNodeLocalTime(100, 100)).toBe(0);
  });

  it('до startTime -> null', () => {
    expect(getNodeLocalTime(50, 100)).toBeNull();
  });

  it('после duration -> null', () => {
    expect(getNodeLocalTime(250, 100, 100)).toBeNull();
  });

  it('в пределах duration -> localTime', () => {
    expect(getNodeLocalTime(150, 100, 100)).toBe(50);
    expect(getNodeLocalTime(200, 100, 100)).toBe(100);
  });
});
