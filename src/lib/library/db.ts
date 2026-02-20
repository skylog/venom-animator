import initSqlJs, { type Database } from 'sql.js';

const DB_NAME = 'venom-animator-library';
const DB_STORE = 'database';

/**
 * Схема библиотеки:
 * - animations: сохранённые .vanim документы
 * - assets: импортированные изображения (blob хранятся в IndexedDB отдельно)
 * - templates: шаблоны/пресеты анимаций
 * - tags: система тегов
 * - item_tags: связь many-to-many (item_type + item_id -> tag_id)
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS animations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    json TEXT NOT NULL,
    thumbnail TEXT,
    width INTEGER DEFAULT 512,
    height INTEGER DEFAULT 512,
    duration INTEGER DEFAULT 1000,
    category TEXT DEFAULT 'uncategorized',
    favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('texture', 'spritesheet')),
    path TEXT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    cols INTEGER,
    rows INTEGER,
    blob_key TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'effect',
    json TEXT NOT NULL,
    thumbnail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item_tags (
    item_type TEXT NOT NULL CHECK(item_type IN ('animation', 'asset', 'template')),
    item_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_type, item_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_animations_category ON animations(category);
  CREATE INDEX IF NOT EXISTS idx_animations_favorite ON animations(favorite);
  CREATE INDEX IF NOT EXISTS idx_animations_name ON animations(name);
  CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
  CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
  CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_type, item_id);
  CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
`;

let db: Database | null = null;

/**
 * Инициализирует SQLite БД. Пытается загрузить из IndexedDB,
 * если нет — создаёт новую с пустой схемой.
 */
export async function initDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });

  // Пробуем загрузить из IndexedDB
  const saved = await loadFromIndexedDB();
  const isFirstRun = !saved;

  if (saved) {
    db = new SQL.Database(saved);
  } else {
    db = new SQL.Database();
  }

  // Всегда применяем schema (IF NOT EXISTS безопасно)
  db.run(SCHEMA);

  // При первом запуске загружаем встроенные шаблоны
  if (isFirstRun) {
    await seedBuiltinContent();
  }

  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

/**
 * Выполняет SQL с параметрами через prepared statement.
 * sql.js db.run(sql, params) НЕ биндит параметры — используем prepare().
 */
export function dbRun(sql: string, params?: any[]): void {
  const d = getDB();
  if (!params || params.length === 0) {
    d.run(sql);
    return;
  }
  const stmt = d.prepare(sql);
  stmt.run(params);
  stmt.free();
}

/**
 * Выполняет SELECT с параметрами через prepared statement.
 */
export function dbQuery(sql: string, params?: any[]): { columns: string[]; values: any[][] } | null {
  const d = getDB();
  const stmt = d.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const columns: string[] = stmt.getColumnNames();
  const values: any[][] = [];
  while (stmt.step()) {
    values.push(stmt.get());
  }
  stmt.free();
  return values.length > 0 ? { columns, values } : null;
}

/**
 * Сохраняет текущее состояние БД в IndexedDB.
 */
export async function persistDB(): Promise<void> {
  if (!db) return;
  const data = db.export();
  const buffer = new Uint8Array(data);
  await saveToIndexedDB(buffer);
}

/**
 * Экспорт БД как файл для бэкапа.
 */
export function exportDB(): Uint8Array {
  if (!db) throw new Error('Database not initialized');
  return new Uint8Array(db.export());
}

/**
 * Импорт БД из файла.
 */
export async function importDB(data: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });

  if (db) db.close();
  db = new SQL.Database(data);
  db.run(SCHEMA); // на случай если старая версия
  await persistDB();
}

// --- IndexedDB persistence ---

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(data, 'db');
    tx.oncomplete = () => { idb.close(); resolve(); };
    tx.onerror = () => { idb.close(); reject(tx.error); };
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get('db');
      req.onsuccess = () => { idb.close(); resolve(req.result ?? null); };
      req.onerror = () => { idb.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

// --- Seed встроенного контента ---

const BUILTIN_TEMPLATES = [
  { name: 'Reel Symbol', category: 'slot-reel', description: 'Иконка на барабане: Idle → Land → Win → Dim', url: '/templates/reel-symbol.vanim' },
  { name: 'Win Popup', category: 'popup', description: 'Всплывающее окно выигрыша: Intro → Hold → Outro', url: '/templates/win-popup.vanim' },
  { name: 'Free Spins Trigger', category: 'popup', description: 'Триггер фриспинов: Flash → Reveal → Hold → Dismiss', url: '/templates/free-spins-trigger.vanim' },
  { name: 'Scatter Collect', category: 'slot-reel', description: 'Скаттер с анимацией сбора: Anticipate → Collect → Settle', url: '/templates/scatter-collect.vanim' },
  { name: 'Big Win Counter', category: 'popup', description: 'Счётчик крупного выигрыша: Intro → Count Up → Celebrate → Dismiss', url: '/templates/big-win-counter.vanim' },
  { name: 'Bonus Meter Fill', category: 'ui', description: 'Прогресс-бар бонуса: Idle → Fill → Complete', url: '/templates/bonus-meter-fill.vanim' },
];

const BUILTIN_ANIMATIONS = [
  { name: 'Coin Spin', category: 'effect', description: 'Вращающаяся монетка с подбрасыванием и бликом', url: '/examples/coin-spin.vanim' },
  { name: 'Button Press', category: 'ui', description: 'Кнопка с анимацией Idle → Hover → Press → Release', url: '/examples/button-press.vanim' },
  { name: 'Jackpot Celebration', category: 'popup', description: 'Полноэкранный эффект джекпота с партиклами и конфетти', url: '/examples/jackpot-celebration.vanim' },
  { name: 'Loading Spinner', category: 'ui', description: 'Лоадер с двумя орбитальными точками', url: '/examples/loading-spinner.vanim' },
  { name: 'Multiplier Badge', category: 'effect', description: 'Бейдж множителя с пульсацией и свечением', url: '/examples/multiplier-badge.vanim' },
  { name: 'Wild Expand', category: 'slot-reel', description: 'Расширяющийся Wild символ на весь рил', url: '/examples/wild-expand.vanim' },
  { name: 'Skull Symbol', category: 'slot-reel', description: 'Символ черепа с зелёным свечением — idle/land/win/dim', url: '/examples/skull-symbol.vanim' },
];

const BUILTIN_ASSETS = [
  { id: 'asset-gold-coin', name: 'Gold Coin', type: 'texture' as const, mime_type: 'image/png', width: 128, height: 128 },
  { id: 'asset-diamond', name: 'Diamond', type: 'texture' as const, mime_type: 'image/png', width: 96, height: 96 },
  { id: 'asset-wild-symbol', name: 'Wild Symbol', type: 'texture' as const, mime_type: 'image/png', width: 200, height: 200 },
  { id: 'asset-star-particle', name: 'Star Particle', type: 'texture' as const, mime_type: 'image/png', width: 32, height: 32 },
  { id: 'asset-coin-sheet', name: 'Coin Spritesheet', type: 'spritesheet' as const, mime_type: 'image/png', width: 512, height: 128, cols: 8, rows: 2 },
  { id: 'asset-explosion-sheet', name: 'Explosion Spritesheet', type: 'spritesheet' as const, mime_type: 'image/png', width: 1024, height: 256, cols: 8, rows: 2 },
  { id: 'asset-ui-button', name: 'UI Button Slice', type: 'texture' as const, mime_type: 'image/png', width: 256, height: 80 },
];

async function seedBuiltinContent(): Promise<void> {
  if (!db) return;

  // Шаблоны
  for (const tmpl of BUILTIN_TEMPLATES) {
    try {
      const resp = await fetch(tmpl.url);
      if (!resp.ok) continue;
      const json = await resp.text();
      const id = tmpl.name.toLowerCase().replace(/\s+/g, '-');
      dbRun(
        `INSERT OR IGNORE INTO templates (id, name, description, category, json) VALUES (?, ?, ?, ?, ?)`,
        [id, tmpl.name, tmpl.description, tmpl.category, json]
      );
    } catch { /* skip */ }
  }

  // Анимации
  for (const anim of BUILTIN_ANIMATIONS) {
    try {
      const resp = await fetch(anim.url);
      if (!resp.ok) continue;
      const json = await resp.text();
      const doc = JSON.parse(json);
      const id = anim.name.toLowerCase().replace(/\s+/g, '-');
      dbRun(
        `INSERT OR IGNORE INTO animations (id, name, description, json, width, height, duration, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, anim.name, anim.description, json, doc.width, doc.height, doc.duration, anim.category]
      );
    } catch { /* skip */ }
  }

  // Ассеты (метаданные без blob)
  for (const asset of BUILTIN_ASSETS) {
    dbRun(
      `INSERT OR IGNORE INTO assets (id, name, type, mime_type, width, height, cols, rows) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [asset.id, asset.name, asset.type, asset.mime_type, asset.width, asset.height,
       'cols' in asset ? (asset as any).cols : null,
       'rows' in asset ? (asset as any).rows : null]
    );
  }

  await persistDB();
}
