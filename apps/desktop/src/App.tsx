import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { MainPage } from './pages/MainPage';

/**
 * Main App Component
 *
 * Routes between authentication and main application based on auth state.
 * - Shows AuthPage when user is not authenticated
 * - Shows main app content when user is authenticated
 */
function App() {
  const { t } = useTranslation();
  const { isAuthenticated, initialize, hasVault } = useAuth();

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
            <p className="text-gray-600">{t('app.loading')}</p>
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
  return <MainPage />;
}

export default App;
