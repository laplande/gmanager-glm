import * as React from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "../../lib/utils";
import {
  FieldBlock,
  FIELD_TYPE_META,
  type FieldType,
} from "./FieldBlock";
import type {
  FieldConfig,
} from "./useFieldDragDrop";

/**
 * Props for the FieldEditor component
 */
export interface FieldEditorProps {
  /** Initial field configurations */
  initialFields?: FieldConfig[];
  /** Callback when fields are reordered or changed */
  onFieldsChange?: (fields: FieldConfig[]) => void;
  /** Callback when a field is toggled */
  onFieldToggle?: (id: string, enabled: boolean) => void;
  /** Whether to show a preview of changes */
  showPreview?: boolean;
  /** Whether to allow deleting fields */
  allowDelete?: boolean;
  /** Whether to allow adding new fields */
  allowAdd?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum number of fields allowed */
  maxFields?: number;
  /** Label for the field editor section */
  label?: string;
  /** Description text */
  description?: string;
}

/**
 * Sortable field wrapper that integrates FieldBlock with dnd-kit
 */
interface SortableFieldBlockProps {
  field: FieldConfig;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

function SortableFieldBlock({
  field,
  onToggle,
  onDelete,
  showDelete,
}: SortableFieldBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: field,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <FieldBlock
        type={field.type}
        enabled={field.enabled}
        isDragging={isDragging}
        id={field.id}
        onToggle={onToggle}
        onDelete={onDelete}
        showDelete={showDelete}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
        setNodeRef={setNodeRef}
      />
    </div>
  );
}

/**
 * Available field types for adding new fields
 */
const AVAILABLE_FIELD_TYPES: FieldType[] = [
  "email",
  "password",
  "recovery_email",
  "totp_secret",
  "year",
  "notes",
];

/**
 * FieldEditor Component
 *
 * A visual editor for reordering and configuring account field types.
 * Features:
 * - Drag-and-drop reordering with @dnd-kit
 * - Click to toggle field visibility
 * - Delete fields (optional)
 * - Add new fields (optional)
 * - Preview of enabled fields
 *
 * @example
 * ```tsx
 * <FieldEditor
 *   initialFields={[
 *     { id: 'email-1', type: 'email', enabled: true },
 *     { id: 'password-1', type: 'password', enabled: true }
 *   ]}
 *   onFieldsChange={(fields) => console.log('Fields changed', fields)}
 *   showPreview={true}
 * />
 * ```
 */
export const FieldEditor = React.forwardRef<HTMLDivElement, FieldEditorProps>(
  (
    {
      initialFields,
      onFieldsChange,
      onFieldToggle,
      showPreview = true,
      allowDelete = true,
      allowAdd = true,
      maxFields = 10,
      className,
      label = "Field Configuration",
      description = "Drag to reorder fields. Toggle visibility with the switch.",
    },
    ref
  ) => {
    // Initialize fields state
    const [fields, setFields] = React.useState<FieldConfig[]>(
      initialFields ?? [
        { id: "email-1", type: "email", enabled: true },
        { id: "password-1", type: "password", enabled: true },
        { id: "recovery_email-1", type: "recovery_email", enabled: true },
        { id: "totp_secret-1", type: "totp_secret", enabled: true },
        { id: "year-1", type: "year", enabled: true },
        { id: "notes-1", type: "notes", enabled: true },
      ]
    );

    const [_activeId, setActiveId] = React.useState<string | null>(null);
    const [draggedField, setDraggedField] = React.useState<FieldConfig | null>(
      null
    );

    // Sync with initialFields prop changes
    React.useEffect(() => {
      if (initialFields && initialFields.length > 0) {
        setFields(initialFields);
      }
    }, [initialFields]);

    // Configure drag sensors
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8, // Require 8px movement before drag starts
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Generate a unique ID for new fields
    const generateId = React.useCallback((type: FieldType): string => {
      return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Add a new field
    const addField = React.useCallback(
      (type: FieldType) => {
        if (fields.length >= maxFields) return;
        const newField: FieldConfig = {
          id: generateId(type),
          type,
          enabled: true,
        };
        const newFields = [...fields, newField];
        setFields(newFields);
        onFieldsChange?.(newFields);
      },
      [fields, maxFields, generateId, onFieldsChange]
    );

    // Remove a field by ID
    const removeField = React.useCallback(
      (id: string) => {
        const newFields = fields.filter((f) => f.id !== id);
        setFields(newFields);
        onFieldsChange?.(newFields);
      },
      [fields, onFieldsChange]
    );

    // Toggle field enabled state
    const toggleField = React.useCallback(
      (id: string) => {
        const newFields = fields.map((f) =>
          f.id === id ? { ...f, enabled: !f.enabled } : f
        );
        setFields(newFields);
        onFieldsChange?.(newFields);
        const toggledField = newFields.find((f) => f.id === id);
        if (toggledField) {
          onFieldToggle?.(id, toggledField.enabled);
        }
      },
      [fields, onFieldsChange, onFieldToggle]
    );

    // Get enabled field types in order
    const getEnabledFieldTypes = React.useCallback(() => {
      return fields.filter((f) => f.enabled).map((f) => f.type);
    }, [fields]);

    // Handle drag start
    const handleDragStart = React.useCallback(
      (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        const field = fields.find((f) => f.id === active.id);
        setDraggedField(field ?? null);
      },
      [fields]
    );

    // Handle drag end
    const handleDragEnd = React.useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = fields.findIndex((item) => item.id === active.id);
          const newIndex = fields.findIndex((item) => item.id === over.id);

          const newFields = [
            ...fields.slice(0, oldIndex),
            ...fields.slice(oldIndex + 1),
          ];
          newFields.splice(newIndex, 0, fields[oldIndex]);

          setFields(newFields);
          onFieldsChange?.(newFields);
        }

        setActiveId(null);
        setDraggedField(null);
      },
      [fields, onFieldsChange]
    );

    // Check which field types are already added
    const addedFieldTypes = React.useMemo(
      () => new Set(fields.map((f) => f.type)),
      [fields]
    );

    // Get available field types to add
    const availableToAdd = React.useMemo(() => {
      return AVAILABLE_FIELD_TYPES.filter(
        (type) => !addedFieldTypes.has(type) || fields.length < maxFields
      );
    }, [addedFieldTypes, fields.length, maxFields]);

    // Enabled fields for preview
    const enabledFields = React.useMemo(
      () => fields.filter((f) => f.enabled),
      [fields]
    );

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Field Editor */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Draggable Fields List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Fields ({fields.length}/{maxFields})
                </span>
                {allowAdd && availableToAdd.length > 0 && (
                  <div className="relative">
                    <select
                      className={cn(
                        "text-sm px-3 py-1.5 rounded-md border border-input",
                        "bg-background hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "cursor-pointer"
                      )}
                      onChange={(e) => {
                        if (e.target.value) {
                          addField(e.target.value as FieldType);
                          e.target.value = "";
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>
                        Add field...
                      </option>
                      {AVAILABLE_FIELD_TYPES.filter(
                        (type) => !addedFieldTypes.has(type)
                      ).map((type) => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_META[type].label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <SortableContext
                items={fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {fields.map((field) => (
                    <SortableFieldBlock
                      key={field.id}
                      field={field}
                      onToggle={toggleField}
                      onDelete={allowDelete ? removeField : undefined}
                      showDelete={allowDelete && fields.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>

              {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p className="text-sm">No fields configured</p>
                  {allowAdd && (
                    <button
                      type="button"
                      onClick={() => addField("email")}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Add your first field
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Preview ({enabledFields.length} visible)
                </span>

                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  {enabledFields.length > 0 ? (
                    <div className="space-y-2">
                      {/* Column header preview */}
                      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <div className="w-4 h-4 rounded border border-border" />
                        {enabledFields.map((field) => (
                          <div
                            key={field.id}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-medium",
                              FIELD_TYPE_META[field.type].bgGradient,
                              FIELD_TYPE_META[field.type].color
                            )}
                          >
                            {FIELD_TYPE_META[field.type].label}
                          </div>
                        ))}
                      </div>

                      {/* Sample row preview */}
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-4 h-4 rounded border border-border" />
                        {enabledFields.map((field) => (
                          <div
                            key={field.id}
                            className="px-3 py-1 rounded text-xs text-muted-foreground bg-background/50 border border-border/50"
                          >
                            {field.type === "email" && "user@example.com"}
                            {field.type === "password" && "••••••••"}
                            {field.type === "recovery_email" && "backup@example.com"}
                            {field.type === "totp_secret" && "123 456"}
                            {field.type === "year" && "2024"}
                            {field.type === "notes" && "Additional info..."}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No fields enabled for display
                    </div>
                  )}
                </div>

                {/* Export summary */}
                <div className="p-3 rounded-md bg-accent/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Field order for import:
                  </p>
                  <code className="text-xs font-mono text-foreground break-all">
                    {getEnabledFieldTypes().join(", ") || "(none)"}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          {typeof document === "object" &&
            draggedField &&
            createPortal(
              <DragOverlay>
                <div className="rotate-3 scale-105 shadow-xl">
                  <FieldBlock
                    type={draggedField.type}
                    enabled={draggedField.enabled}
                    isDragging={true}
                    id={draggedField.id}
                    dragHandleProps={{}}
                  />
                </div>
              </DragOverlay>,
              document.body
            )}
        </DndContext>
      </div>
    );
  }
);

FieldEditor.displayName = "FieldEditor";

/**
 * Hook for programmatic field editor control
 * Can be used to control the editor from a parent component
 */
export function useFieldEditorState(
  fields: FieldConfig[],
  onChange: (fields: FieldConfig[]) => void
) {
  const reorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      const newFields = [...fields];
      const [removed] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, removed);
      onChange(newFields);
    },
    [fields, onChange]
  );

  const toggle = React.useCallback(
    (id: string) => {
      const newFields = fields.map((f) =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      );
      onChange(newFields);
    },
    [fields, onChange]
  );

  const remove = React.useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id));
    },
    [fields, onChange]
  );

  const add = React.useCallback(
    (type: FieldType) => {
      const newField: FieldConfig = {
        id: `${type}-${Date.now()}`,
        type,
        enabled: true,
      };
      onChange([...fields, newField]);
    },
    [fields, onChange]
  );

  return { reorder, toggle, remove, add };
}
