/**
 * Field type detection for account parser
 *
 * This module identifies the type of data contained in field values.
 * It uses pattern matching and heuristics to classify fields into known types:
 * - Email addresses (primary and recovery)
 * - TOTP/2FA secrets (Base32 encoded)
 * - Year values
 * - Country names
 * - Passwords
 *
 * Each detector returns a confidence score to indicate how certain the classification is.
 */

/**
 * Known field type classifications
 */
export enum FieldType {
  /** Primary email address (gmail.com or google.com domains) */
  Email = 'email',
  /** Recovery/alternate email address (any domain) */
  RecoveryEmail = 'recoveryEmail',
  /** TOTP/2FA secret (Base32 encoded) */
  TotpSecret = 'totpSecret',
  /** Year value (1900-2099) */
  Year = 'year',
  /** Country name or code */
  Country = 'country',
  /** Password value */
  Password = 'password',
  /** Unknown/unclassified field type */
  Unknown = 'unknown',
}

/**
 * Result of field type detection
 */
export interface FieldDetectionResult {
  /** The detected field type */
  type: FieldType;
  /** Normalized/cleaned value (if applicable) */
  value: string;
  /** Confidence score (0-1, higher is more certain) */
  confidence: number;
  /** Whether the value should be considered sensitive data */
  sensitive: boolean;
}

/**
 * Common country names in English and Chinese
 * Used for detecting country fields in account data
 */
const COUNTRY_NAMES: ReadonlySet<string> = new Set([
  // English names
  'United States', 'USA', 'US', 'America',
  'United Kingdom', 'UK', 'Britain', 'England',
  'Canada', 'Australia', 'New Zealand', 'Ireland',
  'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Switzerland', 'Austria', 'Sweden',
  'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal',
  'Russia', 'China', 'Japan', 'Korea', 'India',
  'Brazil', 'Argentina', 'Mexico', 'Singapore',
  'Hong Kong', 'Taiwan', 'Thailand', 'Vietnam',
  'Malaysia', 'Indonesia', 'Philippines', 'Israel',
  'UAE', 'Saudi Arabia', 'South Africa', 'Egypt',
  // Chinese names
  '美国', '英国', '加拿大', '澳大利亚', '新西兰',
  '德国', '法国', '西班牙', '意大利', '荷兰',
  '比利时', '瑞士', '奥地利', '瑞典', '挪威',
  '丹麦', '芬兰', '波兰', '葡萄牙', '俄罗斯',
  '中国', '日本', '韩国', '印度', '巴西',
  '阿根廷', '墨西哥', '新加坡', '香港', '台湾',
  '泰国', '越南', '马来西亚', '印尼', '菲律宾',
  '以色列', '阿联酋', '沙特', '南非', '埃及',
]);

/**
 * Country code mappings (ISO 3166-1 alpha-2)
 */
const COUNTRY_CODES: ReadonlyMap<string, string> = new Map([
  ['US', 'United States'],
  ['UK', 'United Kingdom'],
  ['GB', 'United Kingdom'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['CN', 'China'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['IN', 'India'],
  ['BR', 'Brazil'],
  ['SG', 'Singapore'],
  ['TW', 'Taiwan'],
  ['TH', 'Thailand'],
  ['VN', 'Vietnam'],
  ['MY', 'Malaysia'],
  ['ID', 'Indonesia'],
  ['PH', 'Philippines'],
  ['IL', 'Israel'],
  ['AE', 'United Arab Emirates'],
  ['SA', 'Saudi Arabia'],
  ['ZA', 'South Africa'],
  ['EG', 'Egypt'],
]);

/**
 * Email field detection patterns
 *
 * Primary email: gmail.com or google.com domains (most common for Google accounts)
 * Recovery email: any valid email domain
 */
const EMAIL_PATTERNS = {
  /**
   * Primary email pattern - matches gmail.com or google.com domains
   * This is the main identifier for Google accounts
   */
  primary: /^[a-zA-Z0-9._%+-]+@(gmail\.com|google\.com|googlemail\.com)$/i,

  /**
   * Recovery/secondary email pattern - matches any valid email
   * Used for backup email addresses
   */
  recovery: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
};

/**
 * TOTP secret detection pattern
 *
 * TOTP secrets are Base32 encoded strings (A-Z, 2-7)
 * Common lengths: 16, 20, 26, 32 characters
 */
const TOTP_PATTERN = /^[A-Z2-7]{16,32}$/i;

/**
 * Year detection pattern
 *
 * Matches years from 1900-2099
 */
const YEAR_PATTERN = /^(19|20)\d{2}$/;

/**
 * Password field heuristics
 *
 * Passwords are identified by process of elimination and characteristics:
 * - Length: typically 8-50 characters
 * - No obvious pattern that matches other field types
 * - May contain special characters, numbers, mixed case
 */
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 100;

/**
 * Detects if a value is a primary email address
 *
 * @param value - The value to check
 * @returns Detection result with confidence score
 */
export function detectEmail(value: string): FieldDetectionResult | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Check against primary email pattern
  if (EMAIL_PATTERNS.primary.test(trimmed)) {
    return {
      type: FieldType.Email,
      value: trimmed.toLowerCase(),
      confidence: 1.0,
      sensitive: true,
    };
  }

  // Check against general email pattern for less certain match
  if (EMAIL_PATTERNS.recovery.test(trimmed)) {
    return {
      type: FieldType.RecoveryEmail,
      value: trimmed.toLowerCase(),
      confidence: 0.9,
      sensitive: true,
    };
  }

  return null;
}

/**
 * Detects if a value is a TOTP/2FA secret
 *
 * TOTP secrets are Base32 encoded (A-Z, 2-7) and typically 16-32 characters
 *
 * @param value - The value to check
 * @returns Detection result with confidence score
 */
export function detectTotpSecret(value: string): FieldDetectionResult | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Remove spaces and hyphens (sometimes used for readability)
  const normalized = trimmed.replace(/[\s-]/g, '');

  if (!TOTP_PATTERN.test(normalized)) {
    return null;
  }

  // Check length - common TOTP secret lengths
  const confidence = normalized.length >= 20 && normalized.length <= 32 ? 0.95 : 0.8;

  return {
    type: FieldType.TotpSecret,
    value: normalized.toUpperCase(),
    confidence,
    sensitive: true,
  };
}

/**
 * Detects if a value is a year
 *
 * @param value - The value to check
 * @returns Detection result with confidence score
 */
export function detectYear(value: string): FieldDetectionResult | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Must match the year pattern
  if (!YEAR_PATTERN.test(trimmed)) {
    return null;
  }

  const yearNum = parseInt(trimmed, 10);
  const currentYear = new Date().getFullYear();

  // Higher confidence for reasonable account-related years
  if (yearNum >= 2000 && yearNum <= currentYear + 1) {
    return {
      type: FieldType.Year,
      value: trimmed,
      confidence: 0.95,
      sensitive: false,
    };
  }

  // Lower confidence for years outside typical range
  if (yearNum >= 1990 && yearNum <= 2030) {
    return {
      type: FieldType.Year,
      value: trimmed,
      confidence: 0.7,
      sensitive: false,
    };
  }

  return {
    type: FieldType.Year,
    value: trimmed,
    confidence: 0.5,
    sensitive: false,
  };
}

/**
 * Detects if a value is a country name or code
 *
 * @param value - The value to check
 * @returns Detection result with confidence score
 */
export function detectCountry(value: string): FieldDetectionResult | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Check exact match against known country names
  if (COUNTRY_NAMES.has(trimmed)) {
    // Normalize to full name if it's a code
    const normalizedName = COUNTRY_CODES.get(trimmed.toUpperCase()) || trimmed;
    return {
      type: FieldType.Country,
      value: normalizedName,
      confidence: 0.95,
      sensitive: false,
    };
  }

  // Check case-insensitive match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const country of Array.from(COUNTRY_NAMES)) {
    if (country.toLowerCase() === lowerTrimmed) {
      return {
        type: FieldType.Country,
        value: country,
        confidence: 0.9,
        sensitive: false,
      };
    }
  }

  // Check for country code
  const upperTrimmed = trimmed.toUpperCase();
  if (COUNTRY_CODES.has(upperTrimmed)) {
    return {
      type: FieldType.Country,
      value: COUNTRY_CODES.get(upperTrimmed)!,
      confidence: 0.9,
      sensitive: false,
    };
  }

  // Check for partial match (country name contains value)
  for (const country of Array.from(COUNTRY_NAMES)) {
    if (country.toLowerCase().includes(lowerTrimmed) && lowerTrimmed.length > 2) {
      return {
        type: FieldType.Country,
        value: country,
        confidence: 0.6,
        sensitive: false,
      };
    }
  }

  return null;
}

/**
 * Detects if a value is likely a password
 *
 * Password detection is tricky because passwords can be anything.
 * We use a process of elimination and heuristics:
 * 1. Not matched by other detectors
 * 2. Reasonable length (6-100 characters)
 * 3. Not obviously another data type
 *
 * @param value - The value to check
 * @param context - Additional context for better detection
 * @returns Detection result with confidence score
 */
export function detectPassword(
  value: string,
  context: { fieldName?: string } = {}
): FieldDetectionResult | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Length check
  if (trimmed.length < PASSWORD_MIN_LENGTH || trimmed.length > PASSWORD_MAX_LENGTH) {
    return null;
  }

  // Field name hints
  const fieldNameLower = context.fieldName?.toLowerCase() || '';
  if (fieldNameLower.includes('pass') || fieldNameLower.includes('pwd') || fieldNameLower === '密码') {
    return {
      type: FieldType.Password,
      value: trimmed,
      confidence: 0.95,
      sensitive: true,
    };
  }

  // Check if it matches other patterns first (process of elimination)
  if (EMAIL_PATTERNS.primary.test(trimmed) || EMAIL_PATTERNS.recovery.test(trimmed)) {
    return null;
  }

  if (YEAR_PATTERN.test(trimmed)) {
    return null;
  }

  if (TOTP_PATTERN.test(trimmed.replace(/[\s-]/g, ''))) {
    return null;
  }

  // Heuristic: passwords often have mixed characters
  const hasLowerCase = /[a-z]/.test(trimmed);
  const hasUpperCase = /[A-Z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);
  const hasSpecial = /[^a-zA-Z0-9]/.test(trimmed);

  const varietyCount = [hasLowerCase, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  // Higher confidence for passwords with character variety
  let confidence = 0.5;
  if (varietyCount >= 3) {
    confidence = 0.8;
  } else if (varietyCount >= 2) {
    confidence = 0.7;
  }

  // Increase confidence if length is in typical password range
  if (trimmed.length >= 8 && trimmed.length <= 32) {
    confidence += 0.1;
  }

  return {
    type: FieldType.Password,
    value: trimmed,
    confidence: Math.min(1, confidence),
    sensitive: true,
  };
}

/**
 * Detects the field type for a given value
 *
 * This is the main entry point that tries all detectors
 * and returns the best match with the highest confidence.
 *
 * Priority order:
 * 1. Email (primary) - highest confidence, most specific
 * 2. TOTP Secret - very specific pattern
 * 3. Year - specific pattern but less critical
 * 4. Country - lookup-based detection
 * 5. Recovery Email - general email pattern
 * 6. Password - process of elimination
 * 7. Unknown - default fallback
 *
 * @param value - The value to classify
 * @param context - Additional context (field name, etc.)
 * @returns Detection result with field type and confidence
 */
export function detectFieldType(
  value: string,
  context: { fieldName?: string } = {}
): FieldDetectionResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      type: FieldType.Unknown,
      value: '',
      confidence: 0,
      sensitive: false,
    };
  }

  // Try each detector in priority order
  const detectors: Array<(v: string, ctx?: { fieldName?: string }) => FieldDetectionResult | null> = [
    detectEmail,
    detectTotpSecret,
    detectYear,
    detectCountry,
    // detectPassword is handled separately as fallback
  ];

  let bestResult: FieldDetectionResult | null = null;
  let bestConfidence = 0;

  for (const detector of detectors) {
    const result = detector(trimmed, context);
    if (result && result.confidence > bestConfidence) {
      bestResult = result;
      bestConfidence = result.confidence;
    }
  }

  // If we found a high-confidence match, return it
  if (bestResult && bestConfidence >= 0.8) {
    return bestResult;
  }

  // Try password detection for remaining values
  const passwordResult = detectPassword(trimmed, context);
  if (passwordResult && passwordResult.confidence > bestConfidence) {
    return passwordResult;
  }

  // Return best result or unknown
  return bestResult || {
    type: FieldType.Unknown,
    value: trimmed,
    confidence: 0,
    sensitive: false,
  };
}

/**
 * Normalizes a field name to a standard key
 *
 * Handles common variations like "Email", "email", "E-mail", "电子邮件", etc.
 *
 * @param fieldName - The field name to normalize
 * @returns Normalized field key
 */
export function normalizeFieldName(fieldName: string): string {
  const trimmed = fieldName.trim().toLowerCase();

  // Common mappings
  const mappings: Record<string, string> = {
    // Email variations
    'email': 'email',
    'e-mail': 'email',
    '电子邮件': 'email',
    '邮箱': 'email',
    '账号': 'email',
    'account': 'email',
    'mail': 'email',
    'gmail': 'email',

    // Password variations
    'password': 'password',
    'pwd': 'password',
    'pass': 'password',
    '密码': 'password',
    '口令': 'password',

    // Recovery email variations
    'recovery': 'recoveryEmail',
    'recovery email': 'recoveryEmail',
    'recovery-email': 'recoveryEmail',
    'recovery_email': 'recoveryEmail',
    '备用邮箱': 'recoveryEmail',
    '恢复邮箱': 'recoveryEmail',
    '备用邮件': 'recoveryEmail',

    // TOTP variations
    'totp': 'totpSecret',
    '2fa': 'totpSecret',
    '2factor': 'totpSecret',
    'two factor': 'totpSecret',
    'secret': 'totpSecret',
    '验证码': 'totpSecret',
    '两步验证': 'totpSecret',
    '密钥': 'totpSecret',

    // Year variations
    'year': 'year',
    '年份': 'year',

    // Country variations
    'country': 'country',
    '国家': 'country',
    '地区': 'country',
  };

  return mappings[trimmed] || trimmed;
}

/**
 * Checks if a value matches a specific field type hint
 *
 * @param value - The value to check
 * @param typeHint - The expected field type
 * @returns True if the value matches the type hint
 */
export function matchesTypeHint(value: string, typeHint: string): boolean {
  const trimmed = value.trim();

  switch (typeHint.toLowerCase()) {
    case 'email':
      return EMAIL_PATTERNS.primary.test(trimmed) || EMAIL_PATTERNS.recovery.test(trimmed);
    case 'year':
      return YEAR_PATTERN.test(trimmed);
    case 'totp':
    case 'secret':
      return TOTP_PATTERN.test(trimmed.replace(/[\s-]/g, ''));
    case 'country':
      return COUNTRY_NAMES.has(trimmed) || COUNTRY_CODES.has(trimmed.toUpperCase());
    default:
      return false;
  }
}
