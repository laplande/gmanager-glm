import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

/**
 * Authentication state management using Zustand
 *
 * The sessionKey is intentionally NOT persisted to disk.
 * It only lives in memory during the application session.
 * When the app closes or logout is called, the key is cleared.
 */

interface AuthState {
  /** Whether the user is authenticated (has unlocked with password) */
  isAuthenticated: boolean;

  /** Whether a master password vault exists (first-time user vs returning) */
  hasVault: boolean | null;

  /** The derived session key from PBKDF2 - NEVER persisted, cleared on logout */
  sessionKey?: string;

  /** Error message from last authentication attempt */
  error: string | null;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Check if vault exists (call on app startup) */
  checkVault: () => Promise<void>;

  /** Create a new vault with master password */
  setPassword: (password: string) => Promise<boolean>;

  /** Unlock existing vault with master password */
  unlock: (password: string) => Promise<boolean>;

  /** Clear authentication state (logout) */
  logout: () => void;

  /** Clear error message */
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hasVault: null,
  sessionKey: undefined,
  error: null,
  isLoading: false,

  checkVault: async () => {
    set({ isLoading: true, error: null });
    try {
      const hasVault = await invoke<boolean>('db:check_has_vault');
      set({ hasVault, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check vault',
        isLoading: false,
        hasVault: false
      });
    }
  },

  setPassword: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const sessionKey = await invoke<string>('db:create_vault', { password });
      set({
        isAuthenticated: true,
        hasVault: true,
        sessionKey,
        isLoading: false,
        error: null
      });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create vault';
      set({
        error: errorMsg,
        isLoading: false
      });
      return false;
    }
  },

  unlock: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const sessionKey = await invoke<string>('db:unlock_vault', { password });
      set({
        isAuthenticated: true,
        sessionKey,
        isLoading: false,
        error: null
      });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unlock';
      set({
        error: errorMsg,
        isLoading: false
      });
      return false;
    }
  },

  logout: () => {
    set({
      isAuthenticated: false,
      sessionKey: undefined,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
