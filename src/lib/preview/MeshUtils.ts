import type { MeshVertex } from '$lib/types/vanim';

/**
 * Генерирует прямоугольную сетку вершин NxM для mesh-деформаций.
 * cols/rows — количество ячеек (вершин будет cols+1 x rows+1).
 */
export function generateGrid(
  cols: number,
  rows: number,
  width: number,
  height: number,
): { vertices: MeshVertex[]; indices: number[] } {
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];

  const vCols = cols + 1;
  const vRows = rows + 1;

  // Вершины
  for (let r = 0; r < vRows; r++) {
    for (let c = 0; c < vCols; c++) {
      vertices.push({
        x: (c / cols) * width,
        y: (r / rows) * height,
        u: c / cols,
        v: r / rows,
      });
    }
  }

  // Индексы треугольников (два на ячейку)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = r * vCols + c;
      const tr = tl + 1;
      const bl = (r + 1) * vCols + c;
      const br = bl + 1;

      indices.push(tl, tr, bl);
      indices.push(tr, br, bl);
    }
  }

  return { vertices, indices };
}

// --- Пресеты деформаций ---

/**
 * Wave — синусоидальная волна по горизонтали.
 * amplitude — амплитуда в пикселях, frequency — количество волн, phase — фаза (0-1).
 */
export function applyWave(
  vertices: MeshVertex[],
  width: number,
  height: number,
  amplitude: number,
  frequency: number = 1,
  phase: number = 0,
): MeshVertex[] {
  return vertices.map((v) => ({
    ...v,
    y: v.y + Math.sin((v.x / width) * Math.PI * 2 * frequency + phase * Math.PI * 2) * amplitude,
  }));
}

/**
 * Bulge — выпуклость из центра.
 * strength — интенсивность (0-1), radius — радиус эффекта (0-1, от размера).
 */
export function applyBulge(
  vertices: MeshVertex[],
  width: number,
  height: number,
  strength: number,
  radius: number = 0.5,
): MeshVertex[] {
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy) * radius;

  return vertices.map((v) => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist || dist === 0) return v;

    const factor = 1 + strength * (1 - dist / maxDist);
    return {
      ...v,
      x: cx + dx * factor,
      y: cy + dy * factor,
    };
  });
}

/**
 * Twist — вращение вершин вокруг центра, усиливающееся к краям.
 * angle — максимальный угол закручивания (в радианах).
 */
export function applyTwist(
  vertices: MeshVertex[],
  width: number,
  height: number,
  angle: number,
): MeshVertex[] {
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  return vertices.map((v) => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rotAngle = (dist / maxDist) * angle;
    const cos = Math.cos(rotAngle);
    const sin = Math.sin(rotAngle);

    return {
      ...v,
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });
}

/**
 * Bend — изгиб по вертикали (верх отклоняется горизонтально).
 * amount — смещение верхнего края в пикселях.
 */
export function applyBend(
  vertices: MeshVertex[],
  _width: number,
  height: number,
  amount: number,
): MeshVertex[] {
  return vertices.map((v) => ({
    ...v,
    x: v.x + (1 - v.y / height) * amount,
  }));
}

export type MeshPreset = 'wave' | 'bulge' | 'twist' | 'bend';

export interface MeshPresetParams {
  wave: { amplitude: number; frequency: number; phase: number };
  bulge: { strength: number; radius: number };
  twist: { angle: number };
  bend: { amount: number };
}

/**
 * Применяет пресет деформации к сетке.
 */
export function applyPreset<T extends MeshPreset>(
  preset: T,
  vertices: MeshVertex[],
  width: number,
  height: number,
  params: MeshPresetParams[T],
): MeshVertex[] {
  switch (preset) {
    case 'wave': {
      const p = params as MeshPresetParams['wave'];
      return applyWave(vertices, width, height, p.amplitude, p.frequency, p.phase);
    }
    case 'bulge': {
      const p = params as MeshPresetParams['bulge'];
      return applyBulge(vertices, width, height, p.strength, p.radius);
    }
    case 'twist': {
      const p = params as MeshPresetParams['twist'];
      return applyTwist(vertices, width, height, p.angle);
    }
    case 'bend': {
      const p = params as MeshPresetParams['bend'];
      return applyBend(vertices, width, height, p.amount);
    }
    default:
      return vertices;
  }
}
