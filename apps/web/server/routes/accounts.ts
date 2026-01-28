/**
 * Accounts routes
 * Handles CRUD operations for GLM accounts
 */

import { Router } from 'express';
import {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  searchAccounts
} from '../services/accounts.service.js';
import { getEncryptionKey } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// All account routes require authentication
router.use(authenticate);

/**
 * Middleware to get encryption key from request
 * Requires password in header for decryption
 */
function requireEncryptionKey(req: any, res: any, next: any) {
  const password = req.headers['x-master-password'];

  if (!password) {
    res.status(400).json({ error: 'Master password required in X-Master-Password header' });
    return;
  }

  const key = getEncryptionKey(password as string);

  if (!key) {
    res.status(401).json({ error: 'Invalid master password' });
    return;
  }

  req.encryptionKey = key;
  next();
}

/**
 * GET /api/accounts
 * Get all accounts
 */
router.get('/', requireEncryptionKey, asyncHandler(async (req, res) => {
  const accounts = getAllAccounts(req.encryptionKey!);
  res.json(accounts);
}));

/**
 * GET /api/accounts/:id
 * Get account by ID
 */
router.get('/:id', requireEncryptionKey, asyncHandler(async (req, res) => {
  const account = getAccountById(req.params.id, req.encryptionKey!);

  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.json(account);
}));

/**
 * POST /api/accounts
 * Create a new account
 */
router.post(
  '/',
  requireEncryptionKey,
  validateBody([
    { field: 'email', required: true, type: 'string', minLength: 1 },
    { field: 'password', required: false, type: 'string' },
    { field: 'recoveryEmail', required: false, type: 'string' },
    { field: 'totpSecret', required: false, type: 'string' },
    { field: 'year', required: false, type: 'string' },
    { field: 'notes', required: false, type: 'string' },
    { field: 'groupId', required: false, type: 'string' },
    { field: 'tagIds', required: false, type: 'array' },
    { field: 'fieldOrder', required: false, type: 'array' }
  ]),
  asyncHandler(async (req, res) => {
    const account = createAccount(req.body, req.encryptionKey!);
    res.status(201).json(account);
  })
);

/**
 * PUT /api/accounts/:id
 * Update an account
 */
router.put(
  '/:id',
  requireEncryptionKey,
  validateBody([
    { field: 'email', required: false, type: 'string', minLength: 1 },
    { field: 'password', required: false, type: 'string' },
    { field: 'recoveryEmail', required: false, type: 'string' },
    { field: 'totpSecret', required: false, type: 'string' },
    { field: 'year', required: false, type: 'string' },
    { field: 'notes', required: false, type: 'string' },
    { field: 'groupId', required: false, type: 'string' },
    { field: 'tagIds', required: false, type: 'array' },
    { field: 'fieldOrder', required: false, type: 'array' }
  ]),
  asyncHandler(async (req, res) => {
    const account = updateAccount(req.params.id, req.body, req.encryptionKey!);

    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    res.json(account);
  })
);

/**
 * DELETE /api/accounts/:id
 * Delete an account
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = deleteAccount(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  res.status(204).send();
}));

/**
 * POST /api/accounts/search
 * Search accounts with filters
 */
router.post(
  '/search',
  requireEncryptionKey,
  validateBody([
    { field: 'query', required: false, type: 'string' },
    { field: 'groupId', required: false, type: 'string' },
    { field: 'tagIds', required: false, type: 'array' },
    { field: 'year', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const accounts = searchAccounts(req.body, req.encryptionKey!);
    res.json(accounts);
  })
);

export default router;
