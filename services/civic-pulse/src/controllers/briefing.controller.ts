import { Request, Response } from 'express';
import { Briefing } from '../models/Briefing.model';
import { generateDailyBriefing } from '../utils/briefing';
import { successResponse, errorResponse } from '../utils/response';

export const getDaily = async (req: Request, res: Response) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const briefing = await Briefing.findOne({
    generatedAt: { $gte: startOfDay }
  }).sort({ generatedAt: -1 });

  if (!briefing) return res.status(404).json(errorResponse('No briefing generated for today', 404));

  return res.json(successResponse(briefing, 'Briefing retrieved'));
};

export const generateBriefing = async (req: Request, res: Response) => {
  const { markdown, generatedAt } = await generateDailyBriefing();
  
  const briefing = await Briefing.create({
    markdown,
    generatedAt
  });

  return res.status(201).json(successResponse(briefing, 'Briefing generated'));
};
