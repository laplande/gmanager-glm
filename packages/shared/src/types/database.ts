/**
 * Database schema types for GManager
 *
 * This module defines the core database entities used across the application.
 * These represent the persisted data models.
 */

/**
 * Raw text import record
 * Tracks the original text data that accounts were parsed from
 */
export interface RawImport {
  /** Unique identifier for the import batch */
  id: string;
  /** The original raw text content */
  rawText: string;
  /** How the data was imported */
  sourceType: 'file' | 'text' | 'database';
  /** Source identifier (filename, clipboard, etc.) */
  sourceName?: string;
  /** ISO timestamp when the import occurred */
  importedAt: string;
}

/**
 * Account grouping/category
 * Allows organizing related accounts together
 */
export interface Group {
  /** Unique identifier for the group */
  id: string;
  /** Display name for the group */
  name: string;
  /** Optional color for UI highlighting (hex format) */
  color?: string;
  /** Sort order for display (lower = earlier) */
  sortOrder: number;
  /** ISO timestamp when the group was created */
  createdAt: string;
}

/**
 * Tag/label for accounts
 * Flexible categorization - accounts can have multiple tags
 */
export interface Tag {
  /** Unique identifier for the tag */
  id: string;
  /** Display name for the tag */
  name: string;
  /** Optional color for UI highlighting (hex format) */
  color?: string;
  /** ISO timestamp when the tag was created */
  createdAt: string;
}

/**
 * Junction table for account-tag associations
 * Many-to-many relationship between accounts and tags
 */
export interface AccountTag {
  /** The account ID */
  accountId: string;
  /** The tag ID */
  tagId: string;
  /** ISO timestamp when the tag was applied */
  assignedAt: string;
}

/**
 * Audit log entry
 * Tracks all significant operations on accounts
 */
export interface OperationLog {
  /** Unique identifier for the log entry */
  id: string;
  /** The account affected (null for global operations) */
  accountId?: string;
  /** The type of operation performed */
  action:
    | 'import'
    | 'update'
    | 'delete'
    | 'field_adjust'
    | 'group_change'
    | 'tag_add'
    | 'tag_remove';
  /** Additional contextual data about the operation */
  details?: Record<string, unknown>;
  /** ISO timestamp when the operation occurred */
  createdAt: string;
}

/**
 * Operation log details specific to each action type
 */
export interface OperationLogDetails {
  /** Details for import actions */
  import: {
    /** Number of accounts imported */
    count: number;
    /** Source of the import */
    source: RawImport['sourceType'];
  };
  /** Details for update actions */
  update: {
    /** Fields that were changed */
    fields: string[];
  };
  /** Details for delete actions */
  delete: {
    /** The email of the deleted account (for reference) */
    email?: string;
  };
  /** Details for field adjustment actions */
  field_adjust: {
    /** The field that was adjusted */
    field: string;
    /** Previous value reference */
    from?: string;
  };
  /** Details for group changes */
  group_change: {
    /** Previous group ID (null if ungrouped) */
    fromGroupId?: string | null;
    /** New group ID (null if ungrouped) */
    toGroupId?: string | null;
  };
  /** Details for tag additions */
  tag_add: {
    /** The tag that was added */
    tagId: string;
    /** Tag name for reference */
    tagName: string;
  };
  /** Details for tag removals */
  tag_remove: {
    /** The tag that was removed */
    tagId: string;
    /** Tag name for reference */
    tagName: string;
  };
}

/**
 * Database schema version info
 * Used for migrations and compatibility checks
 */
export interface SchemaVersion {
  /** The current schema version */
  version: number;
  /** ISO timestamp of last migration */
  migratedAt?: string;
}

/**
 * Full database state
 * All tables in a single interface for transactions
 */
export interface Database {
  /** All raw imports */
  rawImports: RawImport[];
  /** All accounts (from account.ts) */
  accounts: unknown[];
  /** All groups */
  groups: Group[];
  /** All tags */
  tags: Tag[];
  /** All account-tag associations */
  accountTags: AccountTag[];
  /** All operation logs */
  operationLogs: OperationLog[];
}

/**
 * Type import for Account to avoid circular dependency
 * Re-imported here for convenience
 */
import type { Account } from './account.js';

/**
 * Augmented Database with proper Account type
 */
export interface DatabaseWithAccounts {
  /** All raw imports */
  rawImports: RawImport[];
  /** All accounts */
  accounts: Account[];
  /** All groups */
  groups: Group[];
  /** All tags */
  tags: Tag[];
  /** All account-tag associations */
  accountTags: AccountTag[];
  /** All operation logs */
  operationLogs: OperationLog[];
}
