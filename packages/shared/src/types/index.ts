/**
 * Type exports for GManager shared package
 *
 * This module re-exports all types for convenient importing.
 * Consumers can import from this package like:
 *   import { Account, ParsedAccount, Group } from '@gmanager/shared';
 */

// Account-related types
export type {
  ParsedAccount,
  AccountField,
  Account,
  AccountWithTags,
  AccountRef,
  AccountFieldValue,
  AccountUpdate,
} from './account.js';

// Database schema types
export type {
  RawImport,
  Group,
  Tag,
  AccountTag,
  OperationLog,
  OperationLogDetails,
  SchemaVersion,
  Database,
  DatabaseWithAccounts,
} from './database.js';

// Cryptography types
export type {
  EncryptionAlgorithm,
  KdfType,
  EncryptedData,
  KdfParams,
  MasterKey,
  DerivedKey,
  PasswordPolicy,
  PasswordValidation,
  EncryptResult,
  DecryptResult,
  SecureBuffer,
  BiometricResult,
} from './crypto.js';

