/**
 * Web-compatible encryption utilities for GManager
 *
 * This package provides AES-256-GCM encryption using the native Web Crypto API.
 * It is designed to be compatible with the Rust backend encryption, ensuring
 * that data encrypted in the browser can be decrypted on the server and vice versa.
 *
 * @packageDocumentation
 */

// Key Derivation Functions (PBKDF2-HMAC-SHA256)
export {
  deriveKey,
  generateSalt,
  isValidSalt,
  saltToBase64,
  saltFromBase64,
} from "./kdf";

// AES-256-GCM Encryption/Decryption
export {
  encrypt,
  decrypt,
  decryptToBytes,
  reencrypt,
  generateIV,
} from "./aes";

// TOTP (Time-based One-Time Password)
export {
  generateTOTP,
  getRemainingSeconds,
  isValidTOTP,
  generateTOTPUri,
  generateSecret,
} from "./totp";

// Secure Export/Import
export {
  exportToEncryptedJSON,
  exportToTextFormat,
  exportToBackupFile,
  importFromEncryptedJSON,
  mergeAccounts,
  validateExport,
  getExportMetadata,
} from "./export";

// Re-export types for convenience
export type { DerivedKey } from "./kdf";
export type {
  Account,
  EncryptedExport,
  TextExportOptions,
  MergeConflictReport,
  DuplicateAccount,
} from "./export";
