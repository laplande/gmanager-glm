/**
 * BatchActions component - Toolbar for batch account operations
 *
 * Appears when accounts are selected and provides actions like:
 * - Delete selected accounts
 * - Move to group
 * - Add/remove tags
 * - Export selected accounts
 */

import * as React from 'react';
import { Button } from '@gmanager/ui';
import {
  Trash2,
  FolderOpen,
  Tag,
  Download,
  X,
  MoreHorizontal,
} from 'lucide-react';

/**
 * Batch action types
 */
export type BatchActionType =
  | 'delete'
  | 'moveToGroup'
  | 'addTags'
  | 'removeTags'
  | 'export'
  | 'custom';

/**
 * Batch action definition
 */
export interface BatchAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of action */
  type: BatchActionType;
  /** Display label */
  label: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Whether action is destructive (danger) */
  destructive?: boolean;
  /** Whether action is currently disabled */
  disabled?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Callback when action is triggered */
  onClick: () => void;
}

/**
 * Props for BatchActions component
 */
export interface BatchActionsProps {
  /** Number of selected accounts */
  selectedCount: number;
  /** Available batch actions */
  actions?: BatchAction[];
  /** Callback when delete is triggered */
  onDelete?: () => void;
  /** Callback when move to group is triggered */
  onMoveToGroup?: () => void;
  /** Callback when add tags is triggered */
  onAddTags?: () => void;
  /** Callback when remove tags is triggered */
  onRemoveTags?: () => void;
  /** Callback when export is triggered */
  onExport?: () => void;
  /** Callback when clear selection is triggered */
  onClearSelection?: () => void;
  /** Whether actions are currently loading */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Position of the toolbar */
  position?: 'top' | 'bottom' | 'sticky';
  /** Maximum width before actions wrap */
  maxWidth?: string;
}

/**
 * Default batch actions configuration
 */
const getDefaultActions = (props: BatchActionsProps): BatchAction[] => {
  const actions: BatchAction[] = [];

  if (props.onMoveToGroup) {
    actions.push({
      id: 'move-to-group',
      type: 'moveToGroup',
      label: 'Move to Group',
      icon: <FolderOpen className="w-4 h-4" />,
      onClick: props.onMoveToGroup,
    });
  }

  if (props.onAddTags) {
    actions.push({
      id: 'add-tags',
      type: 'addTags',
      label: 'Add Tags',
      icon: <Tag className="w-4 h-4" />,
      onClick: props.onAddTags,
    });
  }

  if (props.onRemoveTags) {
    actions.push({
      id: 'remove-tags',
      type: 'removeTags',
      label: 'Remove Tags',
      icon: <Tag className="w-4 h-4" />,
      onClick: props.onRemoveTags,
    });
  }

  if (props.onExport) {
    actions.push({
      id: 'export',
      type: 'export',
      label: 'Export',
      icon: <Download className="w-4 h-4" />,
      onClick: props.onExport,
    });
  }

  if (props.onDelete) {
    actions.push({
      id: 'delete',
      type: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      destructive: true,
      onClick: props.onDelete,
    });
  }

  return actions;
};

/**
 * BatchActions toolbar component
 *
 * Displays a toolbar with batch operations when accounts are selected.
 * Automatically handles showing/hiding based on selection count.
 *
 * @example
 * ```tsx
 * <BatchActions
 *   selectedCount={selectedIds.size}
 *   onDelete={handleDelete}
 *   onMoveToGroup={handleMoveToGroup}
 *   onAddTags={handleAddTags}
 *   onExport={handleExport}
 *   onClearSelection={() => setSelectedIds(new Set())}
 * />
 *
 * // With custom actions
 * <BatchActions
 *   selectedCount={selectedIds.size}
 *   actions={[
 *     { id: 'custom', type: 'custom', label: 'Custom', onClick: handleCustom }
 *   ]}
 *   onClearSelection={clearSelection}
 * />
 * ```
 */
export const BatchActions = React.forwardRef<HTMLDivElement, BatchActionsProps>(
  (
    {
      selectedCount,
      actions: propActions,
      onDelete,
      onMoveToGroup,
      onAddTags,
      onRemoveTags,
      onExport,
      onClearSelection,
      loading = false,
      className,
      position = 'bottom',
      maxWidth = '100%',
    },
    ref
  ) => {
    // Use provided actions or generate from props
    const actions = React.useMemo(
      () =>
        propActions || getDefaultActions({ selectedCount, onDelete, onMoveToGroup, onAddTags, onRemoveTags, onExport }),
      [propActions, selectedCount, onDelete, onMoveToGroup, onAddTags, onRemoveTags, onExport]
    );

    // Don't render if nothing is selected
    if (selectedCount === 0) {
      return null;
    }

    const positionClasses = {
      top: 'rounded-b-lg border-t border-b-0 border-x-0',
      bottom: 'rounded-t-lg border-b border-t-0 border-x-0',
      sticky: 'sticky bottom-0 rounded-t-lg border-t',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3',
          'bg-muted/90 backdrop-blur-sm border border-border',
          'px-4 py-2.5 transition-all duration-200',
          positionClasses[position],
          'shadow-sm',
          className
        )}
        style={{ maxWidth }}
        role="toolbar"
        aria-label={`Batch actions for ${selectedCount} selected accounts`}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {getSelectionCountText(selectedCount)}
          </span>
        </div>

        {/* Batch actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.destructive ? 'destructive' : 'ghost'}
              size="sm"
              disabled={action.disabled || loading}
              onClick={action.onClick}
              className="gap-1.5"
              title={action.tooltip || action.label}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Clear selection button */}
        {onClearSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={loading}
            className="flex-shrink-0 ml-auto"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        )}
      </div>
    );
  }
);

BatchActions.displayName = 'BatchActions';

/**
 * Helper to get selection count text
 */
function getSelectionCountText(count: number): string {
  return `${count} account${count !== 1 ? 's' : ''} selected`;
}

/**
 * Compact variant for smaller screens
 */
export interface BatchActionsCompactProps extends Omit<BatchActionsProps, 'className'> {
  /** Expand menu when true */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * BatchActionsCompact - A more compact version with dropdown menu
 *
 * @example
 * ```tsx
 * <BatchActionsCompact
 *   selectedCount={selectedIds.size}
 *   onDelete={handleDelete}
 *   onMoveToGroup={handleMoveToGroup}
 *   onClearSelection={clearSelection}
 * />
 * ```
 */
export const BatchActionsCompact = React.forwardRef<
  HTMLDivElement,
  BatchActionsCompactProps
>(
  (
    {
      selectedCount,
      actions: propActions,
      onDelete,
      onMoveToGroup,
      onAddTags,
      onRemoveTags,
      onExport,
      onClearSelection,
      loading = false,
      expanded = false,
      onExpandedChange,
      position = 'bottom',
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(expanded);

    React.useEffect(() => {
      setIsExpanded(expanded);
    }, [expanded]);

    const handleToggleExpand = () => {
      const next = !isExpanded;
      setIsExpanded(next);
      onExpandedChange?.(next);
    };

    // Use provided actions or generate from props
    const actions = React.useMemo(
      () =>
        propActions || getDefaultActions({ selectedCount, onDelete, onMoveToGroup, onAddTags, onRemoveTags, onExport }),
      [propActions, selectedCount, onDelete, onMoveToGroup, onAddTags, onRemoveTags, onExport]
    );

    if (selectedCount === 0) {
      return null;
    }

    const positionClasses = {
      top: 'rounded-b-lg border-t border-b-0 border-x-0',
      bottom: 'rounded-t-lg border-b border-t-0 border-x-0',
      sticky: 'sticky bottom-0 rounded-t-lg border-t',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-3',
          'bg-muted/90 backdrop-blur-sm border border-border',
          'px-3 py-2 transition-all duration-200',
          positionClasses[position],
          'shadow-sm'
        )}
        role="toolbar"
        aria-label={`Batch actions for ${selectedCount} selected accounts`}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {selectedCount} selected
          </span>
        </div>

        {/* Actions or expand button */}
        {isExpanded ? (
          <div className="flex items-center gap-1 flex-wrap">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.destructive ? 'destructive' : 'ghost'}
                size="sm"
                disabled={action.disabled || loading}
                onClick={action.onClick}
                className="h-7 px-2 text-xs gap-1"
                title={action.tooltip || action.label}
              >
                {action.icon}
                <span className="hidden lg:inline">{action.label}</span>
              </Button>
            ))}

            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClearSelection();
                  setIsExpanded(false);
                }}
                disabled={loading}
                className="h-7 px-2"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              disabled={loading}
              className="h-7 px-2"
              aria-label="Show batch actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>

            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={loading}
                className="h-7 px-2"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

BatchActionsCompact.displayName = 'BatchActionsCompact';

// Import cn utility
import { cn } from '@gmanager/ui';
