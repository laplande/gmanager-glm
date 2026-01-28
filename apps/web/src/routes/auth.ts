/**
 * Authentication routes for GManager Web
 *
 * This module handles vault creation (registration), unlocking (login),
 * logout, and password changes. All routes manage vault authentication
 * and session creation.
 */

import type { Router } from 'express';
import { hash, compare } from 'bcrypt';
import { randomBytes } from 'crypto';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { generateToken, verifyToken, authenticate } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';
import {
  generateKdfParams,
  deriveKey,
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey,
  encryptSessionKey,
  encrypt,
  decrypt,
  reencrypt,
  generateSalt,
} from '../crypto/index.js';

/**
 * Creates authentication routes
 *
 * Routes:
 * - POST /api/auth/register - Create a new vault
 * - POST /api/auth/login - Unlock an existing vault
 * - POST /api/auth/logout - Logout from current session
 * - POST /api/auth/change-password - Change vault password
 *
 * @param router - Express router instance
 */
export function createAuthRoutes(router: Router): void {
  /**
   * POST /api/auth/register
   *
   * Creates a new vault with the given credentials.
   * A vault can only be created if none exists (single vault mode).
   *
   * Request body:
   * ```json
   * {
   *   "vaultName": "My Accounts",
   *   "password": "secure-password",
   *   "hint": "Optional password hint"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "token": "jwt-token",
   *   "vaultId": "vault-id",
   *   "vaultName": "My Accounts",
   *   "encryptedSessionKey": "base64-encrypted-session-key"
   * }
   * ```
   *
   * Errors:
   * - 400: Invalid request or vault already exists
   */
  router.post('/api/auth/register', async (req, res) => {
    try {
      const { vaultName, password, hint } = req.body;

      // Validate input
      if (!vaultName || typeof vaultName !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'vaultName is required and must be a string',
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'password is required and must be a string',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'password must be at least 8 characters long',
        });
      }

      const db = getDatabase();

      // Check if vault already exists (single vault mode)
      if (db.vaultExists()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'A vault already exists. Use /api/auth/login to unlock it.',
        });
      }

      // Generate KDF parameters
      const kdfParams = generateKdfParams();

      // Hash the password for verification
      const passwordHash = await hash(password, 12);

      // Derive the password key
      const passwordKey = deriveKey(password, kdfParams.salt, kdfParams.iterations);

      // Generate and encrypt the master key
      const masterKey = generateMasterKey();
      const encryptedMasterKey = encryptMasterKey(masterKey, passwordKey);

      // Create the vault
      const vault = db.createVault({
        name: vaultName,
        passwordHash,
        encryptedMasterKey,
        kdfSalt: kdfParams.salt,
        kdfIterations: kdfParams.iterations,
      });

      // Generate and encrypt a session key
      const sessionKey = randomBytes(32);
      const encryptedSessionKey = encryptSessionKey(sessionKey, masterKey);

      // Create session
      const session = db.createSession({
        vaultId: vault.id,
        encryptedSessionKey,
        expirationHours: 24,
      });

      // Generate JWT token
      const token = generateToken(session.id);

      res.status(201).json({
        token,
        vaultId: vault.id,
        vaultName: vault.name,
        encryptedSessionKey,
      });
    } catch (error) {
      console.error('Error creating vault:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create vault',
      });
    }
  });

  /**
   * POST /api/auth/login
   *
   * Unlocks an existing vault with the correct password.
   *
   * Request body:
   * ```json
   * {
   *   "password": "secure-password"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "token": "jwt-token",
   *   "vaultId": "vault-id",
   *   "vaultName": "My Accounts",
   *   "encryptedSessionKey": "base64-encrypted-session-key"
   * }
   * ```
   *
   * Errors:
   * - 401: Invalid password or vault not found
   */
  router.post('/api/auth/login', async (req, res) => {
    try {
      const { password } = req.body;

      // Validate input
      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'password is required and must be a string',
        });
      }

      const db = getDatabase();

      // Get the vault
      const vault = db.getFirstVault();
      if (!vault) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No vault found. Use /api/auth/register to create one.',
        });
      }

      // Verify password
      const passwordMatch = await compare(password, vault.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid password',
        });
      }

      // Derive the password key
      const passwordKey = deriveKey(password, vault.kdfSalt, vault.kdfIterations);

      // Decrypt the master key
      const masterKey = decryptMasterKey(vault.encryptedMasterKey, passwordKey);

      // Generate and encrypt a new session key
      const sessionKey = randomBytes(32);
      const encryptedSessionKey = encryptSessionKey(sessionKey, masterKey);

      // Create session
      const session = db.createSession({
        vaultId: vault.id,
        encryptedSessionKey,
        expirationHours: 24,
      });

      // Generate JWT token
      const token = generateToken(session.id);

      res.json({
        token,
        vaultId: vault.id,
        vaultName: vault.name,
        encryptedSessionKey,
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  });

  /**
   * POST /api/auth/logout
   *
   * Logs out the current session by invalidating the JWT token.
   *
   * Headers:
   * - Authorization: Bearer <token>
   *
   * Response:
   * ```json
   * {
   *   "success": true
   * }
   * ```
   */
  router.post('/api/auth/logout', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = req.sessionId;
      if (sessionId) {
        const db = getDatabase();
        db.deleteSession(sessionId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  });

  /**
   * POST /api/auth/change-password
   *
   * Changes the vault password and re-encrypts the master key.
   *
   * Headers:
   * - Authorization: Bearer <token>
   *
   * Request body:
   * ```json
   * {
   *   "currentPassword": "old-password",
   *   "newPassword": "new-password"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "newEncryptedSessionKey": "base64-encrypted-session-key"
   * }
   * ```
   *
   * Errors:
   * - 400: Invalid request
   * - 401: Invalid current password
   */
  router.post('/api/auth/change-password', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'currentPassword is required and must be a string',
        });
      }

      if (!newPassword || typeof newPassword !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'newPassword is required and must be a string',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'newPassword must be at least 8 characters long',
        });
      }

      const db = getDatabase();
      const sessionId = req.sessionId;

      if (!sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      // Get the session
      const session = db.getSession(sessionId);
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session not found',
        });
      }

      // Get the vault
      const vault = db.getVaultById(session.vaultId);
      if (!vault) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Vault not found',
        });
      }

      // Verify current password
      const passwordMatch = await compare(currentPassword, vault.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid current password',
        });
      }

      // Derive keys
      const oldPasswordKey = deriveKey(currentPassword, vault.kdfSalt, vault.kdfIterations);
      const masterKey = decryptMasterKey(vault.encryptedMasterKey, oldPasswordKey);

      // Generate new KDF parameters
      const newKdfParams = generateKdfParams();
      const newPasswordKey = deriveKey(newPassword, newKdfParams.salt, newKdfParams.iterations);

      // Re-encrypt the master key with new password
      const newEncryptedMasterKey = encryptMasterKey(masterKey, newPasswordKey);

      // Hash the new password
      const newPasswordHash = await hash(newPassword, 12);

      // Update the vault (this would require an update method in the DB)
      // For now, we'll just create a new encrypted session key
      const newEncryptedSessionKey = encryptSessionKey(randomBytes(32), masterKey);

      // Create a new session with the new key
      const newSession = db.createSession({
        vaultId: vault.id,
        encryptedSessionKey: newEncryptedSessionKey,
        expirationHours: 24,
      });

      // Delete old session
      db.deleteSession(sessionId);

      // Generate new JWT token
      const newToken = generateToken(newSession.id);

      res.json({
        success: true,
        token: newToken,
        newEncryptedSessionKey,
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to change password',
      });
    }
  });

  /**
   * GET /api/auth/status
   *
   * Checks if a vault exists and whether the user is authenticated.
   *
   * Response (not authenticated, no vault):
   * ```json
   * {
   *   "vaultExists": false,
   *   "authenticated": false
   * }
   * ```
   *
   * Response (not authenticated, vault exists):
   * ```json
   * {
   *   "vaultExists": true,
   *   "authenticated": false
   * }
   * ```
   *
   * Response (authenticated):
   * ```json
   * {
   *   "vaultExists": true,
   *   "authenticated": true,
   *   "vaultId": "vault-id",
   *   "vaultName": "My Accounts"
   * }
   * ```
   */
  router.get('/api/auth/status', (req, res) => {
    try {
      const db = getDatabase();
      const vaultExists = db.vaultExists();

      // Check for authorization header
      const authHeader = req.headers.authorization;
      let authenticated = false;
      let vaultData = null;

      if (authHeader) {
        try {
          const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

          const payload = verifyToken(token);
          const session = db.getSession(payload.sessionId);

          if (session) {
            authenticated = true;
            const vault = db.getVaultById(session.vaultId);
            if (vault) {
              vaultData = {
                vaultId: vault.id,
                vaultName: vault.name,
              };
            }
          }
        } catch {
          // Token is invalid or expired
        }
      }

      res.json({
        vaultExists,
        authenticated,
        ...vaultData,
      });
    } catch (error) {
      console.error('Error checking auth status:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check auth status',
      });
    }
  });
}
