/**
 * TOTP (Time-based One-Time Password) implementation for Web
 *
 * This module provides TOTP generation and validation according to RFC 6238
 * and RFC 4226 (HOTP). It uses the Web Crypto API for HMAC-SHA1 operations
 * and is compatible with Google Authenticator and other authenticator apps.
 *
 * References:
 * - RFC 6238: TOTP: Time-Based One-Time Password Algorithm
 * - RFC 4226: HOTP: An HMAC-Based One-Time Password Algorithm
 * - Google Authenticator spec
 */

/**
 * Standard time step for TOTP in seconds (RFC 6238 recommends 30 seconds)
 */
const TIME_STEP = 30;

/**
 * Number of digits in TOTP code (6 is standard for Google Authenticator)
 */
const DIGITS = 6;

/**
 * Base32 alphabet (RFC 4648)
 * Used for decoding TOTP secrets
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Clock skew tolerance window
 * Allows for verification of previous and next time step
 * to accommodate clock drift between client and server
 */
const CLOCK_SKEW_WINDOW = 1;

/**
 * Decodes a Base32-encoded string to bytes
 *
 * Base32 is used by most authenticator apps for encoding TOTP secrets
 * because it's case-insensitive and avoids ambiguous characters.
 *
 * @param base32 - Base32-encoded secret string (uppercase, padding optional)
 * @returns Uint8Array - Decoded secret bytes
 * @throws Error if input contains invalid Base32 characters
 *
 * @example
 * ```ts
 * const secret = "JBSWY3DPEHPK3PXP"; // "Hello World" in Base32
 * const bytes = base32Decode(secret);
 * ```
 */
function base32Decode(base32: string): Uint8Array {
  // Normalize: uppercase and remove whitespace/hyphens
  const normalized = base32.toUpperCase().replace(/[\s-]/g, "");

  // Validate input contains only Base32 characters
  for (const char of normalized) {
    if (!BASE32_ALPHABET.includes(char)) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
  }

  // Calculate output length (5 bits per character -> 8 bits per byte)
  const bits = normalized.length * 5;
  const bytes = Math.floor(bits / 8);
  const result = new Uint8Array(bytes);

  // Process input in 8-character blocks (40 bits = 5 bytes)
  let buffer = 0;
  let bitsLeft = 0;
  let index = 0;

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    buffer = (buffer << 5) | value;
    bitsLeft += 5;

    // When we have at least 8 bits, extract a byte
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result[index++] = (buffer >> bitsLeft) & 0xff;
    }
  }

  return result;
}

/**
 * Calculates the time counter for TOTP generation
 *
 * Time is divided into discrete steps, each producing a unique TOTP code.
 * The counter is simply the Unix timestamp divided by the time step.
 *
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 * @returns number - Time counter value
 *
 * @example
 * ```ts
 * const counter = getTimeCounter(Date.now() / 1000);
 * ```
 */
function getTimeCounter(timestamp?: number): number {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  return Math.floor(time / TIME_STEP);
}

/**
 * Generates HMAC-SHA1 of the time counter using the secret
 *
 * This is the core cryptographic operation for TOTP.
 * Uses the Web Crypto SubtleCrypto API for HMAC computation.
 *
 * @param secret - TOTP secret as bytes
 * @param counter - Time counter value
 * @returns Promise<Uint8Array> - HMAC-SHA1 result (20 bytes)
 * @throws Error if Web Crypto API is not available
 */
async function hmacSha1(
  secret: Uint8Array,
  counter: number
): Promise<Uint8Array> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure cryptographic operations."
    );
  }

  // Import the secret as a CryptoKey for HMAC
  const key = await crypto.subtle.importKey(
    "raw", // key format
    secret, // key data
    { name: "HMAC", hash: "SHA-1" }, // algorithm
    false, // extractable (false for security)
    ["sign"] // key usages
  );

  // Convert counter to 8-byte big-endian array
  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false); // high 32 bits
  view.setUint32(4, counter >>> 0, false); // low 32 bits

  // Sign the counter with HMAC-SHA1
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    counterBytes
  );

  return new Uint8Array(signature);
}

/**
 * Extracts a TOTP code from HMAC result using dynamic truncation
 *
 * Dynamic truncation (RFC 4226):
 * 1. Take low 4 bits of HMAC result as offset
 * 2. Extract 4 bytes starting at offset
 * 3. Mask MSB to avoid signed/unsigned issues
 * 4. Modulo by 10^digits to get final code
 *
 * @param hmac - HMAC-SHA1 result (20 bytes)
 * @returns number - TOTP code
 */
function truncate(hmac: Uint8Array): number {
  // Low 4 bits of last byte determines offset (0-15)
  // Ensures we can extract 4 bytes without going out of bounds
  const offset = hmac[hmac.length - 1] & 0x0f;

  // Extract 4 bytes starting at offset
  const binary =
    ((hmac[offset] & 0x7f) << 24) | // Mask MSB to keep value positive
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  // Modulo to get the desired number of digits
  return binary % Math.pow(10, DIGITS);
}

/**
 * Formats a TOTP code as a zero-padded string
 *
 * @param code - Numeric TOTP code
 * @returns string - Zero-padded code (e.g., "012345")
 */
function formatCode(code: number): string {
  return String(code).padStart(DIGITS, "0");
}

/**
 * Generates a TOTP code for the current time
 *
 * This function implements the complete TOTP algorithm:
 * 1. Decode the Base32 secret to bytes
 * 2. Calculate the current time counter
 * 3. Compute HMAC-SHA1 of counter with secret
 * 4. Dynamically truncate to extract digits
 *
 * @param secret - Base32-encoded TOTP secret
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 * @returns Promise<string> - 6-digit TOTP code
 *
 * @example
 * ```ts
 * const secret = "JBSWY3DPEHPK3PXP";
 * const code = await generateTOTP(secret);
 * console.log(code); // e.g., "123456"
 * ```
 */
export async function generateTOTP(
  secret: string,
  timestamp?: number
): Promise<string> {
  // Decode Base32 secret
  const secretBytes = base32Decode(secret);

  // Get time counter
  const counter = getTimeCounter(timestamp);

  // Compute HMAC-SHA1
  const hmac = await hmacSha1(secretBytes, counter);

  // Extract and format code
  const code = truncate(hmac);
  return formatCode(code);
}

/**
 * Gets the number of seconds until the next TOTP refresh
 *
 * TOTP codes change every TIME_STEP seconds. This function returns
 * the remaining time before the current code expires.
 *
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 * @returns number - Seconds until next code (0 to TIME_STEP)
 *
 * @example
 * ```ts
 * const remaining = getRemainingSeconds();
 * console.log(`Code expires in ${remaining} seconds`);
 * ```
 */
export function getRemainingSeconds(timestamp?: number): number {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const step = time % TIME_STEP;
  return step === 0 ? TIME_STEP : TIME_STEP - step;
}

/**
 * Validates a TOTP code against a secret
 *
 * This function checks the provided code against current, previous, and next
 * time steps to accommodate clock skew between devices. The window of
 * acceptable time steps is defined by CLOCK_SKEW_WINDOW.
 *
 * Validation is successful if the code matches ANY of the checked time steps.
 *
 * @param secret - Base32-encoded TOTP secret
 * @param code - TOTP code to validate (6-digit string)
 * @param timestamp - Unix timestamp in seconds (defaults to current time)
 * @returns Promise<boolean> - True if code is valid (current or adjacent window)
 *
 * @example
 * ```ts
 * const secret = "JBSWY3DPEHPK3PXP";
 * const valid = await isValidTOTP(secret, "123456");
 * if (valid) {
 *   console.log("Code is valid");
 * }
 * ```
 */
export async function isValidTOTP(
  secret: string,
  code: string,
  timestamp?: number
): Promise<boolean> {
  // Validate code format
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  // Decode Base32 secret
  const secretBytes = base32Decode(secret);

  // Get current time counter
  const counter = getTimeCounter(timestamp);

  // Check code in multiple time steps (current, previous, next)
  // This handles clock drift and network latency
  const windowSize = CLOCK_SKEW_WINDOW;
  for (let i = -windowSize; i <= windowSize; i++) {
    const testCounter = counter + i;
    const hmac = await hmacSha1(secretBytes, testCounter);
    const testCode = formatCode(truncate(hmac));

    if (testCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an otpauth:// URI for QR code generation
 *
 * The otpauth:// URI format is used by authenticator apps to configure
 * TOTP secrets via QR code scanning. This function generates a URI
 * formatted for Google Authenticator (and compatible apps).
 *
 * URI format: otpauth://totp/Google:{email}?secret={secret}&issuer=Google
 *
 * @param email - User's email address (used as account label)
 * @param secret - Base32-encoded TOTP secret
 * @returns string - otpauth:// URI suitable for QR code generation
 *
 * @example
 * ```ts
 * const email = "user@example.com";
 * const secret = "JBSWY3DPEHPK3PXP";
 * const uri = generateTOTPUri(email, secret);
 * console.log(uri);
 * // "otpauth://totp/Google:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Google"
 *
 * // Use with a QR code library:
 * // const qrCode = generateQRCode(uri);
 * ```
 */
export function generateTOTPUri(email: string, secret: string): string {
  const params = new URLSearchParams({
    secret: secret,
    issuer: "Google",
  });

  // Format: otpauth://totp/Issuer:account?secret=xxx&issuer=xxx
  // Note: The label includes the issuer for better display in apps
  const label = `Google:${email}`;

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

/**
 * Generates a random Base32-encoded TOTP secret
 *
 * TOTP secrets should be randomly generated and cryptographically secure.
 * A 20-byte secret (160 bits) provides 128 bits of entropy after Base32
 * encoding, which is sufficient for TOTP security.
 *
 * @param bytes - Number of random bytes to generate (default: 20)
 * @returns string - Base32-encoded secret
 * @throws Error if Web Crypto API is not available
 *
 * @example
 * ```ts
 * const secret = generateSecret();
 * console.log(secret); // e.g., "JBSWY3DPEHPK3PXPKJA4BSF6KOA====="
 * ```
 */
export function generateSecret(bytes: number = 20): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure random number generation."
    );
  }

  // Generate random bytes
  const randomBytes = new Uint8Array(bytes);
  crypto.getRandomValues(randomBytes);

  // Convert to Base32
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of randomBytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const index = (buffer >> bitsLeft) & 0x1f;
      result += BASE32_ALPHABET[index];
    }
  }

  // Add padding if needed
  while (bitsLeft > 0) {
    const index = ((buffer << (5 - bitsLeft)) & 0x1f) >>> 0;
    result += BASE32_ALPHABET[index];
    bitsLeft = 0;
  }

  // Add standard Base32 padding
  while (result.length % 8 !== 0) {
    result += "=";
  }

  return result;
}
