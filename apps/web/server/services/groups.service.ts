/**
 * Groups service
 * Handles CRUD operations for account groups
 */

import getDatabase, { generateId } from '../db/index.js';
import type { Group } from '@gmanager/shared';

export interface GroupInput {
  name: string;
  color?: string;
  sortOrder?: number;
}

/**
 * Get all groups
 */
export function getAllGroups(): Group[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, name, color, sort_order as sortOrder, created_at as createdAt
    FROM groups
    ORDER BY sort_order ASC, name ASC
  `).all() as Group[];

  return rows;
}

/**
 * Get group by ID
 */
export function getGroupById(id: string): Group | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, name, color, sort_order as sortOrder, created_at as createdAt
    FROM groups
    WHERE id = ?
  `).get(id) as Group | undefined;

  return row || null;
}

/**
 * Create a new group
 */
export function createGroup(input: GroupInput): Group {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO groups (id, name, color, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.name, input.color || null, input.sortOrder || 0, now);

  return {
    id,
    name: input.name,
    color: input.color,
    sortOrder: input.sortOrder || 0,
    createdAt: now
  };
}

/**
 * Update a group
 */
export function updateGroup(id: string, input: Partial<GroupInput>): Group | null {
  const db = getDatabase();
  const existing = getGroupById(id);

  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color || null);
  }
  if (input.sortOrder !== undefined) {
    updates.push('sort_order = ?');
    values.push(input.sortOrder);
  }

  if (updates.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getGroupById(id);
}

/**
 * Delete a group
 */
export function deleteGroup(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Get account count for a group
 */
export function getGroupAccountCount(groupId: string): number {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE group_id = ?').get(groupId) as { count: number };
  return row.count;
}
