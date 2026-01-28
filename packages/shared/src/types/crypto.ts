/**
 * Cryptography and encryption types for GManager
 *
 * This module defines types related to encryption, key derivation,
 * and secure data handling.
 */

/**
 * Encryption algorithm identifier
 */
export type EncryptionAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305';

/**
 * Key derivation function identifier
 */
export type KdfType = 'argon2id' | 'pbkdf2';

/**
 * Encrypted data payload
 * The standard format for storing encrypted values
 */
export interface EncryptedData {
  /** The encryption algorithm used */
  algorithm: EncryptionAlgorithm;
  /** Initialization vector (base64 encoded) */
  iv: string;
  /** The ciphertext (base64 encoded) */
  ciphertext: string;
  /** Authentication tag (base64 encoded, for AEAD modes) */
  authTag?: string;
}

/**
 * Encryption key derivation parameters
 */
export interface KdfParams {
  /** The key derivation function */
  type: KdfType;
  /** Salt for key derivation (base64 encoded) */
  salt: string;
  /** Number of iterations (for PBKDF2) or time cost (for Argon2) */
  iterations?: number;
  /** Memory cost in KB (for Argon2) */
  memory?: number;
  /** Parallelism (for Argon2) */
  parallelism?: number;
  /** Desired key length in bytes */
  keyLength: number;
}

/**
 * Master encryption key container
 * Stores the encrypted master key with its derivation params
 */
export interface MasterKey {
  /** Unique identifier for this key */
  id: string;
  /** The encrypted master key data */
  encryptedKey: EncryptedData;
  /** Parameters for deriving the key from user password */
  kdfParams: KdfParams;
  /** Key creation timestamp */
  createdAt: string;
  /** Optional hint for password recovery (not the actual password) */
  hint?: string;
}

/**
 * Derived encryption key
 * Runtime representation of a decrypted key
 */
export interface DerivedKey {
  /** The raw key bytes (Uint8Array in practice) */
  key: Uint8Array;
  /** The algorithm this key is for */
  algorithm: EncryptionAlgorithm;
}

/**
 * Password strength requirements
 */
export interface PasswordPolicy {
  /** Minimum password length */
  minLength: number;
  /** Whether uppercase letters are required */
  requireUppercase: boolean;
  /** Whether lowercase letters are required */
  requireLowercase: boolean;
  /** Whether numbers are required */
  requireNumbers: boolean;
  /** Whether special characters are required */
  requireSpecial: boolean;
  /** Optional forbidden common passwords list */
  forbiddenPasswords?: string[];
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  /** Whether the password meets all requirements */
  valid: boolean;
  /** Human-readable error message (if invalid) */
  error?: string;
  /** Estimated password strength (0-4) */
  strength: 0 | 1 | 2 | 3 | 4;
  /** Strength label */
  strengthLabel: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}

/**
 * Encryption result
 */
export interface EncryptResult {
  /** The encrypted data */
  data: EncryptedData;
  /** The original data length */
  originalLength: number;
}

/**
 * Decryption result
 */
export interface DecryptResult {
  /** The decrypted data as UTF-8 string */
  plaintext: string;
  /** Whether decryption was successful */
  success: boolean;
  /** Error message if decryption failed */
  error?: string;
}

/**
 * Secure memory buffer
 * Represents sensitive data that should be zeroed after use
 */
export interface SecureBuffer {
  /** The underlying buffer */
  buffer: Uint8Array;
  /** Securely wipe the buffer contents */
  wipe: () => void;
}

/**
 * Biometric authentication result (for future support)
 */
export interface BiometricResult {
  /** Whether biometric auth succeeded */
  success: boolean;
  /** The type of biometric used */
  biometricType?: 'fingerprint' | 'face' | 'iris';
  /** Error message if failed */
  error?: string;
}
