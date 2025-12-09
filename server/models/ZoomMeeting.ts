import mongoose, { Schema, Document } from 'mongoose';

export interface IZoomMeeting extends Document {
  workshopId: mongoose.Types.ObjectId;
  batchId: string;
  
  // Meeting Details
  title: string;
  description?: string;
  scheduledDate: Date;
  duration: number; // minutes
  
  // Zoom Configuration
  zoomMeetingId: string;
  zoomMeetingPassword?: string;
  zoomJoinUrl: string;
  zoomStartUrl?: string;
  
  // Recording
  recordingAvailable: boolean;
  recordingUrl?: string;
  recordingDownloadUrl?: string;
  recordingStartTime?: Date;
  recordingEndTime?: Date;
  
  // Attendee Details
  expectedAttendees: number;
  actualAttendees?: string[]; // array of user IDs
  
  // Session
  sessionNumber: number;
  instructorId: mongoose.Types.ObjectId;
  
  // Status
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;
  
  // Pre/Post Meeting
  preSessionInstructions?: string;
  postSessionNotes?: string;
  
  // Metadata
  isRecordingEnabled: boolean;
  isAutoRecordingEnabled: boolean;
  meetingNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const ZoomMeetingSchema = new Schema<IZoomMeeting>(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true
    },
    batchId: {
      type: String,
      required: true
    },
    
    title: {
      type: String,
      required: true
    },
    description: String,
    scheduledDate: {
      type: Date,
      required: true,
      index: true
    },
    duration: {
      type: Number,
      required: true
    },
    
    zoomMeetingId: {
      type: String,
      required: true,
      unique: true
    },
    zoomMeetingPassword: String,
    zoomJoinUrl: {
      type: String,
      required: true
    },
    zoomStartUrl: String,
    
    recordingAvailable: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    recordingDownloadUrl: String,
    recordingStartTime: Date,
    recordingEndTime: Date,
    
    expectedAttendees: {
      type: Number,
      default: 0
    },
    actualAttendees: [mongoose.Schema.Types.ObjectId],
    
    sessionNumber: {
      type: Number,
      required: true
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    actualStartTime: Date,
    actualEndTime: Date,
    
    preSessionInstructions: String,
    postSessionNotes: String,
    
    isRecordingEnabled: {
      type: Boolean,
      default: true
    },
    isAutoRecordingEnabled: {
      type: Boolean,
      default: true
    },
    meetingNotes: String,
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Index for finding meetings by workshop and date
ZoomMeetingSchema.index({ workshopId: 1, scheduledDate: 1 });
ZoomMeetingSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model<IZoomMeeting>('ZoomMeeting', ZoomMeetingSchema);
