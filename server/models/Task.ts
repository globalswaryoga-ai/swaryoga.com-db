import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITask {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Pending' | 'In Progress' | 'Completed';
  startDate?: string;
  dueDate?: string;
  recurrence?: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  createdAt?: Date;
  updatedAt?: Date;
}

const taskSchema = new Schema<ITask>(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    startDate: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    recurrence: { type: String, enum: ['Once', 'Daily', 'Weekly', 'Monthly', 'Yearly'], default: 'Once' },
  },
  { _id: false, timestamps: true }
);

taskSchema.index({ userId: 1, linkedGoalId: 1, status: 1 });

export default mongoose.model<ITask>('Task', taskSchema);
