import { getDB, persistDB } from './db';
import type { VanimDocument } from '$lib/types/vanim';

// --- Types ---

export interface LibraryAnimation {
  id: string;
  name: string;
  description: string;
  json: string;
  thumbnail: string | null;
  width: number;
  height: number;
  duration: number;
  category: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface LibraryAsset {
  id: string;
  name: string;
  type: 'texture' | 'spritesheet';
  path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  cols: number | null;
  rows: number | null;
  blob_key: string | null;
  created_at: string;
}

export interface LibraryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  json: string;
  thumbnail: string | null;
  created_at: string;
  tags: string[];
}

export interface SearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  favorite?: boolean;
  limit?: number;
  offset?: number;
}

// --- Animations ---

export function saveAnimation(doc: VanimDocument, description = '', category = 'uncategorized', thumbnail?: string): string {
  const db = getDB();
  const id = doc.name + '-' + Date.now().toString(36);
  const json = JSON.stringify(doc);

  db.run(
    `INSERT OR REPLACE INTO animations (id, name, description, json, thumbnail, width, height, duration, category, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, doc.name, description, json, thumbnail ?? null, doc.width, doc.height, doc.duration, category]
  );

  persistDB();
  return id;
}

export function updateAnimation(id: string, updates: Partial<{ name: string; description: string; json: string; thumbnail: string; category: string; favorite: boolean }>): void {
  const db = getDB();
  const sets: string[] = [];
  const vals: any[] = [];

  if (updates.name !== undefined) { sets.push('name = ?'); vals.push(updates.name); }
  if (updates.description !== undefined) { sets.push('description = ?'); vals.push(updates.description); }
  if (updates.json !== undefined) {
    sets.push('json = ?');
    vals.push(updates.json);
    try {
      const doc = JSON.parse(updates.json) as VanimDocument;
      sets.push('width = ?, height = ?, duration = ?');
      vals.push(doc.width, doc.height, doc.duration);
    } catch { /* ignore */ }
  }
  if (updates.thumbnail !== undefined) { sets.push('thumbnail = ?'); vals.push(updates.thumbnail); }
  if (updates.category !== undefined) { sets.push('category = ?'); vals.push(updates.category); }
  if (updates.favorite !== undefined) { sets.push('favorite = ?'); vals.push(updates.favorite ? 1 : 0); }

  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.run(`UPDATE animations SET ${sets.join(', ')} WHERE id = ?`, vals);
  persistDB();
}

export function deleteAnimation(id: string): void {
  const db = getDB();
  db.run('DELETE FROM animations WHERE id = ?', [id]);
  db.run("DELETE FROM item_tags WHERE item_type = 'animation' AND item_id = ?", [id]);
  persistDB();
}

export function getAnimation(id: string): LibraryAnimation | null {
  const db = getDB();
  const result = db.exec('SELECT * FROM animations WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const row = result[0];
  const cols = row.columns;
  const vals = row.values[0];
  const obj: any = {};
  cols.forEach((c, i) => obj[c] = vals[i]);
  obj.favorite = !!obj.favorite;
  obj.tags = getItemTags('animation', id);
  return obj as LibraryAnimation;
}

export function searchAnimations(opts: SearchOptions = {}): LibraryAnimation[] {
  const db = getDB();
  const where: string[] = [];
  const params: any[] = [];

  if (opts.query) {
    where.push('(name LIKE ? OR description LIKE ?)');
    const q = `%${opts.query}%`;
    params.push(q, q);
  }
  if (opts.category) {
    where.push('category = ?');
    params.push(opts.category);
  }
  if (opts.favorite !== undefined) {
    where.push('favorite = ?');
    params.push(opts.favorite ? 1 : 0);
  }
  if (opts.tags && opts.tags.length > 0) {
    const placeholders = opts.tags.map(() => '?').join(',');
    where.push(`id IN (
      SELECT item_id FROM item_tags
      JOIN tags ON tags.id = item_tags.tag_id
      WHERE item_type = 'animation' AND tags.name IN (${placeholders})
    )`);
    params.push(...opts.tags);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const sql = `SELECT * FROM animations ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = db.exec(sql, params);
  if (result.length === 0) return [];

  return result[0].values.map((vals) => {
    const obj: any = {};
    result[0].columns.forEach((c, i) => obj[c] = vals[i]);
    obj.favorite = !!obj.favorite;
    obj.tags = getItemTags('animation', obj.id);
    return obj as LibraryAnimation;
  });
}

// --- Assets ---

export function saveAsset(asset: Omit<LibraryAsset, 'created_at'>): void {
  const db = getDB();
  db.run(
    `INSERT OR REPLACE INTO assets (id, name, type, path, mime_type, width, height, cols, rows, blob_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [asset.id, asset.name, asset.type, asset.path, asset.mime_type, asset.width, asset.height, asset.cols, asset.rows, asset.blob_key]
  );
  persistDB();
}

export function searchAssets(opts: SearchOptions = {}): LibraryAsset[] {
  const db = getDB();
  const where: string[] = [];
  const params: any[] = [];

  if (opts.query) {
    where.push('name LIKE ?');
    params.push(`%${opts.query}%`);
  }
  if (opts.category) {
    where.push('type = ?');
    params.push(opts.category);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const result = db.exec(
    `SELECT * FROM assets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  if (result.length === 0) return [];

  return result[0].values.map((vals) => {
    const obj: any = {};
    result[0].columns.forEach((c, i) => obj[c] = vals[i]);
    return obj as LibraryAsset;
  });
}

export function deleteAsset(id: string): void {
  const db = getDB();
  db.run('DELETE FROM assets WHERE id = ?', [id]);
  db.run("DELETE FROM item_tags WHERE item_type = 'asset' AND item_id = ?", [id]);
  persistDB();
}

// --- Templates ---

export function saveTemplate(name: string, description: string, category: string, doc: VanimDocument, thumbnail?: string): string {
  const db = getDB();
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  db.run(
    `INSERT INTO templates (id, name, description, category, json, thumbnail) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, description, category, JSON.stringify(doc), thumbnail ?? null]
  );
  persistDB();
  return id;
}

export function searchTemplates(opts: SearchOptions = {}): LibraryTemplate[] {
  const db = getDB();
  const where: string[] = [];
  const params: any[] = [];

  if (opts.query) {
    where.push('(name LIKE ? OR description LIKE ?)');
    const q = `%${opts.query}%`;
    params.push(q, q);
  }
  if (opts.category) {
    where.push('category = ?');
    params.push(opts.category);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const result = db.exec(
    `SELECT * FROM templates ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  if (result.length === 0) return [];

  return result[0].values.map((vals) => {
    const obj: any = {};
    result[0].columns.forEach((c, i) => obj[c] = vals[i]);
    obj.tags = getItemTags('template', obj.id);
    return obj as LibraryTemplate;
  });
}

export function deleteTemplate(id: string): void {
  const db = getDB();
  db.run('DELETE FROM templates WHERE id = ?', [id]);
  db.run("DELETE FROM item_tags WHERE item_type = 'template' AND item_id = ?", [id]);
  persistDB();
}

// --- Tags ---

export function addTag(name: string): number {
  const db = getDB();
  db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name]);
  const result = db.exec('SELECT id FROM tags WHERE name = ?', [name]);
  persistDB();
  return result[0].values[0][0] as number;
}

export function getAllTags(): { id: number; name: string }[] {
  const db = getDB();
  const result = db.exec('SELECT id, name FROM tags ORDER BY name');
  if (result.length === 0) return [];
  return result[0].values.map((v) => ({ id: v[0] as number, name: v[1] as string }));
}

export function tagItem(itemType: 'animation' | 'asset' | 'template', itemId: string, tagName: string): void {
  const tagId = addTag(tagName);
  const db = getDB();
  db.run('INSERT OR IGNORE INTO item_tags (item_type, item_id, tag_id) VALUES (?, ?, ?)', [itemType, itemId, tagId]);
  persistDB();
}

export function untagItem(itemType: 'animation' | 'asset' | 'template', itemId: string, tagName: string): void {
  const db = getDB();
  db.run(
    `DELETE FROM item_tags WHERE item_type = ? AND item_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)`,
    [itemType, itemId, tagName]
  );
  persistDB();
}

function getItemTags(itemType: string, itemId: string): string[] {
  const db = getDB();
  const result = db.exec(
    `SELECT tags.name FROM item_tags JOIN tags ON tags.id = item_tags.tag_id WHERE item_type = ? AND item_id = ?`,
    [itemType, itemId]
  );
  if (result.length === 0) return [];
  return result[0].values.map((v) => v[0] as string);
}

// --- Stats ---

export function getLibraryStats(): { animations: number; assets: number; templates: number; tags: number } {
  const db = getDB();
  const count = (sql: string) => {
    const res = db.exec(sql);
    return (res.length > 0 ? res[0].values[0][0] : 0) as number;
  };
  return {
    animations: count('SELECT COUNT(*) FROM animations'),
    assets: count('SELECT COUNT(*) FROM assets'),
    templates: count('SELECT COUNT(*) FROM templates'),
    tags: count('SELECT COUNT(*) FROM tags'),
  };
}

export function getAnimationCategories(): string[] {
  const db = getDB();
  const result = db.exec('SELECT DISTINCT category FROM animations ORDER BY category');
  if (result.length === 0) return [];
  return result[0].values.map((v) => v[0] as string);
}

export function getTemplateCategories(): string[] {
  const db = getDB();
  const result = db.exec('SELECT DISTINCT category FROM templates ORDER BY category');
  if (result.length === 0) return [];
  return result[0].values.map((v) => v[0] as string);
}
