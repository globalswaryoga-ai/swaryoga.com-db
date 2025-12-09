import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  workshopId: mongoose.Types.ObjectId;
  sessionNumber: number;
  title: string;
  description: string;
  duration: number; // minutes
  
  // Video Content
  videoUrl?: string;
  s3Key?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  
  // Video Unlock Rules
  unlockRules: {
    requiresPreviousCompletion: boolean;
    timeGapAfterPreviousHours?: number;
    requiresAssignment: boolean;
    assignmentId?: mongoose.Types.ObjectId;
    requiresRating: boolean;
    requiresTestimony: boolean;
  };
  
  // Content
  transcript?: string;
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'document' | 'link' | 'image';
  }[];
  
  // Status
  isPublished: boolean;
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const SessionSchema = new Schema<ISession>(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true
    },
    sessionNumber: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    duration: {
      type: Number,
      required: true
    },
    
    videoUrl: String,
    s3Key: String,
    youtubeId: String,
    thumbnailUrl: String,
    
    unlockRules: {
      requiresPreviousCompletion: {
        type: Boolean,
        default: true
      },
      timeGapAfterPreviousHours: {
        type: Number,
        default: 24
      },
      requiresAssignment: {
        type: Boolean,
        default: false
      },
      assignmentId: mongoose.Schema.Types.ObjectId,
      requiresRating: {
        type: Boolean,
        default: false
      },
      requiresTestimony: {
        type: Boolean,
        default: false
      }
    },
    
    transcript: String,
    resources: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: ['pdf', 'document', 'link', 'image']
        }
      }
    ],
    
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Index for finding sessions by workshop
SessionSchema.index({ workshopId: 1, sessionNumber: 1 });

export default mongoose.model<ISession>('Session', SessionSchema);
