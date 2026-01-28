/**
 * Tags service
 * Handles CRUD operations for account tags
 */

import getDatabase, { generateId } from '../db/index.js';
import type { Tag } from '@gmanager/shared';

export interface TagInput {
  name: string;
  color?: string;
}

/**
 * Get all tags
 */
export function getAllTags(): Tag[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, name, color, created_at as createdAt
    FROM tags
    ORDER BY name ASC
  `).all() as Tag[];

  return rows;
}

/**
 * Get tag by ID
 */
export function getTagById(id: string): Tag | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, name, color, created_at as createdAt
    FROM tags
    WHERE id = ?
  `).get(id) as Tag | undefined;

  return row || null;
}

/**
 * Create a new tag
 */
export function createTag(input: TagInput): Tag {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tags (id, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, input.name, input.color || null, now);

  return {
    id,
    name: input.name,
    color: input.color,
    createdAt: now
  };
}

/**
 * Update a tag
 */
export function updateTag(id: string, input: Partial<TagInput>): Tag | null {
  const db = getDatabase();
  const existing = getTagById(id);

  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color || null);
  }

  if (updates.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getTagById(id);
}

/**
 * Delete a tag
 */
export function deleteTag(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Get tags for an account
 */
export function getTagsForAccount(accountId: string): Tag[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT t.id, t.name, t.color, t.created_at as createdAt
    FROM tags t
    INNER JOIN account_tags at ON t.id = at.tag_id
    WHERE at.account_id = ?
    ORDER BY t.name ASC
  `).all(accountId) as Tag[];

  return rows;
}

/**
 * Add tag to account
 */
export function addTagToAccount(accountId: string, tagId: string): boolean {
  const db = getDatabase();
  try {
    db.prepare(`
      INSERT OR IGNORE INTO account_tags (account_id, tag_id, assigned_at)
      VALUES (?, ?, ?)
    `).run(accountId, tagId, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove tag from account
 */
export function removeTagFromAccount(accountId: string, tagId: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM account_tags WHERE account_id = ? AND tag_id = ?').run(accountId, tagId);
  return result.changes > 0;
}

/**
 * Get account count for a tag
 */
export function getTagAccountCount(tagId: string): number {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM account_tags WHERE tag_id = ?').get(tagId) as { count: number };
  return row.count;
}
