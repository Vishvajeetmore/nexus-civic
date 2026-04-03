import type { Request, Response } from 'express';
import { SOSEvent } from '@nexus-civic/db';

import { errorResponse, paginatedResponse, successResponse } from '../utils/response';
import { notifyNearbyVolunteers, sendSOSAlert } from '../utils/fcm';
import { triggerPoliceEscalation } from '../utils/superplane';
import { createLogger } from '../utils/logger';
import { latLngToS2Cell } from '../utils/s2geometry';
import { updateCellSafetyScore } from '../utils/safetyScorer';

const logger = createLogger(process.env.SERVICE_NAME ?? 'guardian-net');

type GeminiClientLike = {
  predictCrimeRisk: (
    location: { lat: number; lng: number },
    timeSlot: string,
    historicalData: unknown[]
  ) => Promise<{ riskScore: number }>;
};

function createGeminiClientSafe(): GeminiClientLike | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Runtime require avoids hard failure when package artifacts are not built yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const geminiClientModule = require('@nexus-civic/gemini-client') as {
      createGeminiClient?: (key: string) => GeminiClientLike;
    };

    if (typeof geminiClientModule.createGeminiClient === 'function') {
      return geminiClientModule.createGeminiClient(apiKey);
    }
  } catch {
    logger.warn('Gemini client unavailable; using default SOS severity.');
  }

  return null;
}

const gemini = createGeminiClientSafe();

function getTimeSlot(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) {
    return 'late-night';
  }
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

function riskToSeverity(riskScore: number): number {
  const normalized = Math.ceil(riskScore / 2);
  return Math.max(1, Math.min(5, normalized));
}

async function runAsyncSOSChain(
  eventId: string,
  cellId: string,
  location: { lat: number; lng: number; accuracy?: number; address?: string }
): Promise<void> {
  let severity = 3;

  if (gemini) {
    const prediction = await gemini.predictCrimeRisk(
      { lat: location.lat, lng: location.lng },
      getTimeSlot(),
      []
    );
    severity = riskToSeverity(prediction.riskScore);
  }

  const event = await SOSEvent.findByIdAndUpdate(eventId, { $set: { severity } }, { new: true });
  if (!event) {
    logger.warn('SOS event missing during async enrichment.', { eventId });
    return;
  }

  await sendSOSAlert(event.toObject(), []);
  await notifyNearbyVolunteers(location, eventId);

  if (severity >= 4) {
    const runId = await triggerPoliceEscalation(event.toObject());
    if (runId) {
      event.superplaneRunId = runId;
      await event.save();
    }
  }

  await updateCellSafetyScore(cellId, severity);
}

export async function triggerSOS(req: Request, res: Response): Promise<void> {
  const payload = req.body as {
    type: 'hardware' | 'voice' | 'tap';
    location: { lat: number; lng: number; accuracy?: number; address?: string };
    userId: string;
    deviceId?: string;
  };

  const s2CellId = latLngToS2Cell(payload.location.lat, payload.location.lng);

  const event = await SOSEvent.create({
    ...payload,
    location: {
      ...payload.location,
      s2CellId,
    },
    severity: 3,
    status: 'ACTIVE',
  });

  void runAsyncSOSChain(String(event._id), s2CellId, payload.location).catch((error) => {
    logger.error('Async SOS chain failed.', {
      eventId: String(event._id),
      error: error instanceof Error ? error.message : String(error),
    });
  });

  res.status(201).json({
    eventId: String(event._id),
    severity: 3,
    message: 'SOS received. Help is being notified.',
    estimatedResponseMinutes: 7,
  });
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;

  const filter: Record<string, unknown> = {};
  if (status) {
    filter.status = status;
  }
  if (userId) {
    filter.userId = userId;
  }

  const [events, total] = await Promise.all([
    SOSEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    SOSEvent.countDocuments(filter),
  ]);

  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };

  res.json(paginatedResponse(events, pagination));
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const event = await SOSEvent.findById(req.params.id);
  if (!event) {
    res.status(404).json(errorResponse('SOS event not found', 404));
    return;
  }

  res.json(successResponse(event));
}

export async function resolveEvent(req: Request, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json(errorResponse('Unauthorized', 401));
    return;
  }

  const event = await SOSEvent.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!event) {
    res.status(404).json(errorResponse('SOS event not found', 404));
    return;
  }

  res.json(successResponse(event, 'SOS event resolved'));
}
