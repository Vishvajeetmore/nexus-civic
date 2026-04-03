import mongoose, { Schema, Document } from 'mongoose';

export interface IBriefingDocument extends Document {
  markdown: string;
  generatedAt: Date;
}

const BriefingSchema = new Schema<IBriefingDocument>({
  markdown: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now }
});

export const Briefing = mongoose.models.Briefing || mongoose.model<IBriefingDocument>('Briefing', BriefingSchema);
