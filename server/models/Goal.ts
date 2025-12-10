import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IGoal {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Not Started' | 'In Progress' | 'Completed';
  progress?: number;
  targetDate?: string;
  visionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    targetDate: { type: String, default: '' },
    visionId: { type: String, ref: 'Vision' },
  },
  { _id: false, timestamps: true }
);

goalSchema.index({ userId: 1, linkedVisionId: 1 });

export default mongoose.model<IGoal>('Goal', goalSchema);
