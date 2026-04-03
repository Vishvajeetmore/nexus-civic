import mongoose, { Schema, type Document } from 'mongoose';
import { SOSEvent } from '@nexus-civic/db';

import { calculateSafetyScore } from './s2geometry';

interface ISafetyScoreDocument extends Document {
  cellId: string;
  score: number;
  lastUpdated: Date;
}

const SafetyScoreSchema = new Schema<ISafetyScoreDocument>(
  {
    cellId: { type: String, required: true, unique: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    lastUpdated: { type: Date, required: true },
  },
  {
    collection: 'SafetyScore',
    versionKey: false,
  }
);

const SafetyScoreModel =
  mongoose.models.SafetyScore || mongoose.model<ISafetyScoreDocument>('SafetyScore', SafetyScoreSchema);

export async function updateCellSafetyScore(cellId: string, _severity: number): Promise<void> {
  const incidents = await SOSEvent.find({ 'location.s2CellId': cellId })
    .sort({ createdAt: -1 })
    .limit(30)
    .select({ createdAt: 1, severity: 1 })
    .lean();

  const score = calculateSafetyScore(
    incidents.map((incident) => ({
      timestamp: new Date(incident.createdAt ?? new Date()),
      severity: Number(incident.severity ?? 1),
    }))
  );

  await SafetyScoreModel.findOneAndUpdate(
    { cellId },
    {
      $set: {
        score,
        lastUpdated: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}
