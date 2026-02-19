import type { VanimAsset } from '$lib/types/vanim';

export interface ImportedAsset {
  id: string;
  asset: VanimAsset;
  /** Data URL для превью в редакторе (blob URL) */
  dataUrl: string;
}

/**
 * Открывает file picker для выбора изображения.
 * Возвращает asset definition + data URL для превью.
 */
export async function importTexture(): Promise<ImportedAsset | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Image',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] as `.${string}`[] },
        },
      ],
      multiple: false,
    });

    const file: File = await handle.getFile();
    const dataUrl = URL.createObjectURL(file);

    // Генерируем id из имени файла
    const id = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    return {
      id,
      asset: { type: 'texture', path: `./${file.name}` },
      dataUrl,
    };
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
}

/**
 * Импорт спрайтшита с указанием cols/rows.
 */
export async function importSpritesheet(cols: number, rows: number): Promise<ImportedAsset | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Spritesheet Image',
          accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] as `.${string}`[] },
        },
      ],
      multiple: false,
    });

    const file: File = await handle.getFile();
    const dataUrl = URL.createObjectURL(file);

    const id = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    return {
      id,
      asset: { type: 'spritesheet', path: `./${file.name}`, cols, rows },
      dataUrl,
    };
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
}

/**
 * Обработка drag-n-drop файлов на канвас.
 * Автоматически определяет texture vs spritesheet.
 */
export function handleDroppedFiles(files: FileList): ImportedAsset[] {
  const results: ImportedAsset[] = [];

  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue;

    const dataUrl = URL.createObjectURL(file);
    const id = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    results.push({
      id,
      asset: { type: 'texture', path: `./${file.name}` },
      dataUrl,
    });
  }

  return results;
}
