/**
 * FilterChips component for displaying active filters
 *
 * Shows selected filters as removable chips with a "Clear all" option.
 */

import * as React from 'react';
import { cn } from '@gmanager/ui';
import type { Group, Tag } from '@gmanager/shared';

/**
 * Active filter state
 */
export interface ActiveFilters {
  /** Search query text */
  query?: string;
  /** Selected group ID */
  groupId?: string;
  /** Selected tag ID */
  tagId?: string;
  /** Selected year */
  year?: string;
}

/**
 * Props for FilterChips component
 */
export interface FilterChipsProps {
  /** Active filters to display */
  activeFilters: ActiveFilters;
  /** Available groups for name lookup */
  groups?: Group[];
  /** Available tags for name lookup */
  tags?: Tag[];
  /** Callback when a filter is removed */
  onRemoveFilter: (filterType: keyof ActiveFilters) => void;
  /** Callback when all filters are cleared */
  onClearAll: () => void;
  /** Optional label for the filter container */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Maximum number of chips to show before collapsing */
  maxVisible?: number;
}

/**
 * X/close icon for chips
 */
const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5"
    />
  </svg>
);

/**
 * Search icon
 */
const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM16.5 16.5 13 13"
    />
  </svg>
);

/**
 * Individual filter chip component
 */
interface FilterChipProps {
  /** Display label for the chip */
  label: string;
  /** Type of filter (for accessible labeling) */
  type: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional color indicator */
  color?: string;
  /** On remove callback */
  onRemove: () => void;
  /** Whether chip is disabled */
  disabled?: boolean;
}

function FilterChip({ label, type, icon, color, onRemove, disabled = false }: FilterChipProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onRemove();
    }
  };

  return (
    <div
      role="listitem"
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-sm',
        'bg-secondary text-secondary-foreground border border-border',
        'transition-colors',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Icon if provided */}
      {icon && (
        <span className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Color indicator if provided */}
      {color && !icon && (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border/20"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}

      {/* Filter label */}
      <span className="truncate max-w-[150px]" title={label}>
        {label}
      </span>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 p-0.5 rounded-sm',
          'hover:bg-destructive/10 hover:text-destructive',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'transition-colors',
          disabled && 'pointer-events-none'
        )}
        aria-label={`Remove ${type} filter: ${label}`}
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * Main FilterChips component
 *
 * Displays active filters as removable chips. Automatically shows/hides
 * based on whether there are any active filters.
 *
 * @example
 * ```tsx
 * <FilterChips
 *   activeFilters={{ query: 'work', groupId: '1' }}
 *   groups={groups}
 *   tags={tags}
 *   onRemoveFilter={(type) => {
 *     if (type === 'query') clearQuery();
 *     if (type === 'groupId') clearGroupId();
 *   }}
 *   onClearAll={clearAllFilters}
 * />
 * ```
 */
export const FilterChips = React.forwardRef<HTMLDivElement, FilterChipsProps>(
  (
    {
      activeFilters,
      groups = [],
      tags = [],
      onRemoveFilter,
      onClearAll,
      label = 'Active Filters',
      className,
      maxVisible,
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Build array of active filter chips
    const chips = React.useMemo(() => {
      const result: Array<{
        key: keyof ActiveFilters;
        label: string;
        type: string;
        icon?: React.ReactNode;
        color?: string;
      }> = [];

      // Query filter
      if (activeFilters.query) {
        result.push({
          key: 'query',
          label: activeFilters.query,
          type: 'search',
          icon: <SearchIcon className="w-3.5 h-3.5" />,
        });
      }

      // Group filter
      if (activeFilters.groupId) {
        const group = groups.find((g) => g.id === activeFilters.groupId);
        if (group) {
          result.push({
            key: 'groupId',
            label: group.name,
            type: 'group',
            color: group.color,
          });
        }
      }

      // Tag filter
      if (activeFilters.tagId) {
        const tag = tags.find((t) => t.id === activeFilters.tagId);
        if (tag) {
          result.push({
            key: 'tagId',
            label: tag.name,
            type: 'tag',
            color: tag.color,
          });
        }
      }

      // Year filter
      if (activeFilters.year) {
        result.push({
          key: 'year',
          label: activeFilters.year,
          type: 'year',
        });
      }

      return result;
    }, [activeFilters, groups, tags]);

    // Determine visible chips
    const visibleChips = React.useMemo(() => {
      if (!maxVisible || chips.length <= maxVisible || isExpanded) {
        return chips;
      }
      return chips.slice(0, maxVisible);
    }, [chips, maxVisible, isExpanded]);

    const hasHiddenChips = maxVisible && chips.length > maxVisible;
    const hasFilters = chips.length > 0;

    // Don't render if no filters
    if (!hasFilters) {
      return null;
    }

    const handleRemove = (filterType: keyof ActiveFilters) => {
      onRemoveFilter(filterType);
    };

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {/* Header with label and clear all */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className={cn(
              'text-xs text-primary hover:underline',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-sm'
            )}
          >
            Clear all
          </button>
        </div>

        {/* Chips container */}
        <div
          role="list"
          aria-label={label}
          className="flex flex-wrap items-center gap-2"
        >
          {visibleChips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              type={chip.type}
              icon={chip.icon}
              color={chip.color}
              onRemove={() => handleRemove(chip.key)}
            />
          ))}

          {/* Show more/less button */}
          {hasHiddenChips && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'inline-flex items-center h-7 px-2.5 rounded-full text-sm',
                'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                'transition-colors'
              )}
            >
              {isExpanded ? (
                <>Show less</>
              ) : (
                <>+{chips.length - maxVisible} more</>
              )}
            </button>
          )}
        </div>

        {/* Filter count for screen readers */}
        <span className="sr-only">
          {chips.length} active filter{chips.length !== 1 ? 's' : ''} applied
        </span>
      </div>
    );
  }
);

FilterChips.displayName = 'FilterChips';

/**
 * Export individual FilterChip for direct use if needed
 */
export { FilterChip };
export type { FilterChipProps };
