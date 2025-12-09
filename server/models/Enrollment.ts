import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  workshopId: mongoose.Types.ObjectId;
  batchId: string; // Reference to batch in workshop
  userId: mongoose.Types.ObjectId;
  
  // Enrollment Details
  enrollmentDate: Date;
  startDate: Date;
  endDate: Date;
  
  // Selection
  selectedMode: 'online' | 'offline' | 'residential' | 'recorded';
  selectedLanguage: 'hindi' | 'marathi' | 'english';
  
  // Status
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  progressPercentage: number;
  
  // Certificate
  certificateUrl?: string;
  certificateIssueDate?: Date;
  certificateNumber?: string;
  
  // Contact
  phone: string;
  email: string;
  address?: string;
  
  // Metadata
  notes?: string;
  cancelledAt?: Date;
  cancelledReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    
    selectedMode: {
      type: String,
      enum: ['online', 'offline', 'residential', 'recorded'],
      required: true
    },
    selectedLanguage: {
      type: String,
      enum: ['hindi', 'marathi', 'english'],
      required: true
    },
    
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'paused'],
      default: 'active',
      index: true
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    certificateUrl: String,
    certificateIssueDate: Date,
    certificateNumber: String,
    
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    address: String,
    
    notes: String,
    cancelledAt: Date,
    cancelledReason: String
  },
  { timestamps: true }
);

// Index for finding user enrollments
EnrollmentSchema.index({ userId: 1, workshopId: 1 });
EnrollmentSchema.index({ status: 1 });

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
