/**
 * FieldEditor Component
 *
 * A visual drag-and-drop editor for configuring account field types.
 * Allows reordering columns, toggling visibility, and managing field configuration.
 *
 * @example
 * ```tsx
 * import { FieldEditor } from '@gmanager/ui';
 *
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

// Main component
export {
  FieldEditor,
  useFieldEditorState,
  type FieldEditorProps,
} from "./FieldEditor";

// Individual draggable block component
export {
  FieldBlock,
  FIELD_TYPE_META,
  getAllFieldTypes,
  type FieldBlockProps,
  type FieldType,
  type FieldTypeMeta,
} from "./FieldBlock";

// Drag-and-drop hook
export {
  useFieldDragDrop,
  type FieldConfig,
  type UseFieldDragDropProps,
  type UseFieldDragDropState,
} from "./useFieldDragDrop";
