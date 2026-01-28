import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Props for the TOTPDisplay component
 */
export interface TOTPDisplayProps {
  /** The TOTP secret to generate codes from */
  secret: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Custom algorithm (defaults to SHA1) */
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  /** Custom digit count (defaults to 6) */
  digits?: number;
  /** Custom period in seconds (defaults to 30) */
  period?: number;
  /** Callback when code is clicked */
  onCodeClick?: (code: string) => void;
}

/**
 * TOTP code display with countdown timer.
 *
 * Generates and displays time-based one-time passwords with a visual
 * countdown showing when the code will expire.
 *
 * @example
 * ```tsx
 * <TOTPDisplay secret="JBSWY3DPEHPK3PXP" />
 * ```
 */
export const TOTPDisplay = React.forwardRef<HTMLDivElement, TOTPDisplayProps>(
  (
    {
      secret,
      className,
      algorithm = "SHA1",
      digits = 6,
      period = 30,
      onCodeClick,
    },
    ref
  ) => {
    const [code, setCode] = React.useState<string>("");
    const [remainingSeconds, setRemainingSeconds] = React.useState(period);
    const [copied, setCopied] = React.useState(false);

    // Generate TOTP code using Web Crypto API
    const generateTOTP = React.useCallback(async () => {
      try {
        const time = Math.floor(Date.now() / 1000 / period);
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new DataView(timeBuffer);
        timeView.setUint32(4, time, false); // Big-endian

        // Decode base32 secret
        const key = base32Decode(secret);

        // Import key for HMAC
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          key.buffer as ArrayBuffer,
          { name: "HMAC", hash: algorithm },
          false,
          ["sign"]
        );

        // Generate HMAC
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
        const hmac = new Uint8Array(signature);

        // Dynamic truncation
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff);

        const otp = binary % Math.pow(10, digits);
        return otp.toString().padStart(digits, "0");
      } catch {
        return "------";
      }
    }, [secret, algorithm, digits, period]);

    // Calculate remaining time in current period
    const calculateRemaining = React.useCallback(() => {
      return period - (Math.floor(Date.now() / 1000) % period);
    }, [period]);

    // Update code and timer
    React.useEffect(() => {
      const update = async () => {
        const newCode = await generateTOTP();
        setCode(newCode);
        setRemainingSeconds(calculateRemaining());
      };

      update();

      // Update every second for countdown
      const interval = setInterval(() => {
        const remaining = calculateRemaining();
        setRemainingSeconds(remaining);

        // Generate new code when period resets
        if (remaining === period) {
          generateTOTP().then(setCode);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [generateTOTP, calculateRemaining, period]);

    const handleClick = () => {
      if (code && code !== "------") {
        onCodeClick?.(code);
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    };

    // Calculate progress percentage (inverse for countdown effect)
    const progressPercent = (remainingSeconds / period) * 100;

    // Color based on remaining time
    const getTimeColor = () => {
      if (remainingSeconds > 20) return "text-green-500 dark:text-green-400";
      if (remainingSeconds > 10) return "text-yellow-500 dark:text-yellow-400";
      return "text-red-500 dark:text-red-400";
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer select-none group",
          "rounded px-2 py-1 -mx-2 -my-1",
          "hover:bg-accent/50 transition-colors",
          copied && "text-green-500 dark:text-green-400",
          className
        )}
        onClick={handleClick}
        title={copied ? "Code copied!" : "Click to copy code"}
      >
        {/* TOTP Code */}
        <span
          className={cn(
            "font-mono text-lg font-semibold tracking-wider tabular-nums",
            getTimeColor()
          )}
        >
          {code.match(/.{1,3}/g)?.join(" ") || code}
        </span>

        {/* Countdown Ring */}
        <div className="relative w-5 h-5 flex-shrink-0">
          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
            {/* Background circle */}
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/20"
            />
            {/* Progress circle */}
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progressPercent * 0.5} 50.2`}
              className={cn("transition-all duration-300", getTimeColor())}
            />
          </svg>
          {/* Seconds indicator */}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums",
              getTimeColor()
            )}
          >
            {remainingSeconds}
          </span>
        </div>

        {/* Copy icon */}
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

TOTPDisplay.displayName = "TOTPDisplay";

/**
 * Base32 decode utility
 */
function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = input.toUpperCase().replace(/[^A-Z2-7]/g, "");

  const bits = cleanInput
    .split("")
    .map((char) => {
      const index = alphabet.indexOf(char);
      if (index === -1) throw new Error("Invalid base32 character");
      return index.toString(2).padStart(5, "0");
    })
    .join("");

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }

  return bytes;
}
