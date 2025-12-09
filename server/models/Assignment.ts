import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  workshopId: mongoose.Types.ObjectId;
  sessionId: number;
  
  // Assignment Details
  title: string;
  description: string;
  instructions: string;
  
  // Submission
  submissionDeadlineDays: number; // Days after session release
  allowLateSubmission: boolean;
  latePenaltyPercentage?: number;
  
  // Scoring
  totalPoints: number;
  passingPercentage: number;
  
  // Files
  attachments?: {
    title: string;
    url: string;
    type: 'pdf' | 'document' | 'image' | 'video';
  }[];
  
  // Status
  isActive: boolean;
  isPublished: boolean;
  
  // Analytics
  totalSubmissions: number;
  averageScore: number;
  submissionRate: number; // percentage
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true
    },
    sessionId: {
      type: Number,
      required: true
    },
    
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    instructions: {
      type: String,
      required: true
    },
    
    submissionDeadlineDays: {
      type: Number,
      default: 7
    },
    allowLateSubmission: {
      type: Boolean,
      default: true
    },
    latePenaltyPercentage: {
      type: Number,
      default: 0
    },
    
    totalPoints: {
      type: Number,
      default: 100
    },
    passingPercentage: {
      type: Number,
      default: 60
    },
    
    attachments: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: ['pdf', 'document', 'image', 'video']
        }
      }
    ],
    
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    
    totalSubmissions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    submissionRate: {
      type: Number,
      default: 0
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Index for finding assignments by workshop and session
AssignmentSchema.index({ workshopId: 1, sessionId: 1 });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
