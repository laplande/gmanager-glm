/**
 * Groups API client for GManager Desktop
 *
 * This module provides TypeScript functions that call the Tauri Rust backend
 * for group management operations.
 *
 * @module api/groups
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Group returned from the API
 */
export interface ApiGroup {
  /** Unique identifier for the group */
  id: string;
  /** Group name */
  name: string;
  /** Group color (hex) */
  color: string;
  /** Display sort order (lower = first) */
  sort_order: number;
  /** ISO timestamp when the group was created */
  created_at: string;
}

/**
 * Payload for creating a new group
 */
export interface CreateGroupPayload {
  /** Group name */
  name: string;
  /** Group color (hex), defaults to '#6366f1' */
  color?: string;
  /** Display sort order, defaults to 0 */
  sort_order?: number;
}

/**
 * Payload for updating an existing group
 */
export interface UpdateGroupPayload {
  /** The group ID to update */
  id: string;
  /** New group name (optional) */
  name?: string;
  /** New group color (optional) */
  color?: string;
  /** New sort order (optional) */
  sort_order?: number;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error type for group API operations
 */
export class GroupApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'GroupApiError';
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all groups
 *
 * Returns all groups ordered by sort_order, then name.
 *
 * @returns Array of all groups
 * @throws GroupApiError if database error occurs
 *
 * @example
 * ```ts
 * const groups = await getGroups();
 * console.log(`Found ${groups.length} groups`);
 * ```
 */
export async function getGroups(): Promise<ApiGroup[]> {
  try {
    return await invoke<ApiGroup[]>('get_groups_command');
  } catch (error) {
    throw new GroupApiError(
      'Failed to get groups',
      'GET_GROUPS_ERROR',
      error
    );
  }
}

/**
 * Get a single group by ID
 *
 * @param id - The group ID
 * @returns The group
 * @throws GroupApiError if group not found
 *
 * @example
 * ```ts
 * const group = await getGroup('1');
 * console.log(group.name);
 * ```
 */
export async function getGroup(id: string): Promise<ApiGroup> {
  try {
    return await invoke<ApiGroup>('get_group_command', { id });
  } catch (error) {
    throw new GroupApiError(
      `Failed to get group: ${id}`,
      'GET_GROUP_ERROR',
      error
    );
  }
}

/**
 * Create a new group
 *
 * @param group - The group data to create
 * @returns The ID of the created group
 * @throws GroupApiError if validation fails or name already exists
 *
 * @example
 * ```ts
 * const id = await createGroup({
 *   name: 'Work',
 *   color: '#3b82f6',
 *   sort_order: 1,
 * });
 * ```
 */
export async function createGroup(group: CreateGroupPayload): Promise<string> {
  try {
    return await invoke<string>('create_group_command', { group });
  } catch (error) {
    throw new GroupApiError(
      'Failed to create group',
      'CREATE_ERROR',
      error
    );
  }
}

/**
 * Update an existing group
 *
 * Only include the fields that should be updated.
 *
 * @param group - The group updates with ID
 * @throws GroupApiError if group not found or name already exists
 *
 * @example
 * ```ts
 * await updateGroup({
 *   id: '1',
 *   name: 'Personal',
 *   color: '#10b981',
 * });
 * ```
 */
export async function updateGroup(group: UpdateGroupPayload): Promise<void> {
  try {
    await invoke('update_group_command', { group });
  } catch (error) {
    throw new GroupApiError(
      `Failed to update group: ${group.id}`,
      'UPDATE_ERROR',
      error
    );
  }
}

/**
 * Delete a group by ID
 *
 * Note: Accounts associated with this group will have their group_id set to NULL.
 *
 * @param id - The group ID to delete
 * @throws GroupApiError if group not found
 *
 * @example
 * ```ts
 * await deleteGroup('1');
 * ```
 */
export async function deleteGroup(id: string): Promise<void> {
  try {
    await invoke('delete_group_command', { id });
  } catch (error) {
    throw new GroupApiError(
      `Failed to delete group: ${id}`,
      'DELETE_ERROR',
      error
    );
  }
}

/**
 * Get the number of accounts in a group
 *
 * @param id - The group ID
 * @returns The number of accounts in the group
 * @throws GroupApiError if database error occurs
 *
 * @example
 * ```ts
 * const count = await getGroupAccountsCount('1');
 * console.log(`Accounts in group: ${count}`);
 * ```
 */
export async function getGroupAccountsCount(id: string): Promise<number> {
  try {
    return await invoke<number>('get_group_accounts_count_command', { id });
  } catch (error) {
    throw new GroupApiError(
      `Failed to get account count for group: ${id}`,
      'GET_COUNT_ERROR',
      error
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert an API group to a shared Group type
 * Useful for compatibility with other parts of the application
 *
 * @param apiGroup - The group from the API
 * @returns A Group matching the shared types
 */
export function apiGroupToGroup(apiGroup: ApiGroup): {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  createdAt: string;
} {
  return {
    id: apiGroup.id,
    name: apiGroup.name,
    color: apiGroup.color,
    sort_order: apiGroup.sort_order,
    createdAt: apiGroup.created_at,
  };
}

/**
 * Default color palette for groups
 */
export const DEFAULT_GROUP_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

/**
 * Generate a default color for a new group
 *
 * @param index - Index to use for color selection
 * @returns A hex color string
 */
export function getDefaultGroupColor(index: number = 0): string {
  return DEFAULT_GROUP_COLORS[index % DEFAULT_GROUP_COLORS.length];
}
