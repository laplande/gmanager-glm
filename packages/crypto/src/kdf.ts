/**
 * Key Derivation Functions for Web (using Web Crypto API)
 *
 * This module provides PBKDF2-based key derivation compatible with the Rust backend.
 * Uses the Web Crypto SubtleCrypto API for cryptographic operations.
 */

// Web Crypto API requires secure context (HTTPS or localhost)
// The SubtleCrypto interface is available via window.crypto.subtle in browsers

/**
 * Derives a cryptographic key from a password using PBKDF2-HMAC-SHA256
 *
 * This implementation is compatible with the Rust backend's PBKDF2 configuration:
 * - Algorithm: PBKDF2-HMAC-SHA256
 * - Iterations: 100,000
 * - Key length: 256 bits (32 bytes)
 *
 * @param password - The password string to derive from
 * @param salt - The salt bytes (must be 16 bytes for compatibility)
 * @returns Promise<CryptoKey> - The derived AES-GCM key
 *
 * @example
 * ```ts
 * const password = "my-secure-password";
 * const salt = generateSalt();
 * const key = await deriveKey(password, salt);
 * ```
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (salt.length !== 16) {
    throw new Error("Salt must be exactly 16 bytes");
  }

  // Ensure we have access to Web Crypto API
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure cryptographic operations."
    );
  }

  // Import the password as a key for PBKDF2
  const passwordKey = await window.crypto.subtle.importKey(
    "raw", // key format
    new TextEncoder().encode(password), // key data
    { name: "PBKDF2" }, // algorithm
    false, // extractable (false for security)
    ["deriveBits", "deriveKey"] // key usages
  );

  // Derive the actual encryption key using PBKDF2
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // 100,000 iterations - matches Rust backend
      hash: { name: "SHA-256" }, // HMAC with SHA-256
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256, // 256-bit key
    },
    false, // extractable (false for security)
    ["encrypt", "decrypt"] // key usages
  );

  return key;
}

/**
 * Generates a cryptographically secure random salt
 *
 * The salt is 16 bytes (128 bits) as required for compatibility with
 * the Rust backend's key derivation function.
 *
 * @returns Uint8Array - 16 random bytes
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * // Use with deriveKey
 * const key = await deriveKey("password", salt);
 * // Store salt alongside encrypted data for later decryption
 * ```
 */
export function generateSalt(): Uint8Array {
  if (!window.crypto || !window.crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure random number generation."
    );
  }

  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Type alias for the key derivation result
 * Represents a derived key that can be used for AES-GCM encryption/decryption
 */
export type DerivedKey = CryptoKey;

/**
 * Validates a salt buffer
 *
 * @param salt - The salt to validate
 * @returns true if salt is valid (16 bytes), false otherwise
 */
export function isValidSalt(salt: Uint8Array): boolean {
  return salt.length === 16;
}

/**
 * Encodes a salt to base64 for storage/transmission
 *
 * @param salt - The salt bytes to encode
 * @returns Base64-encoded string
 */
export function saltToBase64(salt: Uint8Array): string {
  // Convert Uint8Array to binary string, then to base64
  const binary = Array.from(salt)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary);
}

/**
 * Decodes a base64-encoded salt back to bytes
 *
 * @param base64Salt - Base64-encoded salt string
 * @returns Uint8Array - The decoded salt bytes
 */
export function saltFromBase64(base64Salt: string): Uint8Array {
  const binary = atob(base64Salt);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
