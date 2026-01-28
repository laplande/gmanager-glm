/**
 * Groups routes
 * Handles CRUD operations for account groups
 */

import { Router } from 'express';
import {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupAccountCount
} from '../services/groups.service.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// All group routes require authentication
router.use(authenticate);

/**
 * GET /api/groups
 * Get all groups
 */
router.get('/', asyncHandler(async (_req, res) => {
  const groups = getAllGroups();
  res.json(groups);
}));

/**
 * GET /api/groups/:id
 * Get group by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const group = getGroupById(req.params.id);

  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  res.json(group);
}));

/**
 * POST /api/groups
 * Create a new group
 */
router.post(
  '/',
  validateBody([
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'color', required: false, type: 'string' },
    { field: 'sortOrder', required: false, type: 'number' }
  ]),
  asyncHandler(async (req, res) => {
    const group = createGroup(req.body);
    res.status(201).json(group);
  })
);

/**
 * PUT /api/groups/:id
 * Update a group
 */
router.put(
  '/:id',
  validateBody([
    { field: 'name', required: false, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'color', required: false, type: 'string' },
    { field: 'sortOrder', required: false, type: 'number' }
  ]),
  asyncHandler(async (req, res) => {
    const group = updateGroup(req.params.id, req.body);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group);
  })
);

/**
 * DELETE /api/groups/:id
 * Delete a group
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const accountCount = getGroupAccountCount(req.params.id);

  if (accountCount > 0) {
    res.status(400).json({
      error: 'Cannot delete group with accounts',
      accountCount
    });
    return;
  }

  const deleted = deleteGroup(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  res.status(204).send();
}));

export default router;
