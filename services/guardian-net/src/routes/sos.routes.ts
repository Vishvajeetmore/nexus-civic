import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getEvent, listEvents, resolveEvent, triggerSOS } from '../controllers/sos.controller';
import { sosSchema } from '../validators/sos.validator';

const router = Router();

router.post(
  '/api/sos/trigger',
  validate(sosSchema),
  asyncHandler(triggerSOS)
);

router.get(
  '/api/sos/events',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(listEvents)
);

router.get(
  '/api/sos/events/:id',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(getEvent)
);

router.patch(
  '/api/sos/events/:id/resolve',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(resolveEvent)
);

export default router;
