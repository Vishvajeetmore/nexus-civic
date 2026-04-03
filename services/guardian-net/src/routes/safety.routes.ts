import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler';
import { getNearbyEvents, getSafetyHeatmap, getSafetyScore } from '../controllers/safety.controller';

const router = Router();

router.get(
  '/api/safety/heatmap',
  asyncHandler(getSafetyHeatmap)
);

router.get(
  '/api/safety/score',
  asyncHandler(getSafetyScore)
);

router.get(
  '/api/safety/nearby-events',
  asyncHandler(getNearbyEvents)
);

export default router;
