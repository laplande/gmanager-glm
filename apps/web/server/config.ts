/**
 * Server configuration management
 * Loads configuration from environment variables with sensible defaults
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env file from project root
dotenvConfig({ path: resolve(process.cwd(), '.env') });

export interface ServerConfig {
  /** Server port */
  port: number;
  /** Node environment */
  nodeEnv: 'development' | 'production' | 'test';
  /** JWT secret for token signing */
  jwtSecret: string;
  /** JWT token expiration time */
  jwtExpiresIn: string;
  /** Database file path */
  dbPath: string;
  /** CORS allowed origins */
  corsOrigins: string[];
  /** Rate limit window in milliseconds */
  rateLimitWindowMs: number;
  /** Rate limit max requests per window */
  rateLimitMax: number;
  /** PBKDF2 iterations for key derivation */
  pbkdf2Iterations: number;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export const config: ServerConfig = {
  port: getEnvNumber('PORT', 3000),
  nodeEnv: getEnvString('NODE_ENV', 'development') as ServerConfig['nodeEnv'],
  jwtSecret: getEnvString('JWT_SECRET', 'gmanager-dev-secret-change-in-production'),
  jwtExpiresIn: getEnvString('JWT_EXPIRES_IN', '24h'),
  dbPath: getEnvString('DB_PATH', resolve(process.cwd(), 'data', 'gmanager.db')),
  corsOrigins: getEnvArray('CORS_ORIGINS', ['http://localhost:5173', 'http://localhost:3000']),
  rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100),
  pbkdf2Iterations: getEnvNumber('PBKDF2_ITERATIONS', 100000),
};

export default config;
