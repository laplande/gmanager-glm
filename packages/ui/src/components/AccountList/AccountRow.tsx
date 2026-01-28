import * as React from "react";
import type { AccountWithTags } from "@gmanager/shared";
import { cn } from "../../lib/utils";
import { PasswordReveal } from "./PasswordReveal";
import { TOTPDisplay } from "./TOTPDisplay";

/**
 * Props for the AccountRow component
 */
export interface AccountRowProps {
  /** The account data to display */
  account: AccountWithTags;
  /** Whether this row is selected */
  selected?: boolean;
  /** Whether this account has low confidence (from parsing) */
  lowConfidence?: boolean;
  /** Callback when selection state changes */
  onSelectionChange?: (selected: boolean) => void;
  /** Callback when a field is clicked (for copy) */
  onFieldClick?: (field: string, value: string) => void;
  /** Callback when row is right-clicked */
  onContextMenu?: (event: React.MouseEvent, account: AccountWithTags) => void;
  /** Callback when row is double-clicked */
  onDoubleClick?: (account: AccountWithTags) => void;
  /** Additional CSS classes */
  className?: string;
  /** Currently focused field for keyboard navigation */
  focusedField?: string;
  /** Whether password is revealed */
  passwordRevealed?: boolean;
  /** Callback to toggle password reveal */
  onPasswordRevealChange?: (revealed: boolean) => void;
}

/**
 * Context menu item type
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
}

/**
 * Individual account row component.
 *
 * Displays account data in a compact, keyboard-accessible row format.
 * Supports field copying, selection, and context menus.
 *
 * @example
 * ```tsx
 * <AccountRow
 *   account={account}
 *   selected={false}
 *   onSelectionChange={(sel) => console.log(sel)}
 *   onFieldClick={(field, value) => navigator.clipboard.writeText(value)}
 * />
 * ```
 */
export const AccountRow = React.forwardRef<HTMLDivElement, AccountRowProps>(
  (
    {
      account,
      selected = false,
      lowConfidence = false,
      onSelectionChange,
      onFieldClick,
      onContextMenu,
      onDoubleClick,
      className,
      focusedField,
      passwordRevealed = false,
      onPasswordRevealChange,
    },
    ref
  ) => {
    const rowRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => rowRef.current!);

    const handleCheckboxChange = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectionChange?.(!selected);
    };

    const handleFieldClick = (field: string, value: string) => {
      onFieldClick?.(field, value);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(e, account);
    };

    const handleRowDoubleClick = () => {
      onDoubleClick?.(account);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          onSelectionChange?.(!selected);
          break;
        case "c":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleFieldClick("email", account.email);
          }
          break;
      }
    };

    const groupBadge = account.group ? (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
          "border",
          account.group.color
            ? `border-[style=${account.group.color}] bg-opacity-10`
            : "border-border bg-muted text-muted-foreground"
        )}
        style={
          account.group.color
            ? {
                backgroundColor: `${account.group.color}20`,
                borderColor: account.group.color,
                color: account.group.color,
              }
            : undefined
        }
        title={`Group: ${account.group.name}`}
      >
        {account.group.name}
      </span>
    ) : null;

    const tagBadges =
      account.tags.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap">
          {account.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className={cn(
                "inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium",
                "border"
              )}
              style={
                tag.color
                  ? {
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color,
                    }
                  : undefined
              }
              title={`Tag: ${tag.name}`}
            >
              {tag.name}
            </span>
          ))}
          {account.tags.length > 3 && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] text-muted-foreground">
              +{account.tags.length - 3}
            </span>
          )}
        </div>
      ) : null;

    const totpDisplay = account.totpSecret ? (
      <TOTPDisplay secret={account.totpSecret} />
    ) : (
      <span className="text-muted-foreground text-sm">—</span>
    );

    const passwordDisplay = account.password ? (
      <PasswordReveal
        password={account.password}
        revealed={passwordRevealed}
        onRevealChange={onPasswordRevealChange}
      />
    ) : (
      <span className="text-muted-foreground text-sm italic">No password</span>
    );

    const recoveryEmailDisplay = account.recoveryEmail ? (
      <button
        className={cn(
          "text-left text-sm truncate max-w-[200px]",
          "hover:text-primary transition-colors",
          "rounded px-2 py-1 -mx-2 -my-1",
          "hover:bg-accent/50"
        )}
        onClick={() => handleFieldClick("recoveryEmail", account.recoveryEmail!)}
        title="Click to copy recovery email"
      >
        {account.recoveryEmail}
      </button>
    ) : (
      <span className="text-muted-foreground text-sm">—</span>
    );

    return (
      <div
        ref={rowRef}
        role="row"
        aria-selected={selected}
        className={cn(
          "group flex items-center gap-3 py-2 px-3 border-b border-border/50",
          "transition-colors duration-150",
          "hover:bg-accent/30",
          "focus-within:bg-accent/50",
          selected && "bg-accent/60",
          lowConfidence && "bg-orange-500/5 hover:bg-orange-500/10",
          "outline-none",
          className
        )}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleRowDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Checkbox */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            onClick={handleCheckboxChange}
            className={cn(
              "w-4 h-4 rounded border border-input",
              "accent-primary cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            )}
            aria-label={`Select ${account.email}`}
          />
        </div>

        {/* Low confidence indicator */}
        {lowConfidence && (
          <div
            className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500"
            title="Low confidence - please verify"
          />
        )}

        {/* Email */}
        <div className="flex-1 min-w-[200px]">
          <button
            className={cn(
              "text-left text-sm font-medium truncate block w-full",
              "hover:text-primary transition-colors",
              "rounded px-2 py-1 -mx-2 -my-1",
              "hover:bg-accent/50",
              focusedField === "email" && "ring-2 ring-ring ring-offset-1"
            )}
            onClick={() => handleFieldClick("email", account.email)}
            title="Click to copy email"
          >
            {account.email}
          </button>
        </div>

        {/* Password */}
        <div className="flex-1 min-w-[150px]">{passwordDisplay}</div>

        {/* TOTP */}
        <div className="flex-1 min-w-[160px] flex items-center">
          {totpDisplay}
        </div>

        {/* Recovery Email */}
        <div className="flex-1 min-w-[150px]">{recoveryEmailDisplay}</div>

        {/* Group Badge */}
        <div className="flex-shrink-0">{groupBadge}</div>

        {/* Tags */}
        <div className="flex-shrink-0 w-32">{tagBadges}</div>

        {/* Action menu trigger */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className={cn(
              "p-1.5 rounded-md",
              "hover:bg-accent",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu?.(e, account);
            }}
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
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);

AccountRow.displayName = "AccountRow";
