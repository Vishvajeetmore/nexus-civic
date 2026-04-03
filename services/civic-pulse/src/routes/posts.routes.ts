import { Router } from 'express';
import { createPost, getFeed, getPost, votePost } from '../controllers/post.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/', optionalAuth, asyncHandler(createPost));
router.get('/', asyncHandler(getFeed));
router.get('/:id', asyncHandler(getPost));
router.post('/:id/vote', authenticate, asyncHandler(votePost));

export default router;
