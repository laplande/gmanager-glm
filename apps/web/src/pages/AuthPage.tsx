import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PasswordInput } from '../components/PasswordInput';
import { isTauri } from '../lib/tauriApi';

/**
 * AuthPage - Master Password Authentication
 *
 * Handles two flows:
 * 1. First-time setup - User creates a new master password
 * 2. Returning users - User unlocks the vault with existing password
 *
 * Works in both Tauri (desktop) and Web (browser) environments.
 *
 * Features:
 * - Password visibility toggle
 * - Password strength indicator (for setup)
 * - Error handling and display
 * - Loading states
 * - Keyboard shortcuts (Enter to submit)
 * - Smooth transitions between states
 */
export function AuthPage() {
  const { isAuthenticated, hasVault, error, isLoading, setPassword: setMasterPassword, unlock, clearError, initialize, vaultName } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vaultNameInput, setVaultNameInput] = useState('My Accounts');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize vault check on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Clear errors when password changes
  useEffect(() => {
    if (password || confirmPassword) {
      clearError();
      setLocalError(null);
    }
  }, [password, confirmPassword, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setLocalError('Please enter a password');
      return;
    }

    // For setup, validate passwords match
    if (hasVault === false) {
      if (!confirmPassword.trim()) {
        setLocalError('Please confirm your password');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters');
        return;
      }
      if (!vaultNameInput.trim()) {
        setLocalError('Please enter a vault name');
        return;
      }
    }

    setIsSubmitting(true);
    let success = false;

    try {
      if (hasVault === false) {
        success = await setMasterPassword(password, vaultNameInput);
      } else {
        success = await unlock(password);
      }

      if (!success) {
        // Error is set in the store, clear password field for security
        setPassword('');
        setConfirmPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  // Loading state while checking for vault
  if (hasVault === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Already authenticated - shouldn't render this page
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {hasVault ? 'Welcome Back' : 'Create Master Password'}
          </h1>
          <p className="text-gray-500 mt-2">
            {hasVault
              ? `Enter your master password to unlock ${vaultName || 'your vault'}`
              : 'Create a strong master password to secure your accounts'}
          </p>
        </div>

        {/* Platform Badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {isTauri() ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                </svg>
                Desktop App
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Web App
              </>
            )}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vault Name (for setup only) */}
          {!hasVault && (
            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-gray-700 mb-1">
                Vault Name
              </label>
              <input
                id="vault-name"
                type="text"
                value={vaultNameInput}
                onChange={(e) => setVaultNameInput(e.target.value)}
                placeholder="My Accounts"
                disabled={isSubmitting || isLoading}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400 outline-none transition-colors duration-200"
                required
              />
            </div>
          )}

          {/* Password Input */}
          <PasswordInput
            id="master-password"
            label="Master Password"
            placeholder={hasVault ? 'Enter your master password' : 'Create a master password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showStrength={!hasVault}
            error={undefined}
            disabled={isSubmitting || isLoading}
            autoFocus
            required
          />

          {/* Confirm Password (for setup only) */}
          {!hasVault && (
            <PasswordInput
              id="confirm-password"
              label="Confirm Password"
              placeholder="Confirm your master password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={undefined}
              disabled={isSubmitting || isLoading}
              required
            />
          )}

          {/* Error Display */}
          {displayError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-600">{displayError}</span>
            </div>
          )}

          {/* Security Notice (for setup) */}
          {!hasVault && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Important</p>
                  <p className="mt-1">
                    Your master password cannot be recovered. If you forget it, you will lose access to all your stored accounts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || !password.trim() || (!hasVault && !confirmPassword.trim())}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700
              text-white font-semibold rounded-lg shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
              transition-all duration-200
              flex items-center justify-center gap-2"
          >
            {isSubmitting || isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{hasVault ? 'Unlocking...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                {hasVault ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>Unlock Vault</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Create Vault</span>
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Your data is encrypted with AES-256-GCM</p>
          <p className="mt-1">Keys derived with PBKDF2 (100,000 iterations)</p>
        </div>
      </div>
    </div>
  );
}
