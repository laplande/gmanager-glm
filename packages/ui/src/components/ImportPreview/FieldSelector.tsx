import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Available field types for account data
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
 * Display label for each field type
 */
const FIELD_LABELS: Record<FieldType, string> = {
  email: "Email",
  password: "Password",
  recoveryEmail: "Recovery Email",
  totpSecret: "TOTP Secret",
  year: "Year",
  country: "Country",
  unknown: "Unknown",
};

/**
 * Props for the FieldSelector component
 */
export interface FieldSelectorProps {
  /** Currently selected field type */
  value: FieldType;
  /** Callback when field type changes */
  onChange: (value: FieldType) => void;
  /** Optional custom className */
  className?: string;
  /** Optional unique identifier for accessibility */
  id?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional custom field type options */
  options?: FieldType[];
}

/**
 * FieldSelector component - Dropdown to change field type
 *
 * A native select dropdown for choosing the type of a parsed field.
 * Used in the ImportPreview table to reclassify detected fields.
 *
 * @example
 * ```tsx
 * <FieldSelector
 *   value="email"
 *   onChange={(type) => setFieldType(type)}
 * />
 * ```
 */
const FieldSelector = React.forwardRef<HTMLSelectElement, FieldSelectorProps>(
  ({ value, onChange, className, id, disabled, options }, ref) => {
    const fieldOptions = options || (Object.keys(FIELD_LABELS) as FieldType[]);

    const selectId = id || `field-selector-${React.useId()}`;

    return (
      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as FieldType)}
        disabled={disabled}
        className={cn(
          "h-8 px-2 py-1 text-sm rounded border border-input bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:bg-accent/50 transition-colors",
          className
        )}
        aria-label="Select field type"
      >
        {fieldOptions.map((fieldType) => (
          <option key={fieldType} value={fieldType}>
            {FIELD_LABELS[fieldType]}
          </option>
        ))}
      </select>
    );
  }
);

FieldSelector.displayName = "FieldSelector";

export { FieldSelector, FIELD_LABELS };
