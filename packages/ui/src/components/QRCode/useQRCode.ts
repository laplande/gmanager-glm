import { useMemo, useRef, useState } from "react"
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react"

/**
 * Options for QR code generation
 */
export interface QRCodeOptions {
  /** Size of the QR code in pixels */
  size?: number
  /** Error correction level (L, M, Q, H) */
  level?: "L" | "M" | "Q" | "H"
  /** Foreground color (hex or CSS color) */
  fgColor?: string
  /** Background color (hex or CSS color) */
  bgColor?: string
  /** Margin around QR code */
  margin?: number
}

/**
 * Result from useQRCode hook
 */
export interface UseQRCodeResult {
  /** QR code as SVG component */
  QRSVG: typeof QRCodeSVG
  /** QR code as Canvas component (for download) */
  QRCanvas: typeof QRCodeCanvas
  /** Generated otpauth URI */
  uri: string
  /** Error state */
  error: Error | null
  /** Function to download QR code as PNG */
  downloadAsPNG: (filename?: string) => void
  /** Function to copy URI to clipboard */
  copyURIToClipboard: () => Promise<void>
  /** Whether clipboard copy is supported */
  canCopyToClipboard: boolean
}

/**
 * Generate otpauth:// URI for TOTP
 *
 * @param email - User email address
 * @param secret - TOTP secret key
 * @param issuer - Service issuer (default: "Google")
 * @returns otpauth:// URI string
 */
export function generateTOTPUri(
  email: string,
  secret: string,
  issuer: string = "Google"
): string {
  // Validate required parameters
  if (!email || !secret) {
    throw new Error("Email and secret are required to generate TOTP URI")
  }

  // Clean and validate inputs
  const cleanEmail = email.trim()
  const cleanSecret = secret.replace(/\s/g, "")

  if (!cleanSecret) {
    throw new Error("Secret cannot be empty")
  }

  // Build otpauth URI
  // Format: otpauth://totp/ISSUER:EMAIL?secret=SECRET&issuer=ISSUER
  const params = new URLSearchParams({
    secret: cleanSecret,
    issuer,
  })

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?${params.toString()}`
}

/**
 * Hook for generating and managing QR codes for TOTP secrets.
 *
 * @param email - User email address
 * @param secret - TOTP secret key
 * @param options - QR code generation options
 * @param issuer - Service issuer (default: "Google")
 *
 * @example
 * ```tsx
 * const { QRSVG, uri, downloadAsPNG, copyURIToClipboard, error } = useQRCode({
 *   email: "user@example.com",
 *   secret: "JBSWY3DPEHPK3PXP",
 *   size: 256,
 * })
 *
 * if (error) return <div>Error generating QR code</div>
 *
 * return (
 *   <div>
 *     <QRSVG value={uri} size={256} />
 *     <button onClick={() => downloadAsPNG()}>Download PNG</button>
 *     <button onClick={() => copyURIToClipboard()}>Copy URI</button>
 *   </div>
 * )
 * ```
 */
export function useQRCode(
  email: string,
  secret: string,
  _options: QRCodeOptions = {},
  issuer: string = "Google"
): UseQRCodeResult {
  const [error, setError] = useState<Error | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate URI memoized
  const uri = useMemo(() => {
    try {
      setError(null)
      return generateTOTPUri(email, secret, issuer)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to generate URI"))
      return ""
    }
  }, [email, secret, issuer])

  // Check if clipboard API is available
  const canCopyToClipboard = useMemo(
    () => typeof navigator !== "undefined" && "clipboard" in navigator,
    []
  )

  // Download QR code as PNG
  const downloadAsPNG = (filename: string = "qrcode.png") => {
    try {
      const canvas = canvasRef.current
      if (!canvas) {
        throw new Error("QR code canvas not available")
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png")

      // Create download link and trigger download
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download QR code"))
    }
  }

  // Copy URI to clipboard
  const copyURIToClipboard = async () => {
    if (!canCopyToClipboard) {
      setError(new Error("Clipboard API not supported"))
      return
    }

    try {
      await navigator.clipboard.writeText(uri)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to copy to clipboard"))
      throw err
    }
  }

  return {
    QRSVG: QRCodeSVG,
    QRCanvas: QRCodeCanvas,
    uri,
    error,
    downloadAsPNG,
    copyURIToClipboard,
    canCopyToClipboard,
  }
}
