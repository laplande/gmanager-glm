/**
 * Constants for GManager shared package
 *
 * This module defines field patterns, delimiters, and other
 * configuration constants used across the application.
 */

/**
 * Field name patterns for parsing account data
 * Each pattern maps to a canonical field name
 */
export const FIELD_PATTERNS = Object.freeze({
  // Email patterns
  email: [
    'email',
    'mail',
    'e-mail',
    'correo',
    'e_mail',
    'e mail',
    'mailaddress',
    'mail_address',
  ],
  // Password patterns
  password: [
    'password',
    'pass',
    'pwd',
    'passwd',
    'contraseña',
    'senha',
    'passwort',
    'key',
    'secret',
  ],
  // Recovery email patterns
  recoveryEmail: [
    'recovery',
    'recovery email',
    'recovery-email',
    'recovery_email',
    'recoveryemail',
    'recovery_mail',
    'recovery-mail',
    'backup',
    'backup email',
    'backup-email',
    'backup_email',
    'backupemail',
    'recuperacion',
    'recuperacao',
  ],
  // TOTP/2FA patterns
  totpSecret: [
    'totp',
    '2fa',
    '2fa_secret',
    '2fa-secret',
    '2factor',
    '2-factor',
    'two factor',
    'two-factor',
    'twofactor',
    'authenticator',
    'mfa',
    'verification code',
    'verification_code',
    'verification-code',
    'verify code',
    'authkey',
    'auth_key',
    'auth-key',
    'secretkey',
    'secret_key',
    'secret-key',
    'otp',
    'otpsecret',
  ],
  // Year patterns
  year: [
    'year',
    'año',
    'ano',
    'created',
    'created at',
    'created_at',
    'registered',
    'registered at',
    'registration',
  ],
  // Country patterns
  country: [
    'country',
    'pais',
    'país',
    'region',
    'location',
    'nation',
  ],
  // Notes patterns
  notes: [
    'notes',
    'note',
    'comment',
    'comments',
    'info',
    'information',
    'description',
    'desc',
    'remarks',
    'observation',
    'observations',
    'notas',
    'comentario',
  ],
} as const);

/**
 * Field delimiters used when parsing raw text
 * Characters that separate field names from values
 */
export const FIELD_DELIMITERS = Object.freeze([
  ':',    // Standard: "email: user@example.com"
  '=',    // Assignment: "email=user@example.com"
  '|',    // Pipe: "email|user@example.com"
  '-',    // Dash: "email-user@example.com"
  '→',    // Arrow: "email→user@example.com"
  '=>',   // Fat arrow: "email=>user@example.com"
  '~',    // Tilde: "email~user@example.com"
] as const);

/**
 * Record delimiters used when parsing multi-account text
 * Characters or patterns that separate individual accounts
 */
export const RECORD_DELIMITERS = Object.freeze([
  '\n\n',          // Double newline
  '\r\n\r\n',     // Windows double newline
  '---',          // Markdown separator
  '==============', // Common underline separator
  '_______________', // Common underline separator
] as const);

/**
 * Default field display order
 * Lower numbers appear first in the UI
 */
export const DEFAULT_FIELD_ORDER = Object.freeze({
  email: 0,
  password: 1,
  recoveryEmail: 2,
  totpSecret: 3,
  year: 4,
  country: 5,
  notes: 6,
} as const);

/**
 * Standard account field definitions
 */
export const ACCOUNT_FIELDS = Object.freeze([
  {
    name: 'email',
    label: 'Email',
    sensitive: true,
    required: true,
    type: 'email' as const,
    order: 0,
  },
  {
    name: 'password',
    label: 'Password',
    sensitive: true,
    required: false,
    type: 'password' as const,
    order: 1,
  },
  {
    name: 'recoveryEmail',
    label: 'Recovery Email',
    sensitive: true,
    required: false,
    type: 'email' as const,
    order: 2,
  },
  {
    name: 'totpSecret',
    label: 'TOTP Secret',
    sensitive: true,
    required: false,
    type: 'secret' as const,
    order: 3,
  },
  {
    name: 'year',
    label: 'Year',
    sensitive: false,
    required: false,
    type: 'text' as const,
    order: 4,
  },
  {
    name: 'country',
    label: 'Country',
    sensitive: false,
    required: false,
    type: 'text' as const,
    order: 5,
  },
  {
    name: 'notes',
    label: 'Notes',
    sensitive: true,
    required: false,
    type: 'text' as const,
    order: 6,
  },
] as const);

/**
 * Default password policy
 */
export const DEFAULT_PASSWORD_POLICY = Object.freeze({
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: false,
} as const);

/**
 * Encryption defaults
 */
export const ENCRYPTION_DEFAULTS = Object.freeze({
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 12,  // 96 bits for GCM
  saltLength: 16, // 128 bits
} as const);

/**
 * KDF defaults (Argon2id recommended)
 */
export const KDF_DEFAULTS = Object.freeze({
  type: 'argon2id' as const,
  iterations: 3,      // Time cost
  memory: 65536,      // 64 MB in KB
  parallelism: 4,     // Threads
  keyLength: 32,      // 256 bits
  saltLength: 16,     // 128 bits
} as const);

/**
 * Confidence thresholds for parsing
 */
export const CONFIDENCE_THRESHOLDS = Object.freeze({
  HIGH: 0.8,    // High confidence - auto-accept
  MEDIUM: 0.5,  // Medium confidence - review suggested
  LOW: 0.3,     // Low confidence - manual review required
} as const);

/**
 * Common TOTP secret formats/prefixes
 */
export const TOTP_PREFIXES = Object.freeze([
  'otpauth://totp/',
  'otpauth://hotp/',
  'KXD',
  'JBSWY3DPEHPK3PXP', // Base32 "Hello!"
] as const);

/**
 * Supported file extensions for import
 */
export const SUPPORTED_IMPORT_EXTENSIONS = Object.freeze([
  '.txt',
  '.csv',
  '.json',
] as const);

/**
 * Maximum file size for import (in bytes)
 * Default: 10 MB
 */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Default color palette for groups and tags
 */
export const DEFAULT_COLORS = Object.freeze([
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
] as const);

/**
 * Application limits
 */
export const APP_LIMITS = Object.freeze({
  MAX_ACCOUNTS_PER_IMPORT: 1000,
  MAX_GROUPS: 100,
  MAX_TAGS: 100,
  MAX_TAGS_PER_ACCOUNT: 20,
} as const);

/**
 * Date format for ISO timestamps
 */
export const ISO_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";

/**
 * UI constants
 */
export const UI_CONSTANTS = Object.freeze({
  DEBOUNCE_DELAY: 300,        // ms
  TOAST_DURATION: 3000,       // ms
  MODAL_ANIMATION_DURATION: 200, // ms
} as const);
