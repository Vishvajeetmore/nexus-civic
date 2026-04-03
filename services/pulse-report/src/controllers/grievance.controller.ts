import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import { Grievance } from '@nexus-civic/db';

import { DEPARTMENT_ROUTING, GRIEVANCE_CATEGORIES } from '../config/departments';
import { verifyMedia } from '../utils/mediaHandler';
import { createLogger } from '../utils/logger';
import { errorResponse, paginatedResponse, successResponse } from '../utils/response';
import { updateWorkflowStatus, triggerGrievancePipeline } from '../utils/superplane';
import { generateTicketId } from '../utils/ticketId';

const logger = createLogger(process.env.SERVICE_NAME ?? 'pulse-report');
const CRITICAL_KEYWORD_REGEX = /\b(flood|fire|death|collapse|outbreak)\b/i;

type GrievancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type GeminiClassifier = {
  classifyText: (
    text: string,
    categories: string[]
  ) => Promise<{ category: string; confidence: number; reasoning: string }>;
  detectDuplicate: (
    newText: string,
    existing: Array<{ id: string; text: string }>
  ) => Promise<{ isDuplicate: boolean; matchedId?: string; similarity: number }>;
};

type AuthUser = {
  id: string;
  role: string;
  departmentId?: string;
};

function resolvePriorityFromScore(score: number): GrievancePriority {
  if (score >= 80) {
    return 'CRITICAL';
  }
  if (score >= 60) {
    return 'HIGH';
  }
  if (score >= 40) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function getSlaHours(priority: GrievancePriority, category: string): number {
  const department = DEPARTMENT_ROUTING[category] ?? DEPARTMENT_ROUTING.other;

  switch (priority) {
    case 'CRITICAL':
      return department.slaHours.critical;
    case 'HIGH':
      return department.slaHours.high;
    case 'LOW':
      return department.slaHours.low;
    case 'MEDIUM':
    default:
      return department.slaHours.medium;
  }
}

function createGeminiClientSafe(): GeminiClassifier | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const geminiClientModule = require('@nexus-civic/gemini-client') as {
      createGeminiClient?: (key: string) => GeminiClassifier;
    };
    if (typeof geminiClientModule.createGeminiClient === 'function') {
      return geminiClientModule.createGeminiClient(apiKey);
    }
  } catch (error) {
    logger.warn('Gemini client unavailable in pulse-report.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

async function estimateSeverity(text: string, gemini: GeminiClassifier | null): Promise<number> {
  if (!gemini) {
    return 3;
  }

  try {
    const severity = await gemini.classifyText(text, ['1', '2', '3', '4', '5']);
    const parsed = Number(severity.category);

    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(5, parsed));
    }
  } catch {
    logger.warn('Gemini severity estimation failed; using fallback severity.');
  }

  return 3;
}

export async function submitGrievance(req: Request, res: Response): Promise<void> {
  const payload = req.body as {
    title: string;
    description: string;
    category: string;
    district: string;
    location: { lat: number; lng: number; accuracy?: number; address?: string };
  };

  const text = `${payload.title}. ${payload.description}`;
  const providedCategory = payload.category || 'other';
  const gemini = createGeminiClientSafe();

  let aiCategory = providedCategory;
  let categoryConfidence = 0;
  try {
    if (gemini) {
      const classification = await gemini.classifyText(text, GRIEVANCE_CATEGORIES);
      aiCategory = classification.category;
      categoryConfidence = classification.confidence;
    }
  } catch {
    aiCategory = providedCategory;
    categoryConfidence = 0;
  }

  const category = categoryConfidence > 0.6 ? aiCategory : providedCategory;
  const district = payload.district.trim().toLowerCase();
  const departmentConfig = DEPARTMENT_ROUTING[category] ?? DEPARTMENT_ROUTING.other;

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const duplicateFilter: Record<string, unknown> = {
    category,
    district,
    createdAt: { $gte: cutoff },
    'location.lat': { $gte: payload.location.lat - 0.05, $lte: payload.location.lat + 0.05 },
    'location.lng': { $gte: payload.location.lng - 0.05, $lte: payload.location.lng + 0.05 },
  };

  const recentNearby = await Grievance.find(duplicateFilter)
    .sort({ createdAt: -1 })
    .limit(25)
    .select({ ticketId: 1, title: 1, description: 1 });

  if (recentNearby.length > 0 && gemini) {
    try {
      const duplicateCheck = await gemini.detectDuplicate(
        text,
        recentNearby.map((row) => ({
          id: String(row._id),
          text: `${row.title}. ${row.description}`,
        }))
      );

      if (duplicateCheck.isDuplicate && duplicateCheck.similarity > 0.8) {
        const matched = duplicateCheck.matchedId
          ? recentNearby.find((row) => String(row._id) === duplicateCheck.matchedId)
          : undefined;
        res.json(
          successResponse(
            {
              isDuplicate: true,
              existingTicketId: matched?.ticketId ?? duplicateCheck.matchedId,
            },
            'Potential duplicate grievance found'
          )
        );
        return;
      }
    } catch {
      logger.warn('Duplicate check failed; continuing grievance creation.');
    }
  }

  const ticketId = await generateTicketId();
  const userId = req.user?.id ?? `anonymous-${randomUUID()}`;

  const severity = await estimateSeverity(text, gemini);
  const categoryBonus = category === 'public-safety' || category === 'electricity' ? 10 : 0;
  const criticalKeywordBonus = CRITICAL_KEYWORD_REGEX.test(text) ? 20 : 0;
  const priorityScore = Math.min(100, 40 + categoryBonus + criticalKeywordBonus + severity * 5);
  const priority = resolvePriorityFromScore(priorityScore);

  const estimatedResolutionDate = new Date(Date.now() + getSlaHours(priority, category) * 60 * 60 * 1000);

  const grievance = await Grievance.create({
    ticketId,
    title: payload.title,
    description: payload.description,
    category,
    district,
    location: payload.location,
    userId,
    departmentId: departmentConfig.departmentId,
    priority,
    priorityScore,
    status: 'OPEN',
    statusHistory: [
      {
        status: 'OPEN',
        timestamp: new Date(),
        changedBy: req.user?.id ?? 'system',
      },
    ],
  });

  void triggerGrievancePipeline(grievance.toObject())
    .then(async (runId) => {
      if (!runId) {
        return;
      }

      grievance.superplaneRunId = runId;
      await grievance.save();
    })
    .catch((error) => {
      logger.warn('Failed to save Superplane run id for grievance.', {
        grievanceId: String(grievance._id),
        error: error instanceof Error ? error.message : String(error),
      });
    });

  res.status(201).json(
    successResponse(
      {
        ticketId,
        category,
        priority,
        department: departmentConfig.name,
        estimatedResolutionDate,
      },
      'Grievance submitted successfully'
    )
  );
}

export async function listGrievances(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const user = req.user as AuthUser | undefined;

  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string') {
    filter.status = req.query.status;
  }
  if (typeof req.query.category === 'string') {
    filter.category = req.query.category;
  }
  if (typeof req.query.departmentId === 'string') {
    filter.departmentId = req.query.departmentId;
  }
  if (typeof req.query.priority === 'string') {
    filter.priority = req.query.priority;
  }

  if (user?.role === 'officer') {
    if (!user.departmentId) {
      res.status(403).json(errorResponse('Officer department is not configured in token', 403));
      return;
    }
    filter.departmentId = user.departmentId;
  } else if (user?.role !== 'admin') {
    if (!user?.id) {
      res.status(401).json(errorResponse('Unauthorized', 401));
      return;
    }
    filter.userId = user.id;
  }

  const [rows, total] = await Promise.all([
    Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Grievance.countDocuments(filter),
  ]);

  res.json(
    paginatedResponse(rows, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    })
  );
}

export async function getGrievance(req: Request, res: Response): Promise<void> {
  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  res.json(successResponse(grievance));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as { status: string; note?: string };

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: { status: body.status },
      $push: {
        statusHistory: {
          status: body.status,
          timestamp: new Date(),
          note: body.note,
          changedBy: req.user?.id ?? 'system',
        },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  if (grievance.superplaneRunId) {
    await updateWorkflowStatus(grievance.superplaneRunId, body.status, body.note);
  }

  res.json(successResponse(grievance, 'Grievance status updated'));
}

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  const mediaRequest = req as Request & {
    file?: {
      path: string;
    };
  };

  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  if (!mediaRequest.file) {
    res.status(400).json(errorResponse('No media uploaded', 400));
    return;
  }

  const verification = await verifyMedia(mediaRequest.file.path, grievance.category);

  if (!verification.verified) {
    await fs.unlink(mediaRequest.file.path).catch(() => undefined);
    res.status(400).json(errorResponse('Uploaded media did not pass verification', 400));
    return;
  }

  const mediaUrls = [...(grievance.mediaUrls ?? []), verification.url];
  grievance.mediaUrls = mediaUrls;
  await grievance.save();

  res.status(201).json(successResponse({ mediaUrls }, 'Media attached to grievance'));

  fs.unlink(mediaRequest.file.path).catch((error) => {
    logger.warn('Failed to remove temporary upload file.', {
      filePath: mediaRequest.file?.path,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
