import { Router } from 'express';
import { createProfile, getProfile, getMatches } from '../controllers/worker.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

// POST /api/workers/profile (authenticate)
router.post('/profile', requireAuth, asyncHandler(createProfile));

// GET /api/workers/:id (public)
router.get('/:id', asyncHandler(getProfile));

// GET /api/workers/:id/matches (authenticate)
router.get('/:id/matches', requireAuth, asyncHandler(getMatches));

export default router;
