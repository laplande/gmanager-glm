/**
 * Database module for GManager Web
 *
 * This module provides SQLite database access using better-sqlite3.
 * It manages the vault file, sessions, and encrypted account storage.
 */

import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import type { Account, Group, Tag, AccountTag } from '@gmanager/shared';

/**
 * Session data for authenticated vault access
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** The master vault ID this session belongs to */
  vaultId: string;
  /** The encrypted session key (AES-256-GCM encrypted master key) */
  encryptedSessionKey: string;
  /** Session creation timestamp */
  createdAt: string;
  /** Session last access timestamp */
  lastAccessAt: string;
  /** Session expiration timestamp */
  expiresAt: string;
}

/**
 * Vault metadata storage
 */
export interface Vault {
  /** Unique vault identifier */
  id: string;
  /** Vault name */
  name: string;
  /** Password hash (bcrypt) */
  passwordHash: string;
  /** The encrypted master key */
  encryptedMasterKey: string;
  /** KDF salt (base64) */
  kdfSalt: string;
  /** KDF iterations */
  kdfIterations: number;
  /** Vault creation timestamp */
  createdAt: string;
}

/**
 * Database instance wrapper
 */
export class GManagerDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeSchema();
  }

  /**
   * Creates the database schema if it doesn't exist
   */
  private initializeSchema(): void {
    // Vaults table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vaults (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        encrypted_master_key TEXT NOT NULL,
        kdf_salt TEXT NOT NULL,
        kdf_iterations INTEGER NOT NULL DEFAULT 100000,
        created_at TEXT NOT NULL DEFAULT (datetime('iso'))
      )
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        encrypted_session_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('iso')),
        last_access_at TEXT NOT NULL DEFAULT (datetime('iso')),
        expires_at TEXT NOT NULL
      )
    `);

    // Accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password TEXT,
        recovery_email TEXT,
        totp_secret TEXT,
        year TEXT,
        notes TEXT,
        group_id TEXT,
        field_order TEXT,
        raw_import_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('iso')),
        updated_at TEXT NOT NULL DEFAULT (datetime('iso'))
      )
    `);

    // Groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('iso'))
      )
    `);

    // Tags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('iso'))
      )
    `);

    // Account tags junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS account_tags (
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        assigned_at TEXT NOT NULL DEFAULT (datetime('iso')),
        PRIMARY KEY (account_id, tag_id)
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_vault_id ON sessions(vault_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_vault_id ON accounts(vault_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
      CREATE INDEX IF NOT EXISTS idx_groups_vault_id ON groups(vault_id);
      CREATE INDEX IF NOT EXISTS idx_tags_vault_id ON tags(vault_id);
      CREATE INDEX IF NOT EXISTS idx_account_tags_account_id ON account_tags(account_id);
      CREATE INDEX IF NOT EXISTS idx_account_tags_tag_id ON account_tags(tag_id);
    `);
  }

  /**
   * Generates a unique ID
   */
  generateId(): string {
    return randomBytes(16).toString('base64url');
  }

  // ============ Vault Operations ============

  /**
   * Creates a new vault with the given credentials
   */
  createVault(params: {
    name: string;
    passwordHash: string;
    encryptedMasterKey: string;
    kdfSalt: string;
    kdfIterations?: number;
  }): Vault {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO vaults (id, name, password_hash, encrypted_master_key, kdf_salt, kdf_iterations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.name,
      params.passwordHash,
      params.encryptedMasterKey,
      params.kdfSalt,
      params.kdfIterations ?? 100000,
      now
    );

    return {
      id,
      name: params.name,
      passwordHash: params.passwordHash,
      encryptedMasterKey: params.encryptedMasterKey,
      kdfSalt: params.kdfSalt,
      kdfIterations: params.kdfIterations ?? 100000,
      createdAt: now,
    };
  }

  /**
   * Gets a vault by ID
   */
  getVaultById(id: string): Vault | null {
    const stmt = this.db.prepare('SELECT * FROM vaults WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToVault(row) : null;
  }

  /**
   * Checks if a vault exists
   */
  vaultExists(): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM vaults');
    const result = stmt.get() as { count: number };
    return (result.count ?? 0) > 0;
  }

  /**
   * Gets the first (and should be only) vault
   */
  getFirstVault(): Vault | null {
    const stmt = this.db.prepare('SELECT * FROM vaults LIMIT 1');
    const row = stmt.get() as any;
    return row ? this.mapRowToVault(row) : null;
  }

  // ============ Session Operations ============

  /**
   * Creates a new session for a vault
   */
  createSession(params: {
    vaultId: string;
    encryptedSessionKey: string;
    expirationHours?: number;
  }): Session {
    const id = this.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expirationHours ?? 24) * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, vault_id, encrypted_session_key, created_at, last_access_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.vaultId,
      params.encryptedSessionKey,
      now.toISOString(),
      now.toISOString(),
      expiresAt.toISOString()
    );

    return {
      id,
      vaultId: params.vaultId,
      encryptedSessionKey: params.encryptedSessionKey,
      createdAt: now.toISOString(),
      lastAccessAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Gets a session by ID
   */
  getSession(id: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToSession(row) : null;
  }

  /**
   * Updates session last access time
   */
  updateSessionAccess(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE sessions SET last_access_at = ? WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
  }

  /**
   * Deletes a session
   */
  deleteSession(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  }

  /**
   * Cleans up expired sessions
   */
  cleanupExpiredSessions(): number {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < datetime("iso")');
    const result = stmt.run();
    return result.changes ?? 0;
  }

  // ============ Account Operations ============

  /**
   * Lists all accounts for a vault
   */
  listAccounts(vaultId: string): Account[] {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts WHERE vault_id = ? ORDER BY created_at DESC
    `);
    const rows = stmt.all(vaultId) as any[];
    return rows.map(row => this.mapRowToAccount(row));
  }

  /**
   * Gets an account by ID
   */
  getAccount(id: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToAccount(row) : null;
  }

  /**
   * Creates a new account
   */
  createAccount(vaultId: string, account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO accounts (
        id, vault_id, email, password, recovery_email, totp_secret,
        year, notes, group_id, field_order, raw_import_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      vaultId,
      account.email,
      account.password ?? null,
      account.recoveryEmail ?? null,
      account.totpSecret ?? null,
      account.year ?? null,
      account.notes ?? null,
      account.groupId ?? null,
      account.fieldOrder ? JSON.stringify(account.fieldOrder) : null,
      account.rawImportId ?? null,
      now,
      now
    );

    return {
      id,
      ...account,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Updates an account
   */
  updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Account | null {
    const existing = this.getAccount(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.recoveryEmail !== undefined) {
      fields.push('recovery_email = ?');
      values.push(updates.recoveryEmail);
    }
    if (updates.totpSecret !== undefined) {
      fields.push('totp_secret = ?');
      values.push(updates.totpSecret);
    }
    if (updates.year !== undefined) {
      fields.push('year = ?');
      values.push(updates.year);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.groupId !== undefined) {
      fields.push('group_id = ?');
      values.push(updates.groupId);
    }
    if (updates.fieldOrder !== undefined) {
      fields.push('field_order = ?');
      values.push(updates.fieldOrder ? JSON.stringify(updates.fieldOrder) : null);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getAccount(id);
  }

  /**
   * Deletes an account
   */
  deleteAccount(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  }

  /**
   * Searches accounts by email (partial match)
   */
  searchAccounts(vaultId: string, query: string, limit: number = 50): Account[] {
    const stmt = this.db.prepare(`
      SELECT * FROM accounts
      WHERE vault_id = ? AND email LIKE ?
      ORDER BY email ASC
      LIMIT ?
    `);
    const rows = stmt.all(vaultId, `%${query}%`, limit) as any[];
    return rows.map(row => this.mapRowToAccount(row));
  }

  // ============ Group Operations ============

  listGroups(vaultId: string): Group[] {
    const stmt = this.db.prepare('SELECT * FROM groups WHERE vault_id = ? ORDER BY sort_order, name');
    const rows = stmt.all(vaultId) as any[];
    return rows.map(row => this.mapRowToGroup(row));
  }

  createGroup(vaultId: string, group: Omit<Group, 'id' | 'createdAt'>): Group {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO groups (id, vault_id, name, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, vaultId, group.name, group.color ?? null, group.sortOrder, now);

    return { id, ...group, createdAt: now };
  }

  // ============ Tag Operations ============

  listTags(vaultId: string): Tag[] {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE vault_id = ? ORDER BY name');
    const rows = stmt.all(vaultId) as any[];
    return rows.map(row => this.mapRowToTag(row));
  }

  createTag(vaultId: string, tag: Omit<Tag, 'id' | 'createdAt'>): Tag {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, vault_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, vaultId, tag.name, tag.color ?? null, now);

    return { id, ...tag, createdAt: now };
  }

  // ============ Account Tags Operations ============

  getAccountTags(accountId: string): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN account_tags at ON t.id = at.tag_id
      WHERE at.account_id = ?
      ORDER BY t.name
    `);
    const rows = stmt.all(accountId) as any[];
    return rows.map(row => this.mapRowToTag(row));
  }

  addTagToAccount(accountId: string, tagId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO account_tags (account_id, tag_id, assigned_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(accountId, tagId, new Date().toISOString());
  }

  removeTagFromAccount(accountId: string, tagId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM account_tags WHERE account_id = ? AND tag_id = ?
    `);
    const result = stmt.run(accountId, tagId);
    return (result.changes ?? 0) > 0;
  }

  // ============ Cleanup ============

  close(): void {
    this.db.close();
  }

  // ============ Row Mappers ============

  private mapRowToVault(row: any): Vault {
    return {
      id: row.id,
      name: row.name,
      passwordHash: row.password_hash,
      encryptedMasterKey: row.encrypted_master_key,
      kdfSalt: row.kdf_salt,
      kdfIterations: row.kdf_iterations,
      createdAt: row.created_at,
    };
  }

  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      vaultId: row.vault_id,
      encryptedSessionKey: row.encrypted_session_key,
      createdAt: row.created_at,
      lastAccessAt: row.last_access_at,
      expiresAt: row.expires_at,
    };
  }

  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      rawImportId: row.raw_import_id,
      email: row.email,
      password: row.password ?? undefined,
      recoveryEmail: row.recovery_email ?? undefined,
      totpSecret: row.totp_secret ?? undefined,
      year: row.year ?? undefined,
      notes: row.notes ?? undefined,
      groupId: row.group_id ?? undefined,
      fieldOrder: row.field_order ? JSON.parse(row.field_order) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToGroup(row: any): Group {
    return {
      id: row.id,
      name: row.name,
      color: row.color ?? undefined,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    };
  }

  private mapRowToTag(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color ?? undefined,
      createdAt: row.created_at,
    };
  }
}

/**
 * Global database instance
 * Initialized when the server starts
 */
let dbInstance: GManagerDatabase | null = null;

/**
 * Gets or creates the database instance
 */
export function getDatabase(dbPath?: string): GManagerDatabase {
  if (!dbInstance) {
    const path = dbPath ?? process.env.GMANAGER_DB_PATH ?? './data/gmanager.db';
    // Ensure directory exists
    const fs = require('fs');
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new GManagerDatabase(path);
  }
  return dbInstance;
}

/**
 * Closes the database instance
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
