/**
 * Server-side cryptography utilities
 * Uses Node.js crypto module for PBKDF2 and AES-256-GCM
 * Compatible with the @gmanager/crypto package format
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

const IV_SIZE = 12;
const TAG_SIZE = 16;
const SALT_SIZE = 16;
const KEY_SIZE = 32; // 256 bits

/**
 * Derive an encryption key from password using PBKDF2
 */
export function deriveKey(password: string, salt: Buffer, iterations: number = 100000): Buffer {
  return pbkdf2Sync(password, salt, iterations, KEY_SIZE, 'sha256');
}

/**
 * Generate a random salt
 */
export function generateSalt(): Buffer {
  return randomBytes(SALT_SIZE);
}

/**
 * Hash password for storage (using PBKDF2)
 */
export function hashPassword(password: string, salt: Buffer, iterations: number = 100000): string {
  const hash = pbkdf2Sync(password, salt, iterations, 64, 'sha256');
  return hash.toString('base64');
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: Buffer,
  iterations: number = 100000
): boolean {
  const hash = hashPassword(password, salt, iterations);
  return hash === storedHash;
}

/**
 * Encrypt data using AES-256-GCM
 * Output format: base64(iv + tag + ciphertext)
 * Compatible with @gmanager/crypto package
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Format: iv (12 bytes) + tag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 * Input format: base64(iv + tag + ciphertext)
 * Compatible with @gmanager/crypto package
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_SIZE + TAG_SIZE) {
    throw new Error(`Invalid ciphertext: must be at least ${IV_SIZE + TAG_SIZE} bytes`);
  }

  const iv = combined.subarray(0, IV_SIZE);
  const tag = combined.subarray(IV_SIZE, IV_SIZE + TAG_SIZE);
  const encrypted = combined.subarray(IV_SIZE + TAG_SIZE);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }
}

/**
 * Convert salt buffer to base64 string
 */
export function saltToBase64(salt: Buffer): string {
  return salt.toString('base64');
}

/**
 * Convert base64 string to salt buffer
 */
export function saltFromBase64(base64Salt: string): Buffer {
  return Buffer.from(base64Salt, 'base64');
}
