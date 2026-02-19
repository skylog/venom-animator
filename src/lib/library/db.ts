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
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  // Пробуем загрузить из IndexedDB
  const saved = await loadFromIndexedDB();
  if (saved) {
    db = new SQL.Database(saved);
  } else {
    db = new SQL.Database();
  }

  // Всегда применяем schema (IF NOT EXISTS безопасно)
  db.run(SCHEMA);

  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
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
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
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
