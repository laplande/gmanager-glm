/**
 * AES-256-GCM Encryption for Web (using Web Crypto API)
 *
 * This module provides AES-256-GCM encryption and decryption using the
 * Web Crypto SubtleCrypto API. The output format is compatible with the
 * Rust backend implementation: base64(iv + tag + ciphertext).
 *
 * Format details:
 * - IV: 12 bytes (96 bits) - standard for GCM
 * - Tag: 16 bytes (128 bits) - authentication tag
 * - Ciphertext: variable length
 */

/**
 * The standard IV (nonce) size for AES-GCM is 12 bytes (96 bits)
 */
const IV_SIZE = 12;

/**
 * The authentication tag size for AES-GCM is 16 bytes (128 bits)
 */
const TAG_SIZE = 16;

/**
 * Encrypts data using AES-256-GCM with a randomly generated IV
 *
 * The output format is: base64(iv + tag + ciphertext)
 * This format is compatible with the Rust backend implementation.
 *
 * @param plaintext - The data to encrypt (string or Uint8Array)
 * @param key - The CryptoKey to use for encryption (from deriveKey)
 * @returns Promise<string> - Base64-encoded encrypted data
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * const key = await deriveKey("my-password", salt);
 * const encrypted = await encrypt("sensitive data", key);
 * // Store encrypted data along with salt
 * ```
 */
export async function encrypt(
  plaintext: string | Uint8Array,
  key: CryptoKey
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure cryptographic operations."
    );
  }

  // Generate a random IV (nonce) for this encryption
  const iv = new Uint8Array(IV_SIZE);
  window.crypto.getRandomValues(iv);

  // Convert plaintext to bytes if it's a string
  const plaintextBytes =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext)
      : plaintext;

  // Encrypt using AES-GCM
  // Web Crypto API returns the ciphertext and tag combined (ciphertext + tag)
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBytes
  );

  // The encrypted buffer contains ciphertext followed by the auth tag
  // We need to format it as: iv + tag + ciphertext
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertextLength = encryptedArray.length - TAG_SIZE;
  const ciphertext = encryptedArray.slice(0, ciphertextLength);
  const tag = encryptedArray.slice(ciphertextLength);

  // Combine: iv (12 bytes) + tag (16 bytes) + ciphertext
  const combined = new Uint8Array(IV_SIZE + TAG_SIZE + ciphertext.length);
  combined.set(iv, 0);
  combined.set(tag, IV_SIZE);
  combined.set(ciphertext, IV_SIZE + TAG_SIZE);

  // Encode to base64
  return arrayBufferToBase64(combined);
}

/**
 * Decrypts data that was encrypted using the encrypt function
 *
 * The input format must be: base64(iv + tag + ciphertext)
 * This format is compatible with the Rust backend implementation.
 *
 * @param ciphertext - Base64-encoded encrypted data (format: iv + tag + ciphertext)
 * @param key - The CryptoKey to use for decryption (from deriveKey)
 * @returns Promise<string> - The decrypted plaintext string
 *
 * @throws Error if decryption fails (wrong key, corrupted data, invalid format)
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * const key = await deriveKey("my-password", salt);
 * const encrypted = await encrypt("sensitive data", key);
 * const decrypted = await decrypt(encrypted, key);
 * console.log(decrypted); // "sensitive data"
 * ```
 */
export async function decrypt(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure cryptographic operations."
    );
  }

  // Decode from base64
  const combined = base64ToArrayBuffer(ciphertext);

  // Validate minimum length (iv + tag)
  if (combined.byteLength < IV_SIZE + TAG_SIZE) {
    throw new Error(
      `Invalid ciphertext: must be at least ${IV_SIZE + TAG_SIZE} bytes`
    );
  }

  // Extract iv (first 12 bytes)
  const iv = new Uint8Array(combined.buffer, combined.byteOffset, IV_SIZE);

  // Extract tag (next 16 bytes after IV)
  const tag = new Uint8Array(
    combined.buffer,
    combined.byteOffset + IV_SIZE,
    TAG_SIZE
  );

  // Extract ciphertext (everything after tag)
  const ciphertextBytes = new Uint8Array(
    combined.buffer,
    combined.byteOffset + IV_SIZE + TAG_SIZE,
    combined.byteLength - IV_SIZE - TAG_SIZE
  );

  // Combine ciphertext + tag (Web Crypto expects this format)
  const encryptedData = new Uint8Array(ciphertextBytes.length + TAG_SIZE);
  encryptedData.set(ciphertextBytes, 0);
  encryptedData.set(tag, ciphertextBytes.length);

  // Decrypt using AES-GCM
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    // Convert bytes to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypts data to raw bytes (instead of string)
 *
 * Use this when you need the decrypted data as bytes rather than a UTF-8 string.
 *
 * @param ciphertext - Base64-encoded encrypted data
 * @param key - The CryptoKey to use for decryption
 * @returns Promise<Uint8Array> - The decrypted plaintext bytes
 */
export async function decryptToBytes(
  ciphertext: string,
  key: CryptoKey
): Promise<Uint8Array> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure cryptographic operations."
    );
  }

  const combined = base64ToArrayBuffer(ciphertext);

  if (combined.byteLength < IV_SIZE + TAG_SIZE) {
    throw new Error(
      `Invalid ciphertext: must be at least ${IV_SIZE + TAG_SIZE} bytes`
    );
  }

  const iv = new Uint8Array(combined.buffer, combined.byteOffset, IV_SIZE);
  const tag = new Uint8Array(
    combined.buffer,
    combined.byteOffset + IV_SIZE,
    TAG_SIZE
  );
  const ciphertextBytes = new Uint8Array(
    combined.buffer,
    combined.byteOffset + IV_SIZE + TAG_SIZE,
    combined.byteLength - IV_SIZE - TAG_SIZE
  );

  const encryptedData = new Uint8Array(ciphertextBytes.length + TAG_SIZE);
  encryptedData.set(ciphertextBytes, 0);
  encryptedData.set(tag, ciphertextBytes.length);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );

    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Utility: Convert Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  // Convert to binary string
  const binary = Array.from(buffer)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  // Encode to base64
  return btoa(binary);
}

/**
 * Utility: Convert base64 string to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  // Decode base64 to binary string
  const binary = atob(base64);
  // Convert to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Re-encrypts data with a new key
 *
 * Useful for password changes or key rotation.
 *
 * @param ciphertext - Existing encrypted data
 * @param oldKey - The current key
 * @param newKey - The new key to re-encrypt with
 * @returns Promise<string> - New encrypted data (different ciphertext, same content)
 */
export async function reencrypt(
  ciphertext: string,
  oldKey: CryptoKey,
  newKey: CryptoKey
): Promise<string> {
  const plaintext = await decrypt(ciphertext, oldKey);
  return await encrypt(plaintext, newKey);
}

/**
 * Generates a cryptographically secure random IV
 *
 * Note: The encrypt function automatically generates a random IV.
 * This function is exposed for testing or advanced use cases.
 *
 * @returns Uint8Array - 12 random bytes (IV for AES-GCM)
 */
export function generateIV(): Uint8Array {
  if (!window.crypto || !window.crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API not available. This environment does not support secure random number generation."
    );
  }

  const iv = new Uint8Array(IV_SIZE);
  window.crypto.getRandomValues(iv);
  return iv;
}
