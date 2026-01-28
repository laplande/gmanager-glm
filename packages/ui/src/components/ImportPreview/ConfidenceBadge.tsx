import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Confidence level for visual indicator
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Props for the ConfidenceBadge component
 */
export interface ConfidenceBadgeProps {
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Optional custom className */
  className?: string;
  /** Display mode - default shows icon + text, compact shows icon only */
  mode?: "default" | "compact";
}

/**
 * Determines the confidence level from a numeric score
 */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

/**
 * Gets the display label for a confidence level
 */
function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

/**
 * Gets the styling classes for a confidence level
 */
function getConfidenceClasses(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  }
}

/**
 * Gets the icon for a confidence level
 */
function getConfidenceIcon(level: ConfidenceLevel): React.ReactNode {
  switch (level) {
    case "high":
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "medium":
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-8a1 1 0 11-2 0 1 1 0 012 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "low":
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

/**
 * ConfidenceBadge component - Visual confidence indicator
 *
 * Displays a color-coded badge based on confidence score:
 * - Green (high): confidence >= 0.7
 * - Yellow (medium): 0.4 <= confidence < 0.7
 * - Red (low): confidence < 0.4
 *
 * @example
 * ```tsx
 * <ConfidenceBadge confidence={0.85} />
 * <ConfidenceBadge confidence={0.5} mode="compact" />
 * ```
 */
const ConfidenceBadge = React.forwardRef<HTMLSpanElement, ConfidenceBadgeProps>(
  ({ confidence, className, mode = "default" }, ref) => {
    const level = getConfidenceLevel(confidence);
    const label = getConfidenceLabel(level);
    const icon = getConfidenceIcon(level);

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
          getConfidenceClasses(level),
          className
        )}
        title={`Confidence: ${Math.round(confidence * 100)}%`}
        aria-label={`Confidence: ${label} (${Math.round(confidence * 100)}%)`}
      >
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        {mode === "default" && <span>{label}</span>}
      </span>
    );
  }
);

ConfidenceBadge.displayName = "ConfidenceBadge";

export { ConfidenceBadge };
