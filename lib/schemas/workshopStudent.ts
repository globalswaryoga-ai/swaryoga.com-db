import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWorkshopStudent extends Document {
  name: string;
  phone: string;
  email?: string;
  source: 'whatsapp' | 'zoom' | 'lead' | 'manual';
  sourceId?: string; // Group ID, Zoom ID, or Lead ID
  workshopName: string;
  batchName?: string;
  attendance: {
    day1: boolean;
    day2: boolean;
    day3: boolean;
    day4: boolean;
    day5: boolean;
  };
  messagesSent: {
    day1: boolean;
    day2: boolean;
    day3: boolean;
    day4: boolean;
    day5: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopStudentSchema = new Schema<IWorkshopStudent>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    source: { type: String, enum: ['whatsapp', 'zoom', 'lead', 'manual'], default: 'manual' },
    sourceId: { type: String },
    workshopName: { type: String, required: true },
    batchName: { type: String },
    attendance: {
      day1: { type: Boolean, default: false },
      day2: { type: Boolean, default: false },
      day3: { type: Boolean, default: false },
      day4: { type: Boolean, default: false },
      day5: { type: Boolean, default: false },
    },
    messagesSent: {
      day1: { type: Boolean, default: false },
      day2: { type: Boolean, default: false },
      day3: { type: Boolean, default: false },
      day4: { type: Boolean, default: false },
      day5: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation
let WorkshopStudent: Model<IWorkshopStudent>;
try {
  WorkshopStudent = mongoose.model<IWorkshopStudent>('WorkshopStudent');
} catch {
  WorkshopStudent = mongoose.model<IWorkshopStudent>('WorkshopStudent', WorkshopStudentSchema);
}

export default WorkshopStudent;
