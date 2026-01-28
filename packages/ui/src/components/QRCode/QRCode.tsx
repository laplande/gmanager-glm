import * as React from "react"
import { Download, Copy, Check } from "lucide-react"
import { cn } from "../../lib/utils"
import { useQRCode, type QRCodeOptions } from "./useQRCode"

/**
 * Props for the QRCode component
 */
export interface QRCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** User email address for TOTP */
  email: string
  /** TOTP secret key */
  secret: string
  /** Service issuer (default: "Google") */
  issuer?: string
  /** QR code size in pixels (default: 256) */
  size?: number
  /** Error correction level (default: "M") */
  level?: "L" | "M" | "Q" | "H"
  /** Foreground color (default: "#000000") */
  fgColor?: string
  /** Background color (default: "#FFFFFF") */
  bgColor?: string
  /** Show action buttons (default: true) */
  showActions?: boolean
  /** Custom download filename */
  downloadFilename?: string
  /** Custom class name for the QR container */
  qrClassName?: string
}

/**
 * QRCode component for displaying TOTP QR codes.
 *
 * Generates a QR code from a TOTP secret that can be scanned by
 * authenticator apps (Google Authenticator, Authy, etc.).
 *
 * @example
 * ```tsx
 * <QRCode
 *   email="user@example.com"
 *   secret="JBSWY3DPEHPK3PXP"
 *   issuer="Google"
 *   size={256}
 * />
 * ```
 */
export const QRCode = React.forwardRef<HTMLDivElement, QRCodeProps>(
  (
    {
      email,
      secret,
      issuer = "Google",
      size = 256,
      level = "M",
      fgColor = "#000000",
      bgColor = "#FFFFFF",
      showActions = true,
      downloadFilename = "qrcode.png",
      qrClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false)
    const [copiedTimeout, setCopiedTimeout] = React.useState<ReturnType<typeof setTimeout> | null>(null)

    // Use the QR code hook
    const {
      QRSVG,
      QRCanvas,
      uri,
      error,
      downloadAsPNG,
      copyURIToClipboard,
      canCopyToClipboard,
    } = useQRCode(email, secret, { size, level, fgColor, bgColor }, issuer)

    // Handle copy to clipboard with feedback
    const handleCopy = async () => {
      try {
        await copyURIToClipboard()
        setCopied(true)

        // Clear existing timeout
        if (copiedTimeout) {
          clearTimeout(copiedTimeout)
        }

        // Reset copied state after 2 seconds
        const timeout = setTimeout(() => setCopied(false), 2000)
        setCopiedTimeout(timeout)
      } catch (err) {
        console.error("Failed to copy URI:", err)
      }
    }

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (copiedTimeout) {
          clearTimeout(copiedTimeout)
        }
      }
    }, [copiedTimeout])

    // Display error state
    if (error) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive",
            className
          )}
          {...props}
        >
          <p className="text-sm font-medium">
            Failed to generate QR code: {error.message}
          </p>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("flex flex-col items-center gap-4", className)} {...props}>
        {/* QR Code Display */}
        <div
          className={cn(
            "flex items-center justify-center rounded-lg border bg-white p-4 shadow-sm",
            qrClassName
          )}
          style={{ backgroundColor: bgColor }}
        >
          {/* Visible SVG QR code */}
          <QRSVG
            value={uri}
            size={size}
            level={level}
            fgColor={fgColor}
            bgColor={bgColor}
            includeMargin
          />

          {/* Hidden Canvas for download functionality */}
          <div className="sr-only">
            <QRCanvas
              value={uri}
              size={size}
              level={level}
              fgColor={fgColor}
              bgColor={bgColor}
              includeMargin
            />
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Download PNG Button */}
            <button
              type="button"
              onClick={() => downloadAsPNG(downloadFilename)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              )}
              aria-label="Download QR code as PNG image"
            >
              <Download className="h-4 w-4" />
              <span>Download PNG</span>
            </button>

            {/* Copy URI Button */}
            {canCopyToClipboard && (
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                )}
                aria-label={copied ? "URI copied to clipboard" : "Copy URI to clipboard"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy URI</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Hidden QR Code URI for accessibility */}
        <div className="sr-only">
          <p>
            TOTP URI: {uri}
          </p>
        </div>
      </div>
    )
  }
)

QRCode.displayName = "QRCode"

export { useQRCode, type QRCodeOptions }
