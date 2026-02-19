import type { Keyframe, KeyframeMap, KeyframeProperty, EasingName } from '$lib/types/vanim';
import { getEasing } from '$lib/types/easing';

/**
 * Вычисляет интерполированное значение keyframe-трека в заданный момент времени.
 * Поддерживает числовые значения с easing-интерполяцией.
 */
export function evaluateKeyframes(
  keyframes: Keyframe[],
  time: number,
): number | string {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // До первого keyframe — зафиксировано на первом значении
  if (time <= keyframes[0].time) return keyframes[0].value;

  // После последнего keyframe — зафиксировано на последнем значении
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.value;

  // Находим пару keyframe'ов для интерполяции
  for (let i = 0; i < keyframes.length - 1; i++) {
    const from = keyframes[i];
    const to = keyframes[i + 1];

    if (time >= from.time && time <= to.time) {
      // Для строковых значений (tint hex) — без интерполяции, snap к ближайшему
      if (typeof from.value === 'string' || typeof to.value === 'string') {
        return time < (from.time + to.time) / 2 ? from.value : to.value;
      }

      const duration = to.time - from.time;
      if (duration === 0) return to.value;

      const progress = (time - from.time) / duration;
      const easingName: EasingName = to.easing ?? 'linear';
      const easedProgress = getEasing(easingName)(progress);

      return from.value + (to.value - from.value) * easedProgress;
    }
  }

  return last.value;
}

/**
 * Вычисляет все keyframe-свойства ноды в заданный момент времени.
 * Возвращает объект { property: value } только для тех свойств, у которых есть keyframes.
 */
export function evaluateAllKeyframes(
  keyframeMap: KeyframeMap | undefined,
  localTime: number,
): Partial<Record<KeyframeProperty, number | string>> {
  if (!keyframeMap) return {};

  const result: Partial<Record<KeyframeProperty, number | string>> = {};

  for (const [prop, keyframes] of Object.entries(keyframeMap)) {
    if (keyframes && keyframes.length > 0) {
      result[prop as KeyframeProperty] = evaluateKeyframes(keyframes, localTime);
    }
  }

  return result;
}

/**
 * Вычисляет локальное время ноды с учётом startTime.
 * Возвращает null если нода ещё не стартовала или уже завершилась.
 */
export function getNodeLocalTime(
  globalTime: number,
  startTime: number = 0,
  duration?: number,
): number | null {
  const localTime = globalTime - startTime;
  if (localTime < 0) return null;
  if (duration !== undefined && localTime > duration) return null;
  return localTime;
}
