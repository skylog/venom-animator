<script lang="ts">
  import { initDB } from '$lib/library/db';
  import {
    searchAnimations, searchTemplates, searchAssets,
    saveAnimation, deleteAnimation, updateAnimation,
    deleteTemplate, deleteAsset,
    getLibraryStats, getAllTags,
    type LibraryAnimation, type LibraryTemplate, type LibraryAsset,
  } from '$lib/library/library-manager';
  import { projectState } from '$lib/state/project.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { selectionState } from '$lib/state/selection.svelte';

  type Tab = 'animations' | 'templates' | 'assets';

  let activeTab = $state<Tab>('animations');
  let searchQuery = $state('');
  let dbReady = $state(false);

  let animations = $state<LibraryAnimation[]>([]);
  let templates = $state<LibraryTemplate[]>([]);
  let assets = $state<LibraryAsset[]>([]);
  let stats = $state({ animations: 0, assets: 0, templates: 0, tags: 0 });

  // Инициализация БД
  $effect(() => {
    initDB().then(() => {
      dbReady = true;
      refresh();
    });
  });

  function refresh() {
    if (!dbReady) return;
    const opts = searchQuery ? { query: searchQuery } : {};
    animations = searchAnimations(opts);
    templates = searchTemplates(opts);
    assets = searchAssets(opts);
    stats = getLibraryStats();
  }

  // При изменении поиска
  $effect(() => {
    // Просто читаем searchQuery чтобы effect сработал
    searchQuery;
    if (dbReady) refresh();
  });

  // Сохранить текущую анимацию в библиотеку
  function handleSaveToLibrary() {
    const name = prompt('Имя анимации:', projectState.document.name);
    if (!name) return;
    const desc = prompt('Описание:', '') ?? '';
    const category = prompt('Категория:', 'effect') ?? 'effect';

    const doc = { ...projectState.document, name };
    saveAnimation(doc, desc, category);
    refresh();
  }

  // Загрузить из библиотеки в редактор
  function loadAnimation(anim: LibraryAnimation) {
    try {
      const doc = JSON.parse(anim.json);
      projectState.setDocument(doc, anim.name);
      selectionState.clear();
      historyState.clear();
    } catch (e) {
      alert('Ошибка загрузки: ' + e);
    }
  }

  function loadTemplate(tmpl: LibraryTemplate) {
    try {
      const doc = JSON.parse(tmpl.json);
      projectState.setDocument(doc);
      selectionState.clear();
      historyState.clear();
    } catch (e) {
      alert('Ошибка загрузки: ' + e);
    }
  }

  function handleDeleteAnimation(id: string) {
    if (confirm('Удалить анимацию из библиотеки?')) {
      deleteAnimation(id);
      refresh();
    }
  }

  function handleToggleFavorite(anim: LibraryAnimation) {
    updateAnimation(anim.id, { favorite: !anim.favorite });
    refresh();
  }

  function handleDeleteTemplate(id: string) {
    if (confirm('Удалить шаблон?')) {
      deleteTemplate(id);
      refresh();
    }
  }

  function handleDeleteAsset(id: string) {
    if (confirm('Удалить ассет?')) {
      deleteAsset(id);
      refresh();
    }
  }
</script>

<div class="library-panel">
  <div class="panel-header">
    <span>Library</span>
    <button class="save-btn" onclick={handleSaveToLibrary} title="Сохранить текущую анимацию в библиотеку">
      + Save
    </button>
  </div>

  <div class="search-bar">
    <input
      type="text"
      placeholder="Search..."
      bind:value={searchQuery}
    />
  </div>

  <div class="tabs">
    <button class="tab" class:active={activeTab === 'animations'} onclick={() => activeTab = 'animations'}>
      Animations <span class="count">{stats.animations}</span>
    </button>
    <button class="tab" class:active={activeTab === 'templates'} onclick={() => activeTab = 'templates'}>
      Templates <span class="count">{stats.templates}</span>
    </button>
    <button class="tab" class:active={activeTab === 'assets'} onclick={() => activeTab = 'assets'}>
      Assets <span class="count">{stats.assets}</span>
    </button>
  </div>

  <div class="content">
    {#if !dbReady}
      <div class="loading">Loading library...</div>
    {:else if activeTab === 'animations'}
      {#if animations.length === 0}
        <div class="empty">Нет сохранённых анимаций. Нажмите "+ Save" чтобы сохранить текущую.</div>
      {:else}
        <div class="grid">
          {#each animations as anim}
            <div class="card">
              <div class="card-preview">
                {#if anim.thumbnail}
                  <img src={anim.thumbnail} alt={anim.name} />
                {:else}
                  <div class="placeholder">{anim.width}x{anim.height}</div>
                {/if}
              </div>
              <div class="card-info">
                <div class="card-name">{anim.name}</div>
                <div class="card-meta">{anim.duration}ms | {anim.category}</div>
                {#if anim.tags.length > 0}
                  <div class="card-tags">
                    {#each anim.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="card-actions">
                <button class="action-btn" onclick={() => loadAnimation(anim)} title="Загрузить">Open</button>
                <button
                  class="action-btn fav"
                  class:active={anim.favorite}
                  onclick={() => handleToggleFavorite(anim)}
                  title="Избранное"
                >*</button>
                <button class="action-btn del" onclick={() => handleDeleteAnimation(anim.id)} title="Удалить">x</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'templates'}
      {#if templates.length === 0}
        <div class="empty">Нет шаблонов.</div>
      {:else}
        <div class="grid">
          {#each templates as tmpl}
            <div class="card">
              <div class="card-preview">
                <div class="placeholder tmpl">{tmpl.category}</div>
              </div>
              <div class="card-info">
                <div class="card-name">{tmpl.name}</div>
                <div class="card-meta">{tmpl.description || tmpl.category}</div>
              </div>
              <div class="card-actions">
                <button class="action-btn" onclick={() => loadTemplate(tmpl)}>Use</button>
                <button class="action-btn del" onclick={() => handleDeleteTemplate(tmpl.id)}>x</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'assets'}
      {#if assets.length === 0}
        <div class="empty">Нет ассетов. Перетащите изображение на канвас.</div>
      {:else}
        <div class="grid">
          {#each assets as asset}
            <div class="card">
              <div class="card-preview">
                <div class="placeholder asset">{asset.type}</div>
              </div>
              <div class="card-info">
                <div class="card-name">{asset.name}</div>
                <div class="card-meta">{asset.type}{asset.cols ? ` ${asset.cols}x${asset.rows}` : ''}</div>
              </div>
              <div class="card-actions">
                <button class="action-btn del" onclick={() => handleDeleteAsset(asset.id)}>x</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .library-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    background: #252526;
    border-bottom: 1px solid #333;
    user-select: none;
  }

  .save-btn {
    padding: 2px 8px;
    background: #094771;
    border: 1px solid #007acc;
    border-radius: 3px;
    color: #4ec9b0;
    font-size: 10px;
    cursor: pointer;
    font-weight: 600;
  }

  .save-btn:hover {
    background: #0a5a8a;
  }

  .search-bar {
    padding: 4px 8px;
    background: #252526;
    border-bottom: 1px solid #333;
  }

  .search-bar input {
    width: 100%;
    padding: 4px 8px;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 3px;
    color: #ccc;
    font-size: 12px;
  }

  .search-bar input:focus {
    outline: none;
    border-color: #007acc;
  }

  .tabs {
    display: flex;
    background: #252526;
    border-bottom: 1px solid #333;
  }

  .tab {
    flex: 1;
    padding: 4px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #888;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .tab:hover {
    color: #ccc;
  }

  .tab.active {
    color: #4ec9b0;
    border-bottom-color: #4ec9b0;
  }

  .count {
    font-size: 9px;
    background: #333;
    padding: 0 4px;
    border-radius: 8px;
    color: #888;
  }

  .tab.active .count {
    background: #094771;
    color: #4ec9b0;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }

  .grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    background: #252526;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .card:hover {
    border-color: #444;
  }

  .card-preview {
    width: 40px;
    height: 40px;
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
    background: #1a1a2e;
  }

  .card-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #555;
  }

  .placeholder.tmpl {
    background: #1a2e1a;
    color: #4ec9b0;
  }

  .placeholder.asset {
    background: #2e1a1a;
    color: #e8a848;
  }

  .card-info {
    flex: 1;
    min-width: 0;
  }

  .card-name {
    font-size: 12px;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    font-size: 10px;
    color: #666;
  }

  .card-tags {
    display: flex;
    gap: 2px;
    margin-top: 2px;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 9px;
    padding: 0 4px;
    background: #333;
    border-radius: 3px;
    color: #888;
  }

  .card-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .action-btn {
    padding: 2px 6px;
    background: #2d2d2d;
    border: 1px solid #444;
    border-radius: 3px;
    color: #aaa;
    font-size: 10px;
    cursor: pointer;
  }

  .action-btn:hover {
    background: #3a3a3a;
    color: #fff;
  }

  .action-btn.fav.active {
    color: #e8a848;
    border-color: #e8a848;
  }

  .action-btn.del:hover {
    background: #5a1d1d;
    border-color: #8b3333;
    color: #ff6b6b;
  }

  .empty, .loading {
    padding: 16px;
    text-align: center;
    color: #555;
    font-size: 12px;
  }
</style>
