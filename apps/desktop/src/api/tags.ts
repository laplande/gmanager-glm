/**
 * Tags API client for GManager Desktop
 *
 * This module provides TypeScript functions that call the Tauri Rust backend
 * for tag management operations.
 *
 * @module api/tags
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Tag returned from the API
 */
export interface ApiTag {
  /** Unique identifier for the tag */
  id: string;
  /** Tag name */
  name: string;
  /** Tag color (hex) */
  color: string;
  /** ISO timestamp when the tag was created */
  created_at: string;
}

/**
 * Payload for creating a new tag
 */
export interface CreateTagPayload {
  /** Tag name */
  name: string;
  /** Tag color (hex), defaults to '#10b981' */
  color?: string;
}

/**
 * Payload for updating an existing tag
 */
export interface UpdateTagPayload {
  /** The tag ID to update */
  id: string;
  /** New tag name (optional) */
  name?: string;
  /** New tag color (optional) */
  color?: string;
}

/**
 * Payload for adding a tag to an account
 */
export interface AddTagToAccountPayload {
  /** The account ID */
  account_id: string;
  /** The tag ID */
  tag_id: string;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error type for tag API operations
 */
export class TagApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'TagApiError';
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all tags
 *
 * Returns all tags ordered by name.
 *
 * @returns Array of all tags
 * @throws TagApiError if database error occurs
 *
 * @example
 * ```ts
 * const tags = await getTags();
 * console.log(`Found ${tags.length} tags`);
 * ```
 */
export async function getTags(): Promise<ApiTag[]> {
  try {
    return await invoke<ApiTag[]>('get_tags_command');
  } catch (error) {
    throw new TagApiError(
      'Failed to get tags',
      'GET_TAGS_ERROR',
      error
    );
  }
}

/**
 * Get a single tag by ID
 *
 * @param id - The tag ID
 * @returns The tag
 * @throws TagApiError if tag not found
 *
 * @example
 * ```ts
 * const tag = await getTag('1');
 * console.log(tag.name);
 * ```
 */
export async function getTag(id: string): Promise<ApiTag> {
  try {
    return await invoke<ApiTag>('get_tag_command', { id });
  } catch (error) {
    throw new TagApiError(
      `Failed to get tag: ${id}`,
      'GET_TAG_ERROR',
      error
    );
  }
}

/**
 * Create a new tag
 *
 * @param tag - The tag data to create
 * @returns The ID of the created tag
 * @throws TagApiError if validation fails or name already exists
 *
 * @example
 * ```ts
 * const id = await createTag({
 *   name: 'important',
 *   color: '#ef4444',
 * });
 * ```
 */
export async function createTag(tag: CreateTagPayload): Promise<string> {
  try {
    return await invoke<string>('create_tag_command', { tag });
  } catch (error) {
    throw new TagApiError(
      'Failed to create tag',
      'CREATE_ERROR',
      error
    );
  }
}

/**
 * Update an existing tag
 *
 * Only include the fields that should be updated.
 *
 * @param tag - The tag updates with ID
 * @throws TagApiError if tag not found or name already exists
 *
 * @example
 * ```ts
 * await updateTag({
 *   id: '1',
 *   name: 'critical',
 *   color: '#dc2626',
 * });
 * ```
 */
export async function updateTag(tag: UpdateTagPayload): Promise<void> {
  try {
    await invoke('update_tag_command', { tag });
  } catch (error) {
    throw new TagApiError(
      `Failed to update tag: ${tag.id}`,
      'UPDATE_ERROR',
      error
    );
  }
}

/**
 * Delete a tag by ID
 *
 * Note: The tag will be removed from all accounts that have it.
 *
 * @param id - The tag ID to delete
 * @throws TagApiError if tag not found
 *
 * @example
 * ```ts
 * await deleteTag('1');
 * ```
 */
export async function deleteTag(id: string): Promise<void> {
  try {
    await invoke('delete_tag_command', { id });
  } catch (error) {
    throw new TagApiError(
      `Failed to delete tag: ${id}`,
      'DELETE_ERROR',
      error
    );
  }
}

/**
 * Add a tag to an account
 *
 * Creates an association between an account and a tag.
 * If the association already exists, this is a no-op.
 *
 * @param accountId - The account ID
 * @param tagId - The tag ID
 * @throws TagApiError if account or tag not found
 *
 * @example
 * ```ts
 * await addTagToAccount('account-123', 'tag-456');
 * ```
 */
export async function addTagToAccount(
  accountId: string,
  tagId: string
): Promise<void> {
  try {
    await invoke('add_tag_to_account_command', {
      account_id: accountId,
      tag_id: tagId,
    });
  } catch (error) {
    throw new TagApiError(
      `Failed to add tag ${tagId} to account ${accountId}`,
      'ADD_TAG_ERROR',
      error
    );
  }
}

/**
 * Remove a tag from an account
 *
 * Deletes the association between an account and a tag.
 *
 * @param accountId - The account ID
 * @param tagId - The tag ID
 * @throws TagApiError if association not found
 *
 * @example
 * ```ts
 * await removeTagFromAccount('account-123', 'tag-456');
 * ```
 */
export async function removeTagFromAccount(
  accountId: string,
  tagId: string
): Promise<void> {
  try {
    await invoke('remove_tag_from_account_command', {
      account_id: accountId,
      tag_id: tagId,
    });
  } catch (error) {
    throw new TagApiError(
      `Failed to remove tag ${tagId} from account ${accountId}`,
      'REMOVE_TAG_ERROR',
      error
    );
  }
}

/**
 * Get all tags for an account
 *
 * Returns all tags associated with the specified account.
 *
 * @param accountId - The account ID
 * @returns Array of tags associated with the account
 * @throws TagApiError if account not found
 *
 * @example
 * ```ts
 * const tags = await getAccountTags('account-123');
 * console.log(`Account has ${tags.length} tags`);
 * ```
 */
export async function getAccountTags(accountId: string): Promise<ApiTag[]> {
  try {
    return await invoke<ApiTag[]>('get_account_tags_command', {
      account_id: accountId,
    });
  } catch (error) {
    throw new TagApiError(
      `Failed to get tags for account: ${accountId}`,
      'GET_ACCOUNT_TAGS_ERROR',
      error
    );
  }
}

/**
 * Set multiple tags for an account
 *
 * Replaces all existing tags on an account with the provided list.
 * Tags not in the list will be removed.
 *
 * @param accountId - The account ID
 * @param tagIds - Array of tag IDs to associate with the account
 * @throws TagApiError if operation fails
 *
 * @example
 * ```ts
 * await setAccountTags('account-123', ['tag-1', 'tag-2', 'tag-3']);
 * ```
 */
export async function setAccountTags(
  accountId: string,
  tagIds: string[]
): Promise<void> {
  try {
    await invoke('set_account_tags_command', {
      account_id: accountId,
      tag_ids: tagIds,
    });
  } catch (error) {
    throw new TagApiError(
      `Failed to set tags for account: ${accountId}`,
      'SET_TAGS_ERROR',
      error
    );
  }
}

/**
 * Get the number of accounts that have a specific tag
 *
 * @param tagId - The tag ID
 * @returns The number of accounts with this tag
 * @throws TagApiError if database error occurs
 *
 * @example
 * ```ts
 * const count = await getTagAccountsCount('tag-1');
 * console.log(`Accounts with tag: ${count}`);
 * ```
 */
export async function getTagAccountsCount(tagId: string): Promise<number> {
  try {
    return await invoke<number>('get_tag_accounts_count_command', {
      tag_id: tagId,
    });
  } catch (error) {
    throw new TagApiError(
      `Failed to get account count for tag: ${tagId}`,
      'GET_COUNT_ERROR',
      error
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an API tag to a shared Tag type
 * Useful for compatibility with other parts of the application
 *
 * @param apiTag - The tag from the API
 * @returns A Tag matching the shared types
 */
export function apiTagToTag(apiTag: ApiTag): {
  id: string;
  name: string;
  color: string;
  createdAt: string;
} {
  return {
    id: apiTag.id,
    name: apiTag.name,
    color: apiTag.color,
    createdAt: apiTag.created_at,
  };
}

/**
 * Default color palette for tags
 */
export const DEFAULT_TAG_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

/**
 * Generate a default color for a new tag
 *
 * @param index - Index to use for color selection
 * @returns A hex color string
 */
export function getDefaultTagColor(index: number = 0): string {
  return DEFAULT_TAG_COLORS[index % DEFAULT_TAG_COLORS.length];
}

/**
 * Suggested tag names for common use cases
 */
export const SUGGESTED_TAG_NAMES = [
  'important',
  'work',
  'personal',
  'social',
  'finance',
  'shopping',
  'entertainment',
  'development',
  'production',
  'testing',
];

/**
 * Get a suggested tag name based on common patterns
 *
 * @param index - Index to use for name selection
 * @returns A suggested tag name
 */
export function getSuggestedTagName(index: number = 0): string {
  return SUGGESTED_TAG_NAMES[index % SUGGESTED_TAG_NAMES.length];
}
