import * as React from "react";
import type { ParsedAccount } from "@gmanager/shared";
import { cn } from "../../lib/utils";
import { Button } from "../Button";
import { ConfidenceBadge } from "./ConfidenceBadge";

/**
 * Translation keys for ImportPreview component
 */
export interface ImportPreviewTranslations {
  /** Empty state message */
  noAccountsToPreview?: string;
  /** Empty state description */
  noAccountsToPreviewDescription?: string;
  /** Loading message */
  loadingPreview?: string;
  /** Stats labels */
  stats?: {
    total?: string;
    valid?: string;
    invalid?: string;
  };
  /** Confidence labels */
  confidence?: {
    high?: string;
    medium?: string;
    low?: string;
  };
  /** Column labels */
  columnLabels?: Record<string, string>;
  /** Action buttons */
  actions?: {
    deleteRow?: string;
    deleteSelected?: string;
    clearSelection?: string;
    cancel?: string;
    import?: string;
    importPlural?: string;
  };
  /** Selection stats */
  selected?: string;
  selectedPlural?: string;
}

/**
 * Default English translations
 */
const DEFAULT_TRANSLATIONS: ImportPreviewTranslations = {
  noAccountsToPreview: "No accounts to preview",
  noAccountsToPreviewDescription: "Parse some account data first to see a preview before importing.",
  loadingPreview: "Loading preview...",
  stats: {
    total: "Total",
    valid: "Valid",
    invalid: "Invalid",
  },
  confidence: {
    high: "High",
    medium: "Medium",
    low: "Low",
  },
  columnLabels: {
    select: "",
    email: "Email",
    password: "Password",
    recoveryEmail: "Recovery",
    totpSecret: "TOTP",
    year: "Year",
    country: "Country",
    unknown: "Unknown Fields",
    confidence: "Confidence",
    actions: "",
  },
  actions: {
    deleteRow: "Delete row",
    deleteSelected: "Delete Selected",
    clearSelection: "Clear Selection",
    cancel: "Cancel",
    import: "Import {{count}} Account",
    importPlural: "Import {{count}} Accounts",
  },
  selected: "{{count}} row selected",
  selectedPlural: "{{count}} rows selected",
};

/**
 * Field mapping type for reclassifying parsed fields
 */
export interface FieldMapping {
  /** Original field name from parsed data */
  originalField: string;
  /** New field type to map to */
  newType: FieldType;
}

/**
 * Available field types for account data
 * Re-exported from FieldSelector for convenience
 */
export type FieldType =
  | "email"
  | "password"
  | "recoveryEmail"
  | "totpSecret"
  | "year"
  | "country"
  | "unknown";

/**
 * Props for the ImportPreview component
 */
export interface ImportPreviewProps {
  /** Array of parsed accounts to display */
  accounts: ParsedAccount[];
  /** Callback when accounts are confirmed for import */
  onConfirm?: (accounts: ParsedAccount[]) => void;
  /** Callback when accounts are cancelled/discarded */
  onCancel?: () => void;
  /** Callback when a single account is deleted */
  onDeleteAccount?: (index: number) => void;
  /** Callback when field type is changed */
  onFieldChange?: (accountIndex: number, fieldMapping: FieldMapping) => void;
  /** Callback when field columns are reordered */
  onColumnReorder?: (newOrder: string[]) => void;
  /** Optional custom className */
  className?: string;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Whether to show the bulk actions toolbar */
  showBulkActions?: boolean;
  /** Custom translations for i18n */
  translations?: ImportPreviewTranslations;
}

/**
 * Statistics for the parsed accounts
 */
interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

/**
 * Calculates statistics for the parsed accounts
 */
function calculateStats(accounts: ParsedAccount[]): ImportStats {
  const stats: ImportStats = {
    total: accounts.length,
    valid: 0,
    invalid: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
  };

  for (const account of accounts) {
    // Count by confidence level
    if (account.confidence >= 0.7) {
      stats.highConfidence++;
      stats.valid++;
    } else if (account.confidence >= 0.4) {
      stats.mediumConfidence++;
      stats.valid++;
    } else {
      stats.lowConfidence++;
      stats.invalid++;
    }
  }

  return stats;
}

/**
 * Default column order for the table
 */
const DEFAULT_COLUMNS: string[] = [
  "select",
  "email",
  "password",
  "recoveryEmail",
  "totpSecret",
  "year",
  "country",
  "unknown",
  "confidence",
  "actions",
];

/**
 * Gets the column labels from translations
 */
function getColumnLabels(translations: ImportPreviewTranslations): Record<string, string> {
  return {
    ...DEFAULT_TRANSLATIONS.columnLabels,
    ...translations.columnLabels,
  };
}

/**
 * Gets the row background color based on confidence
 */
function getRowBackgroundClass(confidence: number): string {
  if (confidence >= 0.7) {
    return "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20";
  }
  if (confidence >= 0.4) {
    return "hover:bg-amber-50/50 dark:hover:bg-amber-950/20";
  }
  return "hover:bg-red-50/50 dark:hover:bg-red-950/20";
}

/**
 * Gets the border color class based on confidence
 */
function getBorderClass(confidence: number): string {
  if (confidence >= 0.7) {
    return "border-l-4 border-l-emerald-500 dark:border-l-emerald-600";
  }
  if (confidence >= 0.4) {
    return "border-l-4 border-l-amber-500 dark:border-l-amber-600";
  }
  return "border-l-4 border-l-red-500 dark:border-l-red-600";
}

/**
 * ImportPreview component - Table display of parsed accounts
 *
 * Shows parsed accounts before importing with:
 * - Column headers showing detected field types
 * - Color-coded rows by confidence (green=high, yellow=medium, red=low)
 * - Edit field types inline
 * - Delete unwanted rows
 * - Multi-select checkboxes with bulk actions
 * - Summary stats (total, valid, invalid)
 *
 * @example
 * ```tsx
 * <ImportPreview
 *   accounts={parsedAccounts}
 *   onConfirm={(accounts) => handleImport(accounts)}
 *   onCancel={() => handleCancel()}
 *   onDeleteAccount={(index) => handleDelete(index)}
 * />
 * ```
 */
const ImportPreview = React.forwardRef<HTMLDivElement, ImportPreviewProps>(
  (
    {
      accounts,
      onConfirm,
      onCancel,
      onDeleteAccount,
      onFieldChange: _onFieldChange,
      className,
      isLoading = false,
      showBulkActions = true,
      translations: externalTranslations,
      onColumnReorder: _onColumnReorder,
    },
    ref
  ) => {
    // Merge translations with defaults
    const t: ImportPreviewTranslations = {
      ...DEFAULT_TRANSLATIONS,
      ...externalTranslations,
      stats: {
        ...DEFAULT_TRANSLATIONS.stats,
        ...externalTranslations?.stats,
      },
      confidence: {
        ...DEFAULT_TRANSLATIONS.confidence,
        ...externalTranslations?.confidence,
      },
      actions: {
        ...DEFAULT_TRANSLATIONS.actions,
        ...externalTranslations?.actions,
      },
      columnLabels: {
        ...DEFAULT_TRANSLATIONS.columnLabels,
        ...externalTranslations?.columnLabels,
      },
    };

    const columnLabels = getColumnLabels(t);

    const [selectedIndices, setSelectedIndices] = React.useState<Set<number>>(new Set());
    const [isAllSelected, setIsAllSelected] = React.useState(false);

    const stats = React.useMemo(() => calculateStats(accounts), [accounts]);

    // Reset selection when accounts change
    React.useEffect(() => {
      setSelectedIndices(new Set());
      setIsAllSelected(false);
    }, [accounts]);

    // Handle select all checkbox
    const handleSelectAll = () => {
      if (isAllSelected) {
        setSelectedIndices(new Set());
      } else {
        setSelectedIndices(new Set(accounts.map((_, i) => i)));
      }
      setIsAllSelected(!isAllSelected);
    };

    // Handle individual row selection
    const handleSelectRow = (index: number) => {
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedIndices(newSelected);
      setIsAllSelected(newSelected.size === accounts.length);
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
      for (const index of Array.from(selectedIndices).sort((a, b) => b - a)) {
        onDeleteAccount?.(index);
      }
      setSelectedIndices(new Set());
      setIsAllSelected(false);
    };

    // Render a cell value with masking for sensitive data
    const renderCellValue = (value: string | undefined, field: string) => {
      if (!value) return <span className="text-muted-foreground text-xs">-</span>;

      const isSensitive = field === "password" || field === "totpSecret";

      return (
        <span
          className={cn(
            "text-sm font-mono truncate block max-w-[150px]",
            isSensitive && "blur-sm hover:blur-none transition-all cursor-pointer"
          )}
          title={isSensitive ? "Hover to reveal" : value}
        >
          {value}
        </span>
      );
    };

    // Render unknown fields
    const renderUnknownFields = (unknown: string[]) => {
      if (!unknown || unknown.length === 0) {
        return <span className="text-muted-foreground text-xs">-</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {unknown.map((field, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded"
              title={field}
            >
              {field.length > 15 ? `${field.substring(0, 15)}...` : field}
            </span>
          ))}
        </div>
      );
    };

    if (accounts.length === 0 && !isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center p-12 text-center",
            className
          )}
        >
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.noAccountsToPreview}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t.noAccountsToPreviewDescription}
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div ref={ref} className={cn("flex items-center justify-center p-12", className)}>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">{t.loadingPreview}</span>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("flex flex-col gap-4", className)}>
        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t.stats?.total}:</span>
            <span className="text-sm font-bold">{stats.total}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t.stats?.valid}:
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {stats.valid}
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {t.stats?.invalid}:
            </span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              {stats.invalid}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t.confidence?.high}: {stats.highConfidence}</span>
            <span>{t.confidence?.medium}: {stats.mediumConfidence}</span>
            <span>{t.confidence?.low}: {stats.lowConfidence}</span>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {showBulkActions && selectedIndices.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">
              {selectedIndices.size === 1
                ? t.selected?.replace('{{count}}', String(selectedIndices.size))
                : t.selectedPlural?.replace('{{count}}', String(selectedIndices.size))
              }
            </span>
            <div className="flex-1" />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {t.actions?.deleteSelected}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIndices(new Set());
                setIsAllSelected(false);
              }}
            >
              {t.actions?.clearSelection}
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background z-10 shadow-sm">
                  <tr>
                    {DEFAULT_COLUMNS.map((column) => {
                      if (column === "select") {
                        return (
                          <th
                            key={column}
                            className="p-3 text-left w-10"
                          >
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={handleSelectAll}
                              className="w-4 h-4 rounded border-input cursor-pointer"
                              aria-label="Select all accounts"
                            />
                          </th>
                        );
                      }

                      if (column === "actions") {
                        return <th key={column} className="p-3 w-10" />;
                      }

                      return (
                        <th
                          key={column}
                          className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                        >
                          {columnLabels[column] || column}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accounts.map((account, index) => (
                    <tr
                      key={index}
                      className={cn(
                        "transition-colors",
                        getRowBackgroundClass(account.confidence),
                        getBorderClass(account.confidence),
                        selectedIndices.has(index) && "bg-accent/50"
                      )}
                    >
                      {/* Select checkbox */}
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-4 h-4 rounded border-input cursor-pointer"
                          aria-label={`Select account ${index + 1}`}
                        />
                      </td>

                      {/* Email */}
                      <td className="p-3">
                        <span className="text-sm font-medium">{account.email}</span>
                      </td>

                      {/* Password */}
                      <td className="p-3">{renderCellValue(account.password, "password")}</td>

                      {/* Recovery Email */}
                      <td className="p-3">{renderCellValue(account.recoveryEmail, "recoveryEmail")}</td>

                      {/* TOTP Secret */}
                      <td className="p-3">{renderCellValue(account.totpSecret, "totpSecret")}</td>

                      {/* Year */}
                      <td className="p-3">
                        {account.year ? (
                          <span className="text-sm">{account.year}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="p-3">
                        {account.country ? (
                          <span className="text-sm">{account.country}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>

                      {/* Unknown Fields */}
                      <td className="p-3">{renderUnknownFields(account.unknown)}</td>

                      {/* Confidence */}
                      <td className="p-3">
                        <ConfidenceBadge confidence={account.confidence} mode="compact" />
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onDeleteAccount?.(index)}
                            className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label={`Delete account ${index + 1}`}
                            title="Delete row"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              {t.actions?.cancel}
            </Button>
          )}
          {onConfirm && (
            <Button
              variant="primary"
              onClick={() => onConfirm(accounts)}
              disabled={isLoading || stats.valid === 0}
            >
              {stats.valid === 1
                ? t.actions?.import?.replace('{{count}}', '1')
                : t.actions?.importPlural?.replace('{{count}}', String(stats.valid))
              }
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ImportPreview.displayName = "ImportPreview";

export { ImportPreview };
export type { ImportStats };
