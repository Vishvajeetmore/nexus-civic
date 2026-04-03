import { Router } from 'express';
import { z } from 'zod';

import {
  getAuditLogs,
  getCapabilities,
  handleQuery,
  transcribeVoice,
} from '../controllers/query.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const querySchema = z.object({
  text: z.string().min(1).optional(),
  audioBase64: z.string().min(1).optional(),
  voiceMode: z.boolean().optional(),
}).refine((data) => Boolean(data.text || data.audioBase64), {
  message: 'Please provide text or audioBase64',
});

const voiceSchema = z.object({
  audioBase64: z.string().min(1),
});

// POST /api/query (authenticate)
router.post('/query', authenticate, validate(querySchema), asyncHandler(handleQuery));

// GET /api/audit-logs (admin only)
router.get('/audit-logs', authenticate, requireAdmin, asyncHandler(getAuditLogs));

// GET /api/capabilities (optionalAuth)
router.get('/capabilities', optionalAuth, asyncHandler(getCapabilities));

// POST /api/voice/transcribe (authenticate)
router.post('/voice/transcribe', authenticate, validate(voiceSchema), asyncHandler(transcribeVoice));

export default router;
