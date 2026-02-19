import type { VanimDocument } from '$lib/types/vanim';
import { VANIM_JSON_SCHEMA } from './vanim-schema';

/**
 * Строит промпт для LLM, содержащий:
 * 1. Формат .vanim (JSON Schema + примеры)
 * 2. Текущее состояние документа (если есть)
 * 3. Запрос пользователя
 *
 * LLM-friendly: промпт структурирован с XML-тегами для лёгкого парсинга.
 */
export function buildPrompt(
  userRequest: string,
  currentDoc?: VanimDocument,
): string {
  const parts: string[] = [];

  parts.push(`<system>
Ты — генератор анимаций для VenomAnimator. Твоя задача — создать JSON в формате .vanim.
Ответ должен содержать ТОЛЬКО валидный JSON (без markdown, без пояснений).
</system>`);

  parts.push(`<vanim-schema>
${JSON.stringify(VANIM_JSON_SCHEMA, null, 2)}
</vanim-schema>`);

  parts.push(`<format-rules>
## Ключевые правила формата .vanim:

1. nodes[] — ПЛОСКИЙ массив. Иерархия ТОЛЬКО через children[] в container нодах.
2. Первая нода обычно root container с children ссылающимися на остальные ноды.
3. Время везде в МИЛЛИСЕКУНДАХ.
4. Keyframes — объект { property: [{time, value, easing?}] }. Свойства: x, y, scale, scaleX, scaleY, rotation, alpha, tint.
5. easing указывается на ПРИНИМАЮЩЕМ keyframe (не на начальном). По умолчанию linear.
6. startTime/duration на ноде — окно видимости. Keyframe time ЛОКАЛЬНЫЙ (от startTime ноды).
7. graphics ноды: type=line нужен stroke, type=circle/rect/roundRect — fill и/или stroke.
8. text ноды поддерживают {{paramName}} — подставляются из params в рантайме.
9. Цвета в hex формате: "#RRGGBB".
10. Все id — уникальные, kebab-case.

## Доступные easing функции:
linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic, easeInOutCubic, easeOutBack, easeInOutSine, spring

## Частицы:
- mode: "burst" — все частицы сразу, "continuous" — по одной в течение duration
- direction: {min, max} в радианах (0–6.283 = полный круг)
- blendMode: "add" для светящихся частиц
</format-rules>`);

  parts.push(`<example>
{
  "version": 1,
  "name": "pulse-glow",
  "duration": 600,
  "width": 256, "height": 256,
  "assets": {},
  "nodes": [
    { "id": "root", "type": "container", "children": ["glow"] },
    {
      "id": "glow",
      "type": "graphics",
      "graphics": { "type": "circle", "cx": 128, "cy": 128, "radius": 40, "fill": { "color": "#00C853", "alpha": 0.8 } },
      "blendMode": "add",
      "keyframes": {
        "alpha": [{ "time": 0, "value": 0 }, { "time": 300, "value": 1, "easing": "easeOutQuad" }, { "time": 600, "value": 0, "easing": "easeInQuad" }],
        "scale": [{ "time": 0, "value": 0.5 }, { "time": 300, "value": 1.2, "easing": "easeOutBack" }, { "time": 600, "value": 0.5 }]
      }
    }
  ],
  "particles": [],
  "params": {}
}
</example>`);

  if (currentDoc) {
    parts.push(`<current-document>
${JSON.stringify(currentDoc, null, 2)}
</current-document>

<instruction>
Модифицируй текущий документ согласно запросу. Верни ПОЛНЫЙ обновлённый JSON.
</instruction>`);
  }

  parts.push(`<user-request>
${userRequest}
</user-request>`);

  return parts.join('\n\n');
}

/**
 * Краткая версия промпта — только схема + запрос, без примеров.
 * Для копирования в буфер обмена.
 */
export function buildCompactPrompt(userRequest: string): string {
  return `Сгенерируй .vanim JSON анимацию. Ответ — ТОЛЬКО валидный JSON.

Формат: version=1, name, duration (мс), width, height, nodes[] (плоский массив, иерархия через children), keyframes (time в мс, easing), particles[].
Типы нод: container, sprite, spritesheet_anim, graphics, text.
Easing: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic, easeInOutCubic, easeOutBack, easeInOutSine, spring.
Keyframe свойства: x, y, scale, scaleX, scaleY, rotation, alpha, tint.

Запрос: ${userRequest}`;
}
