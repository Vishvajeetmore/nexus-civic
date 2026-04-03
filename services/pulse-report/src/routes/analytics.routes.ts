import { Router } from 'express';

import {
  getSLAReport,
  getSummary,
  getTrends,
} from '../controllers/analytics.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get(
  '/api/analytics/summary',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(getSummary)
);

router.get(
  '/api/analytics/trends',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(getTrends)
);

router.get('/api/analytics/sla', authenticate, authorize(['admin', 'officer']), asyncHandler(getSLAReport));

export default router;
