import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { isTauri } from './lib/tauriApi';

/**
 * Main App Component
 *
 * Works for both Tauri (desktop) and Web (browser) environments.
 *
 * Routes between authentication and main application based on auth state.
 * - Shows AuthPage when user is not authenticated
 * - Shows main app content when user is authenticated
 */
function App() {
  const { isAuthenticated, initialize, hasVault, vaultName } = useAuth();

  // Initialize auth state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading state while checking vault
  if (hasVault === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Loading GManager...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show main app when authenticated
  return (
    <div className="container">
      <header>
        <h1>GManager {isTauri() ? 'Desktop' : 'Web'}</h1>
      </header>

      <main>
        <p>Welcome to GManager {isTauri() ? 'Desktop' : 'Web'} Application</p>
        {vaultName && <p className="text-blue-500 mt-1">Vault: {vaultName}</p>}
        <p className="text-green-500 mt-2">Vault unlocked successfully</p>

        <div className="card">
          <h2>Your Accounts</h2>
          <p className="text-gray-500 mt-2">No accounts yet. Import your first account to get started.</p>
        </div>

        <div className="card">
          <h3>Quick Actions</h3>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button>Import Accounts</button>
            <button>Add Account</button>
            <button>Settings</button>
          </div>
        </div>
      </main>

      <footer>
        <p>Built with {isTauri() ? 'Tauri 2.0 + ' : ''}React + Vite</p>
      </footer>
    </div>
  );
}

export default App;
