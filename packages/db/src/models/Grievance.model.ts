import mongoose, { Schema, Document } from 'mongoose';
import { IGrievance, Priority } from '@nexus-civic/shared-types';

export interface IGrievanceDocument extends Omit<IGrievance, '_id' | 'createdAt'>, Document {
  createdAt: Date;
  isOverdue: boolean;
}

const GrievanceSchema = new Schema<IGrievanceDocument>(
  {
    ticketId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    district: { type: String, required: true, lowercase: true, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    userId: { type: String, required: true },
    departmentId: { type: String, required: true },
    priority: { type: String, enum: Object.values(Priority), required: true },
    priorityScore: { type: Number, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      required: true,
      default: 'OPEN',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, required: true },
        note: { type: String },
        changedBy: { type: String },
      },
    ],
    mediaUrls: { type: [String] },
    superplaneRunId: { type: String },
    isDuplicate: { type: Boolean },
    duplicateOf: { type: String },
  },
  {
    timestamps: true,
  }
);

GrievanceSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });
GrievanceSchema.index({ category: 1, status: 1, createdAt: 1 });
GrievanceSchema.index({ category: 1, district: 1, createdAt: 1 });

GrievanceSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

GrievanceSchema.virtual('isOverdue').get(function () {
  if (this.status === 'RESOLVED' || this.status === 'CLOSED') {
    return false;
  }
  const slaTimeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  return Date.now() > this.createdAt.getTime() + slaTimeMs;
});

/**
 * Grievance Model (used by PulseReport)
 */
export const Grievance = mongoose.models.Grievance || mongoose.model<IGrievanceDocument>('Grievance', GrievanceSchema);
