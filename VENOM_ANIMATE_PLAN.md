# VenomAnimator — Визуальный редактор анимаций для слот-игр

**Репозиторий:** `venom-animator`
**Стек:** Svelte 5 + PixiJS 8 + Vite (standalone)
**Формат экспорта:** `.vanim` (JSON)

---

## Контекст

VenomStrike использует PixiJS 8 для рендеринга. Все анимации (VFX, частицы, эффекты символов) сейчас захардкожены в TypeScript (~1200 строк ручного кода в 3 эффектах). Нужен отдельный инструмент для создания, превью и экспорта анимаций в формате, который игра может импортировать. Инструмент должен поддерживать AI-assist — Claude генерирует JSON анимации по текстовому описанию.

---

## Формат `.vanim` (JSON схема)

```jsonc
{
  "version": 1,
  "name": "snake-strike",
  "duration": 500,
  "width": 512, "height": 512,

  // Ассеты — загружаются при инициализации
  "assets": {
    "strike-flash": { "type": "spritesheet", "path": "./vfx/strike-flash.png", "cols": 4, "rows": 3 },
    "fang-pulse":   { "type": "texture", "path": "./vfx/fang-pulse.png" }
  },

  // Сцена — плоский массив нод с иерархией через children
  "nodes": [
    { "id": "root", "type": "container", "children": ["beam", "flash", "text_popup"] },
    {
      "id": "beam",
      "type": "graphics",
      "blendMode": "add",
      "graphics": {
        "type": "line",
        "fromX": 256, "fromY": 0, "toX": 256, "toY": 400,
        "stroke": { "width": 4, "color": "#00C853", "alpha": 0.9 }
      },
      "keyframes": {
        "alpha":  [{ "time": 0, "value": 0 }, { "time": 200, "value": 1, "easing": "easeOutCubic" }, { "time": 500, "value": 0 }],
        "scaleY": [{ "time": 0, "value": 0 }, { "time": 200, "value": 1, "easing": "easeOutCubic" }]
      }
    },
    {
      "id": "flash",
      "type": "spritesheet_anim",
      "asset": "strike-flash",
      "x": 256, "y": 400,
      "anchorX": 0.5, "anchorY": 0.5,
      "width": 140, "height": 140,
      "startTime": 200,
      "duration": 125,
      "keyframes": {
        "alpha": [{ "time": 0, "value": 0.9 }, { "time": 125, "value": 0, "easing": "easeOutQuad" }],
        "scale": [{ "time": 0, "value": 0.6 }, { "time": 125, "value": 1.0, "easing": "easeOutQuad" }]
      }
    },
    {
      "id": "text_popup",
      "type": "text",
      "text": "{{multiplierText}}",
      "style": { "fontFamily": "Arial", "fontWeight": "bold", "fontSize": 40, "fill": "#FFD600" },
      "x": 256, "y": 350, "anchorX": 0.5, "anchorY": 0.5,
      "startTime": 275, "duration": 225,
      "keyframes": {
        "alpha": [{ "time": 0, "value": 0 }, { "time": 90, "value": 1 }, { "time": 225, "value": 0 }],
        "scale": [{ "time": 0, "value": 0.3 }, { "time": 90, "value": 1.0, "easing": "easeOutBack" }],
        "y":     [{ "time": 0, "value": 350 }, { "time": 225, "value": 280 }]
      }
    }
  ],

  // Системы частиц
  "particles": [
    {
      "id": "strike_sparks",
      "startTime": 200,
      "mode": "burst",
      "x": 256, "y": 400,
      "config": {
        "count": 20,
        "lifetime": 400,
        "speed": { "min": 3, "max": 8 },
        "size": { "min": 1.5, "max": 3.5 },
        "color": "#FFD700",
        "alpha": { "start": 1, "end": 0 },
        "direction": { "min": 0, "max": 6.283 },
        "gravity": 0,
        "blendMode": "add"
      }
    }
  ],

  // Параметры — переопределяются в рантайме
  "params": {
    "beamColor": { "type": "color", "default": "#00C853" },
    "multiplierText": { "type": "string", "default": "5x" },
    "targetY": { "type": "number", "default": 400 }
  }
}
```

### Типы нод

| Тип | Описание | PixiJS класс |
|-----|----------|-------------|
| `container` | Группа с children | `Container` |
| `sprite` | Статичная текстура | `Sprite` |
| `spritesheet_anim` | Покадровая анимация из спрайтшита | `AnimatedSprite` / `Sprite` с таймером |
| `graphics` | Примитивы (line, circle, rect, roundRect) | `Graphics` |
| `text` | Текст с стилем | `Text` |

### Easing функции

`linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, `easeInOutSine`, `spring`

### Keyframe свойства

`x`, `y`, `scaleX`, `scaleY`, `scale` (uniform), `rotation`, `alpha`, `tint` — маппятся напрямую на PixiJS Container/Sprite. Для `graphics` нод: `fromX`, `fromY`, `toX`, `toY`, `radius`, `width`, `height`.

---

## Архитектура редактора

```
venom-animator/
  package.json          # name: "venom-animator", standalone
  tsconfig.json
  vite.config.ts        # Vite + @sveltejs/vite-plugin-svelte
  index.html
  src/
    main.ts
    App.svelte          # 4-панельный layout

    lib/
      types/
        vanim.ts        # TypeScript интерфейсы .vanim формата
        easing.ts       # Easing функции (реализации)

      state/
        project.svelte.ts     # $state: текущий .vanim документ
        selection.svelte.ts   # $state: выбранная нода, keyframes
        playback.svelte.ts    # $state: currentTime, playing, loop
        history.svelte.ts     # Undo/redo (command pattern)

      preview/
        PreviewApp.ts         # PixiJS 8 Application wrapper
        NodeRenderer.ts       # Создаёт PixiJS объекты из .vanim нод
        KeyframeEvaluator.ts  # Интерполяция keyframes с easing
        SpritesheetLoader.ts  # Загрузка/нарезка спрайтшитов
        ParticleRenderer.ts   # Рендер частиц

      io/
        save-load.ts          # Open/save .vanim (File System Access API)
        export.ts             # Export в игру (копирует в static/animations/)
        import-assets.ts      # Import PNG/спрайтшитов

      ai/
        prompt-builder.ts     # Промпт со схемой + текущим состоянием
        vanim-validator.ts    # Валидация AI-сгенерированного JSON

      library/
        db.ts                 # SQLite WASM (sql.js) + IndexedDB persistence
        library-manager.ts    # CRUD анимаций, ассетов, шаблонов, тегов

    components/
      toolbar/
        Toolbar.svelte
        AIPromptInput.svelte
      hierarchy/
        HierarchyPanel.svelte
        NodeItem.svelte
      canvas/
        CanvasPanel.svelte
        TransformGizmo.svelte
      properties/
        PropertiesPanel.svelte
        KeyframeEditor.svelte
        ParticleConfigurator.svelte
        EasingPicker.svelte
      timeline/
        TimelinePanel.svelte
        Track.svelte
        Keyframe.svelte
        PlaybackControls.svelte
        TimeRuler.svelte
      library/
        LibraryPanel.svelte
      shared/
        SplitPane.svelte
        Modal.svelte
```

### UI Layout

```
┌───────────────────────────────────────────────────────────┐
│ Toolbar: New | Open | Save | Export | [AI Prompt ______]  │
├────────────┬──────────────────────────┬───────────────────┤
│ Hierarchy  │     Canvas Preview       │  Properties       │
│            │     (PixiJS 8)           │                   │
│ ▸ root     │                          │  x: 256           │
│   ▸ beam   │     [live preview]       │  y: 0             │
│   ▸ flash  │                          │  rotation: 0      │
│   ▸ text   │                          │  easing: ──       │
│            │                          │                   │
│ Particles  │                          │  Particle Config  │
│ ▸ sparks   │                          │  count: 20        │
├────────────┴──────────────────────────┴───────────────────┤
│ Timeline                                                   │
│ ▶ beam.alpha   ◆──────────◆────────────  0ms    500ms     │
│ ▶ beam.scaleY  ◆──────────◆────────────                   │
│ ▶ flash.alpha         ◆──────────◆                        │
│ ▶ flash.scale         ◆──────────◆                        │
│ [▶ Play] [⏸ Pause] [⏹ Stop]  🔁 Loop   Time: 0ms        │
└───────────────────────────────────────────────────────────┘
```

---

## Рантайм плеер (в игре VenomStrike)

```
apps/venom-strike/src/lib/pixi/vanim/
  VanimPlayer.ts        # Главный класс (~200 строк)
  KeyframeResolver.ts   # Интерполяция + easing (~80 строк)
  easing.ts             # Easing функции (~50 строк)
  types.ts              # .vanim TypeScript типы (~80 строк)
```

### VanimPlayer API

```typescript
class VanimPlayer {
  constructor(app: Application, parent: Container);

  // Загрузить .vanim (JSON объект или URL)
  async load(data: VanimDocument | string): Promise<void>;

  // Проиграть. Возвращает Promise, резолвится по завершении
  play(options?: {
    params?: Record<string, string | number>;
    speed?: number;
    loop?: boolean;
    onComplete?: () => void;
  }): Promise<void>;

  pause(): void;
  resume(): void;
  stop(): void;
  seek(timeMs: number): void;

  readonly playing: boolean;
  readonly currentTime: number;
  readonly container: Container;

  destroy(): void;
}
```

### Использование в игре

```typescript
// Вместо 316 строк SnakeStrikeEffect.ts:
import strikeData from '../../../static/animations/snake-strike.vanim?raw';

const player = new VanimPlayer(app, grid.rootContainer);
await player.load(JSON.parse(strikeData));
await player.play({ params: { beamColor: '#FFD600', multiplierText: '3x' } });
player.destroy();
```

---

## AI-Assist интеграция

### Workflow

1. Пользователь вводит описание в AI Prompt: *"Пульсирующее зелёное свечение, fadeIn 500ms, loop"*
2. `prompt-builder.ts` собирает промпт: схема .vanim + текущее состояние + запрос
3. Промпт копируется в буфер обмена → вставляется в Claude Code
4. Claude генерирует JSON → пользователь копирует обратно
5. `vanim-validator.ts` проверяет JSON → импорт в редактор → live preview

### Альтернативный workflow (Claude Code напрямую)

Claude Code может генерировать .vanim JSON файлы напрямую через Write tool, без GUI. Формат достаточно простой для LLM — плоский массив нод, понятные названия полей.

---

## Поток файлов: Редактор → Игра

```
VenomAnimator (редактор)          VenomStrike (игра)
        |                              |
        |-- Save --> *.vanim           |
        |                              |
        |-- Export -----> static/animations/*.vanim
        |                 static/vfx/*.png
        |                              |
        |                     VanimPlayer.load()
        |                     creates PixiJS objects
        |                     plays animation
```

---

## Фазы реализации

### Фаза 1: Типы + Рантайм ✅
- `types/vanim.ts` — интерфейсы
- `types/easing.ts` — 10 easing функций
- `VanimPlayer.ts` + `KeyframeResolver.ts` — рантайм плеер

### Фаза 2: Превью движок ✅
- `PreviewApp.ts` — PixiJS 8 инициализация
- `NodeRenderer.ts` — создание объектов из нод
- `KeyframeEvaluator.ts` — интерполяция
- `SpritesheetLoader.ts` — нарезка спрайтшитов

### Фаза 3: GUI оболочка + Тесты + LLM-архитектура ✅
- `App.svelte` — 4-панельный layout с SplitPane
- `HierarchyPanel` — дерево нод
- `CanvasPanel` — PixiJS превью
- `PropertiesPanel` — редактор свойств
- `TimelinePanel` — таймлайн с keyframe diamonds + tracks + time ruler
- `PlaybackControls` — Play/Pause/Stop/Loop
- State management (project, selection, playback, history)
- **Тесты:** vitest — easing (34), KeyframeEvaluator (17), project state (7), validator (16) = 74 теста
- **LLM-friendly:**
  - `ai/vanim-schema.ts` — JSON Schema для .vanim (контекст для LLM)
  - `ai/vanim-validator.ts` — валидация с actionable-ошибками на русском
  - `ai/prompt-builder.ts` — XML-структурированные промпты со схемой + примеры

### Фаза 4: Редактирование ✅
- Добавление/удаление нод (HierarchyPanel + type picker dropdown)
- Редактирование keyframes (drag на таймлайне, inline KeyframeEditor)
- EasingPicker с визуальными SVG-кривыми
- ParticleConfigurator со слайдерами
- Import ассетов (drag-n-drop на CanvasPanel)
- Undo/Redo интегрировано во все операции
- Save/Load файлов (File System Access API)
- **Библиотека** (sql.js + IndexedDB):
  - SQLite WASM база: animations, assets, templates, tags
  - CRUD + поиск + теги + избранное
  - LibraryPanel с табами (Animations/Templates/Assets), поиском, карточками

### Фаза 5: AI + Интеграция ✅
- AIPromptInput UI в Toolbar (текстовое поле → prompt-builder → буфер обмена)
- Import AI-сгенерированного JSON (вставка из буфера → validator → load с toast-уведомлениями)
- Export кнопка (download + File System Access API)
- Toast-система уведомлений (вместо alert)
- Ctrl+V хоткей для paste .vanim
- **Proof-of-concept:** `static/examples/snake-strike.vanim` (9 нод, 2 системы частиц, 1200ms)

### Фаза 6: Mesh-ноды (деформации спрайтов) ✅
- `MeshNode` в vanim.ts — вершины (x,y,u,v) + индексы треугольников
- Рендеринг через PixiJS 8 `MeshSimple` в NodeRenderer
- Keyframe-анимация вершин: `vertex0_x`, `vertex0_y`, ... в VanimPlayer
- **MeshUtils.ts**: `generateGrid()` + 4 пресета (wave, bulge, twist, bend)
- **MeshEditor.svelte** в PropertiesPanel: сетка генератор, пресеты, таблица вершин
- Mesh в HierarchyPanel add menu, валидатор, JSON Schema обновлены

### Фаза 7: CLI Claude Code интеграция
Цель: Claude Code CLI может полноценно работать с аниматором — создавать, редактировать, валидировать и управлять .vanim анимациями без GUI.

- **CLI утилита** `src/cli/vanim-cli.ts` — Node.js скрипт:
  - `vanim create <name>` — создать новый .vanim из шаблона
  - `vanim validate <file>` — валидация с actionable-ошибками
  - `vanim add-node <file> --type sprite --id hero --asset hero.png` — добавить ноду
  - `vanim add-keyframe <file> --node hero --prop x --time 0 --value 100 --easing easeOutCubic` — добавить кейфрейм
  - `vanim add-particle <file> --id sparks --mode burst --x 256 --y 256` — добавить частицы
  - `vanim list-nodes <file>` — показать дерево нод
  - `vanim info <file>` — показать мета (duration, nodes, particles)
  - `vanim merge <base> <overlay>` — объединить два .vanim файла
  - `vanim export <file> --format game` — экспорт в формат игры
- **CLAUDE.md секция** с инструкциями:
  - Как Claude Code должен работать с .vanim файлами
  - Примеры типовых операций (создание анимации с нуля, модификация)
  - JSON-шаблоны для быстрой генерации
  - Правила валидации (ссылки на vanim-schema.ts)
- **Headless preview** `src/cli/vanim-render.ts`:
  - Рендеринг кадра в PNG через headless PixiJS (для превью в терминале)
  - `vanim render <file> --time 250 --out frame.png`
- **MCP Server** (опционально, для продвинутой интеграции):
  - Claude Code подключает MCP-сервер аниматора
  - Инструменты: create_animation, add_node, add_keyframe, validate, render_preview
  - Прямой доступ к SQLite библиотеке (search, save, load)

### Фаза 8: UI тесты (Playwright / Vitest Browser)
- E2E тесты основных UI-сценариев:
  - Создание/удаление нод через Hierarchy
  - Переключение табов (Hierarchy ↔ Library)
  - Редактирование свойств в PropertiesPanel
  - Drag keyframes на таймлайне
  - Save/Load через Toolbar
  - Библиотека: сохранение и загрузка анимаций
  - Playback: Play/Pause/Stop
- Component тесты (Vitest + @testing-library/svelte):
  - Каждый компонент: рендерится, реагирует на клики, обновляет стейт

---

## Код для переиспользования из VenomStrike

| Файл | Что берём |
|------|-----------|
| `apps/venom-strike/src/lib/pixi/ParticleSystem.ts` строки 5-17 | Интерфейс ParticleConfig |
| `apps/venom-strike/src/lib/pixi/ParticleSystem.ts` строки 39-140 | Пресеты частиц |
| `apps/venom-strike/src/lib/pixi/spritesheet-utils.ts` | Функция sliceSpriteSheet() |
| `apps/venom-strike/src/lib/pixi/SnakeStrikeEffect.ts` строки 302-316 | Easing функции |
| `apps/venom-strike/src/lib/components/GameCanvas.svelte` | Паттерн init PixiJS 8 |

---

## Зависимости (все бесплатные)

```json
{
  "dependencies": {
    "pixi.js": "^8.0.0"
  },
  "devDependencies": {
    "svelte": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

Итого: **$0** за инструменты.