/**
 * Account API client for GManager Desktop
 *
 * This module provides TypeScript functions that call the Tauri Rust backend
 * for account management operations. All sensitive field encryption/decryption
 * is handled on the Rust side using the active session key.
 *
 * @module api/accounts
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  AccountWithTags,
} from '@gmanager/shared';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Account returned from the API (decrypted fields)
 * Matches the Rust Account struct returned to frontend
 */
export interface ApiAccount {
  /** Unique identifier for the account */
  id: string;
  /** Reference to the raw import this account came from */
  raw_import_id?: string;
  /** The primary email address (decrypted) */
  email: string;
  /** The password (decrypted) */
  password: string;
  /** The recovery email address (decrypted, optional) */
  recovery_email?: string;
  /** The TOTP/2FA secret (decrypted, optional) */
  totp_secret?: string;
  /** The year associated with the account (optional) */
  year?: string;
  /** Additional notes (decrypted, optional) */
  notes?: string;
  /** Reference to the group this account belongs to */
  group_id?: string;
  /** ISO timestamp when the account was created */
  created_at: string;
  /** ISO timestamp when the account was last updated */
  updated_at: string;
  /** Tags associated with this account */
  tags: ApiTag[];
}

/**
 * Tag returned from the API
 */
export interface ApiTag {
  /** Unique identifier */
  id: string;
  /** Tag name */
  name: string;
  /** Tag color (hex) */
  color: string;
  /** ISO timestamp when the tag was created */
  created_at: string;
}

/**
 * Payload for creating a new account
 * All fields are plaintext (encryption happens on backend)
 */
export interface CreateAccountPayload {
  /** Reference to the raw import this account came from */
  raw_import_id?: string;
  /** The primary email address */
  email: string;
  /** The password */
  password: string;
  /** The recovery email address (optional) */
  recovery_email?: string;
  /** The TOTP/2FA secret (optional) */
  totp_secret?: string;
  /** The year associated with the account (optional) */
  year?: string;
  /** Additional notes (optional) */
  notes?: string;
  /** Reference to the group this account belongs to */
  group_id?: string;
  /** Custom field display order */
  field_order?: string[];
}

/**
 * Payload for updating an existing account
 * Only include fields that should be updated
 */
export interface UpdateAccountPayload {
  /** The account ID to update */
  id: string;
  /** New email address (optional) */
  email?: string;
  /** New password (optional) */
  password?: string;
  /** New recovery email (optional) */
  recovery_email?: string;
  /** New TOTP secret (optional) */
  totp_secret?: string;
  /** New year (optional) */
  year?: string;
  /** New notes (optional) */
  notes?: string;
  /** New group ID (undefined to remove) */
  group_id?: string;
  /** New field order (optional) */
  field_order?: string[];
}

/**
 * Search parameters for filtering accounts
 */
export interface AccountSearchParams {
  /** Text search query (searches email, recovery_email, notes) */
  query?: string;
  /** Filter by group ID */
  group_id?: string;
  /** Filter by tag ID */
  tag_id?: string;
  /** Filter by year */
  year?: string;
  /** Pagination offset (default: 0) */
  offset?: number;
  /** Pagination limit (default: 50) */
  limit?: number;
}

/**
 * Statistics about accounts
 */
export interface AccountStats {
  /** Total number of accounts */
  total_accounts: number;
  /** Total number of groups */
  total_groups: number;
  /** Total number of tags */
  total_tags: number;
  /** Accounts grouped by year */
  accounts_by_year: [string, number][];
  /** Accounts per group: (id, name, count) */
  accounts_per_group: [string, string, number][];
}

/**
 * Batch delete request
 */
export interface BatchDeleteRequest {
  /** Account IDs to delete */
  ids: string[];
}

/**
 * Batch update request
 */
export interface BatchUpdateRequest {
  /** Account IDs to update */
  ids: string[];
  /** Updates to apply to all accounts */
  updates: UpdateAccountPayload;
}

/**
 * Result type for paginated responses
 */
export interface PaginatedResult<T> {
  /** The results */
  data: T[];
  /** Total count (if available) */
  total?: number;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error type for account API operations
 */
export class AccountApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AccountApiError';
  }
}

/**
 * Check if an error is a "not logged in" error
 */
export function isNotLoggedInError(error: unknown): error is AccountApiError {
  return error instanceof AccountApiError && error.message.includes('session');
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all accounts with optional pagination
 *
 * @param offset - Pagination offset (default: 0)
 * @param limit - Pagination limit (default: 100)
 * @returns Array of accounts with decrypted fields
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * const accounts = await getAccounts();
 * const firstPage = await getAccounts(0, 20);
 * ```
 */
export async function getAccounts(
  offset: number = 0,
  limit: number = 100
): Promise<ApiAccount[]> {
  try {
    return await invoke<ApiAccount[]>('get_accounts_command', {
      offset,
      limit,
    });
  } catch (error) {
    throw new AccountApiError(
      'Failed to get accounts',
      'GET_ACCOUNTS_ERROR',
      error
    );
  }
}

/**
 * Get a single account by ID
 *
 * @param id - The account ID
 * @returns The account with decrypted fields
 * @throws AccountApiError if account not found or not logged in
 *
 * @example
 * ```ts
 * const account = await getAccount('123');
 * console.log(account.email);
 * ```
 */
export async function getAccount(id: string): Promise<ApiAccount> {
  try {
    return await invoke<ApiAccount>('get_account_command', { id });
  } catch (error) {
    throw new AccountApiError(
      `Failed to get account: ${id}`,
      'GET_ACCOUNT_ERROR',
      error
    );
  }
}

/**
 * Get the total count of accounts
 *
 * @returns The total number of accounts
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * const count = await getAccountsCount();
 * console.log(`Total accounts: ${count}`);
 * ```
 */
export async function getAccountsCount(): Promise<number> {
  try {
    return await invoke<number>('get_accounts_count_command');
  } catch (error) {
    throw new AccountApiError(
      'Failed to get accounts count',
      'GET_COUNT_ERROR',
      error
    );
  }
}

/**
 * Create a new account
 *
 * Sensitive fields (email, password, recovery_email, totp_secret, notes)
 * are encrypted on the backend before storage.
 *
 * @param account - The account data to create
 * @returns The ID of the created account
 * @throws AccountApiError if validation fails or not logged in
 *
 * @example
 * ```ts
 * const id = await createAccount({
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   recovery_email: 'backup@example.com',
 *   year: '2024',
 * });
 * ```
 */
export async function createAccount(
  account: CreateAccountPayload
): Promise<string> {
  try {
    return await invoke<string>('create_account_command', { account });
  } catch (error) {
    throw new AccountApiError(
      'Failed to create account',
      'CREATE_ERROR',
      error
    );
  }
}

/**
 * Update an existing account
 *
 * Only include the fields that should be updated.
 * Sensitive fields are encrypted on the backend before storage.
 *
 * @param account - The account updates with ID
 * @throws AccountApiError if account not found or not logged in
 *
 * @example
 * ```ts
 * await updateAccount({
 *   id: '123',
 *   email: 'newemail@example.com',
 *   notes: 'Updated notes',
 * });
 * ```
 */
export async function updateAccount(
  account: UpdateAccountPayload
): Promise<void> {
  try {
    await invoke('update_account_command', { account });
  } catch (error) {
    throw new AccountApiError(
      `Failed to update account: ${account.id}`,
      'UPDATE_ERROR',
      error
    );
  }
}

/**
 * Delete an account by ID
 *
 * @param id - The account ID to delete
 * @throws AccountApiError if account not found or not logged in
 *
 * @example
 * ```ts
 * await deleteAccount('123');
 * ```
 */
export async function deleteAccount(id: string): Promise<void> {
  try {
    await invoke('delete_account_command', { id });
  } catch (error) {
    throw new AccountApiError(
      `Failed to delete account: ${id}`,
      'DELETE_ERROR',
      error
    );
  }
}

/**
 * Search accounts with filters
 *
 * Supports searching by text query, group, tag, and year.
 * Results are paginated.
 *
 * @param params - Search parameters
 * @returns Array of matching accounts with decrypted fields
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * // Search by email
 * const results = await searchAccounts({ query: 'work' });
 *
 * // Filter by group
 * const workAccounts = await searchAccounts({ group_id: '1' });
 *
 * // Filter by year with pagination
 * const page1 = await searchAccounts({
 *   year: '2024',
 *   offset: 0,
 *   limit: 20,
 * });
 * ```
 */
export async function searchAccounts(
  params: AccountSearchParams = {}
): Promise<ApiAccount[]> {
  try {
    return await invoke<ApiAccount[]>('search_accounts_command', { params });
  } catch (error) {
    throw new AccountApiError(
      'Failed to search accounts',
      'SEARCH_ERROR',
      error
    );
  }
}

/**
 * Delete multiple accounts at once
 *
 * @param ids - Array of account IDs to delete
 * @returns The number of accounts successfully deleted
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * const deleted = await batchDeleteAccounts(['1', '2', '3']);
 * console.log(`Deleted ${deleted} accounts`);
 * ```
 */
export async function batchDeleteAccounts(
  ids: string[]
): Promise<number> {
  try {
    const request: BatchDeleteRequest = { ids };
    return await invoke<number>('batch_delete_accounts_command', { request });
  } catch (error) {
    throw new AccountApiError(
      'Failed to batch delete accounts',
      'BATCH_DELETE_ERROR',
      error
    );
  }
}

/**
 * Update multiple accounts with the same changes
 *
 * @param ids - Array of account IDs to update
 * @param updates - The updates to apply to all accounts
 * @returns The number of accounts successfully updated
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * // Move accounts to a different group
 * const updated = await batchUpdateAccounts(
 *   ['1', '2', '3'],
 *   { group_id: '5' }
 * );
 *
 * // Add notes to multiple accounts
 * await batchUpdateAccounts(
 *   ['1', '2'],
 *   { notes: 'Imported from old system' }
 * );
 * ```
 */
export async function batchUpdateAccounts(
  ids: string[],
  updates: Omit<UpdateAccountPayload, 'id'>
): Promise<number> {
  try {
    const request: BatchUpdateRequest = {
      ids,
      updates: { ...updates, id: '' }, // ID is ignored for batch updates
    };
    return await invoke<number>('batch_update_accounts_command', { request });
  } catch (error) {
    throw new AccountApiError(
      'Failed to batch update accounts',
      'BATCH_UPDATE_ERROR',
      error
    );
  }
}

/**
 * Get account statistics
 *
 * Returns aggregated data about accounts including counts
 * grouped by year and by group.
 *
 * @returns Account statistics
 * @throws AccountApiError if not logged in or database error occurs
 *
 * @example
 * ```ts
 * const stats = await getAccountStats();
 * console.log(`Total: ${stats.total_accounts}`);
 * console.log(`By year:`, stats.accounts_by_year);
 * ```
 */
export async function getAccountStats(): Promise<AccountStats> {
  try {
    return await invoke<AccountStats>('get_account_stats_command');
  } catch (error) {
    throw new AccountApiError(
      'Failed to get account statistics',
      'GET_STATS_ERROR',
      error
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an API account to a shared Account type
 * Useful for compatibility with other parts of the application
 *
 * @param apiAccount - The account from the API
 * @returns An Account matching the shared types
 */
export function apiAccountToAccount(
  apiAccount: ApiAccount
): AccountWithTags {
  return {
    id: apiAccount.id,
    rawImportId: apiAccount.raw_import_id,
    email: apiAccount.email,
    password: apiAccount.password,
    recoveryEmail: apiAccount.recovery_email,
    totpSecret: apiAccount.totp_secret,
    year: apiAccount.year,
    notes: apiAccount.notes,
    groupId: apiAccount.group_id,
    fieldOrder: undefined,
    createdAt: apiAccount.created_at,
    updatedAt: apiAccount.updated_at,
    tags: apiAccount.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.created_at,
    })),
    group: undefined, // Would need to be fetched separately
  };
}

/**
 * Convert a shared Account type to an update payload
 *
 * @param account - The account to convert
 * @returns An update payload for the API
 */
export function accountToUpdatePayload(
  account: Partial<AccountWithTags> & { id: string }
): UpdateAccountPayload {
  return {
    id: account.id,
    email: account.email,
    password: account.password,
    recovery_email: account.recoveryEmail,
    totp_secret: account.totpSecret,
    year: account.year,
    notes: account.notes,
    group_id: account.groupId,
    field_order: account.fieldOrder
      ? Object.entries(account.fieldOrder)
          .sort(([, a], [, b]) => a - b)
          .map(([field]) => field)
      : undefined,
  };
}

/**
 * Create a paginated result from accounts and total count
 *
 * @param accounts - The accounts for this page
 * @param total - The total count (optional)
 * @param offset - The current offset
 * @param limit - The current limit
 * @returns A paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  offset: number,
  limit: number,
  total?: number
): PaginatedResult<T> {
  return { data, offset, limit, total };
}

// ============================================================================
// React Hook Integration (optional)
// ============================================================================

/**
 * Helper to create a mutation result type
 * Can be used with React Query or similar libraries
 */
export interface MutationResult<T = void> {
  data?: T;
  error?: AccountApiError;
  isLoading: boolean;
}

/**
 * Helper to create a query result type
 * Can be used with React Query or similar libraries
 */
export interface QueryResult<T = unknown> {
  data?: T;
  error?: AccountApiError;
  isLoading: boolean;
  refetch: () => Promise<void>;
}
