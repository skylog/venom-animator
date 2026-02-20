import type { VanimDocument } from '$lib/types/vanim';

/**
 * Экспорт .vanim как скачиваемый файл (через <a download>).
 * Работает во всех браузерах.
 */
export function exportVanimDownload(doc: VanimDocument, filename?: string): void {
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${doc.name}.vanim`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Экспорт .vanim через File System Access API (выбор директории).
 * Только Chromium. Возвращает имя файла или null если отменено.
 */
export async function exportVanimToDirectory(
  doc: VanimDocument,
  suggestedName?: string,
): Promise<string | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: suggestedName ?? `${doc.name}.vanim`,
      types: [
        {
          description: 'Vanim Animation (game export)',
          accept: { 'application/json': ['.vanim'] as `.${string}`[] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(doc, null, 2));
    await writable.close();
    return handle.name;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
}

/**
 * Копирует .vanim JSON в буфер обмена (минифицированный, для интеграции).
 */
export async function exportVanimMinified(doc: VanimDocument): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(doc));
}
