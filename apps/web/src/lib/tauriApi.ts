/**
 * Conditional API layer for GManager
 *
 * Detects if running in Tauri (desktop) or Web (browser) environment
 * and uses the appropriate transport method:
 * - Tauri: Uses @tauri-apps/api/core invoke() for Rust backend
 * - Web: Uses fetch() for HTTP REST API
 *
 * @module lib/tauriApi
 */

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Check if running in Tauri desktop environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    window.__TAURI__ !== undefined;
}

/**
 * Check if running in Web browser environment
 */
export function isWeb(): boolean {
  return !isTauri();
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get the base URL for API requests in web mode
 */
function getApiBaseUrl(): string {
  if (isTauri()) {
    return ''; // Not used in Tauri
  }
  // In development, use the backend server
  // In production, this should be configured via environment variable
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (isTauri()) {
    return sessionStorage.getItem('tauri_session_key');
  }
  return localStorage.getItem('gmanager_token');
}

/**
 * Set the authentication token
 */
export function setAuthToken(token: string | null): void {
  if (isTauri()) {
    if (token) {
      sessionStorage.setItem('tauri_session_key', token);
    } else {
      sessionStorage.removeItem('tauri_session_key');
    }
  } else {
    if (token) {
      localStorage.setItem('gmanager_token', token);
    } else {
      localStorage.removeItem('gmanager_token');
    }
  }
}

/**
 * Get the encrypted session key from localStorage
 */
export function getEncryptedSessionKey(): string | null {
  if (isTauri()) {
    return sessionStorage.getItem('tauri_encrypted_session_key');
  }
  return localStorage.getItem('gmanager_encrypted_session_key');
}

/**
 * Set the encrypted session key
 */
export function setEncryptedSessionKey(key: string | null): void {
  if (isTauri()) {
    if (key) {
      sessionStorage.setItem('tauri_encrypted_session_key', key);
    } else {
      sessionStorage.removeItem('tauri_encrypted_session_key');
    }
  } else {
    if (key) {
      localStorage.setItem('gmanager_encrypted_session_key', key);
    } else {
      localStorage.removeItem('gmanager_encrypted_session_key');
    }
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Tauri Invoke Wrapper
// ============================================================================

/**
 * Dynamic import of Tauri API (only when in Tauri environment)
 */
async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new ApiError('Not running in Tauri environment', 'NOT_TAURI');
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(command, args);
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'Tauri invoke failed',
      'TAURI_INVOKE_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// HTTP Fetch Wrapper (Web)
// ============================================================================

/**
 * Make an HTTP request to the web backend
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const encryptedSessionKey = getEncryptedSessionKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add other headers
  if (options.headers) {
    const h = options.headers as Record<string, string>;
    Object.keys(h).forEach(key => {
      headers[key] = h[key];
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (encryptedSessionKey) {
    headers['X-Session-Key'] = encryptedSessionKey;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: headers as HeadersInit,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}`,
        data.error,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Auth API
// ============================================================================

/**
 * Check if a vault exists
 */
export async function checkHasVault(): Promise<boolean> {
  if (isTauri()) {
    return tauriInvoke<boolean>('db:check_has_vault');
  }
  const response = await fetchApi<{ vaultExists: boolean }>('/api/auth/status');
  return response.vaultExists;
}

/**
 * Create a new vault (register)
 */
export async function createVault(password: string, vaultName: string = 'My Accounts'): Promise<{
  token: string;
  vaultId: string;
  vaultName: string;
  encryptedSessionKey: string;
}> {
  if (isTauri()) {
    const sessionKey = await tauriInvoke<string>('db:create_vault', { password });
    return {
      token: sessionKey,
      vaultId: 'desktop-vault',
      vaultName: 'Desktop Vault',
      encryptedSessionKey: sessionKey,
    };
  }
  const result = await fetchApi<{
    token: string;
    vaultId: string;
    vaultName: string;
    encryptedSessionKey: string;
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ vaultName, password }),
  });
  return result;
}

/**
 * Unlock an existing vault (login)
 */
export async function unlockVault(password: string): Promise<{
  token: string;
  vaultId: string;
  vaultName: string;
  encryptedSessionKey: string;
}> {
  if (isTauri()) {
    const sessionKey = await tauriInvoke<string>('db:unlock_vault', { password });
    return {
      token: sessionKey,
      vaultId: 'desktop-vault',
      vaultName: 'Desktop Vault',
      encryptedSessionKey: sessionKey,
    };
  }
  const result = await fetchApi<{
    token: string;
    vaultId: string;
    vaultName: string;
    encryptedSessionKey: string;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return result;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();
  if (isTauri()) {
    // In Tauri, the session is cleared by clearing the session key
    setAuthToken(null);
    setEncryptedSessionKey(null);
    return;
  }
  if (token) {
    await fetchApi<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  }
  setAuthToken(null);
  setEncryptedSessionKey(null);
}

/**
 * Check authentication status
 */
export async function checkAuthStatus(): Promise<{
  vaultExists: boolean;
  authenticated: boolean;
  vaultId?: string;
  vaultName?: string;
}> {
  if (isTauri()) {
    const hasVault = await checkHasVault();
    return {
      vaultExists: hasVault,
      authenticated: !!getAuthToken(),
    };
  }
  return fetchApi<{
    vaultExists: boolean;
    authenticated: boolean;
    vaultId?: string;
    vaultName?: string;
  }>('/api/auth/status');
}

// ============================================================================
// Accounts API
// ============================================================================

/**
 * Account type from API
 */
export interface ApiAccount {
  id: string;
  raw_import_id?: string;
  email: string;
  password: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  created_at: string;
  updated_at: string;
  tags: ApiTag[];
}

/**
 * Tag type from API
 */
export interface ApiTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

/**
 * Get all accounts
 */
export async function getAccounts(offset: number = 0, limit: number = 100): Promise<ApiAccount[]> {
  if (isTauri()) {
    return tauriInvoke<ApiAccount[]>('get_accounts_command', { offset, limit });
  }
  return fetchApi<ApiAccount[]>(`/api/accounts?offset=${offset}&limit=${limit}`);
}

/**
 * Get a single account by ID
 */
export async function getAccount(id: string): Promise<ApiAccount> {
  if (isTauri()) {
    return tauriInvoke<ApiAccount>('get_account_command', { id });
  }
  return fetchApi<ApiAccount>(`/api/accounts/${id}`);
}

/**
 * Create a new account
 */
export async function createAccount(account: CreateAccountPayload): Promise<string> {
  if (isTauri()) {
    return tauriInvoke<string>('create_account_command', { account });
  }
  const result = await fetchApi<{ id: string }>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(account),
  });
  return result.id;
}

/**
 * Update an existing account
 */
export async function updateAccount(account: UpdateAccountPayload): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('update_account_command', { account });
  } else {
    await fetchApi(`/api/accounts/${account.id}`, {
      method: 'PUT',
      body: JSON.stringify(account),
    });
  }
}

/**
 * Delete an account
 */
export async function deleteAccount(id: string): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('delete_account_command', { id });
  } else {
    await fetchApi(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Search accounts
 */
export async function searchAccounts(params: AccountSearchParams): Promise<ApiAccount[]> {
  if (isTauri()) {
    return tauriInvoke<ApiAccount[]>('search_accounts_command', { params });
  }
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('query', params.query);
  if (params.group_id) queryParams.append('group_id', params.group_id);
  if (params.tag_id) queryParams.append('tag_id', params.tag_id);
  if (params.year) queryParams.append('year', params.year);
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  return fetchApi<ApiAccount[]>(`/api/accounts/search?${queryParams.toString()}`);
}

// ============================================================================
// Groups API
// ============================================================================

/**
 * Group type from API
 */
export interface ApiGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<ApiGroup[]> {
  if (isTauri()) {
    return tauriInvoke<ApiGroup[]>('get_groups_command');
  }
  return fetchApi<ApiGroup[]>('/api/groups');
}

/**
 * Create a new group
 */
export async function createGroup(group: CreateGroupPayload): Promise<string> {
  if (isTauri()) {
    return tauriInvoke<string>('create_group_command', { group });
  }
  const result = await fetchApi<{ id: string }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify(group),
  });
  return result.id;
}

/**
 * Update a group
 */
export async function updateGroup(group: UpdateGroupPayload): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('update_group_command', { group });
  } else {
    await fetchApi(`/api/groups/${group.id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    });
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(id: string): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('delete_group_command', { id });
  } else {
    await fetchApi(`/api/groups/${id}`, {
      method: 'DELETE',
    });
  }
}

// ============================================================================
// Tags API
// ============================================================================

/**
 * Get all tags
 */
export async function getTags(): Promise<ApiTag[]> {
  if (isTauri()) {
    return tauriInvoke<ApiTag[]>('get_tags_command');
  }
  return fetchApi<ApiTag[]>('/api/tags');
}

/**
 * Create a new tag
 */
export async function createTag(tag: CreateTagPayload): Promise<string> {
  if (isTauri()) {
    return tauriInvoke<string>('create_tag_command', { tag });
  }
  const result = await fetchApi<{ id: string }>('/api/tags', {
    method: 'POST',
    body: JSON.stringify(tag),
  });
  return result.id;
}

/**
 * Update a tag
 */
export async function updateTag(tag: UpdateTagPayload): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('update_tag_command', { tag });
  } else {
    await fetchApi(`/api/tags/${tag.id}`, {
      method: 'PUT',
      body: JSON.stringify(tag),
    });
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  if (isTauri()) {
    await tauriInvoke('delete_tag_command', { id });
  } else {
    await fetchApi(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Payload for creating a new account
 */
export interface CreateAccountPayload {
  raw_import_id?: string;
  email: string;
  password: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  field_order?: string[];
}

/**
 * Payload for updating an existing account
 */
export interface UpdateAccountPayload {
  id: string;
  email?: string;
  password?: string;
  recovery_email?: string;
  totp_secret?: string;
  year?: string;
  notes?: string;
  group_id?: string;
  field_order?: string[];
}

/**
 * Search parameters for filtering accounts
 */
export interface AccountSearchParams {
  query?: string;
  group_id?: string;
  tag_id?: string;
  year?: string;
  offset?: number;
  limit?: number;
}

/**
 * Payload for creating a new group
 */
export interface CreateGroupPayload {
  name: string;
  color?: string;
  sort_order?: number;
}

/**
 * Payload for updating an existing group
 */
export interface UpdateGroupPayload {
  id: string;
  name?: string;
  color?: string;
  sort_order?: number;
}

/**
 * Payload for creating a new tag
 */
export interface CreateTagPayload {
  name: string;
  color?: string;
}

/**
 * Payload for updating an existing tag
 */
export interface UpdateTagPayload {
  id: string;
  name?: string;
  color?: string;
}
