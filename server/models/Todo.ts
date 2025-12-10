import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITodo {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  status?: 'Pending' | 'Completed';
  dueDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  createdAt?: Date;
  updatedAt?: Date;
}

const todoSchema = new Schema<ITodo>(
  {
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    dueDate: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  },
  { _id: false, timestamps: true }
);

todoSchema.index({ userId: 1, status: 1 });

export default mongoose.model<ITodo>('Todo', todoSchema);
