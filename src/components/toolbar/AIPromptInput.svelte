<script lang="ts">
  import { buildPrompt, buildCompactPrompt } from '$lib/ai/prompt-builder';
  import { projectState } from '$lib/state/project.svelte';
  import { toastState } from '$lib/state/toast.svelte';

  let promptText = $state('');
  let mode = $state<'full' | 'compact'>('full');

  async function handleGenerate() {
    if (!promptText.trim()) return;

    const prompt =
      mode === 'full'
        ? buildPrompt(promptText, projectState.document)
        : buildCompactPrompt(promptText);

    try {
      await navigator.clipboard.writeText(prompt);
      toastState.success(
        'Промпт скопирован в буфер',
        'Вставьте в Claude, затем скопируйте ответ и нажмите Paste .vanim (Ctrl+V)',
      );
      promptText = '';
    } catch {
      toastState.error('Не удалось скопировать в буфер обмена');
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }
</script>

<div class="ai-prompt">
  <input
    type="text"
    class="ai-input"
    placeholder="Опишите анимацию..."
    bind:value={promptText}
    onkeydown={handleKeydown}
  />
  <select class="ai-mode" bind:value={mode} title="Режим промпта">
    <option value="full">Full</option>
    <option value="compact">Compact</option>
  </select>
  <button class="ai-btn" onclick={handleGenerate} disabled={!promptText.trim()} title="Скопировать AI-промпт в буфер">
    AI
  </button>
</div>

<style>
  .ai-prompt {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .ai-input {
    width: 180px;
    padding: 4px 8px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    font-size: 12px;
    outline: none;
  }

  .ai-input:focus {
    border-color: #007acc;
    width: 260px;
  }

  .ai-input::placeholder {
    color: #555;
  }

  .ai-mode {
    padding: 4px 2px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #888;
    font-size: 10px;
    cursor: pointer;
    outline: none;
  }

  .ai-mode:focus {
    border-color: #007acc;
  }

  .ai-btn {
    padding: 4px 10px;
    background: #094771;
    border: 1px solid #007acc;
    border-radius: 4px;
    color: #4ec9b0;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .ai-btn:hover:not(:disabled) {
    background: #0d5a8f;
  }

  .ai-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
