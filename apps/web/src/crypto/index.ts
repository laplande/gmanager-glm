/**
 * Server-side encryption utilities for GManager Web
 *
 * This module provides AES-256-GCM encryption using Node.js crypto API.
 * It is compatible with the web client encryption, ensuring that data
 * encrypted in the browser can be decrypted on the server and vice versa.
 */

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

/**
 * Standard IV (nonce) size for AES-GCM is 12 bytes (96 bits)
 */
const IV_SIZE = 12;

/**
 * The authentication tag size for AES-GCM is 16 bytes (128 bits)
 */
const TAG_SIZE = 16;

/**
 * Default KDF iterations for key derivation
 */
const DEFAULT_KDF_ITERATIONS = 100000;

/**
 * Derived encryption key for runtime use
 */
export interface DerivedKey {
  /** The raw key bytes */
  key: Buffer;
  /** The algorithm this key is for */
  algorithm: 'aes-256-gcm';
}

/**
 * KDF parameters for key derivation
 */
export interface KdfParams {
  /** Salt for key derivation (base64 encoded) */
  salt: string;
  /** Number of iterations */
  iterations: number;
  /** Desired key length in bytes (32 for AES-256) */
  keyLength: number;
}

/**
 * Encrypts data using AES-256-GCM with a randomly generated IV
 *
 * The output format is: base64(iv + tag + ciphertext)
 * This format is compatible with the web client implementation.
 *
 * @param plaintext - The data to encrypt (string or Buffer)
 * @param key - The derived key to use for encryption
 * @returns Base64-encoded encrypted data
 */
export function encrypt(plaintext: string | Buffer, key: DerivedKey): string {
  // Generate a random IV (nonce) for this encryption
  const iv = randomBytes(IV_SIZE);

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key.key, iv);

  // Encrypt the data
  const plaintextBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf-8');
  const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);

  // Get the auth tag
  const authTag = cipher.getAuthTag();

  // Combine: iv (12 bytes) + tag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, ciphertext]);

  // Encode to base64
  return combined.toString('base64');
}

/**
 * Decrypts data that was encrypted using the encrypt function
 *
 * The input format must be: base64(iv + tag + ciphertext)
 *
 * @param ciphertext - Base64-encoded encrypted data
 * @param key - The derived key to use for decryption
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails
 */
export function decrypt(ciphertext: string, key: DerivedKey): string {
  // Decode from base64
  const combined = Buffer.from(ciphertext, 'base64');

  // Validate minimum length (iv + tag)
  if (combined.length < IV_SIZE + TAG_SIZE) {
    throw new Error(`Invalid ciphertext: must be at least ${IV_SIZE + TAG_SIZE} bytes`);
  }

  // Extract iv (first 12 bytes)
  const iv = combined.subarray(0, IV_SIZE);

  // Extract tag (next 16 bytes after IV)
  const authTag = combined.subarray(IV_SIZE, IV_SIZE + TAG_SIZE);

  // Extract ciphertext (everything after tag)
  const ciphertextBytes = combined.subarray(IV_SIZE + TAG_SIZE);

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key.key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  const plaintext = Buffer.concat([decipher.update(ciphertextBytes), decipher.final()]);

  return plaintext.toString('utf-8');
}

/**
 * Derives an encryption key from a password using PBKDF2
 *
 * Uses scrypt (a memory-hard KDF) for better security against brute force.
 *
 * @param password - The password to derive from
 * @param salt - The salt (base64 encoded)
 * @param iterations - Number of iterations (default: 100000)
 * @param keyLength - Desired key length in bytes (default: 32 for AES-256)
 * @returns The derived key
 */
export function deriveKey(
  password: string,
  salt: string,
  iterations: number = DEFAULT_KDF_ITERATIONS,
  keyLength: number = 32
): DerivedKey {
  const saltBuffer = Buffer.from(salt, 'base64');

  // Use scrypt for key derivation (memory-hard KDF)
  const key = scryptSync(password, saltBuffer, keyLength);

  return {
    key,
    algorithm: 'aes-256-gcm',
  };
}

/**
 * Generates a cryptographically secure random salt
 *
 * @param bytes - Number of bytes (default: 16)
 * @returns Base64-encoded salt
 */
export function generateSalt(bytes: number = 16): string {
  return randomBytes(bytes).toString('base64');
}

/**
 * Generates KDF parameters for a new vault
 *
 * @param iterations - Number of iterations (default: 100000)
 * @param keyLength - Desired key length in bytes (default: 32)
 * @returns KDF parameters
 */
export function generateKdfParams(
  iterations: number = DEFAULT_KDF_ITERATIONS,
  keyLength: number = 32
): KdfParams {
  return {
    salt: generateSalt(16),
    iterations,
    keyLength,
  };
}

/**
 * Re-encrypts data with a new key
 *
 * Useful for password changes or key rotation.
 *
 * @param ciphertext - Existing encrypted data
 * @param oldKey - The current key
 * @param newKey - The new key to re-encrypt with
 * @returns New encrypted data
 */
export function reencrypt(ciphertext: string, oldKey: DerivedKey, newKey: DerivedKey): string {
  const plaintext = decrypt(ciphertext, oldKey);
  return encrypt(plaintext, newKey);
}

/**
 * Encrypts a master key with a derived password key
 *
 * The master key is used for encrypting account data.
 * It is itself encrypted with the user's password-derived key.
 *
 * @param masterKey - The master key to encrypt (32 bytes for AES-256)
 * @param passwordKey - The key derived from the user's password
 * @returns Encrypted master key (base64)
 */
export function encryptMasterKey(masterKey: Buffer, passwordKey: DerivedKey): string {
  return encrypt(masterKey, passwordKey);
}

/**
 * Decrypts a master key with a derived password key
 *
 * @param encryptedMasterKey - The encrypted master key (base64)
 * @param passwordKey - The key derived from the user's password
 * @returns The decrypted master key (32 bytes)
 */
export function decryptMasterKey(encryptedMasterKey: string, passwordKey: DerivedKey): Buffer {
  const decrypted = decrypt(encryptedMasterKey, passwordKey);
  return Buffer.from(decrypted, 'base64');
}

/**
 * Generates a new random master key
 *
 * @returns A 32-byte random key suitable for AES-256
 */
export function generateMasterKey(): Buffer {
  return randomBytes(32);
}

/**
 * Encrypts a session key with the master key
 *
 * The session key is used for the current user session.
 * It is encrypted with the master key so it can be stored.
 *
 * @param sessionKey - The session key to encrypt
 * @param masterKey - The master key
 * @returns Encrypted session key (base64)
 */
export function encryptSessionKey(sessionKey: Buffer, masterKey: Buffer): string {
  const key: DerivedKey = { key: masterKey, algorithm: 'aes-256-gcm' };
  return encrypt(sessionKey, key);
}

/**
 * Decrypts a session key with the master key
 *
 * @param encryptedSessionKey - The encrypted session key (base64)
 * @param masterKey - The master key
 * @returns The decrypted session key
 */
export function decryptSessionKey(encryptedSessionKey: string, masterKey: Buffer): Buffer {
  const key: DerivedKey = { key: masterKey, algorithm: 'aes-256-gcm' };
  const decrypted = decrypt(encryptedSessionKey, key);
  return Buffer.from(decrypted, 'hex');
}
