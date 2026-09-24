import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWorkshopRecording extends Document {
  workshopName: string;
  batchName?: string;
  day: 'day1' | 'day2' | 'day3' | 'day4' | 'day5';
  zoomMeetingId?: string; // Optional: To auto-link Zoom attendees to this day
  youtubeUrl: string;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopRecordingSchema = new Schema<IWorkshopRecording>(
  {
    workshopName: { type: String, required: true },
    batchName: { type: String },
    day: { type: String, enum: ['day1', 'day2', 'day3', 'day4', 'day5'], required: true },
    zoomMeetingId: { type: String },
    youtubeUrl: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation
let WorkshopRecording: Model<IWorkshopRecording>;
try {
  WorkshopRecording = mongoose.model<IWorkshopRecording>('WorkshopRecording');
} catch {
  WorkshopRecording = mongoose.model<IWorkshopRecording>('WorkshopRecording', WorkshopRecordingSchema);
}

export default WorkshopRecording;
