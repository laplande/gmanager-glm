/**
 * Account types for GManager
 *
 * This module defines the core account-related types used across the application.
 * Accounts represent stored credentials with encrypted sensitive data.
 */

/**
 * A parsed account from raw text input
 * Contains the extracted data before persistence
 */
export interface ParsedAccount {
  /** The primary email address */
  email: string;
  /** The password (optional, may not be present in raw data) */
  password?: string;
  /** The recovery email address (optional) */
  recoveryEmail?: string;
  /** The TOTP/2FA secret (optional) */
  totpSecret?: string;
  /** The year associated with the account (optional) */
  year?: string;
  /** The country code associated with the account (optional) */
  country?: string;
  /** Any unknown/unparsed fields from the raw data */
  unknown: string[];
  /** Confidence score of the parsing (0-1, higher is better) */
  confidence: number;
}

/**
 * Individual field definition for an account
 */
export interface AccountField {
  /** Field name (e.g., 'email', 'password', 'totpSecret') */
  name: string;
  /** Display label for the field */
  label: string;
  /** Whether the field contains encrypted sensitive data */
  sensitive: boolean;
  /** Whether the field is required */
  required: boolean;
  /** The field type for validation/display */
  type: 'email' | 'password' | 'text' | 'secret' | 'number' | 'select';
  /** Display order priority (lower = earlier) */
  order: number;
}

/**
 * Persisted account entity
 * Sensitive fields are encrypted at rest
 */
export interface Account {
  /** Unique identifier for the account */
  id: string;
  /** Reference to the raw import this account came from */
  rawImportId?: string;
  /** The primary email address (encrypted) */
  email: string;
  /** The password (encrypted, optional) */
  password?: string;
  /** The recovery email address (encrypted, optional) */
  recoveryEmail?: string;
  /** The TOTP/2FA secret (encrypted, optional) */
  totpSecret?: string;
  /** The year associated with the account (optional) */
  year?: string;
  /** Additional notes (encrypted, optional) */
  notes?: string;
  /** Reference to the group this account belongs to */
  groupId?: string;
  /** Custom field display order (field name -> order index) */
  fieldOrder?: Record<string, number>;
  /** ISO timestamp when the account was created */
  createdAt: string;
  /** ISO timestamp when the account was last updated */
  updatedAt: string;
}

/**
 * Account with joined tag and group data
 * Used when displaying accounts in the UI
 */
export interface AccountWithTags extends Account {
  /** Tags associated with this account */
  tags: Tag[];
  /** Group data if the account belongs to a group */
  group?: Group;
}

/**
 * Lightweight account reference
 * Used for dropdowns and selections where full account data isn't needed
 */
export interface AccountRef {
  /** Unique identifier */
  id: string;
  /** Email address (decrypted for display) */
  email: string;
  /** Group ID if assigned */
  groupId?: string;
}

/**
 * Account field value for display/editing
 * Decrypted and ready for UI consumption
 */
export interface AccountFieldValue {
  /** The field name */
  field: string;
  /** The decrypted value (empty string if not set) */
  value: string;
  /** Whether the value is currently visible (for sensitive fields) */
  visible?: boolean;
}

/**
 * Account update payload
 * Fields to update on an existing account
 */
export interface AccountUpdate {
  /** The account ID to update */
  id: string;
  /** New email address (optional) */
  email?: string;
  /** New password (optional) */
  password?: string;
  /** New recovery email (optional) */
  recoveryEmail?: string;
  /** New TOTP secret (optional) */
  totpSecret?: string;
  /** New year (optional) */
  year?: string;
  /** New notes (optional) */
  notes?: string;
  /** New group ID (undefined to ungroup) */
  groupId?: string | null;
  /** New field order (optional) */
  fieldOrder?: Record<string, number> | null;
}

/**
 * Reusable type import to avoid circular dependencies
 */
import type { Tag, Group } from './database.js';
