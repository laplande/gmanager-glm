/**
 * Delimiter detection for account parser
 *
 * This module provides automatic delimiter detection for parsing raw account data.
 * Different data sources use different separators between fields, and this module
 * intelligently identifies the most likely delimiter based on statistical analysis.
 *
 * Priority order (most reliable first):
 * 1. '----' - Explicit record separator (four dashes)
 * 2. '|' - Pipe delimiter (structured exports)
 * 3. '密码：' - Chinese password label indicator
 * 4. ':' - Standard key-value separator
 * 5. '\t' - Tab delimiter (spreadsheet exports)
 * 6. ' ' - Space delimiter (least reliable)
 */

/**
 * Result of delimiter detection
 */
export interface DelimiterResult {
  /** The detected delimiter character/string */
  delimiter: string;
  /** Confidence score (0-1, higher is more certain) */
  confidence: number;
  /** Number of occurrences found in the text */
  count: number;
  /** Whether the delimiter appears consistently across lines */
  consistency: number;
}

/**
 * Delimiter candidates in priority order
 * Higher priority delimiters are more specific and reliable
 */
const DELIMITER_CANDIDATES: ReadonlyArray<{
  /** The delimiter string to detect */
  delimiter: string;
  /**
   * Minimum number of occurrences required to consider this delimiter valid
   * Lower values for more specific delimiters, higher for common ones
   */
  minOccurrences: number;
  /**
   * Weight for confidence calculation (0-1)
   * Higher weight = more reliable when found
   */
  weight: number;
  /** Description for debugging */
  description: string;
}> = [
  { delimiter: '----', minOccurrences: 1, weight: 1.0, description: 'explicit record separator' },
  { delimiter: '|', minOccurrences: 2, weight: 0.9, description: 'pipe delimiter' },
  { delimiter: '密码：', minOccurrences: 1, weight: 0.95, description: 'Chinese password label' },
  { delimiter: ':', minOccurrences: 2, weight: 0.7, description: 'colon key-value' },
  { delimiter: '\t', minOccurrences: 2, weight: 0.8, description: 'tab delimiter' },
  { delimiter: ' ', minOccurrences: 5, weight: 0.3, description: 'space delimiter' },
] as const;

/**
 * Minimum confidence threshold for accepting a detected delimiter
 * Delimiters below this threshold are considered unreliable
 */
const MIN_CONFIDENCE = 0.3;

/**
 * Analyzes a single line to count delimiter occurrences
 *
 * @param line - The line to analyze
 * @param delimiter - The delimiter to count
 * @returns Number of occurrences in this line
 */
function countOccurrencesInLine(line: string, delimiter: string): number {
  if (delimiter === ' ') {
    // For spaces, count actual word separators (ignore multiple consecutive spaces)
    return line.trim().split(/\s+/).length - 1;
  }

  let count = 0;
  let position = 0;

  while (position < line.length) {
    const found = line.indexOf(delimiter, position);
    if (found === -1) break;
    count++;
    position = found + delimiter.length;
  }

  return count;
}

/**
 * Calculates line-based consistency score for a delimiter
 *
 * A delimiter is more reliable if it appears consistently across multiple lines
 * rather than being concentrated in a single line.
 *
 * @param lines - Array of text lines
 * @param delimiter - The delimiter to analyze
 * @returns Consistency score (0-1)
 */
function calculateConsistency(lines: string[], delimiter: string): number {
  const linesWithDelimiter = lines.filter((line) =>
    countOccurrencesInLine(line, delimiter) > 0
  );

  if (linesWithDelimiter.length === 0) {
    return 0;
  }

  // Calculate average occurrences per line that contains the delimiter
  const totalOccurrences = linesWithDelimiter.reduce(
    (sum, line) => sum + countOccurrencesInLine(line, delimiter),
    0
  );

  const avgOccurrences = totalOccurrences / linesWithDelimiter.length;

  // Consistency is higher when most non-empty lines have the delimiter
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const coverage = linesWithDelimiter.length / nonEmptyLines.length;

  // Combine coverage and average occurrences
  // High coverage + reasonable occurrences = high consistency
  return Math.min(1, coverage * (avgOccurrences >= 1 ? 1 : avgOccurrences));
}

/**
 * Detects the most likely delimiter in the given text
 *
 * This function analyzes the input text using statistical heuristics to identify
 * which delimiter is most likely being used to separate fields. It considers:
 * - Number of occurrences
 * - Consistency across lines
 * - Priority weighting (more specific delimiters are preferred)
 *
 * @param text - The raw text to analyze
 * @returns Delimiter detection result with confidence score
 */
export function detectDelimiter(text: string): DelimiterResult {
  // Handle empty or whitespace-only input
  if (!text || text.trim().length === 0) {
    return {
      delimiter: ':',
      confidence: 0,
      count: 0,
      consistency: 0,
    };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      delimiter: ':',
      confidence: 0,
      count: 0,
      consistency: 0,
    };
  }

  const results: Array<DelimiterResult & { weight: number }> = [];

  // Analyze each delimiter candidate
  for (const candidate of DELIMITER_CANDIDATES) {
    const { delimiter, minOccurrences, weight } = candidate;

    let totalCount = 0;

    for (const line of lines) {
      totalCount += countOccurrencesInLine(line, delimiter);
    }

    // Skip if minimum occurrence threshold not met
    if (totalCount < minOccurrences) {
      continue;
    }

    const consistency = calculateConsistency(lines, delimiter);

    // Calculate base confidence from count and consistency
    const countScore = Math.min(1, totalCount / (lines.length * 2)); // Normalize against line count
    const baseConfidence = (countScore * 0.4) + (consistency * 0.6);

    // Apply delimiter weight (specific delimiters get boosted)
    const weightedConfidence = baseConfidence * weight;

    results.push({
      delimiter,
      confidence: weightedConfidence,
      count: totalCount,
      consistency,
      weight,
    });
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);

  // Return the best match, or a default if nothing detected
  if (results.length > 0 && results[0].confidence >= MIN_CONFIDENCE) {
    return {
      delimiter: results[0].delimiter,
      confidence: results[0].confidence,
      count: results[0].count,
      consistency: results[0].consistency,
    };
  }

  // Fallback: try to detect any colon usage (very common in key-value pairs)
  const colonCount = lines.reduce((sum, line) => sum + countOccurrencesInLine(line, ':'), 0);
  if (colonCount > 0) {
    return {
      delimiter: ':',
      confidence: 0.2,
      count: colonCount,
      consistency: calculateConsistency(lines, ':'),
    };
  }

  // Last resort: default to colon
  return {
    delimiter: ':',
    confidence: 0,
    count: 0,
    consistency: 0,
  };
}

/**
 * Splits text into records using the detected or provided delimiter
 *
 * @param text - The raw text to split
 * @param delimiter - Optional delimiter (auto-detected if not provided)
 * @returns Array of record strings
 */
export function splitIntoRecords(text: string, delimiter?: string): string[] {
  const detected = delimiter || detectDelimiter(text).delimiter;

  // Special handling for explicit record separator
  if (detected === '----') {
    return text
      .split(/----+/)
      .map((record) => record.trim())
      .filter((record) => record.length > 0);
  }

  // For other delimiters, split by lines and group by delimiter patterns
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  // If delimiter is consistent per-line, each line is a record
  const delimiterCounts = lines.map((line) => countOccurrencesInLine(line, detected));
  const avgCount = delimiterCounts.reduce((a, b) => a + b, 0) / lines.length;

  // High consistency: each line is a separate record
  if (avgCount >= 1 && delimiterCounts.every((c) => c === avgCount || c === 0)) {
    return lines;
  }

  // Low consistency: treat as single record
  return [text.trim()];
}

/**
 * Extracts key-value pairs from a record using the detected delimiter
 *
 * @param record - The record text to parse
 * @param delimiter - The delimiter to use (auto-detected if not provided)
 * @returns Object with extracted key-value pairs
 */
export function extractKeyValuePairs(
  record: string,
  delimiter?: string
): Record<string, string> {
  const detected = delimiter || detectDelimiter(record).delimiter;

  const result: Record<string, string> = {};

  // Special handling for space delimiter (most fragile)
  if (detected === ' ') {
    // Split on spaces but try to identify reasonable groups
    const parts = record.trim().split(/\s+/);
    for (const part of parts) {
      if (part.includes(':')) {
        const [key, ...valueParts] = part.split(':');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join(':').trim();
        }
      } else if (part.length > 0) {
        result[part] = '';
      }
    }
    return result;
  }

  // For pipe, tab, or colon delimiters
  let separator = detected;

  // Handle Chinese password label specially
  if (detected === '密码：') {
    // Extract password value after the label
    const match = record.match(/密码：(.+)/);
    if (match) {
      result['password'] = match[1].trim();
    }
    // Also try to extract other fields with colon
    const colonSplit = record.split(/密码：|:(?!\/\/)/);
    for (const part of colonSplit) {
      const trimmed = part.trim();
      if (trimmed && !trimmed.includes('密码')) {
        // Try to identify email-like content
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          result['email'] = trimmed;
        }
      }
    }
    return result;
  }

  // Standard delimiter handling
  const parts = record.split(separator);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;

    // If part contains colon, it's likely a key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0 && colonIndex < trimmed.length - 1) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      result[key] = value;
    } else if (trimmed.includes('@')) {
      // Email field without explicit key
      result['email'] = trimmed;
    } else {
      // Unnamed field - use index as key
      const keys = Object.keys(result);
      result[`field_${keys.length}`] = trimmed;
    }
  }

  return result;
}
