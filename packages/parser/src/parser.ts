/**
 * Main account parser module
 *
 * This module provides the core parsing functionality for converting raw text
 * into structured ParsedAccount objects. It coordinates delimiter detection,
 * field type detection, and account extraction.
 *
 * Input: Raw text string (potentially containing multiple records)
 * Output: Array of ParsedAccount objects with confidence scores
 *
 * Features:
 * - Automatic delimiter detection
 * - Multi-record parsing from single text
 * - Field type classification with confidence scores
 * - Unknown field tracking for manual review
 * - Robust error handling
 */

import type { ParsedAccount } from '@gmanager/shared';
import { detectDelimiter, splitIntoRecords, extractKeyValuePairs } from './delimiter.js';
import {
  detectFieldType,
  normalizeFieldName,
  FieldType,
  type FieldDetectionResult,
} from './fieldDetector.js';

/**
 * Parser options for customizing parsing behavior
 */
export interface ParserOptions {
  /**
   * Force a specific delimiter instead of auto-detection
   * Useful when the format is known in advance
   */
  delimiter?: string;

  /**
   * Minimum confidence threshold for including a parsed field
   * Fields below this threshold are added to unknown[]
   * Default: 0.3
   */
  minConfidence?: number;

  /**
   * Whether to include unknown/unclassified fields in the result
   * Default: true
   */
  includeUnknown?: boolean;

  /**
   * Maximum number of records to parse from the input
   * Default: unlimited (0)
   */
  maxRecords?: number;

  /**
   * Whether to be strict about required fields
   * When true, records without an email are rejected
   * Default: true
   */
  strict?: boolean;
}

/**
 * Internal representation of a parsed record before finalization
 */
interface ParsedRecord {
  /** Detected/parsed email */
  email?: string;
  /** Detected/parsed password */
  password?: string;
  /** Detected/parsed recovery email */
  recoveryEmail?: string;
  /** Detected/parsed TOTP secret */
  totpSecret?: string;
  /** Detected/parsed year */
  year?: string;
  /** Detected/parsed country */
  country?: string;
  /** Unknown/unclassified fields */
  unknown: Array<{ key: string; value: string; confidence: number }>;
  /** Overall confidence score for this record */
  confidence: number;
  /** Raw record text for debugging */
  raw: string;
}

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: Required<ParserOptions> = {
  delimiter: '',
  minConfidence: 0.3,
  includeUnknown: true,
  maxRecords: 0,
  strict: true,
};

/**
 * Extracts a single account from a record string
 *
 * @param record - The raw record text
 * @param options - Parser options
 * @returns Parsed record or null if parsing failed
 */
function parseRecord(record: string, options: Required<ParserOptions>): ParsedRecord | null {
  const trimmed = record.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const result: ParsedRecord = {
    unknown: [],
    confidence: 0,
    raw: trimmed,
  };

  // Try to extract key-value pairs first
  const kvPairs = extractKeyValuePairs(trimmed, options.delimiter);

  // If no key-value pairs found, try to parse as a simple line
  if (Object.keys(kvPairs).length === 0) {
    // Treat the entire record as potential field values
    const parts = trimmed.split(/[\s,;|]+/).filter((p) => p.length > 0);

    for (const part of parts) {
      const detection = detectFieldType(part);
      assignField(result, detection, { fieldName: '' });
    }
  } else {
    // Process each key-value pair
    for (const [rawKey, value] of Object.entries(kvPairs)) {
      const normalizedKey = normalizeFieldName(rawKey);
      const detection = detectFieldType(value, { fieldName: normalizedKey });

      // Special handling for known field names
      if (normalizedKey === 'email' || normalizedKey === 'account') {
        if (detection.type === FieldType.Email || detection.type === FieldType.RecoveryEmail) {
          result.email = detection.value;
          result.confidence += detection.confidence * 0.3;
        } else {
          // Value doesn't look like email, but key suggests it is
          result.email = value.trim();
          result.confidence += 0.2;
        }
        continue;
      }

      if (normalizedKey === 'password' || normalizedKey === 'pwd') {
        result.password = detection.value;
        result.confidence += detection.confidence * 0.2;
        continue;
      }

      if (normalizedKey === 'recoveryemail' || normalizedKey === 'recovery') {
        if (detection.type === FieldType.Email || detection.type === FieldType.RecoveryEmail) {
          result.recoveryEmail = detection.value;
          result.confidence += detection.confidence * 0.15;
        }
        continue;
      }

      if (normalizedKey === 'totpsecret' || normalizedKey === 'totp' || normalizedKey === '2fa') {
        result.totpSecret = detection.value;
        result.confidence += detection.confidence * 0.15;
        continue;
      }

      if (normalizedKey === 'year') {
        result.year = detection.value;
        result.confidence += detection.confidence * 0.05;
        continue;
      }

      if (normalizedKey === 'country') {
        result.country = detection.value;
        result.confidence += detection.confidence * 0.05;
        continue;
      }

      // Unknown field - use type detection
      assignField(result, detection, { fieldName: normalizedKey, rawKey });
    }
  }

  // Normalize confidence to 0-1 range
  result.confidence = Math.min(1, result.confidence);

  // If strict mode and no email found, reject this record
  if (options.strict && !result.email) {
    // Try to find any email-like value as a last resort
    for (const unknown of result.unknown) {
      const emailDetection = detectFieldType(unknown.value);
      if (emailDetection.type === FieldType.Email || emailDetection.type === FieldType.RecoveryEmail) {
        result.email = emailDetection.value;
        result.confidence += 0.3;
        break;
      }
    }

    if (!result.email) {
      return null;
    }
  }

  return result;
}

/**
 * Assigns a detected field to the appropriate slot in a parsed record
 *
 * @param record - The record to modify
 * @param detection - The field detection result
 * @param context - Additional context (field name, raw key)
 */
function assignField(
  record: ParsedRecord,
  detection: FieldDetectionResult,
  context: {
    fieldName: string;
    rawKey?: string;
  }
): void {
  const { fieldName, rawKey } = context;

  // Skip if confidence is too low
  if (detection.confidence < DEFAULT_OPTIONS.minConfidence) {
    record.unknown.push({
      key: rawKey || fieldName,
      value: detection.value,
      confidence: detection.confidence,
    });
    return;
  }

  switch (detection.type) {
    case FieldType.Email:
      // Primary email - highest priority
      if (!record.email) {
        record.email = detection.value;
        record.confidence += detection.confidence * 0.3;
      }
      break;

    case FieldType.RecoveryEmail:
      // Secondary email
      if (!record.recoveryEmail) {
        record.recoveryEmail = detection.value;
        record.confidence += detection.confidence * 0.15;
      }
      // If no primary email yet, use this as primary
      if (!record.email) {
        record.email = detection.value;
        record.confidence += detection.confidence * 0.2;
      }
      break;

    case FieldType.Password:
      if (!record.password) {
        record.password = detection.value;
        record.confidence += detection.confidence * 0.2;
      }
      break;

    case FieldType.TotpSecret:
      if (!record.totpSecret) {
        record.totpSecret = detection.value;
        record.confidence += detection.confidence * 0.15;
      }
      break;

    case FieldType.Year:
      if (!record.year) {
        record.year = detection.value;
        record.confidence += detection.confidence * 0.05;
      }
      break;

    case FieldType.Country:
      if (!record.country) {
        record.country = detection.value;
        record.confidence += detection.confidence * 0.05;
      }
      break;

    default:
      // Unknown field type
      record.unknown.push({
        key: rawKey || fieldName,
        value: detection.value,
        confidence: detection.confidence,
      });
  }
}

/**
 * Converts an internal ParsedRecord to a ParsedAccount
 *
 * @param record - The internal parsed record
 * @param options - Parser options
 * @returns ParsedAccount object
 */
function finalizeRecord(record: ParsedRecord, options: Required<ParserOptions>): ParsedAccount {
  return {
    email: record.email || '',
    password: record.password,
    recoveryEmail: record.recoveryEmail,
    totpSecret: record.totpSecret,
    year: record.year,
    country: record.country,
    unknown: options.includeUnknown
      ? record.unknown.map((u) => `${u.key}:${u.value}`)
      : [],
    confidence: record.confidence,
  };
}

/**
 * Parses raw account text into structured ParsedAccount objects
 *
 * This is the main entry point for the parser. It handles:
 * - Multi-record input (text containing multiple accounts)
 * - Automatic delimiter detection
 * - Field type classification
 * - Confidence scoring
 *
 * @param text - Raw text to parse
 * @param options - Parser options for customizing behavior
 * @returns Array of parsed accounts
 *
 * @example
 * ```ts
 * const text = `
 * ----
 * email: user@gmail.com
 * password: secret123
 * ----
 * email: user2@gmail.com
 * recovery: backup@gmail.com
 * `;
 *
 * const accounts = parseAccounts(text);
 * // Returns: [
 * //   { email: 'user@gmail.com', password: 'secret123', unknown: [], confidence: 0.5 },
 * //   { email: 'user2@gmail.com', recoveryEmail: 'backup@gmail.com', unknown: [], confidence: 0.45 }
 * // ]
 * ```
 */
export function parseAccounts(text: string, options: ParserOptions = {}): ParsedAccount[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: ParsedAccount[] = [];

  // Handle empty input
  if (!text || text.trim().length === 0) {
    return results;
  }

  // Detect delimiter if not provided
  const delimiter = opts.delimiter || detectDelimiter(text).delimiter;
  opts.delimiter = delimiter;

  // Split into records
  const records = splitIntoRecords(text, delimiter);

  // Parse each record
  for (const record of records) {
    // Check max records limit
    if (opts.maxRecords > 0 && results.length >= opts.maxRecords) {
      break;
    }

    const parsed = parseRecord(record, opts);
    if (parsed) {
      results.push(finalizeRecord(parsed, opts));
    }
  }

  return results;
}

/**
 * Parses a single account from text
 *
 * Convenience function for parsing a single account record.
 * Returns the first (or only) account found in the text.
 *
 * @param text - Raw text to parse
 * @param options - Parser options
 * @returns Parsed account or null if no account found
 */
export function parseAccount(text: string, options: ParserOptions = {}): ParsedAccount | null {
  const accounts = parseAccounts(text, { ...options, maxRecords: 1 });
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Validates a ParsedAccount object
 *
 * Checks if the parsed account meets minimum validity requirements.
 * Useful for filtering out low-quality or incomplete parses.
 *
 * @param account - The account to validate
 * @param options - Validation options
 * @returns True if the account is valid
 */
export function isValidAccount(
  account: ParsedAccount,
  options: {
    /** Minimum confidence threshold (default: 0.3) */
    minConfidence?: number;
    /** Whether email is required (default: true) */
    requireEmail?: boolean;
  } = {}
): boolean {
  const minConfidence = options.minConfidence ?? 0.3;
  const requireEmail = options.requireEmail ?? true;

  if (account.confidence < minConfidence) {
    return false;
  }

  if (requireEmail && !account.email) {
    return false;
  }

  // Email should look somewhat valid if present
  if (account.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
    return false;
  }

  return true;
}

/**
 * Filters valid accounts from a parse result
 *
 * @param accounts - Array of parsed accounts
 * @param options - Validation options
 * @returns Filtered array of valid accounts
 */
export function filterValidAccounts(
  accounts: ParsedAccount[],
  options?: {
    minConfidence?: number;
    requireEmail?: boolean;
  }
): ParsedAccount[] {
  return accounts.filter((account) => isValidAccount(account, options));
}

/**
 * Gets parsing statistics for a batch of accounts
 *
 * @param accounts - Array of parsed accounts
 * @returns Statistics object
 */
export function getParseStats(accounts: ParsedAccount[]): {
  total: number;
  valid: number;
  invalid: number;
  averageConfidence: number;
  fieldCounts: Record<string, number>;
} {
  const stats = {
    total: accounts.length,
    valid: 0,
    invalid: 0,
    averageConfidence: 0,
    fieldCounts: {
      email: 0,
      password: 0,
      recoveryEmail: 0,
      totpSecret: 0,
      year: 0,
      country: 0,
    },
  };

  let totalConfidence = 0;

  for (const account of accounts) {
    if (isValidAccount(account)) {
      stats.valid++;
    } else {
      stats.invalid++;
    }

    totalConfidence += account.confidence;

    if (account.email) stats.fieldCounts.email++;
    if (account.password) stats.fieldCounts.password++;
    if (account.recoveryEmail) stats.fieldCounts.recoveryEmail++;
    if (account.totpSecret) stats.fieldCounts.totpSecret++;
    if (account.year) stats.fieldCounts.year++;
    if (account.country) stats.fieldCounts.country++;
  }

  stats.averageConfidence = accounts.length > 0 ? totalConfidence / accounts.length : 0;

  return stats;
}
