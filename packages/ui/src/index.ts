/**
 * @gmanager/ui - Shared React Component Library
 *
 * A collection of reusable, accessible UI components built with:
 * - React 19
 * - TailwindCSS
 * - Radix UI primitives
 * - class-variance-authority for variant management
 */

// Components
export { Button, buttonVariants, type ButtonProps } from "./components/Button"
export { Input, type InputProps } from "./components/Input"

// Form Components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/Dialog"
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./components/Select"
export { Checkbox } from "./components/Checkbox"
export { Textarea, type TextareaProps } from "./components/Textarea"
export { Label } from "./components/Label"

// QR Code Components
export {
  QRCode,
  useQRCode,
  generateTOTPUri,
  type QRCodeProps,
  type QRCodeOptions,
  type UseQRCodeResult,
} from "./components/QRCode"

// Account Components
export {
  AccountList,
  AccountRow,
  PasswordReveal,
  TOTPDisplay,
  type AccountListProps,
  type AccountRowProps,
  type PasswordRevealProps,
  type TOTPDisplayProps,
  type ColumnDef,
  type ContextMenuItem,
} from "./components/AccountList"

// Import Preview Components
export {
  ImportPreview,
  ConfidenceBadge,
  FieldSelector,
  FIELD_LABELS,
  type ImportPreviewProps,
  type ImportStats,
  type FieldMapping,
  type ConfidenceBadgeProps,
  type ConfidenceLevel,
  type FieldSelectorProps,
  type FieldType,
} from "./components/ImportPreview"

// Field Editor Components
export {
  FieldEditor,
  FieldBlock,
  FIELD_TYPE_META,
  getAllFieldTypes,
  useFieldDragDrop,
  useFieldEditorState,
  type FieldEditorProps,
  type FieldBlockProps,
  type FieldConfig,
  type FieldType as FieldEditorFieldType,
  type FieldTypeMeta,
  type UseFieldDragDropProps,
  type UseFieldDragDropState,
} from "./components/FieldEditor"

// Language Switcher
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
} from "./components/LanguageSwitcher"

// i18n
export {
  default as i18n,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  changeLanguage,
  getStoredLanguage,
  storeLanguage,
  type SupportedLanguage,
} from "./i18n/config"

// Utilities
export { cn } from "./lib/utils"

// Styles
import "./styles/globals.css"
