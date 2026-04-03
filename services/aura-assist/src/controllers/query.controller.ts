import type { Request, Response } from 'express';
import { AIAuditLog } from '@nexus-civic/db';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import {
  ALL_KNOWN_ACTIONS,
  ALL_KNOWN_MODULES,
  BlockReason,
  evaluatePolicy,
  logDecision,
  POLICIES,
} from '../armoriq/policyEngine';
import { errorResponse, successResponse } from '../utils/response';
import { generateSpeech, transcribeAudio } from '../utils';

const geminiApiKey = process.env.GEMINI_API_KEY;
const gemini = geminiApiKey ? createGeminiClient(geminiApiKey) : null;

const SERVICE_URLS: Record<string, string> = {
  'guardian-net': process.env.GUARDIAN_NET_URL ?? 'http://guardian-net:3001',
  'pulse-report': process.env.PULSE_REPORT_URL ?? 'http://pulse-report:3002',
  'civic-pulse': process.env.CIVIC_PULSE_URL ?? 'http://civic-pulse:3003',
  'gig-forge': process.env.GIG_FORGE_URL ?? 'http://gig-forge:3004',
  'near-give': process.env.NEAR_GIVE_URL ?? 'http://near-give:3005',
  'terra-scan': process.env.TERRA_SCAN_URL ?? 'http://terra-scan:3006',
  'sentinel-ai': process.env.SENTINEL_AI_URL ?? 'http://sentinel-ai:3007',
  'voice-assembly': process.env.VOICE_ASSEMBLY_URL ?? 'http://voice-assembly:3008',
  'ledger-civic': process.env.LEDGER_CIVIC_URL ?? 'http://ledger-civic:3009',
  'mesh-alert': process.env.MESH_ALERT_URL ?? 'http://mesh-alert:3010',
  'aura-assist': process.env.AURA_ASSIST_URL ?? 'http://aura-assist:3011',
};

type ActionRoute = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
};

const ACTION_ROUTE_MAP: Record<string, ActionRoute> = {
  get_own_grievances: { method: 'GET', path: '/api/grievances' },
  submit_grievance: { method: 'POST', path: '/api/grievances' },
  track_grievance_status: { method: 'GET', path: '/api/grievances' },
  ask_budget_question: { method: 'POST', path: '/api/budget/ask' },
  check_safety_score: { method: 'GET', path: '/api/safety/score' },
  check_safety_heatmap: { method: 'GET', path: '/api/safety/heatmap' },
  find_nearby_ngos: { method: 'GET', path: '/api/ngos/nearby' },
  submit_donation: { method: 'POST', path: '/api/donations' },
  track_donation: { method: 'GET', path: '/api/donations' },
  join_townhall: { method: 'GET', path: '/api/sessions' },
  submit_townhall_issue: { method: 'GET', path: '/api/sessions' },
  cast_townhall_vote: { method: 'GET', path: '/api/sessions' },
  find_gig_listings: { method: 'GET', path: '/api/listings' },
  apply_to_gig: { method: 'GET', path: '/api/listings' },
  update_worker_profile: { method: 'POST', path: '/api/workers/profile' },
  view_assigned_grievances: { method: 'GET', path: '/api/grievances' },
  update_grievance_status: { method: 'GET', path: '/api/grievances' },
  view_sos_events: { method: 'GET', path: '/api/sos/events' },
  resolve_sos_event: { method: 'GET', path: '/api/sos/events' },
  view_crime_predictions: { method: 'GET', path: '/api/predictions/top-zones' },
  acknowledge_dispatch: { method: 'GET', path: '/api/dispatch/active' },
  view_townhall_sessions: { method: 'GET', path: '/api/sessions' },
  view_volunteer_list: { method: 'GET', path: '/api/sos/events' },
  view_assigned_donations: { method: 'GET', path: '/api/donations' },
  update_donation_status: { method: 'GET', path: '/api/donations' },
  view_own_ngo_profile: { method: 'GET', path: '/api/ngos/nearby' },
  view_all_grievances: { method: 'GET', path: '/api/grievances' },
  trigger_patrol_dispatch: { method: 'POST', path: '/api/dispatch/trigger' },
  view_budget_anomalies: { method: 'GET', path: '/api/budget/anomalies' },
  manage_ngos: { method: 'POST', path: '/api/ngos' },
};

function getUserContext(req: Request): { userId: string; role: string } {
  return {
    userId: req.user?.id ?? 'anonymous',
    role: req.user?.role ?? 'citizen',
  };
}

export async function handleQuery(req: Request, res: Response): Promise<void> {
  const { userId, role } = getUserContext(req);
  const body = req.body as { text?: string; audioBase64?: string; voiceMode?: boolean };

  let text = body.text?.trim() ?? '';

  if (body.audioBase64) {
    try {
      const transcription = await transcribeAudio(body.audioBase64);
      text = transcription.transcript.trim();
    } catch {
      res.status(400).json(errorResponse('Audio transcription failed', 400));
      return;
    }
  }

  if (!text) {
    res.status(400).json(errorResponse('Please provide text or audio', 400));
    return;
  }

  const intent = gemini
    ? await gemini.detectIntent(text, ALL_KNOWN_ACTIONS, ALL_KNOWN_MODULES)
    : { action: 'unknown', module: 'aura-assist' };

  const action = intent.action;
  const moduleName = intent.module;

  const decision = evaluatePolicy(userId, role, action, moduleName);
  await logDecision(decision, text, userId);

  if (!decision.allowed) {
    res.status(403).json({
      blocked: true,
      reason: decision.reason,
      blockReason: decision.blockReason,
    });
    return;
  }

  const baseUrl = SERVICE_URLS[moduleName];
  if (!baseUrl) {
    const unavailableDecision = {
      ...decision,
      allowed: false,
      reason: `Unknown service module '${moduleName}'.`,
      blockReason: BlockReason.MODULE_NOT_ACCESSIBLE,
    };
    await logDecision(unavailableDecision, text, userId);
    res.status(502).json({
      blocked: false,
      answer: `The ${moduleName} service is not configured right now. Please try again later.`,
      sources: [moduleName],
    });
    return;
  }

  const actionRoute = ACTION_ROUTE_MAP[action] ?? { method: 'GET', path: '/health' };

  let serviceResponseData: unknown;
  try {
    const response = await axios({
      method: actionRoute.method,
      url: `${baseUrl}${actionRoute.path}`,
      timeout: 5000,
      data: {
        text,
        userId,
        role,
      },
      headers: {
        Authorization: req.header('Authorization') ?? '',
      },
      validateStatus: (status) => status >= 200 && status < 500,
    });

    serviceResponseData = response.data;
  } catch {
    res.status(502).json({
      blocked: false,
      answer: `The ${moduleName} service is currently unavailable. Please try again shortly.`,
      sources: [moduleName],
    });
    return;
  }

  const answerText = typeof serviceResponseData === 'string'
    ? serviceResponseData
    : JSON.stringify(serviceResponseData);

  let audioUrl: string | undefined;
  if (body.voiceMode) {
    const audioBuffer = await generateSpeech(answerText);
    if (audioBuffer) {
      const fileName = `aura-assist-${randomUUID()}.mp3`;
      const filePath = path.join('/tmp', fileName);
      await fs.writeFile(filePath, audioBuffer);
      audioUrl = `/tmp/${fileName}`;
    }
  }

  res.json({
    answer: answerText,
    sources: [moduleName],
    blocked: false,
    audioUrl,
  });
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));

  const filter: Record<string, unknown> = {};
  if (typeof req.query.role === 'string' && req.query.role.trim()) {
    filter.role = req.query.role.trim();
  }
  if (typeof req.query.module === 'string' && req.query.module.trim()) {
    filter.module = req.query.module.trim();
  }
  if (typeof req.query.allowed === 'string') {
    if (req.query.allowed === 'true') {
      filter.allowed = true;
    } else if (req.query.allowed === 'false') {
      filter.allowed = false;
    }
  }

  const dateFrom = typeof req.query.dateFrom === 'string' ? new Date(req.query.dateFrom) : null;
  const dateTo = typeof req.query.dateTo === 'string' ? new Date(req.query.dateTo) : null;
  if ((dateFrom && !Number.isNaN(dateFrom.getTime())) || (dateTo && !Number.isNaN(dateTo.getTime()))) {
    filter.createdAt = {
      ...(dateFrom && !Number.isNaN(dateFrom.getTime()) ? { $gte: dateFrom } : {}),
      ...(dateTo && !Number.isNaN(dateTo.getTime()) ? { $lte: dateTo } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    AIAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AIAuditLog.countDocuments(filter),
  ]);

  res.json(
    successResponse(
      {
        items: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Audit logs fetched'
    )
  );
}

export async function getCapabilities(req: Request, res: Response): Promise<void> {
  const role = req.user?.role ?? 'citizen';
  const policy = POLICIES[role];

  if (!policy) {
    res.status(403).json(errorResponse(`Unknown role '${role}'`, 403));
    return;
  }

  res.json(
    successResponse(
      {
        role,
        allowedActions: policy.allowedActions,
        allowedModules: policy.allowedModules,
        description: `You are signed in as '${role}'. The listed actions and modules are currently permitted by ArmorIQ.`,
      },
      'Role capabilities fetched'
    )
  );
}

export async function transcribeVoice(req: Request, res: Response): Promise<void> {
  const body = req.body as { audioBase64: string };
  const result = await transcribeAudio(body.audioBase64);

  res.json(
    successResponse(
      {
        transcript: result.transcript,
        language: result.language,
      },
      'Voice transcribed'
    )
  );
}
