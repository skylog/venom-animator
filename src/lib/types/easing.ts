import type { EasingName } from './vanim';

export type EasingFn = (t: number) => number;

const linear: EasingFn = (t) => t;

const easeInQuad: EasingFn = (t) => t * t;

const easeOutQuad: EasingFn = (t) => t * (2 - t);

const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const easeInCubic: EasingFn = (t) => t * t * t;

const easeOutCubic: EasingFn = (t) => (--t) * t * t + 1;

const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeInOutSine: EasingFn = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

const spring: EasingFn = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const EASING_MAP: Record<EasingName, EasingFn> = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
  easeInOutSine,
  spring,
};

export function getEasing(name: EasingName): EasingFn {
  return EASING_MAP[name] ?? linear;
}

export { EASING_MAP };
