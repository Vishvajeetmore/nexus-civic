import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

/**
 * Counter Model (used globally for sequential IDs)
 */
export const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
