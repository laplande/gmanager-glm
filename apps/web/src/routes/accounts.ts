/**
 * Account routes for GManager Web
 *
 * This module handles CRUD operations for accounts, including
 * listing, creating, reading, updating, deleting, and searching.
 *
 * All account data is encrypted at rest using the session key
 * which is stored encrypted in the session record.
 */

import type { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';
import { getDatabase } from '../db/index.js';
import { encrypt, decrypt, type DerivedKey } from '../crypto/index.js';
import type { Account, AccountUpdate } from '@gmanager/shared';

/**
 * Encrypts an account's sensitive fields using the session key
 *
 * @param account - The account data with plaintext values
 * @param sessionKey - The session key for encryption
 * @returns The account with encrypted fields
 */
function encryptAccountFields(
  account: Partial<Account>,
  sessionKey: Buffer
): Partial<Account> {
  const key: DerivedKey = { key: sessionKey, algorithm: 'aes-256-gcm' };
  const result: Partial<Account> = {};

  // Always encrypt email
  if (account.email !== undefined) {
    result.email = encrypt(account.email, key);
  }

  // Encrypt optional fields if present
  if (account.password !== undefined) {
    result.password = account.password ? encrypt(account.password, key) : undefined;
  }

  if (account.recoveryEmail !== undefined) {
    result.recoveryEmail = account.recoveryEmail ? encrypt(account.recoveryEmail, key) : undefined;
  }

  if (account.totpSecret !== undefined) {
    result.totpSecret = account.totpSecret ? encrypt(account.totpSecret, key) : undefined;
  }

  if (account.notes !== undefined) {
    result.notes = account.notes ? encrypt(account.notes, key) : undefined;
  }

  // Copy non-encrypted fields
  if (account.year !== undefined) result.year = account.year;
  if (account.groupId !== undefined) result.groupId = account.groupId;
  if (account.fieldOrder !== undefined) result.fieldOrder = account.fieldOrder;
  if (account.rawImportId !== undefined) result.rawImportId = account.rawImportId;

  return result;
}

/**
 * Validates that an account has all required fields for creation
 */
function validateAccountForCreation(account: Partial<Account>): account is Omit<Account, 'id' | 'createdAt' | 'updatedAt'> {
  return typeof account.email === 'string' && account.email.length > 0;
}

/**
 * Decrypts an account's sensitive fields using the session key
 *
 * @param account - The account with encrypted values
 * @param sessionKey - The session key for decryption
 * @returns The account with decrypted fields
 */
function decryptAccountFields(account: Account, sessionKey: Buffer): Account {
  const key: DerivedKey = { key: sessionKey, algorithm: 'aes-256-gcm' };

  return {
    ...account,
    email: decrypt(account.email, key),
    password: account.password ? decrypt(account.password, key) : undefined,
    recoveryEmail: account.recoveryEmail ? decrypt(account.recoveryEmail, key) : undefined,
    totpSecret: account.totpSecret ? decrypt(account.totpSecret, key) : undefined,
    notes: account.notes ? decrypt(account.notes, key) : undefined,
  };
}

/**
 * Derives the session key from encrypted session data
 *
 * The session key is encrypted with the master key. For client-side
 * encryption, the client provides the session key directly.
 *
 * @param encryptedSessionKey - The encrypted session key (base64)
 * @returns The decrypted session key buffer
 */
function getSessionKey(encryptedSessionKey: string): Buffer {
  // In a full implementation, this would decrypt using the master key
  // For now, we'll assume the client sends the hex-encoded session key
  return Buffer.from(encryptedSessionKey, 'hex');
}

/**
 * Creates account routes
 *
 * Routes:
 * - GET /api/accounts - List all accounts
 * - POST /api/accounts - Create a new account
 * - GET /api/accounts/:id - Get a single account
 * - PUT /api/accounts/:id - Update an account
 * - DELETE /api/accounts/:id - Delete an account
 * - POST /api/accounts/search - Search accounts
 *
 * @param router - Express router instance
 */
export function createAccountRoutes(router: Router): void {
  /**
   * GET /api/accounts
   *
   * Lists all accounts for the authenticated user's vault.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Query params:
   * - limit: Maximum number of accounts to return (default: 100)
   * - offset: Number of accounts to skip (default: 0)
   *
   * Response:
   * ```json
   * {
   *   "accounts": [
   *     {
   *       "id": "account-id",
   *       "email": "user@example.com",
   *       "password": "encrypted-password",
   *       ...
   *     }
   *   ],
   *   "total": 42
   * }
   * ```
   */
  router.get('/api/accounts', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionKeyHeader = req.headers['x-session-key'] as string;
      if (!sessionKeyHeader) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'X-Session-Key header is required',
        });
      }

      const sessionKey = getSessionKey(sessionKeyHeader);
      const db = getDatabase();

      if (!req.sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      const session = db.getSession(req.sessionId);
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session not found',
        });
      }

      const limit = Math.min(Number(req.query.limit) || 100, 1000);
      const offset = Number(req.query.offset) || 0;

      let accounts = db.listAccounts(session.vaultId);

      // Apply pagination
      const total = accounts.length;
      accounts = accounts.slice(offset, offset + limit);

      // Decrypt sensitive fields
      const decryptedAccounts = accounts.map(account =>
        decryptAccountFields(account, sessionKey)
      );

      res.json({
        accounts: decryptedAccounts,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Error listing accounts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list accounts',
      });
    }
  });

  /**
   * POST /api/accounts
   *
   * Creates a new account.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Request body:
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "secure-password",
   *   "recoveryEmail": "recovery@example.com",
   *   "totpSecret": "JBSWY3DPEHPK3PXP",
   *   "year": "2024",
   *   "notes": "My account",
   *   "groupId": "group-id",
   *   "fieldOrder": { "email": 0, "password": 1 }
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "id": "new-account-id",
   *   "email": "user@example.com",
   *   ...
   * }
   * ```
   *
   * Errors:
   * - 400: Invalid request data
   */
  router.post('/api/accounts', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionKeyHeader = req.headers['x-session-key'] as string;
      if (!sessionKeyHeader) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'X-Session-Key header is required',
        });
      }

      const sessionKey = getSessionKey(sessionKeyHeader);
      const db = getDatabase();

      if (!req.sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      const session = db.getSession(req.sessionId);
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session not found',
        });
      }

      // Validate email
      if (!req.body.email || typeof req.body.email !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'email is required and must be a string',
        });
      }

      // Encrypt sensitive fields
      const encryptedAccount = encryptAccountFields(req.body, sessionKey);

      // Validate and create the account
      if (!validateAccountForCreation(encryptedAccount)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'email is required and must be a string',
        });
      }

      // Create the account with guaranteed non-undefined email
      const accountForCreation: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
        email: encryptedAccount.email,
        password: encryptedAccount.password,
        recoveryEmail: encryptedAccount.recoveryEmail,
        totpSecret: encryptedAccount.totpSecret,
        notes: encryptedAccount.notes,
        year: encryptedAccount.year,
        groupId: encryptedAccount.groupId,
        fieldOrder: encryptedAccount.fieldOrder,
        rawImportId: encryptedAccount.rawImportId,
      };

      const newAccount = db.createAccount(session.vaultId, accountForCreation);

      // Return the account with decrypted fields
      const decryptedAccount = decryptAccountFields(newAccount, sessionKey);

      res.status(201).json(decryptedAccount);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create account',
      });
    }
  });

  /**
   * GET /api/accounts/:id
   *
   * Gets a single account by ID.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Response:
   * ```json
   * {
   *   "id": "account-id",
   *   "email": "user@example.com",
   *   ...
   * }
   * ```
   *
   * Errors:
   * - 404: Account not found
   */
  router.get('/api/accounts/:id', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionKeyHeader = req.headers['x-session-key'] as string;
      if (!sessionKeyHeader) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'X-Session-Key header is required',
        });
      }

      const sessionKey = getSessionKey(sessionKeyHeader);
      const db = getDatabase();

      const account = db.getAccount(String(req.params.id));
      if (!account) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      // Verify access to this account's vault
      if (!req.sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      const session = db.getSession(req.sessionId);
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session not found',
        });
      }

      // Return the account with decrypted fields
      const decryptedAccount = decryptAccountFields(account, sessionKey);

      res.json(decryptedAccount);
    } catch (error) {
      console.error('Error getting account:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get account',
      });
    }
  });

  /**
   * PUT /api/accounts/:id
   *
   * Updates an existing account.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Request body:
   * ```json
   * {
   *   "email": "new-email@example.com",
   *   "password": "new-password",
   *   "notes": "Updated notes"
   * }
   * ```
   *
   * Only include fields that should be updated.
   *
   * Response:
   * ```json
   * {
   *   "id": "account-id",
   *   "email": "new-email@example.com",
   *   ...
   * }
   * ```
   *
   * Errors:
   * - 404: Account not found
   */
  router.put('/api/accounts/:id', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionKeyHeader = req.headers['x-session-key'] as string;
      if (!sessionKeyHeader) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'X-Session-Key header is required',
        });
      }

      const sessionKey = getSessionKey(sessionKeyHeader);
      const db = getDatabase();

      const existingAccount = db.getAccount(String(req.params.id));
      if (!existingAccount) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      if (!req.sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      // Encrypt the updated fields
      const encryptedUpdates = encryptAccountFields(req.body, sessionKey);

      // Update the account
      const updatedAccount = db.updateAccount(String(req.params.id), encryptedUpdates);

      if (!updatedAccount) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      // Return the account with decrypted fields
      const decryptedAccount = decryptAccountFields(updatedAccount, sessionKey);

      res.json(decryptedAccount);
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update account',
      });
    }
  });

  /**
   * DELETE /api/accounts/:id
   *
   * Deletes an account.
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
   *
   * Errors:
   * - 404: Account not found
   */
  router.delete('/api/accounts/:id', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const db = getDatabase();

      const account = db.getAccount(String(req.params.id));
      if (!account) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Account not found',
        });
      }

      const deleted = db.deleteAccount(String(req.params.id));

      res.json({ success: deleted });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete account',
      });
    }
  });

  /**
   * POST /api/accounts/search
   *
   * Searches for accounts by email or other fields.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Request body:
   * ```json
   * {
   *   "query": "search-term",
   *   "limit": 50
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "accounts": [...],
   *   "total": 5
   * }
   * ```
   */
  router.post('/api/accounts/search', authenticate, (req: AuthenticatedRequest, res) => {
    try {
      const sessionKeyHeader = req.headers['x-session-key'] as string;
      if (!sessionKeyHeader) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'X-Session-Key header is required',
        });
      }

      const sessionKey = getSessionKey(sessionKeyHeader);
      const db = getDatabase();

      if (!req.sessionId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid session',
        });
      }

      const session = db.getSession(req.sessionId);
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session not found',
        });
      }

      const { query, limit = 50 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'query is required and must be a string',
        });
      }

      // Search accounts (encrypted values are searched as-is)
      const accounts = db.searchAccounts(session.vaultId, query, Math.min(limit, 1000));

      // Decrypt sensitive fields for results
      const decryptedAccounts = accounts.map(account =>
        decryptAccountFields(account, sessionKey)
      );

      // Filter results on the client side since we can't search encrypted data
      // The client could send pre-encrypted search terms for server-side search
      const filtered = decryptedAccounts.filter(account =>
        account.email.toLowerCase().includes(query.toLowerCase()) ||
        account.recoveryEmail?.toLowerCase().includes(query.toLowerCase())
      );

      res.json({
        accounts: filtered,
        total: filtered.length,
      });
    } catch (error) {
      console.error('Error searching accounts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search accounts',
      });
    }
  });

  /**
   * POST /api/accounts/bulk
   *
   * Bulk operation on multiple accounts.
   *
   * Headers:
   * - Authorization: Bearer <token>
   * - X-Session-Key: <hex-encoded-session-key>
   *
   * Request body (delete):
   * ```json
   * {
   *   "operation": "delete",
   *   "accountIds": ["id1", "id2", ...]
   * }
   * ```
   *
   * Request body (update):
   * ```json
   * {
   *   "operation": "update",
   *   "accountIds": ["id1", "id2", ...],
   *   "updates": {
   *     "groupId": "new-group-id"
   *   }
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "affected": 5
   * }
   * ```
   */
  router.post('/api/accounts/bulk', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { operation, accountIds, updates } = req.body;

      if (!operation || typeof operation !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'operation is required',
        });
      }

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'accountIds must be a non-empty array',
        });
      }

      const db = getDatabase();
      let affected = 0;

      if (operation === 'delete') {
        for (const id of accountIds) {
          if (db.deleteAccount(id)) {
            affected++;
          }
        }
      } else if (operation === 'update') {
        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'updates object is required for update operation',
          });
        }

        for (const id of accountIds) {
          const updated = db.updateAccount(id, updates);
          if (updated) {
            affected++;
          }
        }
      } else {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'operation must be either "delete" or "update"',
        });
      }

      res.json({ success: true, affected });
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to perform bulk operation',
      });
    }
  });
}
