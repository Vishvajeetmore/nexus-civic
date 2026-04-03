import { Router } from 'express';
import { createListing, browseListing, getListing, applyToGig } from '../controllers/listing.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

// POST /api/listings (authenticate)
router.post('/', requireAuth, asyncHandler(createListing));

// GET /api/listings (public)
router.get('/', asyncHandler(browseListing));

// GET /api/listings/:id (public)
router.get('/:id', asyncHandler(getListing));

// POST /api/listings/:id/apply (authenticate)
router.post('/:id/apply', requireAuth, asyncHandler(applyToGig));

export default router;
