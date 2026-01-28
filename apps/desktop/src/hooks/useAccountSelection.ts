/**
 * React hook for account selection management
 *
 * Provides selection state management, keyboard shortcuts,
 * and batch operations for accounts.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AccountWithTags } from '@gmanager/shared';

/**
 * Selection state for accounts
 */
export interface AccountSelectionState {
  /** Set of selected account IDs */
  selectedIds: Set<string>;
  /** Number of selected accounts */
  count: number;
  /** Whether all accounts are selected */
  allSelected: boolean;
  /** Whether some (but not all) accounts are selected */
  someSelected: boolean;
}

/**
 * Result from useAccountSelection hook
 */
export interface UseAccountSelectionResult {
  /** Current selection state */
  selectionState: AccountSelectionState;
  /** Select an account by ID */
  selectAccount: (id: string, selected: boolean) => void;
  /** Toggle an account's selection */
  toggleAccount: (id: string) => void;
  /** Select all visible accounts */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Invert selection */
  invertSelection: () => void;
  /** Get selected account objects from provided list */
  getSelectedAccounts: (accounts: AccountWithTags[]) => AccountWithTags[];
  /** Set selection to specific IDs */
  setSelectedIds: (ids: Set<string>) => void;
  /** Select a range of accounts */
  selectRange: (fromId: string, toId: string, accounts: AccountWithTags[]) => void;
}

/**
 * Keyboard shortcuts configuration
 */
interface KeyboardShortcuts {
  /** Key for select all (default: 'a') */
  selectAll?: string;
  /** Key for clear selection (default: 'Escape') */
  clearSelection?: string;
  /** Key for invert selection (default: 'i') */
  invertSelection?: string;
}

/**
 * Options for the hook
 */
interface UseAccountSelectionOptions {
  /** Whether keyboard shortcuts are enabled (default: true) */
  enableKeyboardShortcuts?: boolean;
  /** Custom keyboard shortcuts */
  keyboardShortcuts?: KeyboardShortcuts;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Available accounts for selection operations */
  accounts?: AccountWithTags[];
}

/**
 * Default keyboard shortcuts
 */
const DEFAULT_SHORTCUTS: Required<KeyboardShortcuts> = {
  selectAll: 'a',
  clearSelection: 'Escape',
  invertSelection: 'i',
};

/**
 * Custom hook for account selection management
 *
 * Features:
 * - Track selected account IDs
 * - Select all / clear all / invert selection
 * - Keyboard shortcuts (Ctrl+A, Escape, Ctrl+I)
 * - Range selection with Shift
 * - Get selected account objects
 *
 * @example
 * ```tsx
 * const {
 *   selectionState,
 *   selectAccount,
 *   clearSelection,
 *   getSelectedAccounts,
 * } = useAccountSelection({ accounts, onSelectionChange });
 *
 * // Render selection UI
 * <div>
 *   {selectionState.count} selected
 *   <button onClick={clearSelection}>Clear</button>
 * </div>
 *
 * // Render account list
 * {accounts.map(account => (
 *   <AccountRow
 *     key={account.id}
 *     account={account}
 *     selected={selectionState.selectedIds.has(account.id)}
 *     onSelectedChange={(selected) => selectAccount(account.id, selected)}
 *   />
 * ))}
 * ```
 */
export function useAccountSelection(
  options: UseAccountSelectionOptions = {}
): UseAccountSelectionResult {
  const {
    enableKeyboardShortcuts = true,
    keyboardShortcuts = {},
    onSelectionChange,
    accounts = [],
  } = options;

  const shortcuts = { ...DEFAULT_SHORTCUTS, ...keyboardShortcuts };

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ref for tracking last clicked account (for range selection)
  const lastClickedIdRef = useRef<string | null>(null);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  // Compute selection state
  const selectionState: AccountSelectionState = {
    selectedIds,
    count: selectedIds.size,
    allSelected: accounts.length > 0 && selectedIds.size === accounts.length,
    someSelected: selectedIds.size > 0 && selectedIds.size < accounts.length,
  };

  /**
   * Select or deselect a single account
   */
  const selectAccount = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    lastClickedIdRef.current = id;
  }, []);

  /**
   * Toggle an account's selection state
   */
  const toggleAccount = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastClickedIdRef.current = id;
  }, []);

  /**
   * Select all visible accounts
   */
  const selectAll = useCallback(() => {
    const allIds = new Set(accounts.map((a) => a.id));
    setSelectedIds(allIds);
  }, [accounts]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdRef.current = null;
  }, []);

  /**
   * Invert selection (select unselected, deselect selected)
   */
  const invertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const allIds = new Set(accounts.map((a) => a.id));
      const next = new Set<string>();

      for (const id of allIds) {
        if (!prev.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [accounts]);

  /**
   * Get selected account objects from provided list
   */
  const getSelectedAccounts = useCallback(
    (accountList: AccountWithTags[]): AccountWithTags[] => {
      return accountList.filter((account) => selectedIds.has(account.id));
    },
    [selectedIds]
  );

  /**
   * Set selection to specific IDs
   */
  const setSelectedIdsCallback = useCallback((ids: Set<string>) => {
    setSelectedIds(new Set(ids));
  }, []);

  /**
   * Select a range of accounts (for Shift+Click)
   */
  const selectRange = useCallback(
    (fromId: string, toId: string, accountList: AccountWithTags[]) => {
      const fromIndex = accountList.findIndex((a) => a.id === fromId);
      const toIndex = accountList.findIndex((a) => a.id === toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      const rangeIds = accountList
        .slice(start, end + 1)
        .map((a) => a.id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Toggle: if all in range are selected, deselect them; otherwise select them
        const allInRangeSelected = rangeIds.every((id) => next.has(id));

        if (allInRangeSelected) {
          for (const id of rangeIds) {
            next.delete(id);
          }
        } else {
          for (const id of rangeIds) {
            next.add(id);
          }
        }
        return next;
      });

      lastClickedIdRef.current = toId;
    },
    []
  );

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A for select all
      if ((e.ctrlKey || e.metaKey) && e.key === shortcuts.selectAll) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Escape for clear selection
      if (e.key === shortcuts.clearSelection) {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Ctrl/Cmd + I for invert selection
      if ((e.ctrlKey || e.metaKey) && e.key === shortcuts.invertSelection) {
        e.preventDefault();
        invertSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, shortcuts, selectAll, clearSelection, invertSelection]);

  return {
    selectionState,
    selectAccount,
    toggleAccount,
    selectAll,
    clearSelection,
    invertSelection,
    getSelectedAccounts,
    setSelectedIds: setSelectedIdsCallback,
    selectRange,
  };
}

/**
 * Helper to check if an account is selected
 */
export function isAccountSelected(
  accountId: string,
  selectedIds: Set<string>
): boolean {
  return selectedIds.has(accountId);
}

/**
 * Helper to get selection count text
 */
export function getSelectionCountText(count: number): string {
  return `${count} account${count !== 1 ? 's' : ''} selected`;
}
