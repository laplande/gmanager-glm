/**
 * AccountBulkEdit component - Bulk edit dialog for multiple accounts
 *
 * Allows editing common fields (group, tags, notes) across multiple
 * selected accounts at once.
 */

import * as React from 'react';
import { Button } from '@gmanager/ui';
import type { AccountWithTags, Group, Tag } from '@gmanager/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@gmanager/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@gmanager/ui';
import { Label } from '@gmanager/ui';
import { Checkbox } from '@gmanager/ui';
import { Textarea } from '@gmanager/ui';
import { X, Check } from 'lucide-react';
import { cn } from '@gmanager/ui';

/**
 * Bulk edit field types
 */
export type BulkEditField = 'group' | 'tags' | 'notes';

/**
 * Bulk edit data
 */
export interface BulkEditData {
  /** Group to assign (undefined = no change) */
  groupId?: string | null;
  /** Tags to add (undefined = no change) */
  addTagIds?: string[];
  /** Tags to remove (undefined = no change) */
  removeTagIds?: string[];
  /** Notes to set (undefined = no change) */
  notes?: string;
  /** Which fields to apply */
  fields: BulkEditField[];
}

/**
 * Props for AccountBulkEdit component
 */
export interface AccountBulkEditProps {
  /** Selected accounts to edit */
  selectedAccounts: AccountWithTags[];
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when bulk edit is submitted */
  onSubmit: (data: BulkEditData) => void | Promise<void>;
  /** Available groups */
  groups: Group[];
  /** Available tags */
  tags: Tag[];
  /** Whether operation is in progress */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccountBulkEdit dialog component
 *
 * Displays a modal dialog for editing multiple accounts at once.
 * User can select which fields to apply changes to.
 *
 * @example
 * ```tsx
 * const [bulkEditOpen, setBulkEditOpen] = useState(false);
 * const [selectedIds] = useState(new Set(['acc1', 'acc2']));
 *
 * <AccountBulkEdit
 *   open={bulkEditOpen}
 *   onOpenChange={setBulkEditOpen}
 *   selectedAccounts={getSelectedAccounts(accounts, selectedIds)}
 *   groups={groups}
 *   tags={tags}
 *   onSubmit={async (data) => {
 *     await batchUpdateAccounts(Array.from(selectedIds), data);
 *     setBulkEditOpen(false);
 *   }}
 * />
 * ```
 */
export const AccountBulkEdit = React.forwardRef<HTMLDivElement, AccountBulkEditProps>(
  (
    {
      selectedAccounts,
      open,
      onOpenChange,
      onSubmit,
      groups,
      tags,
      loading = false,
      className,
    },
    ref
  ) => {
    const accountCount = selectedAccounts.length;

    // Field edit states
    const [groupEnabled, setGroupEnabled] = React.useState(false);
    const [groupId, setGroupId] = React.useState<string>('');

    const [tagsEnabled, setTagsEnabled] = React.useState(false);
    const [addTagIds, setAddTagIds] = React.useState<Set<string>>(new Set());
    const [removeTagIds, setRemoveTagIds] = React.useState<Set<string>>(new Set());

    const [notesEnabled, setNotesEnabled] = React.useState(false);
    const [notes, setNotes] = React.useState('');

    // Reset form when dialog opens
    React.useEffect(() => {
      if (open) {
        setGroupEnabled(false);
        setGroupId('');
        setTagsEnabled(false);
        setAddTagIds(new Set());
        setRemoveTagIds(new Set());
        setNotesEnabled(false);
        setNotes('');
      }
    }, [open]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const fields: BulkEditField[] = [];
      const data: BulkEditData = { fields: [] };

      if (groupEnabled) {
        fields.push('group');
        data.groupId = groupId || null;
      }

      if (tagsEnabled) {
        fields.push('tags');
        if (addTagIds.size > 0) {
          data.addTagIds = Array.from(addTagIds);
        }
        if (removeTagIds.size > 0) {
          data.removeTagIds = Array.from(removeTagIds);
        }
      }

      if (notesEnabled) {
        fields.push('notes');
        data.notes = notes;
      }

      if (fields.length === 0) {
        // No fields selected, just close
        onOpenChange(false);
        return;
      }

      await onSubmit(data);
    };

    // Toggle tag add/remove
    const toggleAddTag = (tagId: string) => {
      setAddTagIds((prev) => {
        const next = new Set(prev);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
          // Remove from remove if present
          setRemoveTagIds((remove) => {
            const nextRemove = new Set(remove);
            nextRemove.delete(tagId);
            return nextRemove;
          });
        }
        return next;
      });
    };

    const toggleRemoveTag = (tagId: string) => {
      setRemoveTagIds((prev) => {
        const next = new Set(prev);
        if (next.has(tagId)) {
          next.delete(tagId);
        } else {
          next.add(tagId);
          // Remove from add if present
          setAddTagIds((add) => {
            const nextAdd = new Set(add);
            nextAdd.delete(tagId);
            return nextAdd;
          });
        }
        return next;
      });
    };

    // Check if any field is enabled
    const hasEnabledField = groupEnabled || tagsEnabled || notesEnabled;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={ref}
          className={cn('max-w-lg', className)}
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking inside
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevent closing when interacting outside
            if (loading) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Bulk Edit Accounts</DialogTitle>
            <DialogDescription>
              Edit {accountCount} account{accountCount !== 1 ? 's' : ''} at once. Only the
              fields you enable will be updated.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group field */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="group-enabled"
                  checked={groupEnabled}
                  onCheckedChange={(checked) => setGroupEnabled(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="group-enabled" className="font-medium cursor-pointer">
                  Assign to Group
                </Label>
              </div>

              {groupEnabled && (
                <div className="pl-6 space-y-2">
                  <Select value={groupId} onValueChange={setGroupId} disabled={loading}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Group</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Tags field */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tags-enabled"
                  checked={tagsEnabled}
                  onCheckedChange={(checked) => setTagsEnabled(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="tags-enabled" className="font-medium cursor-pointer">
                  Modify Tags
                </Label>
              </div>

              {tagsEnabled && (
                <div className="pl-6 space-y-3">
                  {/* Tags to add */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Add Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isAdded = addTagIds.has(tag.id);
                        const isRemoved = removeTagIds.has(tag.id);

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleAddTag(tag.id)}
                            disabled={loading || isRemoved}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                              isAdded
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            {isAdded && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                      {tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">No tags available</span>
                      )}
                    </div>
                  </div>

                  {/* Tags to remove */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Remove Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isRemoved = removeTagIds.has(tag.id);
                        const isAdded = addTagIds.has(tag.id);

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleRemoveTag(tag.id)}
                            disabled={loading || isAdded}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                              isRemoved
                                ? 'bg-destructive text-destructive-foreground border-destructive'
                                : 'bg-background border-border hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            {isRemoved && <X className="w-3 h-3" />}
                          </button>
                        );
                      })}
                      {tags.length === 0 && (
                        <span className="text-sm text-muted-foreground">No tags available</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes field */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notes-enabled"
                  checked={notesEnabled}
                  onCheckedChange={(checked) => setNotesEnabled(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="notes-enabled" className="font-medium cursor-pointer">
                  Set Notes
                </Label>
              </div>

              {notesEnabled && (
                <div className="pl-6 space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    placeholder="Enter notes for all selected accounts (will replace existing notes)"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!hasEnabledField || loading}
              >
                {loading ? 'Applying...' : `Apply to ${accountCount} Account${accountCount !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

AccountBulkEdit.displayName = 'AccountBulkEdit';

// Re-export Dialog components from @gmanager/ui for convenience
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
