/**
 * JSON Schema для .vanim формата — используется для валидации и как контекст для LLM.
 * Описывает полную структуру документа в human-readable формате.
 */
export const VANIM_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'VanimDocument',
  description: 'Формат анимации VenomAnimator. Плоский массив нод с иерархией через children, keyframe-анимации со временем в миллисекундах.',
  type: 'object',
  required: ['version', 'name', 'duration', 'width', 'height', 'nodes'],
  properties: {
    version: { type: 'number', const: 1 },
    name: { type: 'string', description: 'Уникальное имя анимации (kebab-case)' },
    duration: { type: 'number', description: 'Длительность анимации в миллисекундах' },
    width: { type: 'number', description: 'Ширина канваса в пикселях' },
    height: { type: 'number', description: 'Высота канваса в пикселях' },

    assets: {
      type: 'object',
      description: 'Ассеты — текстуры и спрайтшиты. Ключ = id ассета.',
      additionalProperties: {
        oneOf: [
          {
            type: 'object',
            required: ['type', 'path'],
            properties: {
              type: { const: 'texture' },
              path: { type: 'string', description: 'Относительный путь к PNG/JPG' },
            },
          },
          {
            type: 'object',
            required: ['type', 'path', 'cols', 'rows'],
            properties: {
              type: { const: 'spritesheet' },
              path: { type: 'string' },
              cols: { type: 'number', description: 'Количество колонок в сетке' },
              rows: { type: 'number', description: 'Количество строк в сетке' },
            },
          },
        ],
      },
    },

    nodes: {
      type: 'array',
      description: 'Плоский массив нод. Первая нода обычно root container. Иерархия через children.',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string', description: 'Уникальный id ноды (kebab-case)' },
          type: { enum: ['container', 'sprite', 'spritesheet_anim', 'graphics', 'text'] },
          children: { type: 'array', items: { type: 'string' }, description: 'ID дочерних нод (только для container)' },
          asset: { type: 'string', description: 'ID ассета (для sprite/spritesheet_anim)' },
          text: { type: 'string', description: 'Текст (для text нод). Поддерживает {{param}}' },
          x: { type: 'number' }, y: { type: 'number' },
          scaleX: { type: 'number' }, scaleY: { type: 'number' },
          rotation: { type: 'number', description: 'В радианах' },
          alpha: { type: 'number', minimum: 0, maximum: 1 },
          anchorX: { type: 'number' }, anchorY: { type: 'number' },
          width: { type: 'number' }, height: { type: 'number' },
          blendMode: { enum: ['normal', 'add', 'multiply', 'screen'] },
          startTime: { type: 'number', description: 'Время появления ноды (мс от начала анимации)' },
          duration: { type: 'number', description: 'Длительность жизни ноды (мс)' },
          graphics: {
            description: 'Графический примитив (только для type=graphics)',
            oneOf: [
              { type: 'object', required: ['type', 'fromX', 'fromY', 'toX', 'toY', 'stroke'], properties: { type: { const: 'line' } } },
              { type: 'object', required: ['type', 'cx', 'cy', 'radius'], properties: { type: { const: 'circle' } } },
              { type: 'object', required: ['type', 'x', 'y', 'width', 'height'], properties: { type: { const: 'rect' } } },
              { type: 'object', required: ['type', 'x', 'y', 'width', 'height', 'radius'], properties: { type: { const: 'roundRect' } } },
            ],
          },
          style: {
            type: 'object',
            description: 'Стиль текста (только для type=text)',
            properties: {
              fontFamily: { type: 'string' },
              fontWeight: { type: 'string' },
              fontSize: { type: 'number' },
              fill: { type: 'string', description: 'Цвет в hex (#RRGGBB)' },
              align: { enum: ['left', 'center', 'right'] },
            },
          },
          keyframes: {
            type: 'object',
            description: 'Анимируемые свойства. Ключ = имя свойства, значение = массив keyframes.',
            additionalProperties: {
              type: 'array',
              items: {
                type: 'object',
                required: ['time', 'value'],
                properties: {
                  time: { type: 'number', description: 'Время в мс (локальное, от startTime ноды)' },
                  value: { description: 'Число или строка (hex цвет для tint)' },
                  easing: {
                    enum: ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeOutBack', 'easeInOutSine', 'spring'],
                    description: 'Easing к ЭТОМУ keyframe (от предыдущего). По умолчанию linear.',
                  },
                },
              },
            },
          },
        },
      },
    },

    particles: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'startTime', 'mode', 'x', 'y', 'config'],
        properties: {
          id: { type: 'string' },
          startTime: { type: 'number' },
          mode: { enum: ['burst', 'continuous'] },
          x: { type: 'number' }, y: { type: 'number' },
          duration: { type: 'number', description: 'Для continuous mode — сколько мс эмитить' },
          config: {
            type: 'object',
            required: ['count', 'lifetime', 'speed', 'size', 'color', 'alpha', 'direction'],
            properties: {
              count: { type: 'number' },
              lifetime: { type: 'number', description: 'Время жизни частицы в мс' },
              speed: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
              size: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
              color: { type: 'string', description: 'Hex цвет (#RRGGBB)' },
              alpha: { type: 'object', properties: { start: { type: 'number' }, end: { type: 'number' } } },
              direction: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } }, description: 'Направление в радианах (0-6.283)' },
              gravity: { type: 'number', default: 0 },
              blendMode: { enum: ['normal', 'add', 'multiply', 'screen'] },
            },
          },
        },
      },
    },

    params: {
      type: 'object',
      description: 'Параметры — переопределяются в рантайме. Ключ используется как {{key}} в text нодах и свойствах.',
      additionalProperties: {
        oneOf: [
          { type: 'object', required: ['type', 'default'], properties: { type: { const: 'color' }, default: { type: 'string' } } },
          { type: 'object', required: ['type', 'default'], properties: { type: { const: 'string' }, default: { type: 'string' } } },
          { type: 'object', required: ['type', 'default'], properties: { type: { const: 'number' }, default: { type: 'number' } } },
        ],
      },
    },
  },
} as const;
