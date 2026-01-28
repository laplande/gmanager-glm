import { create } from 'zustand';
import {
  createVault,
  unlockVault,
  logout as apiLogout,
  checkAuthStatus,
  setAuthToken,
  setEncryptedSessionKey,
} from '../lib/tauriApi';

/**
 * Authentication state management using Zustand
 *
 * Works for both Tauri (desktop) and Web (browser) environments.
 *
 * The sessionKey is intentionally NOT persisted to disk in Tauri.
 * In Web mode, the token is stored in localStorage.
 * When the app closes or logout is called, the key/token is cleared.
 */

interface AuthState {
  /** Whether the user is authenticated (has unlocked with password) */
  isAuthenticated: boolean;

  /** Whether a master password vault exists (first-time user vs returning) */
  hasVault: boolean | null;

  /** The derived session key from PBKDF2 - NEVER persisted, cleared on logout */
  sessionKey?: string;

  /** The encrypted session key from the server */
  encryptedSessionKey?: string;

  /** The vault ID */
  vaultId?: string;

  /** The vault name */
  vaultName?: string;

  /** Error message from last authentication attempt */
  error: string | null;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Check if vault exists (call on app startup) */
  checkVault: () => Promise<void>;

  /** Create a new vault with master password */
  setPassword: (password: string, vaultName?: string) => Promise<boolean>;

  /** Unlock existing vault with master password */
  unlock: (password: string) => Promise<boolean>;

  /** Clear authentication state (logout) */
  logout: () => Promise<void>;

  /** Clear error message */
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hasVault: null,
  sessionKey: undefined,
  encryptedSessionKey: undefined,
  vaultId: undefined,
  vaultName: undefined,
  error: null,
  isLoading: false,

  checkVault: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await checkAuthStatus();
      set({
        hasVault: status.vaultExists,
        isAuthenticated: status.authenticated,
        vaultId: status.vaultId,
        vaultName: status.vaultName,
        isLoading: false,
      });

      // If authenticated, restore the session key
      if (status.authenticated) {
        const token = localStorage.getItem('gmanager_token') ||
          sessionStorage.getItem('tauri_session_key');
        const encryptedKey = localStorage.getItem('gmanager_encrypted_session_key') ||
          sessionStorage.getItem('tauri_encrypted_session_key');
        if (token) {
          set({ sessionKey: token });
        }
        if (encryptedKey) {
          set({ encryptedSessionKey: encryptedKey });
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check vault',
        isLoading: false,
        hasVault: false
      });
    }
  },

  setPassword: async (password: string, vaultName: string = 'My Accounts') => {
    set({ isLoading: true, error: null });
    try {
      const result = await createVault(password, vaultName);

      // Store the token and encrypted session key
      setAuthToken(result.token);
      setEncryptedSessionKey(result.encryptedSessionKey);

      set({
        isAuthenticated: true,
        hasVault: true,
        sessionKey: result.token,
        encryptedSessionKey: result.encryptedSessionKey,
        vaultId: result.vaultId,
        vaultName: result.vaultName,
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
      const result = await unlockVault(password);

      // Store the token and encrypted session key
      setAuthToken(result.token);
      setEncryptedSessionKey(result.encryptedSessionKey);

      set({
        isAuthenticated: true,
        sessionKey: result.token,
        encryptedSessionKey: result.encryptedSessionKey,
        vaultId: result.vaultId,
        vaultName: result.vaultName,
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

  logout: async () => {
    try {
      await apiLogout();
    } finally {
      set({
        isAuthenticated: false,
        sessionKey: undefined,
        encryptedSessionKey: undefined,
        vaultId: undefined,
        vaultName: undefined,
        error: null
      });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));
