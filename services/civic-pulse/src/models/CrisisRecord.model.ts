import mongoose, { Schema, Document } from 'mongoose';

export interface ICrisisRecordDocument extends Document {
  category: string;
  summary: string;
  postIds: string[];
  createdAt: Date;
}

const CrisisRecordSchema = new Schema<ICrisisRecordDocument>({
  category: { type: String, required: true },
  summary: { type: String, required: true },
  postIds: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const CrisisRecord = mongoose.models.CrisisRecord || mongoose.model<ICrisisRecordDocument>('CrisisRecord', CrisisRecordSchema);
