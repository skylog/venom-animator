import { Assets, Texture, Rectangle } from 'pixi.js';
import type { SpritesheetAsset } from '$lib/types/vanim';

/**
 * Загружает спрайтшит и нарезает на фреймы.
 */
export async function loadSpritesheet(
  asset: SpritesheetAsset,
  basePath: string = '',
): Promise<Texture[]> {
  const fullPath = basePath ? `${basePath}/${asset.path}` : asset.path;
  const texture = await Assets.load<Texture>(fullPath);
  return sliceSpritesheet(texture, asset.cols, asset.rows);
}

/**
 * Нарезает текстуру на сетку фреймов cols x rows.
 */
export function sliceSpritesheet(
  texture: Texture,
  cols: number,
  rows: number,
): Texture[] {
  const source = texture.source;
  const frameWidth = source.width / cols;
  const frameHeight = source.height / rows;
  const frames: Texture[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rect = new Rectangle(
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
      );
      frames.push(new Texture({ source, frame: rect }));
    }
  }

  return frames;
}

/**
 * Загружает обычную текстуру по пути.
 */
export async function loadTexture(
  path: string,
  basePath: string = '',
): Promise<Texture> {
  const fullPath = basePath ? `${basePath}/${path}` : path;
  return Assets.load<Texture>(fullPath);
}
