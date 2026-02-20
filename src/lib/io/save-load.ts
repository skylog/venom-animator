import type { VanimDocument } from '$lib/types/vanim';
import { validateVanim, formatValidationErrors, parseAndValidateVanim } from '$lib/ai/vanim-validator';

const VANIM_FILE_TYPES = [
  {
    description: 'Vanim Animation',
    accept: { 'application/json': ['.vanim', '.json'] as `.${string}`[] },
  },
];

/**
 * Открывает .vanim файл через File System Access API.
 * Возвращает документ и имя файла, или null если отменено.
 */
export async function openVanimFile(): Promise<{ doc: VanimDocument; fileName: string } | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: VANIM_FILE_TYPES,
      multiple: false,
    });
    const file: File = await handle.getFile();
    const text = await file.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Файл "${file.name}" не является валидным JSON`);
    }

    const errors = validateVanim(parsed);
    const critical = errors.filter((e) => e.severity === 'error');
    if (critical.length > 0) {
      throw new Error(`Ошибки валидации .vanim:\n${formatValidationErrors(critical)}`);
    }

    return { doc: parsed as VanimDocument, fileName: file.name };
  } catch (e: unknown) {
    // Пользователь отменил picker
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
}

/**
 * Сохраняет .vanim файл через File System Access API.
 * Возвращает имя файла или null если отменено.
 */
export async function saveVanimFile(doc: VanimDocument, suggestedName?: string): Promise<string | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: suggestedName ?? `${doc.name}.vanim`,
      types: VANIM_FILE_TYPES,
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
 * Экспорт .vanim в буфер обмена (для быстрого обмена).
 */
export async function copyVanimToClipboard(doc: VanimDocument): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
}

/**
 * Импорт .vanim из буфера обмена.
 */
export async function pasteVanimFromClipboard(): Promise<VanimDocument | null> {
  const text = await navigator.clipboard.readText();
  if (!text.trim().startsWith('{')) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const errors = validateVanim(parsed);
  const critical = errors.filter((e) => e.severity === 'error');
  if (critical.length > 0) return null;

  return parsed as VanimDocument;
}

export interface ImportResult {
  ok: boolean;
  document?: VanimDocument;
  errorSummary?: string;
  errorDetail?: string;
}

/**
 * Импорт .vanim из буфера обмена с детальной валидацией.
 * Возвращает результат с ошибками для отображения пользователю.
 */
export async function importVanimFromClipboard(): Promise<ImportResult> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return { ok: false, errorSummary: 'Нет доступа к буферу обмена' };
  }

  if (!text.trim()) {
    return { ok: false, errorSummary: 'Буфер обмена пуст' };
  }

  if (!text.trim().startsWith('{')) {
    return { ok: false, errorSummary: 'В буфере не JSON' };
  }

  const result = parseAndValidateVanim(text);
  if (!result.ok) {
    const errorCount = result.errors.filter((e) => e.severity === 'error').length;
    const warnCount = result.errors.filter((e) => e.severity === 'warning').length;
    const detail = result.errors
      .slice(0, 5)
      .map((e) => `${e.path}: ${e.message}`)
      .join('\n');
    console.warn('Validation errors:', formatValidationErrors(result.errors));
    return {
      ok: false,
      errorSummary: `Невалидный .vanim: ${errorCount} ошибок, ${warnCount} предупреждений`,
      errorDetail: detail,
    };
  }

  return { ok: true, document: result.document };
}
