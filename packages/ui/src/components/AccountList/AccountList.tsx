import * as React from "react";
import type { AccountWithTags } from "@gmanager/shared";
import { cn } from "../../lib/utils";
import { AccountRow, type AccountRowProps } from "./AccountRow";

/**
 * Translation keys for AccountList component
 * Allows components to be fully internationalized
 */
export interface AccountListTranslations {
  /** Empty state message when no accounts */
  noAccounts?: string;
  /** Loading message */
  loading?: string;
  /** "X accounts selected" message */
  selected?: string;
  /** "X account selected" message (singular) */
  selectedSingular?: string;
  /** Clear selection button text */
  clearSelection?: string;
  /** Column labels */
  columns?: {
    email?: string;
    password?: string;
    totp?: string;
    recoveryEmail?: string;
    group?: string;
    tags?: string;
  };
}

/**
 * Default English translations
 */
const DEFAULT_TRANSLATIONS: AccountListTranslations = {
  noAccounts: "No accounts found",
  loading: "Loading accounts...",
  selected: "{{count}} accounts selected",
  selectedSingular: "{{count}} account selected",
  clearSelection: "Clear selection",
  columns: {
    email: "Email",
    password: "Password",
    totp: "2FA Code",
    recoveryEmail: "Recovery Email",
    group: "Group",
    tags: "Tags",
  },
};

/**
 * Context menu item type
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

/**
 * Column definition for the account list
 */
export interface ColumnDef {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

/**
 * Props for the AccountList component
 */
export interface AccountListProps {
  /** Array of accounts to display */
  accounts: AccountWithTags[];
  /** Selected account IDs */
  selectedIds?: Set<string>;
  /** Low confidence account IDs (from parsing) */
  lowConfidenceIds?: Set<string>;
  /** Currently focused account ID */
  focusedAccountId?: string | null;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Callback when an account is double-clicked */
  onAccountDoubleClick?: (account: AccountWithTags) => void;
  /** Callback when a field is clicked (for copy) */
  onFieldClick?: (accountId: string, field: string, value: string) => void;
  /** Callback when context menu is requested */
  onContextMenu?: (
    event: React.MouseEvent,
    account: AccountWithTags,
    selectedAccounts: AccountWithTags[]
  ) => void;
  /** Context menu items */
  contextMenuItems?: ContextMenuItem[];
  /** Callback when accounts are dropped (for drag reordering) */
  onAccountsDrop?: (accounts: AccountWithTags[], target: string) => void;
  /** Whether list is in a loading state */
  loading?: boolean;
  /** Custom empty state message @deprecated Use translations instead */
  emptyMessage?: string;
  /** Custom translations for i18n */
  translations?: AccountListTranslations;
  /** Row height for virtual scrolling (in pixels) */
  rowHeight?: number;
  /** Visible columns */
  columns?: ColumnDef[];
  /** Custom row renderer */
  renderRow?: (account: AccountWithTags, props: AccountRowProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Maximum height for the list container */
  maxHeight?: string;
  /** Whether to show the header */
  showHeader?: boolean;
}

/**
 * Default columns for the account list
 */
const getDefaultColumns = (translations: AccountListTranslations): ColumnDef[] => {
  const t = translations.columns || DEFAULT_TRANSLATIONS.columns!;
  return [
    { id: "email", label: t.email || DEFAULT_TRANSLATIONS.columns!.email!, sortable: true, width: "25%" },
    { id: "password", label: t.password || DEFAULT_TRANSLATIONS.columns!.password!, width: "20%" },
    { id: "totp", label: t.totp || DEFAULT_TRANSLATIONS.columns!.totp!, width: "15%" },
    { id: "recoveryEmail", label: t.recoveryEmail || DEFAULT_TRANSLATIONS.columns!.recoveryEmail!, width: "20%" },
    { id: "group", label: t.group || DEFAULT_TRANSLATIONS.columns!.group!, width: "10%" },
    { id: "tags", label: t.tags || DEFAULT_TRANSLATIONS.columns!.tags!, width: "10%" },
  ];
};

const DEFAULT_ROW_HEIGHT = 56; // px

/**
 * Main AccountList component with virtual scrolling support.
 *
 * Displays a list of accounts with features including:
 * - Virtual scrolling for performance with large lists
 * - Multi-select with checkboxes
 * - Click-to-copy for all fields
 * - Hover-to-reveal passwords
 * - Right-click context menu
 * - Keyboard navigation
 * - Drag and drop support
 *
 * @example
 * ```tsx
 * <AccountList
 *   accounts={accounts}
 *   selectedIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   onAccountDoubleClick={(acc) => openEditModal(acc)}
 *   onFieldClick={(id, field, value) => copyToClipboard(value)}
 * />
 * ```
 */
export const AccountList = React.forwardRef<HTMLDivElement, AccountListProps>(
  (
    {
      accounts,
      selectedIds = new Set(),
      lowConfidenceIds = new Set(),
      onSelectionChange,
      onAccountDoubleClick,
      onFieldClick,
      onContextMenu,
      contextMenuItems = [],
      loading = false,
      emptyMessage,
      translations: externalTranslations,
      rowHeight = DEFAULT_ROW_HEIGHT,
      columns,
      renderRow,
      className,
      maxHeight = "600px",
      showHeader = true,
      focusedAccountId: _focusedAccountId,
      onAccountsDrop: _onAccountsDrop,
    },
    ref
  ) => {
    // Merge translations with defaults
    const t: AccountListTranslations = {
      ...DEFAULT_TRANSLATIONS,
      ...externalTranslations,
      columns: {
        ...DEFAULT_TRANSLATIONS.columns,
        ...externalTranslations?.columns,
      },
    };

    // Use provided columns or fall back to default columns based on translations
    const displayColumns = columns || getDefaultColumns(t);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => containerRef.current!);

    // Virtual scrolling state
    const [scrollTop, setScrollTop] = React.useState(0);
    const [containerHeight, setContainerHeight] = React.useState(600);

    // Password reveal state for each account
    const [revealedPasswords, setRevealedPasswords] = React.useState<Set<string>>(
      new Set()
    );

    // Context menu state
    const [contextMenuState, setContextMenuState] = React.useState<{
      x: number;
      y: number;
      account: AccountWithTags;
    } | null>(null);

    // Measure container height
    React.useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, []);

    // Calculate visible range for virtual scrolling
    const visibleRange = React.useMemo(() => {
      const start = Math.floor(scrollTop / rowHeight);
      const end = Math.ceil((scrollTop + containerHeight) / rowHeight);
      return {
        start: Math.max(0, start - 5), // Buffer of 5 rows
        end: Math.min(accounts.length, end + 5),
      };
    }, [scrollTop, containerHeight, rowHeight, accounts.length]);

    const visibleAccounts = accounts.slice(visibleRange.start, visibleRange.end);

    // Handle scroll event for virtual scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    };

    // Handle selection change for a single account
    const handleSelectionChange = (accountId: string, selected: boolean) => {
      const newSelection = new Set(selectedIds);
      if (selected) {
        newSelection.add(accountId);
      } else {
        newSelection.delete(accountId);
      }
      onSelectionChange?.(newSelection);
    };

    // Handle select all
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        onSelectionChange?.(new Set(accounts.map((a) => a.id)));
      } else {
        onSelectionChange?.(new Set());
      }
    };

    // Handle field click
    const handleFieldClick = (accountId: string, field: string, value: string) => {
      onFieldClick?.(accountId, field, value);
    };

    // Handle context menu
    const handleContextMenu = (
      e: React.MouseEvent,
      account: AccountWithTags
    ) => {
      const selectedAccounts = accounts.filter((a) =>
        selectedIds.has(account.id) ? selectedIds.has(a.id) : a.id === account.id
      );

      onContextMenu?.(e, account, selectedAccounts);

      // Set internal context menu state if no external handler
      if (!onContextMenu) {
        setContextMenuState({ x: e.clientX, y: e.clientY, account });
      }
    };

    // Toggle password reveal
    const togglePasswordReveal = (accountId: string) => {
      setRevealedPasswords((prev) => {
        const next = new Set(prev);
        if (next.has(accountId)) {
          next.delete(accountId);
        } else {
          next.add(accountId);
        }
        return next;
      });
    };

    // Handle keyboard navigation
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent, index: number) => {
        if (e.key === "ArrowDown" && index < accounts.length - 1) {
          e.preventDefault();
          const nextAccount = accounts[index + 1];
          (listRef.current
            ?.querySelector(`[data-account-id="${nextAccount.id}"]`) as HTMLElement)?.focus();
        } else if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault();
          const prevAccount = accounts[index - 1];
          (listRef.current
            ?.querySelector(`[data-account-id="${prevAccount.id}"]`) as HTMLElement)?.focus();
        } else if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onSelectionChange?.(new Set(accounts.map((a) => a.id)));
        }
      },
      [accounts, onSelectionChange]
    );

    // All rows selected?
    const allSelected =
      accounts.length > 0 && selectedIds.size === accounts.length;
    const someSelected = selectedIds.size > 0 && !allSelected;

    if (loading) {
      return (
        <div
          ref={containerRef}
          className={cn(
            "flex items-center justify-center py-12",
            "bg-card border border-border rounded-lg",
            className
          )}
          style={{ maxHeight }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      );
    }

    if (accounts.length === 0) {
      return (
        <div
          ref={containerRef}
          className={cn(
            "flex items-center justify-center py-12",
            "bg-card border border-border rounded-lg",
            className
          )}
          style={{ maxHeight }}
        >
          <div className="text-center">
            <p className="text-muted-foreground">{emptyMessage || t.noAccounts || DEFAULT_TRANSLATIONS.noAccounts!}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("relative", className)}>
        {/* Header */}
        {showHeader && (
          <div
            className={cn(
              "flex items-center gap-3 py-2 px-3 border-b border-border",
              "bg-muted/30 rounded-t-lg"
            )}
          >
            {/* Select all checkbox */}
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected;
                  }
                }}
                onChange={handleSelectAll}
                className={cn(
                  "w-4 h-4 rounded border border-input",
                  "accent-primary cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
                aria-label="Select all accounts"
              />
            </div>

            {/* Low confidence indicator spacer */}
            <div className="flex-shrink-0 w-2" />

            {/* Column headers */}
            {displayColumns.map((column) => (
              <div
                key={column.id}
                className={cn("text-xs font-medium text-muted-foreground uppercase tracking-wide")}
                style={{ width: column.width, flex: column.width ? undefined : 1 }}
              >
                {column.label}
              </div>
            ))}

            {/* Action menu spacer */}
            <div className="flex-shrink-0 w-8" />
          </div>
        )}

        {/* List container with virtual scrolling */}
        <div
          ref={containerRef}
          className={cn(
            "overflow-auto border border-t-0 border-border rounded-b-lg",
            "bg-card",
            "focus:outline-none"
          )}
          style={{ maxHeight }}
          onScroll={handleScroll}
          role="grid"
          aria-label="Accounts"
          aria-rowcount={accounts.length}
          tabIndex={0}
        >
          <div
            ref={listRef}
            className="relative"
            style={{
              height: accounts.length * rowHeight,
              paddingTop: visibleRange.start * rowHeight,
            }}
          >
            {visibleAccounts.map((account, visibleIndex) => {
              const actualIndex = visibleRange.start + visibleIndex;
              const rowProps = {
                account,
                selected: selectedIds.has(account.id),
                lowConfidence: lowConfidenceIds.has(account.id),
                onSelectionChange: (selected: boolean) =>
                  handleSelectionChange(account.id, selected),
                onFieldClick: (field: string, value: string) =>
                  handleFieldClick(account.id, field, value),
                onContextMenu: handleContextMenu,
                onDoubleClick: onAccountDoubleClick,
                passwordRevealed: revealedPasswords.has(account.id),
                onPasswordRevealChange: () => togglePasswordReveal(account.id),
              };

              return (
                <div
                  key={account.id}
                  data-account-id={account.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: rowHeight,
                    transform: `translateY(${visibleIndex * rowHeight}px)`,
                  }}
                  onKeyDown={(e) => handleKeyDown(e, actualIndex)}
                >
                  {renderRow ? renderRow(account, rowProps) : <AccountRow {...rowProps} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selection footer */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size === 1
                ? t.selectedSingular?.replace('{{count}}', String(selectedIds.size))
                : t.selected?.replace('{{count}}', String(selectedIds.size))
              }
            </span>
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => onSelectionChange?.(new Set())}
            >
              {t.clearSelection}
            </button>
          </div>
        )}

        {/* Context Menu Portal */}
        {contextMenuState && !onContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setContextMenuState(null)}
            />
            <div
              className="fixed z-50 min-w-[180px] py-1 bg-popover border border-border rounded-md shadow-lg"
              style={{ left: contextMenuState.x, top: contextMenuState.y }}
            >
              {contextMenuItems.map((item) => (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    item.variant === "destructive" &&
                      "text-destructive hover:text-destructive hover:bg-destructive/10"
                  )}
                  onClick={() => {
                    item.action();
                    setContextMenuState(null);
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
);

AccountList.displayName = "AccountList";

/**
 * Re-export AccountRow for direct use if needed
 */
export { AccountRow };
export type { AccountRowProps };
