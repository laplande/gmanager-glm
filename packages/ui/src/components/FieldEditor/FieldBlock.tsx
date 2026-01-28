import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Props for the FieldBlock component
 */
export interface FieldBlockProps {
  /** The field type identifier */
  type: FieldType;
  /** Whether the field is currently enabled/visible */
  enabled: boolean;
  /** Whether the block is currently being dragged */
  isDragging: boolean;
  /** Unique identifier for the field */
  id: string;
  /** Callback to toggle the field enabled state */
  onToggle?: (id: string) => void;
  /** Callback when the field is deleted/removed */
  onDelete?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Drag handle element provided by dnd-kit */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Set ref for drag handle */
  setNodeRef?: (element: HTMLElement | null) => void;
  /** Whether to show delete button */
  showDelete?: boolean;
}

/**
 * Field type enumeration with associated metadata
 */
export type FieldType =
  | "email"
  | "password"
  | "recovery_email"
  | "totp_secret"
  | "year"
  | "notes";

/**
 * Field type metadata for display
 */
export interface FieldTypeMeta {
  id: FieldType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

/**
 * Icons for each field type using SVG
 */
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="4" />
    <path d="m21 21-9.85-9.85" />
    <path d="m15 11 4 4" />
    <path d="m11 15 4 4" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const GripIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

/**
 * Field type metadata mapping
 */
export const FIELD_TYPE_META: Record<FieldType, FieldTypeMeta> = {
  email: {
    id: "email",
    label: "Email",
    icon: <MailIcon />,
    color: "text-blue-500",
    bgGradient: "from-blue-500/10 to-blue-600/5",
  },
  password: {
    id: "password",
    label: "Password",
    icon: <LockIcon />,
    color: "text-amber-500",
    bgGradient: "from-amber-500/10 to-amber-600/5",
  },
  recovery_email: {
    id: "recovery_email",
    label: "Recovery Email",
    icon: <ShieldIcon />,
    color: "text-emerald-500",
    bgGradient: "from-emerald-500/10 to-emerald-600/5",
  },
  totp_secret: {
    id: "totp_secret",
    label: "2FA Secret",
    icon: <KeyIcon />,
    color: "text-purple-500",
    bgGradient: "from-purple-500/10 to-purple-600/5",
  },
  year: {
    id: "year",
    label: "Year",
    icon: <CalendarIcon />,
    color: "text-cyan-500",
    bgGradient: "from-cyan-500/10 to-cyan-600/5",
  },
  notes: {
    id: "notes",
    label: "Notes",
    icon: <FileTextIcon />,
    color: "text-slate-500",
    bgGradient: "from-slate-500/10 to-slate-600/5",
  },
};

/**
 * Get all available field types
 */
export const getAllFieldTypes = (): FieldType[] => {
  return Object.keys(FIELD_TYPE_META) as FieldType[];
};

/**
 * FieldBlock Component
 *
 * A draggable block representing a single field type with:
 * - Icon and label
 * - Color coding by field type
 * - Drag handle for reordering
 * - Toggle to enable/disable
 * - Delete button (optional)
 *
 * @example
 * ```tsx
 * <FieldBlock
 *   type="email"
 *   enabled={true}
 *   isDragging={false}
 *   id="email-1"
 *   onToggle={(id) => console.log('Toggle', id)}
 *   setNodeRef={setNodeRef}
 *   dragHandleProps={attributes}
 * />
 * ```
 */
export const FieldBlock = React.forwardRef<HTMLDivElement, FieldBlockProps>(
  (
    {
      type,
      enabled,
      isDragging,
      id,
      onToggle,
      onDelete,
      className,
      dragHandleProps,
      setNodeRef,
      showDelete = false,
    },
    _ref
  ) => {
    const meta = FIELD_TYPE_META[type];

    return (
      <div
        ref={setNodeRef}
        className={cn(
          // Base styles
          "group relative flex items-center gap-3 px-4 py-3 rounded-lg",
          "bg-gradient-to-r border transition-all duration-200",
          // Disabled state
          !enabled && "opacity-50 grayscale",
          // Hover and focus states
          "hover:shadow-md hover:border-primary/50",
          // Focus ring for keyboard navigation
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          // Dragging state
          isDragging && "opacity-50 scale-95 shadow-lg rotate-1",
          // Field-specific gradient
          meta.bgGradient,
          "border-border/50",
          className
        )}
        style={{ cursor: "grab" }}
      >
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className={cn(
            "flex-shrink-0 p-1 rounded text-muted-foreground",
            "hover:bg-muted-foreground/10 transition-colors",
            "cursor-grab active:cursor-grabbing"
          )}
          aria-label="Drag to reorder"
        >
          <GripIcon />
        </div>

        {/* Field Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-md bg-background/50",
            meta.color
          )}
          aria-hidden="true"
        >
          {meta.icon}
        </div>

        {/* Field Label */}
        <span className="flex-1 font-medium text-sm">{meta.label}</span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Enabled/Disabled Toggle */}
          <button
            type="button"
            onClick={() => onToggle?.(id)}
            className={cn(
              "flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              enabled ? "bg-primary" : "bg-muted"
            )}
            role="switch"
            aria-checked={enabled}
            aria-label={`Toggle ${meta.label} field`}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>

          {/* Delete Button */}
          {showDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(id)}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-md text-muted-foreground",
                "hover:text-destructive hover:bg-destructive/10",
                "opacity-0 group-hover:opacity-100 transition-all",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              aria-label={`Remove ${meta.label} field`}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    );
  }
);

FieldBlock.displayName = "FieldBlock";
