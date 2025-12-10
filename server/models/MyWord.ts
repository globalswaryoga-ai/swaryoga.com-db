import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IMyWord {
  _id?: string;
  userId: string;
  commitment: string;
  committedDate?: string;
  completionDeadline?: string;
  recurrence?: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  status?: 'Pending' | 'In Progress' | 'Completed';
  isOverdue?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const mywordSchema = new Schema<IMyWord>(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    commitment: { type: String, required: true },
    committedDate: { type: String, default: '' },
    completionDeadline: { type: String, default: '' },
    recurrence: { type: String, enum: ['Once', 'Daily', 'Weekly', 'Monthly', 'Yearly'], default: 'Once' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    isOverdue: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true }
);

mywordSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IMyWord>('MyWord', mywordSchema);
