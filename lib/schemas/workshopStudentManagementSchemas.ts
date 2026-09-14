import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkshopCohort extends Document {
  name: string;
  startDate: Date;
  endDate?: Date;
  holidayDates: Date[];
  classStartTime?: string;
  classEndTime?: string;
  timezone: string;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  whatsappGroupLink?: string;
  googleFormLink?: string;
  aiWorkerEnabled?: boolean;
  autoSyncWhatsappGroup?: boolean;
  autoSendRecordings?: boolean;
  workerLastRunAt?: Date;
  whatsappGroupId?: string;
  communityId?: string;
  recordingPolicy: 'speaker_and_gallery';
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopCohortSchema = new Schema<IWorkshopCohort>({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  holidayDates: { type: [Date], default: [] },
  classStartTime: String,
  classEndTime: String,
  timezone: { type: String, default: 'Asia/Kolkata' },
  zoomMeetingId: String,
  zoomJoinUrl: String,
  whatsappGroupLink: String,
  googleFormLink: String,
  aiWorkerEnabled: { type: Boolean, default: true },
  autoSyncWhatsappGroup: { type: Boolean, default: false },
  autoSendRecordings: { type: Boolean, default: false },
  workerLastRunAt: Date,
  whatsappGroupId: String,
  communityId: String,
  recordingPolicy: { type: String, enum: ['speaker_and_gallery'], default: 'speaker_and_gallery' },
  createdByUserId: String,
}, { timestamps: true });

export interface IWorkshopStudent extends Document {
  cohortId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  whatsappJid?: string;
  whatsappNumber?: string;
  source: 'manual' | 'whatsapp_group' | 'form' | 'crm_lead';
  active: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopStudentSchema = new Schema<IWorkshopStudent>({
  cohortId: { type: Schema.Types.ObjectId, ref: 'WorkshopCohort', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: String,
  phone: String,
  whatsappJid: String,
  whatsappNumber: String,
  source: { type: String, enum: ['manual', 'whatsapp_group', 'form', 'crm_lead'], default: 'manual' },
  active: { type: Boolean, default: true },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

WorkshopStudentSchema.index(
  { cohortId: 1, whatsappJid: 1 },
  { unique: true, partialFilterExpression: { whatsappJid: { $type: 'string', $ne: '' } } },
);
WorkshopStudentSchema.index({ cohortId: 1, phone: 1 });

export interface IWorkshopAttendance extends Document {
  cohortId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  classDate: Date;
  joinedAt?: Date;
  leftAt?: Date;
  joined: boolean;
  durationSeconds: number;
  attendancePercent: number;
  source: 'zoom' | 'manual';
}

const WorkshopAttendanceSchema = new Schema<IWorkshopAttendance>({
  cohortId: { type: Schema.Types.ObjectId, ref: 'WorkshopCohort', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'WorkshopStudent', required: true, index: true },
  classDate: { type: Date, required: true },
  joinedAt: Date,
  leftAt: Date,
  joined: { type: Boolean, default: false },
  durationSeconds: { type: Number, default: 0 },
  attendancePercent: { type: Number, default: 0 },
  source: { type: String, enum: ['zoom', 'manual'], default: 'zoom' },
}, { timestamps: true });

WorkshopAttendanceSchema.index({ cohortId: 1, studentId: 1, classDate: 1 }, { unique: true });

export interface IWorkshopRecordingDelivery extends Document {
  cohortId: mongoose.Types.ObjectId;
  classDate: Date;
  dayNumber?: number;
  zoomMeetingId?: string;
  zoomMeetingUuid?: string;
  youtubeSpeakerId?: string;
  youtubeGalleryId?: string;
  youtubeSpeakerUrl?: string;
  youtubeGalleryUrl?: string;
  bunnySpeakerUrl?: string;
  bunnyGalleryUrl?: string;
  deliveredStudentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopRecordingDeliverySchema = new Schema<IWorkshopRecordingDelivery>({
  cohortId: { type: Schema.Types.ObjectId, ref: 'WorkshopCohort', required: true, index: true },
  classDate: { type: Date, required: true },
  dayNumber: Number,
  zoomMeetingId: String,
  zoomMeetingUuid: String,
  youtubeSpeakerId: String,
  youtubeGalleryId: String,
  youtubeSpeakerUrl: String,
  youtubeGalleryUrl: String,
  bunnySpeakerUrl: String,
  bunnyGalleryUrl: String,
  deliveredStudentIds: [{ type: Schema.Types.ObjectId, ref: 'WorkshopStudent' }],
}, { timestamps: true });

WorkshopRecordingDeliverySchema.index({ cohortId: 1, classDate: 1 }, { unique: true });

function getModel<T extends Document>(name: string, schema: Schema<T>): Model<T> {
  return mongoose.models[name] || mongoose.model<T>(name, schema);
}

export const getWorkshopCohort = () => getModel<IWorkshopCohort>('WorkshopCohort', WorkshopCohortSchema);
export const getWorkshopStudent = () => getModel<IWorkshopStudent>('WorkshopStudent', WorkshopStudentSchema);
export const getWorkshopAttendance = () => getModel<IWorkshopAttendance>('WorkshopAttendance', WorkshopAttendanceSchema);
export const getWorkshopRecordingDelivery = () => getModel<IWorkshopRecordingDelivery>('WorkshopRecordingDelivery', WorkshopRecordingDeliverySchema);
