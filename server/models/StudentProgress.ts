import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProgress extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  workshopId: mongoose.Types.ObjectId;
  
  // Session Progress
  sessionsCompleted: {
    sessionId: number;
    completedDate: Date;
    watchTime: number; // seconds
    isWatched: boolean;
    isCompleted: boolean; // Full completion
    assessmentScore?: number;
  }[];
  
  // Unlock Status
  unlockedSessions: number[];
  currentSessionNumber: number;
  
  // Assignment Status
  assignmentsSubmitted: {
    assignmentId: mongoose.Types.ObjectId;
    submittedDate: Date;
    submissionUrl: string;
    status: 'submitted' | 'reviewed' | 'approved' | 'rejected';
    adminReview?: string;
    reviewedDate?: Date;
  }[];
  
  // Ratings & Testimonials
  ratingSubmitted: boolean;
  ratingDate?: Date;
  ratingScore?: number;
  ratingComment?: string;
  
  testimonySubmitted: boolean;
  testimonyDate?: Date;
  testimonyText?: string;
  testimonyVideoUrl?: string;
  
  // Overall Progress
  totalSessionsCompleted: number;
  totalAssignmentsCompleted: number;
  completionPercentage: number;
  estimatedCompletionDate?: Date;
  
  // Engagement
  lastActivityDate: Date;
  totalEngagementMinutes: number; // total watch time + activity time
  
  // Status
  isCompleted: boolean;
  completionDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const StudentProgressSchema = new Schema<IStudentProgress>(
  {
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true
    },
    
    sessionsCompleted: [
      {
        sessionId: Number,
        completedDate: Date,
        watchTime: { type: Number, default: 0 },
        isWatched: { type: Boolean, default: false },
        isCompleted: { type: Boolean, default: false },
        assessmentScore: Number
      }
    ],
    
    unlockedSessions: [Number],
    currentSessionNumber: {
      type: Number,
      default: 1
    },
    
    assignmentsSubmitted: [
      {
        assignmentId: mongoose.Schema.Types.ObjectId,
        submittedDate: Date,
        submissionUrl: String,
        status: {
          type: String,
          enum: ['submitted', 'reviewed', 'approved', 'rejected'],
          default: 'submitted'
        },
        adminReview: String,
        reviewedDate: Date
      }
    ],
    
    ratingSubmitted: {
      type: Boolean,
      default: false
    },
    ratingDate: Date,
    ratingScore: {
      type: Number,
      min: 1,
      max: 5
    },
    ratingComment: String,
    
    testimonySubmitted: {
      type: Boolean,
      default: false
    },
    testimonyDate: Date,
    testimonyText: String,
    testimonyVideoUrl: String,
    
    totalSessionsCompleted: {
      type: Number,
      default: 0
    },
    totalAssignmentsCompleted: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    estimatedCompletionDate: Date,
    
    lastActivityDate: {
      type: Date,
      default: Date.now
    },
    totalEngagementMinutes: {
      type: Number,
      default: 0
    },
    
    isCompleted: {
      type: Boolean,
      default: false,
      index: true
    },
    completionDate: Date
  },
  { timestamps: true }
);

// Index for finding progress by user and workshop
StudentProgressSchema.index({ userId: 1, workshopId: 1 });

export default mongoose.model<IStudentProgress>('StudentProgress', StudentProgressSchema);
