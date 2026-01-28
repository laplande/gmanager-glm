import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Props for the PasswordReveal component
 */
export interface PasswordRevealProps {
  /** The password to display (masked by default) */
  password: string;
  /** Maximum length to display before truncating */
  maxLength?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether the password should be revealed */
  revealed?: boolean;
  /** Callback when user requests reveal (e.g., on hover) */
  onRevealChange?: (revealed: boolean) => void;
  /** Character to use for masking */
  maskChar?: string;
}

/**
 * Password field with hover-to-reveal functionality.
 *
 * Displays a masked password that reveals the actual value on hover.
 * Clicking copies the password to clipboard.
 *
 * @example
 * ```tsx
 * <PasswordReveal password="secret123" />
 * <PasswordReveal password="secret123" maskChar="*" />
 * ```
 */
export const PasswordReveal = React.forwardRef<HTMLDivElement, PasswordRevealProps>(
  (
    {
      password,
      maxLength = 30,
      className,
      revealed: controlledRevealed,
      onRevealChange,
      maskChar = "•",
    },
    ref
  ) => {
    const [internalRevealed, setInternalRevealed] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const revealed = controlledRevealed ?? internalRevealed;
    const setRevealed = onRevealChange ?? setInternalRevealed;

    // Create masked password
    const maskedPassword = React.useMemo(() => {
      const displayLength = Math.min(password.length, maxLength);
      return maskChar.repeat(displayLength) + (password.length > maxLength ? "..." : "");
    }, [password, maxLength, maskChar]);

    // Truncate actual password for display
    const truncatedPassword = React.useMemo(() => {
      if (password.length <= maxLength) return password;
      return password.slice(0, maxLength - 3) + "...";
    }, [password, maxLength]);

    const handleMouseEnter = () => setRevealed(true);
    const handleMouseLeave = () => setRevealed(false);

    const handleClick = async () => {
      try {
        await navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Silently fail if clipboard access is denied
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 cursor-pointer select-none group transition-colors",
          "rounded px-2 py-1 -mx-2 -my-1",
          "hover:bg-accent/50",
          copied && "text-green-500 dark:text-green-400",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title={copied ? "Copied!" : "Click to copy • Hover to reveal"}
      >
        <span className="font-mono text-sm tabular-nums">
          {revealed ? truncatedPassword : maskedPassword}
        </span>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-70 transition-opacity">
          {copied ? (
            <svg
              className="w-3.5 h-3.5 text-green-500 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </span>
      </div>
    );
  }
);

PasswordReveal.displayName = "PasswordReveal";
