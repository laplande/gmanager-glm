import * as React from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
  FieldType,
} from "./FieldBlock";

/**
 * Represents a single field configuration
 */
export interface FieldConfig {
  /** Unique identifier for this field instance */
  id: string;
  /** The field type */
  type: FieldType;
  /** Whether the field is currently enabled */
  enabled: boolean;
}

/**
 * Props for the useFieldDragDrop hook
 */
export interface UseFieldDragDropProps {
  /** Initial field configurations */
  initialFields?: FieldConfig[];
  /** Callback when fields are reordered */
  onFieldsChange?: (fields: FieldConfig[]) => void;
  /** Callback when a field is toggled */
  onFieldToggle?: (id: string, enabled: boolean) => void;
}

/**
 * State returned by the useFieldDragDrop hook
 */
export interface UseFieldDragDropState {
  /** Current field configurations */
  fields: FieldConfig[];
  /** Reorder fields to match given order */
  setFields: React.Dispatch<React.SetStateAction<FieldConfig[]>>;
  /** Add a new field */
  addField: (type: FieldType) => void;
  /** Remove a field by ID */
  removeField: (id: string) => void;
  /** Toggle field enabled state */
  toggleField: (id: string) => void;
  /** Get field by ID */
  getField: (id: string) => FieldConfig | undefined;
  /** Get enabled field types in order */
  getEnabledFieldTypes: () => FieldType[];
  /** Set field order from field type array */
  setFieldOrder: (fieldTypes: FieldType[]) => void;
  /** Drag state */
  activeId: string | null;
}

/**
 * Hook for managing field drag-and-drop functionality
 *
 * Provides:
 * - Field state management
 * - Drag-and-drop handlers using @dnd-kit/core
 * - Add/remove/toggle field operations
 * - Field ordering utilities
 *
 * @example
 * ```tsx
 * const {
 *   fields,
 *   sensors,
 *   handleDragStart,
 *   handleDragEnd,
 *   addField,
 *   removeField,
 *   toggleField,
 *   activeId
 * } = useFieldDragDrop({
 *   initialFields: [
 *     { id: 'email-1', type: 'email', enabled: true },
 *     { id: 'password-1', type: 'password', enabled: true }
 *   ]
 * });
 * ```
 */
export function useFieldDragDrop({
  initialFields,
  onFieldsChange,
  onFieldToggle,
}: UseFieldDragDropProps = {}): UseFieldDragDropState & {
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
} {
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

  const [activeId, setActiveId] = React.useState<string | null>(null);

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
      const newField: FieldConfig = {
        id: generateId(type),
        type,
        enabled: true,
      };
      const newFields = [...fields, newField];
      setFields(newFields);
      onFieldsChange?.(newFields);
    },
    [fields, generateId, onFieldsChange]
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

  // Get field by ID
  const getField = React.useCallback(
    (id: string) => {
      return fields.find((f) => f.id === id);
    },
    [fields]
  );

  // Get enabled field types in order
  const getEnabledFieldTypes = React.useCallback(() => {
    return fields.filter((f) => f.enabled).map((f) => f.type);
  }, [fields]);

  // Set field order from field type array
  const setFieldOrder = React.useCallback(
    (fieldTypes: FieldType[]) => {
      // Preserve enabled state and create new field configs in the specified order
      const enabledMap = new Map(fields.map((f) => [f.type, f.enabled]));

      const newFields: FieldConfig[] = fieldTypes.map((type, index) => ({
        id: `${type}-${index}`,
        type,
        enabled: enabledMap.get(type) ?? true,
      }));

      setFields(newFields);
      onFieldsChange?.(newFields);
    },
    [fields, onFieldsChange]
  );

  // Handle drag start
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setFields((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          const newFields = arrayMove(items, oldIndex, newIndex);
          onFieldsChange?.(newFields);
          return newFields;
        });
      }

      setActiveId(null);
    },
    [onFieldsChange]
  );

  return {
    fields,
    setFields,
    addField,
    removeField,
    toggleField,
    getField,
    getEnabledFieldTypes,
    setFieldOrder,
    activeId,
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}

/**
 * Sortable field wrapper component
 */
export interface SortableFieldBlockProps {
  field: FieldConfig;
  isDragging: boolean;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function SortableFieldBlock({
  field,
  isDragging: _isDragging,
  onToggle: _onToggle,
  onDelete: _onDelete,
  showDelete: _showDelete,
}: SortableFieldBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: field.id,
    data: field,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Return a div that will be enhanced by the parent component
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-dragging={isSortableDragging ? 'true' : 'false'}
    >
      {/* Actual FieldBlock will be rendered by parent */}
      <div {...listeners} />
    </div>
  );
}
