import { Router } from 'express';
import { getDaily, generateBriefing } from '../controllers/briefing.controller';
import { authenticate, authorizeRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/daily', authenticate, asyncHandler(getDaily));
router.post('/generate', authenticate, authorizeRole('admin'), asyncHandler(generateBriefing));

export default router;
