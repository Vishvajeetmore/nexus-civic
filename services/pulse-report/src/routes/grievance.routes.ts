import { Router } from 'express';

import {
  getGrievance,
  listGrievances,
  submitGrievance,
  updateStatus,
  uploadMedia,
} from '../controllers/grievance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadMiddleware } from '../utils/mediaHandler';
import { createGrievanceSchema, updateGrievanceStatusSchema } from '../validators/grievance.validator';

const router = Router();

router.post('/api/grievances', optionalAuth, validate(createGrievanceSchema), asyncHandler(submitGrievance));

router.get('/api/grievances', authenticate, asyncHandler(listGrievances));

router.get('/api/grievances/:id', authenticate, asyncHandler(getGrievance));

router.patch(
  '/api/grievances/:id/status',
  authenticate,
  authorize(['admin', 'officer']),
  validate(updateGrievanceStatusSchema),
  asyncHandler(updateStatus)
);

router.post(
  '/api/grievances/:id/media',
  optionalAuth,
  uploadMiddleware,
  asyncHandler(uploadMedia)
);

export default router;
