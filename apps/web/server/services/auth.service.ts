/**
 * Authentication service
 * Handles master password management and JWT token operations
 */

import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import getDatabase from '../db/index.js';
import config from '../config.js';
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  saltToBase64,
  saltFromBase64,
  deriveKey
} from './crypto.service.js';

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthStatus {
  initialized: boolean;
  authenticated: boolean;
}

/**
 * Check if master password has been set up
 */
export function isInitialized(): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT id FROM auth WHERE id = 1').get();
  return !!row;
}

/**
 * Register master password (first-time setup)
 */
export function register(password: string): AuthResult {
  if (isInitialized()) {
    return { success: false, error: 'Master password already set' };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const db = getDatabase();
  const salt = generateSalt();
  const hash = hashPassword(password, salt, config.pbkdf2Iterations);

  db.prepare(`
    INSERT INTO auth (id, password_hash, salt)
    VALUES (1, ?, ?)
  `).run(hash, saltToBase64(salt));

  // Generate JWT token
  const token = generateToken();

  return { success: true, token };
}

/**
 * Login with master password
 */
export function login(password: string): AuthResult {
  if (!isInitialized()) {
    return { success: false, error: 'Master password not set up' };
  }

  const db = getDatabase();
  const row = db.prepare('SELECT password_hash, salt FROM auth WHERE id = 1').get() as {
    password_hash: string;
    salt: string;
  } | undefined;

  if (!row) {
    return { success: false, error: 'Authentication data not found' };
  }

  const salt = saltFromBase64(row.salt);
  const isValid = verifyPassword(password, row.password_hash, salt, config.pbkdf2Iterations);

  if (!isValid) {
    return { success: false, error: 'Invalid password' };
  }

  const token = generateToken();
  return { success: true, token };
}

/**
 * Get encryption key from password
 */
export function getEncryptionKey(password: string): Buffer | null {
  const db = getDatabase();
  const row = db.prepare('SELECT salt FROM auth WHERE id = 1').get() as { salt: string } | undefined;

  if (!row) return null;

  const salt = saltFromBase64(row.salt);
  return deriveKey(password, salt, config.pbkdf2Iterations);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { valid: boolean; payload?: jwt.JwtPayload } {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Generate JWT token
 */
function generateToken(): string {
  return jwt.sign(
    { userId: 'master' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as StringValue }
  );
}

/**
 * Change master password
 */
export function changePassword(oldPassword: string, newPassword: string): AuthResult {
  // Verify old password first
  const loginResult = login(oldPassword);
  if (!loginResult.success) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  const db = getDatabase();
  const salt = generateSalt();
  const hash = hashPassword(newPassword, salt, config.pbkdf2Iterations);

  db.prepare(`
    UPDATE auth SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(hash, saltToBase64(salt));

  // Generate new token
  const token = generateToken();
  return { success: true, token };
}
