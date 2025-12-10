import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IVision {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Active' | 'Completed' | 'On Hold' | 'Not Started' | 'In Progress';
  visualImageUrl?: string;
  visionStatement?: string;
  affirmations?: string[];
  category?: string;
  timeFrame?: string;
  timelineMonths?: number;
  startDate?: string;
  targetDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const visionSchema = new Schema<IVision>(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Active', 'Completed', 'On Hold', 'Not Started', 'In Progress'], default: 'Active' },
    visualImageUrl: { type: String, default: '' },
    visionStatement: { type: String, default: '' },
    affirmations: { type: [String], default: [] },
    category: { type: String, default: '' },
    timeFrame: { type: String, default: '' },
    timelineMonths: { type: Number, default: 12 },
    startDate: { type: String, default: '' },
    targetDate: { type: String, default: '' },
  },
  { _id: false, timestamps: true }
);

visionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IVision>('Vision', visionSchema);
