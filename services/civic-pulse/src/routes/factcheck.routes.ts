import { Router } from 'express';
import { triggerFactCheck, getFlagged } from '../controllers/factcheck.controller';
import { authenticate, authorizeRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/:postId', authenticate, asyncHandler(triggerFactCheck));
router.get('/flagged', authenticate, authorizeRole('admin'), asyncHandler(getFlagged));

export default router;
