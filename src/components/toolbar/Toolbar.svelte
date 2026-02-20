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

  // Редактирование метаданных документа
  let editingMeta = $state<'duration' | 'size' | 'name' | null>(null);
  let metaInputValue = $state('');

  function startEditMeta(field: 'duration' | 'size' | 'name') {
    editingMeta = field;
    if (field === 'duration') metaInputValue = String(projectState.document.duration);
    else if (field === 'size') metaInputValue = `${projectState.document.width}x${projectState.document.height}`;
    else metaInputValue = projectState.document.name;
  }

  function commitMeta() {
    if (!editingMeta) return;
    const field = editingMeta;
    editingMeta = null;

    if (field === 'duration') {
      const val = parseInt(metaInputValue);
      if (!isNaN(val) && val > 0 && val !== projectState.document.duration) {
        historyState.push('Edit duration');
        projectState.updateDocument((doc) => ({ ...doc, duration: val }));
      }
    } else if (field === 'size') {
      const match = metaInputValue.match(/^(\d+)\s*[x×]\s*(\d+)$/);
      if (match) {
        const w = parseInt(match[1]);
        const h = parseInt(match[2]);
        if (w > 0 && h > 0 && (w !== projectState.document.width || h !== projectState.document.height)) {
          historyState.push('Edit size');
          projectState.updateDocument((doc) => ({ ...doc, width: w, height: h }));
        }
      }
    } else if (field === 'name') {
      const val = metaInputValue.trim();
      if (val && val !== projectState.document.name) {
        historyState.push('Edit name');
        projectState.updateDocument((doc) => ({ ...doc, name: val }));
      }
    }
  }

  function handleMetaKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commitMeta();
    } else if (e.key === 'Escape') {
      editingMeta = null;
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
    {#if editingMeta === 'name'}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="meta-input name-input"
        type="text"
        value={metaInputValue}
        oninput={(e) => metaInputValue = (e.target as HTMLInputElement).value}
        onblur={commitMeta}
        onkeydown={handleMetaKeydown}
        autofocus
      />
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="project-name" ondblclick={() => startEditMeta('name')} title="Двойной клик для редактирования">{projectState.document.name}</span>
    {/if}
    {#if projectState.dirty}
      <span class="dirty-indicator">*</span>
    {/if}

    {#if editingMeta === 'duration'}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="meta-input duration-input"
        type="number"
        min="1"
        step="100"
        value={metaInputValue}
        oninput={(e) => metaInputValue = (e.target as HTMLInputElement).value}
        onblur={commitMeta}
        onkeydown={handleMetaKeydown}
        autofocus
      />ms
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="project-meta editable" ondblclick={() => startEditMeta('duration')} title="Двойной клик для редактирования">{projectState.document.duration}ms</span>
    {/if}

    <span class="project-meta-sep">|</span>

    {#if editingMeta === 'size'}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="meta-input size-input"
        type="text"
        value={metaInputValue}
        oninput={(e) => metaInputValue = (e.target as HTMLInputElement).value}
        onblur={commitMeta}
        onkeydown={handleMetaKeydown}
        autofocus
      />
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="project-meta editable" ondblclick={() => startEditMeta('size')} title="Двойной клик для редактирования">{projectState.document.width}x{projectState.document.height}</span>
    {/if}
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

  .project-meta.editable {
    cursor: pointer;
    border-bottom: 1px dashed transparent;
  }

  .project-meta.editable:hover {
    color: #999;
    border-bottom-color: #555;
  }

  .project-meta-sep {
    font-size: 11px;
    color: #444;
    margin: 0 2px;
  }

  .meta-input {
    background: #2d2d2d;
    border: 1px solid #007acc;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
    font-family: monospace;
    padding: 1px 4px;
    margin-left: 8px;
  }

  .meta-input:focus {
    outline: none;
  }

  .duration-input {
    width: 60px;
  }

  .size-input {
    width: 70px;
  }

  .name-input {
    width: 120px;
    margin-left: 0;
  }
</style>
