/**
 * Account Parser Package
 *
 * This package parses raw account strings into structured ParsedAccount objects.
 * It provides automatic delimiter detection, field type classification, and
 * confidence scoring for robust account data extraction.
 *
 * @packageDocumentation
 */

// Export delimiter detection utilities
export {
  detectDelimiter,
  splitIntoRecords,
  extractKeyValuePairs,
  type DelimiterResult,
} from './delimiter.js';

// Export field type detection utilities
export {
  detectFieldType,
  detectEmail,
  detectTotpSecret,
  detectYear,
  detectCountry,
  detectPassword,
  normalizeFieldName,
  matchesTypeHint,
  FieldType,
  type FieldDetectionResult,
} from './fieldDetector.js';

// Export main parser functions
export {
  parseAccounts,
  parseAccount,
  isValidAccount,
  filterValidAccounts,
  getParseStats,
  type ParserOptions,
} from './parser.js';

// Re-export commonly used types from shared package
export type { ParsedAccount } from '@gmanager/shared';
