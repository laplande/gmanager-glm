/**
 * Secure Data Export/Import for GManager
 *
 * This module provides functionality for securely exporting and importing
 * account data. It supports encrypted JSON exports for backups and
 * customizable text format exports for human-readable output.
 *
 * @packageDocumentation
 */

import { encrypt, decrypt } from "./aes.js";

/**
 * Account interface representing a stored account
 *
 * This matches the expected structure of account objects in GManager.
 */
export interface Account {
  /** Unique identifier for the account */
  id: string;
  /** Email address associated with the account */
  email: string;
  /** Encrypted password (or plaintext if unencrypted) */
  password?: string;
  /** Recovery email address */
  recovery_email?: string;
  /** Additional notes */
  notes?: string;
  /** Account creation timestamp */
  created_at?: string;
  /** Account last modified timestamp */
  updated_at?: string;
  /** Account service/domain */
  service?: string;
  /** Account username (if different from email) */
  username?: string;
  /** Any additional fields */
  [key: string]: unknown;
}

/**
 * Encrypted export file format
 *
 * The structure of an encrypted backup file.
 */
export interface EncryptedExport {
  /** Version of the export format */
  version: number;
  /** Timestamp of export */
  exported_at: string;
  /** The encrypted account data (base64) */
  data: string;
  /** Number of accounts in the export */
  count: number;
}

/**
 * Text export format options
 */
export interface TextExportOptions {
  /** Template string for each account line (e.g., "{email} | {password}") */
  template?: string;
  /** Separator between accounts (default: newline) */
  separator?: string;
  /** Header line to include at the start */
  header?: string;
  /** Footer line to include at the end */
  footer?: string;
  /** Fields to include (if not specified, all available fields are used) */
  includeFields?: string[];
  /** Fields to exclude */
  excludeFields?: string[];
  /** Placeholder for missing values (default: empty string) */
  emptyPlaceholder?: string;
}

/**
 * Conflict report from merge operation
 */
export interface MergeConflictReport {
  /** Accounts that were added (no duplicates) */
  added: Account[];
  /** Duplicate accounts found (by email) */
  duplicates: DuplicateAccount[];
  /** Total count of existing accounts */
  existingCount: number;
  /** Total count of imported accounts */
  importedCount: number;
  /** Total count after merge */
  mergedCount: number;
}

/**
 * Represents a duplicate account found during merge
 */
export interface DuplicateAccount {
  /** The account from existing list */
  existing: Account;
  /** The account from imported list */
  imported: Account;
  /** Type of conflict: "identical" if all fields match, "conflict" if different */
  conflictType: "identical" | "conflict";
  /** Fields that differ between accounts (only for conflicts) */
  differingFields?: string[];
}

/**
 * Current export format version
 */
const EXPORT_VERSION = 1;

/**
 * Exports data to an encrypted JSON format
 *
 * The data is serialized to JSON, encrypted with AES-256-GCM,
 * and returned in a structured format that includes metadata.
 *
 * @param data - The account data to export
 * @param key - The CryptoKey to use for encryption (from deriveKey)
 * @returns Promise<EncryptedExport> - Structured export with encrypted data
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * const key = await deriveKey("my-password", salt);
 * const accounts = [{ id: "1", email: "user@example.com", password: "secret" }];
 * const exported = await exportToEncryptedJSON(accounts, key);
 * // Save exported.data and exported.version for later import
 * ```
 */
export async function exportToEncryptedJSON(
  data: Account[],
  key: CryptoKey
): Promise<EncryptedExport> {
  if (!Array.isArray(data)) {
    throw new Error("Data must be an array of accounts");
  }

  if (data.length === 0) {
    throw new Error("Cannot export empty account list");
  }

  // Serialize data to JSON
  const json = JSON.stringify(data);

  // Encrypt with AES-256-GCM
  const encryptedData = await encrypt(json, key);

  // Return structured export
  return {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    data: encryptedData,
    count: data.length,
  };
}

/**
 * Imports data from an encrypted JSON export
 *
 * Decrypts the data and parses it into account objects.
 *
 * @param encryptedData - The encrypted export data
 * @param key - The CryptoKey to use for decryption
 * @returns Promise<Account[]> - The decrypted account objects
 *
 * @throws Error if decryption fails or JSON is invalid
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * const key = await deriveKey("my-password", salt);
 * const accounts = await importFromEncryptedJSON(encryptedExport.data, key);
 * ```
 */
export async function importFromEncryptedJSON(
  encryptedData: string | EncryptedExport,
  key: CryptoKey
): Promise<Account[]> {
  let ciphertext: string;

  // Handle both string and EncryptedExport input
  if (typeof encryptedData === "string") {
    ciphertext = encryptedData;
  } else if (encryptedData.data) {
    ciphertext = encryptedData.data;
  } else {
    throw new Error("Invalid encrypted data format");
  }

  // Decrypt the data
  let decryptedJson: string;
  try {
    decryptedJson = await decrypt(ciphertext, key);
  } catch (error) {
    throw new Error(
      `Failed to decrypt backup: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Parse JSON
  let accounts: Account[];
  try {
    accounts = JSON.parse(decryptedJson);
  } catch (error) {
    throw new Error(
      `Failed to parse decrypted data: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate that we got an array
  if (!Array.isArray(accounts)) {
    throw new Error("Invalid backup format: expected array of accounts");
  }

  // Validate each account has required fields
  for (const account of accounts) {
    if (typeof account !== "object" || account === null) {
      throw new Error("Invalid account format: expected object");
    }
    if (!account.id || !account.email) {
      throw new Error("Invalid account: missing required fields (id, email)");
    }
  }

  return accounts;
}

/**
 * Exports accounts to a customizable text format
 *
 * Supports template-based formatting with field placeholders,
 * custom separators, and field filtering.
 *
 * @param accounts - Array of accounts to export
 * @param format - Format options for the text export
 * @returns string - Formatted text export
 *
 * @example
 * ```ts
 * const accounts = [{ id: "1", email: "user@example.com", password: "secret" }];
 * const text = exportToTextFormat(accounts, {
 *   template: "{email} | {password} | {recovery_email}",
 *   separator: "\n",
 *   header: "=== Account Export ===",
 *   emptyPlaceholder: "N/A"
 * });
 * ```
 */
export function exportToTextFormat(
  accounts: Account[],
  format: TextExportOptions = {}
): string {
  const {
    template = "{email} | {password}",
    separator = "\n",
    header = "",
    footer = "",
    includeFields,
    excludeFields = [],
    emptyPlaceholder = "",
  } = format;

  // Build lines array
  const lines: string[] = [];

  // Add header if provided
  if (header) {
    lines.push(header);
  }

  // Export each account
  for (const account of accounts) {
    const line = renderTemplate(account, template, {
      includeFields,
      excludeFields,
      emptyPlaceholder,
    });
    lines.push(line);
  }

  // Add footer if provided
  if (footer) {
    lines.push(footer);
  }

  return lines.join(separator);
}

/**
 * Template rendering options (internal)
 */
interface RenderOptions {
  includeFields?: string[];
  excludeFields?: string[];
  emptyPlaceholder: string;
}

/**
 * Renders a template string for a single account
 *
 * Replaces {field} placeholders with actual values from the account.
 *
 * @param account - The account to render
 * @param template - Template string with {field} placeholders
 * @param options - Rendering options
 * @returns Rendered string
 */
function renderTemplate(
  account: Account,
  template: string,
  options: RenderOptions
): string {
  const { includeFields, excludeFields, emptyPlaceholder } = options;

  // Find all placeholders in the template
  const placeholderRegex = /\{(\w+)\}/g;
  const placeholders = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    placeholders.add(match[1]);
  }

  // Build result string
  let result = template;

  for (const field of placeholders) {
    // Check field inclusion/exclusion
    if (includeFields && !includeFields.includes(field)) {
      // Field not in include list
      result = result.replace(new RegExp(`\\{${field}\\}`, "g"), emptyPlaceholder);
      continue;
    }

    if (excludeFields && excludeFields.includes(field)) {
      // Field in exclude list
      result = result.replace(new RegExp(`\\{${field}\\}`, "g"), emptyPlaceholder);
      continue;
    }

    // Get value from account
    const value = (account as Record<string, unknown>)[field];

    // Convert to string, use placeholder if undefined/null
    const stringValue =
      value === undefined || value === null
        ? emptyPlaceholder
        : String(value);

    result = result.replace(new RegExp(`\\{${field}\\}`, "g"), stringValue);
  }

  return result;
}

/**
 * Merges two account lists, detecting duplicates by email
 *
 * Preserves existing accounts and adds new ones.
 * Returns a detailed conflict report.
 *
 * @param existing - Current account list
 * @param imported - Accounts to import
 * @returns MergeConflictReport - Detailed merge results
 *
 * @example
 * ```ts
 * const existing = [{ id: "1", email: "user@example.com", password: "old" }];
 * const imported = [{ id: "2", email: "user@example.com", password: "new" }];
 * const report = mergeAccounts(existing, imported);
 * // report.duplicates will contain the conflict
 * // report.added will be empty
 * ```
 */
export function mergeAccounts(
  existing: Account[],
  imported: Account[]
): MergeConflictReport {
  // Create a lookup map for existing accounts by email (case-insensitive)
  const existingByEmail = new Map<string, Account>();
  for (const account of existing) {
    const email = normalizeEmail(account.email);
    existingByEmail.set(email, account);
  }

  const added: Account[] = [];
  const duplicates: DuplicateAccount[] = [];

  // Process each imported account
  for (const importedAccount of imported) {
    const email = normalizeEmail(importedAccount.email);
    const existingAccount = existingByEmail.get(email);

    if (!existingAccount) {
      // No duplicate - add to new accounts
      added.push(importedAccount);
    } else {
      // Duplicate found - analyze conflict
      const conflictInfo = analyzeDuplicate(existingAccount, importedAccount);
      duplicates.push(conflictInfo);
    }
  }

  // Build merged list (existing + added)
  const merged = [...existing, ...added];

  return {
    added,
    duplicates,
    existingCount: existing.length,
    importedCount: imported.length,
    mergedCount: merged.length,
  };
}

/**
 * Normalizes an email address for comparison
 *
 * Converts to lowercase and trims whitespace.
 *
 * @param email - Email address to normalize
 * @returns Normalized email
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Analyzes a duplicate account pair
 *
 * Determines if accounts are identical or have conflicts.
 *
 * @param existing - Existing account
 * @param imported - Imported account
 * @returns DuplicateAccount info
 */
function analyzeDuplicate(
  existing: Account,
  imported: Account
): DuplicateAccount {
  // Get all unique keys from both accounts
  const allKeys = new Set([
    ...Object.keys(existing),
    ...Object.keys(imported),
  ]);

  // Filter out internal fields from comparison
  const comparisonFields = Array.from(allKeys).filter(
    (key) => key !== "id" && key !== "created_at" && key !== "updated_at"
  );

  const differingFields: string[] = [];
  let hasDifference = false;

  for (const field of comparisonFields) {
    const existingValue = JSON.stringify(existing[field]);
    const importedValue = JSON.stringify(imported[field]);

    if (existingValue !== importedValue) {
      differingFields.push(field);
      hasDifference = true;
    }
  }

  return {
    existing,
    imported,
    conflictType: hasDifference ? "conflict" : "identical",
    differingFields: hasDifference ? differingFields : undefined,
  };
}

/**
 * Exports to encrypted JSON and returns as downloadable file
 *
 * Creates a complete export that can be saved to a file.
 *
 * @param data - Account data to export
 * @param key - Encryption key
 * @param filename - Optional filename (default: "gmanager-backup.json")
 * @returns Promise<EncryptedExport> - Export data ready to save
 *
 * @example
 * ```ts
 * const salt = generateSalt();
 * const key = await deriveKey("password", salt);
 * const exported = await exportToBackupFile(accounts, key, "backup-2024.json");
 * // Create download:
 * // const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
 * // const url = URL.createObjectURL(blob);
 * ```
 */
export async function exportToBackupFile(
  data: Account[],
  key: CryptoKey,
  filename?: string
): Promise<EncryptedExport & { filename: string }> {
  const exported = await exportToEncryptedJSON(data, key);
  return {
    ...exported,
    filename: filename || `gmanager-backup-${Date.now()}.json`,
  };
}

/**
 * Validates an encrypted export file structure
 *
 * Checks if the export has the correct format and version.
 *
 * @param exportData - The export data to validate
 * @returns true if valid, throws error if invalid
 *
 * @throws Error if validation fails
 */
export function validateExport(
  exportData: EncryptedExport
): exportData is EncryptedExport {
  if (typeof exportData !== "object" || exportData === null) {
    throw new Error("Invalid export: not an object");
  }

  if (typeof exportData.version !== "number") {
    throw new Error("Invalid export: missing or invalid version");
  }

  if (exportData.version > EXPORT_VERSION) {
    throw new Error(
      `Unsupported export version: ${exportData.version} (current: ${EXPORT_VERSION})`
    );
  }

  if (typeof exportData.data !== "string") {
    throw new Error("Invalid export: missing or invalid encrypted data");
  }

  if (typeof exportData.count !== "number") {
    throw new Error("Invalid export: missing or invalid count");
  }

  return true;
}

/**
 * Gets export metadata without decrypting
 *
 * Returns information about the export file.
 *
 * @param exportData - The export data
 * @returns Export metadata
 */
export function getExportMetadata(exportData: EncryptedExport): {
  version: number;
  exportedAt: string;
  accountCount: number;
  dataSize: number;
} {
  return {
    version: exportData.version,
    exportedAt: exportData.exported_at,
    accountCount: exportData.count,
    dataSize: exportData.data.length,
  };
}
