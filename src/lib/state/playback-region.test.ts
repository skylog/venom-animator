import { describe, it, expect } from 'vitest';

// Тестируем region-логику (pure functions, без $state)
describe('Playback region logic', () => {
  function effectiveStart(regionStart: number | null): number {
    return regionStart ?? 0;
  }

  function effectiveEnd(regionEnd: number | null, duration: number): number {
    return regionEnd ?? duration;
  }

  function hasRegion(start: number | null, end: number | null): boolean {
    return start !== null && end !== null;
  }

  // Симулируем tick с регионом
  function tickRegion(
    currentTime: number,
    delta: number,
    start: number,
    end: number,
    loop: boolean,
  ): { time: number; stopped: boolean } {
    let t = currentTime + delta;
    if (t >= end) {
      if (loop) {
        const range = end - start;
        t = start + ((t - start) % range);
        return { time: t, stopped: false };
      } else {
        return { time: end, stopped: true };
      }
    }
    return { time: t, stopped: false };
  }

  it('effectiveStart returns 0 when no region', () => {
    expect(effectiveStart(null)).toBe(0);
  });

  it('effectiveStart returns regionStart', () => {
    expect(effectiveStart(400)).toBe(400);
  });

  it('effectiveEnd returns duration when no region', () => {
    expect(effectiveEnd(null, 1400)).toBe(1400);
  });

  it('effectiveEnd returns regionEnd', () => {
    expect(effectiveEnd(650, 1400)).toBe(650);
  });

  it('hasRegion false when null', () => {
    expect(hasRegion(null, null)).toBe(false);
    expect(hasRegion(0, null)).toBe(false);
    expect(hasRegion(null, 100)).toBe(false);
  });

  it('hasRegion true when both set', () => {
    expect(hasRegion(0, 400)).toBe(true);
  });

  describe('tickRegion', () => {
    it('продвигает время внутри региона', () => {
      const r = tickRegion(400, 50, 400, 650, false);
      expect(r.time).toBe(450);
      expect(r.stopped).toBe(false);
    });

    it('останавливается на конце региона (без loop)', () => {
      const r = tickRegion(640, 20, 400, 650, false);
      expect(r.time).toBe(650);
      expect(r.stopped).toBe(true);
    });

    it('loop: оборачивает к началу региона', () => {
      const r = tickRegion(640, 20, 400, 650, true);
      // 640 + 20 = 660, range = 250, (660-400) % 250 = 10, start + 10 = 410
      expect(r.time).toBe(410);
      expect(r.stopped).toBe(false);
    });

    it('loop: точно на конце → возвращается к началу', () => {
      const r = tickRegion(640, 10, 400, 650, true);
      // 650 >= 650, range = 250, (650-400) % 250 = 0, start + 0 = 400
      expect(r.time).toBe(400);
      expect(r.stopped).toBe(false);
    });
  });
});
