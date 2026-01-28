/**
 * Authentication routes
 * Handles user registration, login, and authentication status
 */

import { Router } from 'express';
import { register, login, isInitialized, changePassword } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register master password (first-time setup)
 */
router.post(
  '/register',
  validateBody([
    { field: 'password', required: true, type: 'string', minLength: 8 }
  ]),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = register(password);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Master password registered successfully',
      token: result.token
    });
  })
);

/**
 * POST /api/auth/login
 * Login with master password
 */
router.post(
  '/login',
  validateBody([
    { field: 'password', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    const result = login(password);

    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json({
      message: 'Login successful',
      token: result.token
    });
  })
);

/**
 * POST /api/auth/change-password
 * Change master password
 */
router.post(
  '/change-password',
  authenticate,
  validateBody([
    { field: 'oldPassword', required: true, type: 'string' },
    { field: 'newPassword', required: true, type: 'string', minLength: 8 }
  ]),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const result = changePassword(oldPassword, newPassword);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      message: 'Password changed successfully',
      token: result.token
    });
  })
);

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', asyncHandler(async (_req, res) => {
  const initialized = isInitialized();

  res.json({
    initialized,
    authenticated: false // Will be true if token is valid
  });
}));

/**
 * GET /api/auth/check
 * Verify current token (requires authentication)
 */
router.get('/check', authenticate, asyncHandler(async (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
}));

export default router;
