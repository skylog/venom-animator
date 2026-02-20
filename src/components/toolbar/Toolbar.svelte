<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { selectionState } from '$lib/state/selection.svelte';
  import { toastState } from '$lib/state/toast.svelte';
  import { openVanimFile, saveVanimFile, importVanimFromClipboard } from '$lib/io/save-load';
  import { exportVanimDownload, exportVanimToDirectory } from '$lib/io/export';
  import AIPromptInput from './AIPromptInput.svelte';

  function handleNew() {
    if (projectState.dirty && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) {
      return;
    }
    projectState.newDocument();
    selectionState.clear();
    historyState.clear();
  }

  async function handleOpen() {
    try {
      const result = await openVanimFile();
      if (!result) return;
      projectState.setDocument(result.doc, result.fileName);
      selectionState.clear();
      historyState.clear();
      toastState.success(`Открыто: "${result.fileName}"`);
    } catch (e) {
      toastState.error('Ошибка открытия файла', String(e));
    }
  }

  async function handleSave() {
    try {
      const name = await saveVanimFile(projectState.document, projectState.filePath ?? undefined);
      if (name) {
        projectState.filePath = name;
        projectState.dirty = false;
        toastState.success(`Сохранено: ${name}`);
      }
    } catch (e) {
      toastState.error('Ошибка сохранения', String(e));
    }
  }

  function handleUndo() {
    historyState.undo();
  }

  function handleRedo() {
    historyState.redo();
  }

  async function handleExport() {
    try {
      if ('showSaveFilePicker' in window) {
        const name = await exportVanimToDirectory(projectState.document);
        if (name) toastState.success(`Экспортировано: ${name}`);
      } else {
        exportVanimDownload(projectState.document);
        toastState.success(`Экспортировано: ${projectState.document.name}.vanim`);
      }
    } catch (e) {
      toastState.error('Ошибка экспорта', String(e));
    }
  }

  async function handlePasteVanim() {
    const result = await importVanimFromClipboard();
    if (!result.ok) {
      toastState.error(result.errorSummary!, result.errorDetail);
      return;
    }
    projectState.setDocument(result.document!);
    selectionState.clear();
    historyState.clear();
    toastState.success(
      `Загружено: "${result.document!.name}"`,
      `${result.document!.nodes.length} нод, ${result.document!.duration}ms`,
    );
  }
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <button class="tool-btn" onclick={handleNew} title="Новый документ">
      <span class="icon">+</span> Новый
    </button>
    <button class="tool-btn" onclick={handleOpen} title="Открыть .vanim">
      Открыть
    </button>
    <button class="tool-btn" onclick={handleSave} title="Сохранить .vanim">
      Сохранить
    </button>
    <button class="tool-btn" onclick={handleExport} title="Экспорт .vanim для игры">
      Export
    </button>
  </div>

  <div class="toolbar-separator"></div>

  <div class="toolbar-group">
    <button class="tool-btn" onclick={handleUndo} disabled={!historyState.canUndo} title="Отменить (Ctrl+Z)">
      Undo
    </button>
    <button class="tool-btn" onclick={handleRedo} disabled={!historyState.canRedo} title="Вернуть (Ctrl+Shift+Z)">
      Redo
    </button>
  </div>

  <div class="toolbar-separator"></div>

  <div class="toolbar-group">
    <button class="tool-btn" onclick={handlePasteVanim} title="Вставить .vanim из буфера (Ctrl+V)">
      Paste .vanim
    </button>
  </div>

  <div class="toolbar-separator"></div>

  <div class="toolbar-group">
    <AIPromptInput />
  </div>

  <div class="project-info">
    <span class="project-name">{projectState.document.name}</span>
    {#if projectState.dirty}
      <span class="dirty-indicator">*</span>
    {/if}
    <span class="project-meta">{projectState.document.duration}ms | {projectState.document.width}x{projectState.document.height}</span>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 8px;
    background: #252526;
    border-bottom: 1px solid #333;
    gap: 4px;
    user-select: none;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
  }

  .toolbar-separator {
    width: 1px;
    height: 20px;
    background: #444;
    margin: 0 6px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #ccc;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .tool-btn:hover:not(:disabled) {
    background: #3a3a3a;
    border-color: #555;
  }

  .tool-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .icon {
    font-weight: bold;
    font-size: 14px;
  }

  .project-info {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #888;
  }

  .project-name {
    color: #ccc;
    font-weight: 500;
  }

  .dirty-indicator {
    color: #e8a848;
    font-weight: bold;
  }

  .project-meta {
    font-size: 11px;
    color: #666;
    margin-left: 8px;
  }
</style>
