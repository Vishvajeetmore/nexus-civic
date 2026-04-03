import { Router } from 'express';
import { getUpskilling } from '../controllers/upskilling.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

// GET /api/upskilling/:workerId (authenticate)
router.get('/:workerId', requireAuth, asyncHandler(getUpskilling));

export default router;
