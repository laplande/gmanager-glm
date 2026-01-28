/**
 * Accounts service
 * Handles CRUD operations for GLM accounts with encryption
 */

import getDatabase, { generateId } from '../db/index.js';
import { encrypt, decrypt } from './crypto.service.js';
import { getTagsForAccount, addTagToAccount } from './tags.service.js';
import type { AccountWithTags } from '@gmanager/shared';

export interface AccountInput {
  email: string;
  password?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  year?: string;
  notes?: string;
  groupId?: string;
  tagIds?: string[];
  fieldOrder?: string[];
}

export interface AccountSearchParams {
  query?: string;
  groupId?: string;
  tagIds?: string[];
  year?: string;
}

/**
 * Encrypt sensitive account fields
 */
function encryptAccount(account: AccountInput, key: Buffer): any {
  return {
    email: account.email,
    password: account.password ? encrypt(account.password, key) : null,
    recovery_email: account.recoveryEmail ? encrypt(account.recoveryEmail, key) : null,
    totp_secret: account.totpSecret ? encrypt(account.totpSecret, key) : null,
    year: account.year || null,
    notes: account.notes ? encrypt(account.notes, key) : null,
    group_id: account.groupId || null,
    field_order: account.fieldOrder ? JSON.stringify(account.fieldOrder) : null
  };
}

/**
 * Decrypt sensitive account fields
 */
function decryptAccount(row: any, key: Buffer): AccountWithTags {
  return {
    id: row.id,
    email: row.email,
    password: row.password ? decrypt(row.password, key) : undefined,
    recoveryEmail: row.recovery_email ? decrypt(row.recovery_email, key) : undefined,
    totpSecret: row.totp_secret ? decrypt(row.totp_secret, key) : undefined,
    year: row.year || undefined,
    notes: row.notes ? decrypt(row.notes, key) : undefined,
    groupId: row.group_id || undefined,
    fieldOrder: row.field_order ? JSON.parse(row.field_order) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: [] // Will be populated separately
  };
}

/**
 * Get all accounts
 */
export function getAllAccounts(key: Buffer): AccountWithTags[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, email, password, recovery_email, totp_secret, year, notes,
           group_id, field_order, created_at, updated_at
    FROM accounts
    ORDER BY created_at DESC
  `).all();

  return rows.map(row => {
    const account = decryptAccount(row, key);
    account.tags = getTagsForAccount(account.id);
    return account;
  });
}

/**
 * Get account by ID
 */
export function getAccountById(id: string, key: Buffer): AccountWithTags | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, email, password, recovery_email, totp_secret, year, notes,
           group_id, field_order, created_at, updated_at
    FROM accounts
    WHERE id = ?
  `).get(id);

  if (!row) return null;

  const account = decryptAccount(row, key);
  account.tags = getTagsForAccount(account.id);
  return account;
}

/**
 * Create a new account
 */
export function createAccount(input: AccountInput, key: Buffer): AccountWithTags {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  const encrypted = encryptAccount(input, key);

  db.prepare(`
    INSERT INTO accounts (
      id, email, password, recovery_email, totp_secret, year, notes,
      group_id, field_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    encrypted.email,
    encrypted.password,
    encrypted.recovery_email,
    encrypted.totp_secret,
    encrypted.year,
    encrypted.notes,
    encrypted.group_id,
    encrypted.field_order,
    now,
    now
  );

  // Add tags if provided
  if (input.tagIds && input.tagIds.length > 0) {
    for (const tagId of input.tagIds) {
      addTagToAccount(id, tagId);
    }
  }

  return getAccountById(id, key)!;
}

/**
 * Update an account
 */
export function updateAccount(id: string, input: Partial<AccountInput>, key: Buffer): AccountWithTags | null {
  const db = getDatabase();
  const existing = getAccountById(id, key);

  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.password !== undefined) {
    updates.push('password = ?');
    values.push(input.password ? encrypt(input.password, key) : null);
  }
  if (input.recoveryEmail !== undefined) {
    updates.push('recovery_email = ?');
    values.push(input.recoveryEmail ? encrypt(input.recoveryEmail, key) : null);
  }
  if (input.totpSecret !== undefined) {
    updates.push('totp_secret = ?');
    values.push(input.totpSecret ? encrypt(input.totpSecret, key) : null);
  }
  if (input.year !== undefined) {
    updates.push('year = ?');
    values.push(input.year || null);
  }
  if (input.notes !== undefined) {
    updates.push('notes = ?');
    values.push(input.notes ? encrypt(input.notes, key) : null);
  }
  if (input.groupId !== undefined) {
    updates.push('group_id = ?');
    values.push(input.groupId || null);
  }
  if (input.fieldOrder !== undefined) {
    updates.push('field_order = ?');
    values.push(input.fieldOrder ? JSON.stringify(input.fieldOrder) : null);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // Update tags if provided
  if (input.tagIds !== undefined) {
    // Remove all existing tags
    db.prepare('DELETE FROM account_tags WHERE account_id = ?').run(id);
    // Add new tags
    for (const tagId of input.tagIds) {
      addTagToAccount(id, tagId);
    }
  }

  return getAccountById(id, key);
}

/**
 * Delete an account
 */
export function deleteAccount(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Search accounts
 */
export function searchAccounts(params: AccountSearchParams, key: Buffer): AccountWithTags[] {
  const db = getDatabase();
  let query = `
    SELECT DISTINCT a.id, a.email, a.password, a.recovery_email, a.totp_secret,
           a.year, a.notes, a.group_id, a.field_order, a.created_at, a.updated_at
    FROM accounts a
  `;

  const conditions: string[] = [];
  const values: any[] = [];

  // Join with account_tags if filtering by tags
  if (params.tagIds && params.tagIds.length > 0) {
    query += ' INNER JOIN account_tags at ON a.id = at.account_id';
    conditions.push(`at.tag_id IN (${params.tagIds.map(() => '?').join(', ')})`);
    values.push(...params.tagIds);
  }

  // Filter by group
  if (params.groupId) {
    conditions.push('a.group_id = ?');
    values.push(params.groupId);
  }

  // Filter by year
  if (params.year) {
    conditions.push('a.year = ?');
    values.push(params.year);
  }

  // Text search (email only, since other fields are encrypted)
  if (params.query) {
    conditions.push('a.email LIKE ?');
    values.push(`%${params.query}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.created_at DESC';

  const rows = db.prepare(query).all(...values);

  return rows.map(row => {
    const account = decryptAccount(row, key);
    account.tags = getTagsForAccount(account.id);
    return account;
  });
}
