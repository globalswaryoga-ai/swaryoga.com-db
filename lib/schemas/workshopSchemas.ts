import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Workshop Schema - Represents a yoga workshop/course
 */
export interface IWorkshop extends Document {
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  duration?: string; // e.g., "90 days", "30 days"
  price?: number;
  isActive: boolean;
  isFree: boolean;
  // Zoom meeting info
  zoomMeetingId?: number;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomPassword?: string;
  // Community info
  communityId?: mongoose.Types.ObjectId;
  communityName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopSchema = new Schema<IWorkshop>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  thumbnail: { type: String },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'], default: 'all' },
  duration: { type: String },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFree: { type: Boolean, default: false },
  // Zoom meeting info
  zoomMeetingId: { type: Number },
  zoomJoinUrl: { type: String },
  zoomStartUrl: { type: String },
  zoomPassword: { type: String },
  // Community info
  communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
  communityName: { type: String },
}, { timestamps: true });

/**
 * Batch Schema - A specific batch/cohort of a workshop
 */
export interface IBatch extends Document {
  workshopId: mongoose.Types.ObjectId;
  name?: string; // Alias used in API responses
  batchNumber: number;
  batchName?: string; // e.g., "January 2026 Batch"
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  enrolledUsers: mongoose.Types.ObjectId[]; // User IDs who have access
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>({
  workshopId: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true },
  batchNumber: { type: Number, required: true },
  batchName: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  enrolledUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

BatchSchema.index({ workshopId: 1, batchNumber: 1 }, { unique: true });

/**
 * Workshop Video Schema - Videos belonging to workshops/batches
 */
export interface IWorkshopVideo extends Document {
  workshopId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId; // If null, it's a fixed recording for all batches
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string; // S3 URL
  s3Key?: string; // S3 object key for streaming
  accessType?: 'free' | 'paid' | 'preview' | 'enrolled' | 'purchased';
  duration?: number; // In seconds
  dayNumber?: number; // Day 1, Day 2, etc.
  order: number;
  videoType: 'fixed' | 'daily' | 'free' | 'sale';
  isActive: boolean;
  isPublic: boolean; // For free videos
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkshopVideoSchema = new Schema<IWorkshopVideo>({
  workshopId: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
  title: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  videoUrl: { type: String, required: true },
  duration: { type: Number },
  dayNumber: { type: Number },
  order: { type: Number, default: 0 },
  videoType: { type: String, enum: ['fixed', 'daily', 'free', 'sale'], default: 'fixed' },
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

WorkshopVideoSchema.index({ workshopId: 1, batchId: 1, order: 1 });

/**
 * Video Access Log - Track who watched what (for 3 device limit)
 */
export interface IVideoAccessLog extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  deviceId: string; // Generated device fingerprint
  deviceInfo?: string; // Browser, OS info
  ipAddress?: string;
  watchedAt: Date;
  watchDuration?: number; // Seconds watched
}

const VideoAccessLogSchema = new Schema<IVideoAccessLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'WorkshopVideo', required: true },
  deviceId: { type: String, required: true },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  watchedAt: { type: Date, default: Date.now },
  watchDuration: { type: Number, default: 0 },
}, { timestamps: true });

VideoAccessLogSchema.index({ userId: 1, videoId: 1 });
VideoAccessLogSchema.index({ userId: 1, deviceId: 1 });

/**
 * User Device Registry - Track registered devices per user (max 3)
 */
export interface IUserDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  fingerprint?: string; // Browser fingerprint
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  isActive: boolean;
  registeredAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}

const UserDeviceSchema = new Schema<IUserDevice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  deviceName: { type: String },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  lastUsedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
});

UserDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Export model getters (lazy initialization for Next.js)
export function getWorkshop(): Model<IWorkshop> {
  return mongoose.models.Workshop || mongoose.model<IWorkshop>('Workshop', WorkshopSchema);
}

export function getBatch(): Model<IBatch> {
  return mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);
}

export function getWorkshopVideo(): Model<IWorkshopVideo> {
  return mongoose.models.WorkshopVideo || mongoose.model<IWorkshopVideo>('WorkshopVideo', WorkshopVideoSchema);
}

export function getVideoAccessLog(): Model<IVideoAccessLog> {
  return mongoose.models.VideoAccessLog || mongoose.model<IVideoAccessLog>('VideoAccessLog', VideoAccessLogSchema);
}

export function getUserDevice(): Model<IUserDevice> {
  return mongoose.models.UserDevice || mongoose.model<IUserDevice>('UserDevice', UserDeviceSchema);
}
