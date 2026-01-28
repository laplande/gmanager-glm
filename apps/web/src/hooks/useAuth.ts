import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * Custom hook for authentication operations
 *
 * Provides a clean interface for components to interact
 * with the authentication state managed by Zustand.
 *
 * Works for both Tauri (desktop) and Web (browser) environments.
 */
export function useAuth() {
  const {
    isAuthenticated,
    hasVault,
    sessionKey,
    encryptedSessionKey,
    vaultId,
    vaultName,
    error,
    isLoading,
    checkVault,
    setPassword,
    unlock,
    logout,
    clearError
  } = useAuthStore();

  /**
   * Set a new master password (first-time users)
   * Returns true if successful, false otherwise
   */
  const createMasterPassword = useCallback(async (password: string, vaultName?: string): Promise<boolean> => {
    return await setPassword(password, vaultName);
  }, [setPassword]);

  /**
   * Unlock with existing master password
   * Returns true if successful, false otherwise
   */
  const authenticate = useCallback(async (password: string): Promise<boolean> => {
    return await unlock(password);
  }, [unlock]);

  /**
   * Clear the session and require re-authentication
   */
  const signOut = useCallback(async () => {
    await logout();
  }, [logout]);

  /**
   * Initialize authentication state on app load
   * Checks if a vault exists to determine which flow to show
   */
  const initialize = useCallback(async () => {
    await checkVault();
  }, [checkVault]);

  return {
    // State
    isAuthenticated,
    hasVault,
    sessionKey,
    encryptedSessionKey,
    vaultId,
    vaultName,
    error,
    isLoading,

    // Actions
    setPassword: createMasterPassword,
    unlock: authenticate,
    logout: signOut,
    clearError,
    initialize
  };
}
