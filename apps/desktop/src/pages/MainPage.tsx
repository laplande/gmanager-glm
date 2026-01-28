import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccountList,
  LanguageSwitcher,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@gmanager/ui';
import type { AccountWithTags } from '@gmanager/shared';
import { useAccountSearch } from '../hooks/useAccountSearch';
import {
  getAccounts,
  createAccount,
  updateAccount,
  batchDeleteAccounts,
  apiAccountToAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload
} from '../api/accounts';
import { getGroups } from '../api/groups';
import { getTags, apiTagToTag } from '../api/tags';

/**
 * MainPage - Primary account management interface
 *
 * Features:
 * - Account list with search and filtering
 * - Import accounts dialog
 * - Add/edit account dialog
 * - Batch operations
 * - Responsive layout with sidebar filters
 */
export function MainPage() {
  const { t } = useTranslation();

  // Account search and filtering
  const {
    searchState,
    accounts: searchResults,
    setQuery,
    setGroupId,
    setTagId,
    clearFilters,
    groups,
    tags,
    setGroups,
    setTags,
  } = useAccountSearch();

  // Local state
  const [allAccounts, setAllAccounts] = useState<AccountWithTags[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithTags | null>(null);

  // Form state for add/edit dialog
  const [formData, setFormData] = useState<Partial<CreateAccountPayload>>({
    email: '',
    password: '',
    recovery_email: '',
    totp_secret: '',
    year: '',
    notes: '',
    group_id: undefined,
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [accountsData, groupsData, tagsData] = await Promise.all([
        getAccounts(),
        getGroups(),
        getTags(),
      ]);

      const convertedAccounts = accountsData.map(apiAccountToAccount);
      setAllAccounts(convertedAccounts);
      setGroups(groupsData.map(g => ({
        id: g.id,
        name: g.name,
        color: g.color,
        sortOrder: g.sort_order,
        createdAt: g.created_at,
      })));
      setTags(tagsData.map(apiTagToTag));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get displayed accounts (search results or all accounts)
  const displayedAccounts = searchState.query || searchState.groupId || searchState.tagId
    ? searchResults.map(apiAccountToAccount)
    : allAccounts;

  // Handle account field click (copy to clipboard)
  const handleFieldClick = useCallback(async (_accountId: string, field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      // TODO: Show toast notification
      console.log(`Copied ${field}: ${value}`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, []);

  // Handle account double click (open edit dialog)
  const handleAccountDoubleClick = useCallback((account: AccountWithTags) => {
    setEditingAccount(account);
    setFormData({
      email: account.email,
      password: account.password,
      recovery_email: account.recoveryEmail,
      totp_secret: account.totpSecret,
      year: account.year,
      notes: account.notes,
      group_id: account.groupId,
    });
    setShowAddDialog(true);
  }, []);

  // Handle add account
  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      email: '',
      password: '',
      recovery_email: '',
      totp_secret: '',
      year: '',
      notes: '',
      group_id: undefined,
    });
    setShowAddDialog(true);
  };

  // Handle save account (create or update)
  const handleSaveAccount = async () => {
    try {
      if (editingAccount) {
        // Update existing account
        const payload: UpdateAccountPayload = {
          id: editingAccount.id,
          email: formData.email,
          password: formData.password,
          recovery_email: formData.recovery_email,
          totp_secret: formData.totp_secret,
          year: formData.year,
          notes: formData.notes,
          group_id: formData.group_id,
        };
        await updateAccount(payload);
      } else {
        // Create new account
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          return;
        }
        await createAccount(formData as CreateAccountPayload);
      }

      // Reload data and close dialog
      await loadData();
      setShowAddDialog(false);
      setEditingAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  // Handle delete selected accounts
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      t('account.deleteConfirm', {
        count: selectedIds.size,
        defaultValue: `Delete ${selectedIds.size} account(s)?`,
      })
    );

    if (!confirmed) return;

    try {
      await batchDeleteAccounts(Array.from(selectedIds));
      await loadData();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete accounts');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('app.desktop')}</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchState.query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor"
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {searchState.query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportDialog(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg
                  hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {t('actions.importAccounts')}
              </button>
              <button
                onClick={handleAddAccount}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600
                  text-white rounded-lg hover:from-indigo-600 hover:to-purple-700
                  transition-colors flex items-center gap-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t('actions.addAccount')}
              </button>
              <LanguageSwitcher variant="ghost" size="sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Filters */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 space-y-4">
              {/* Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search.group')}
                </label>
                <select
                  value={searchState.groupId || ''}
                  onChange={(e) => setGroupId(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('search.allGroups')}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search.tag')}
                </label>
                <select
                  value={searchState.tagId || ''}
                  onChange={(e) => setTagId(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('search.allTags')}</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(searchState.query || searchState.groupId || searchState.tagId) && (
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700
                    hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  {t('search.clear')}
                </button>
              )}

              {/* Stats */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>{t('account.plural')}</span>
                    <span className="font-semibold">{allAccounts.length}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{t('account.group')}</span>
                    <span className="font-semibold">{groups.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('account.tags')}</span>
                    <span className="font-semibold">{tags.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Account List */}
          <div className="flex-1">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {selectedIds.size > 0 && (
              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-indigo-700">
                  {t('account.selected', { count: selectedIds.size })}
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700
                    hover:bg-red-50 rounded transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
              <AccountList
                accounts={displayedAccounts}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onAccountDoubleClick={handleAccountDoubleClick}
                onFieldClick={handleFieldClick}
                loading={isLoading}
                maxHeight="calc(100vh - 280px)"
                translations={{
                  noAccounts: t('account.noAccounts'),
                  loading: t('account.loadingAccounts'),
                  selected: t('account.selected_plural'),
                  selectedSingular: t('account.selected'),
                  clearSelection: t('account.clearSelection'),
                  columns: {
                    email: t('account.email'),
                    password: t('account.password'),
                    totp: t('account.totp'),
                    recoveryEmail: t('account.recoveryEmail'),
                    group: t('account.group'),
                    tags: t('account.tags'),
                  },
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.importAccounts')}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              {t('import.noAccountsToPreviewDescription')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? t('common.edit') : t('actions.addAccount')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account.email')} *
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account.password')} *
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account.recoveryEmail')}
              </label>
              <input
                type="email"
                value={formData.recovery_email || ''}
                onChange={(e) => setFormData({ ...formData, recovery_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account.totp')}
              </label>
              <input
                type="text"
                value={formData.totp_secret || ''}
                onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account.group')}
              </label>
              <select
                value={formData.group_id || ''}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">None</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingAccount(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveAccount}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600
                  text-white rounded-lg hover:from-indigo-600 hover:to-purple-700
                  transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

