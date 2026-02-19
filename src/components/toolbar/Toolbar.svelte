<script lang="ts">
  import { projectState } from '$lib/state/project.svelte';
  import { historyState } from '$lib/state/history.svelte';

  function handleNew() {
    if (projectState.dirty && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) {
      return;
    }
    projectState.newDocument();
    historyState.clear();
  }

  async function handleOpen() {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Vanim Animation', accept: { 'application/json': ['.vanim', '.json'] } }],
      });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const doc = JSON.parse(text);
      projectState.setDocument(doc, fileHandle.name);
      historyState.clear();
    } catch {
      // Пользователь отменил
    }
  }

  async function handleSave() {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${projectState.document.name}.vanim`,
        types: [{ description: 'Vanim Animation', accept: { 'application/json': ['.vanim'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(projectState.document, null, 2));
      await writable.close();
      projectState.filePath = handle.name;
      projectState.dirty = false;
    } catch {
      // Пользователь отменил
    }
  }

  function handleUndo() {
    historyState.undo();
  }

  function handleRedo() {
    historyState.redo();
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
