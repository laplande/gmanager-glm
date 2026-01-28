/**
 * Tags routes
 * Handles CRUD operations for account tags
 */

import { Router } from 'express';
import {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagAccountCount
} from '../services/tags.service.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// All tag routes require authentication
router.use(authenticate);

/**
 * GET /api/tags
 * Get all tags
 */
router.get('/', asyncHandler(async (_req, res) => {
  const tags = getAllTags();
  res.json(tags);
}));

/**
 * GET /api/tags/:id
 * Get tag by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const tag = getTagById(req.params.id);

  if (!tag) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  res.json(tag);
}));

/**
 * POST /api/tags
 * Create a new tag
 */
router.post(
  '/',
  validateBody([
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 50 },
    { field: 'color', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const tag = createTag(req.body);
    res.status(201).json(tag);
  })
);

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put(
  '/:id',
  validateBody([
    { field: 'name', required: false, type: 'string', minLength: 1, maxLength: 50 },
    { field: 'color', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const tag = updateTag(req.params.id, req.body);

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(tag);
  })
);

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const accountCount = getTagAccountCount(req.params.id);

  if (accountCount > 0) {
    res.status(400).json({
      error: 'Cannot delete tag with accounts',
      accountCount
    });
    return;
  }

  const deleted = deleteTag(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }

  res.status(204).send();
}));

export default router;
