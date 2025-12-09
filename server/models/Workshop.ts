import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkshop extends Document {
  title: string;
  description: string;
  category: 'basic' | 'L1' | 'L2' | 'L3' | 'L4' | 'weight-loss' | 'meditation' | 'youth' | 'children' | 'pre-pregnancy' | 'bandhan-mukti' | 'amrut-aahar' | 'business' | 'corporate';
  languages: ('hindi' | 'marathi' | 'english')[];
  
  // Media
  thumbnail: string;
  heroImage: string;
  heroVideo?: string;
  galleryImages: string[];
  
  // Instructor
  instructor: {
    name: string;
    bio?: string;
    photo?: string;
  };
  
  // Details
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // days
  totalSessions: number;
  
  // Batches for different modes
  batches: {
    mode: 'online' | 'offline' | 'residential' | 'recorded';
    startDate: Date;
    endDate: Date;
    capacity: number;
    enrolledCount: number;
    pricing: {
      INR: number;
      NPR: number;
      USD: number;
    };
    schedule?: {
      days: string[]; // Mon, Tue, etc
      time: string; // HH:mm
      timezone: string;
    };
  }[];
  
  // Sessions/Videos
  sessions: {
    sessionId: number;
    title: string;
    description: string;
    duration: number; // minutes
    videoUrl?: string; // S3 or YouTube URL
    s3Key?: string; // For S3 storage
    thumbnailUrl?: string;
    
    // Unlock Rules
    unlockRules: {
      requiresPreviousCompletion: boolean;
      timeGapHours?: number;
      requiresAssignment: boolean;
      assignmentTitle?: string;
      requiresRating: boolean;
      requiresTestimony: boolean;
    };
  }[];
  
  // Ratings & Reviews
  averageRating: number;
  totalReviews: number;
  testimonials: {
    userId: mongoose.Types.ObjectId;
    name: string;
    location?: string;
    rating: number;
    text: string;
    photo?: string;
    videoUrl?: string;
    submittedAt: Date;
  }[];
  
  // Benefits
  benefits: string[];
  
  // FAQ
  faq: {
    question: string;
    answer: string;
  }[];
  
  // Content
  whatYouWillLearn: string[];
  requirements: string[];
  targetAudience: string;
  
  // Metadata
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  // Analytics
  totalEnrollments: number;
  totalCompleted: number;
  averageCompletionTime: number; // days
  
  // SEO
  slug: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

const WorkshopSchema = new Schema<IWorkshop>(
  {
    title: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['basic', 'L1', 'L2', 'L3', 'L4', 'weight-loss', 'meditation', 'youth', 'children', 'pre-pregnancy', 'bandhan-mukti', 'amrut-aahar', 'business', 'corporate'],
      required: true,
      index: true
    },
    languages: {
      type: [String],
      enum: ['hindi', 'marathi', 'english'],
      required: true
    },
    
    thumbnail: { type: String, required: true },
    heroImage: { type: String, required: true },
    heroVideo: { type: String },
    galleryImages: [{ type: String }],
    
    instructor: {
      name: { type: String, required: true },
      bio: { type: String },
      photo: { type: String }
    },
    
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    duration: { type: Number, required: true },
    totalSessions: { type: Number, required: true },
    
    batches: [
      {
        mode: {
          type: String,
          enum: ['online', 'offline', 'residential', 'recorded'],
          required: true
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        capacity: { type: Number, required: true },
        enrolledCount: { type: Number, default: 0 },
        pricing: {
          INR: { type: Number, required: true },
          NPR: { type: Number, required: true },
          USD: { type: Number, required: true }
        },
        schedule: {
          days: [String],
          time: String,
          timezone: String
        }
      }
    ],
    
    sessions: [
      {
        sessionId: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String },
        duration: { type: Number, required: true },
        videoUrl: { type: String },
        s3Key: { type: String },
        thumbnailUrl: { type: String },
        
        unlockRules: {
          requiresPreviousCompletion: { type: Boolean, default: true },
          timeGapHours: { type: Number, default: 24 },
          requiresAssignment: { type: Boolean, default: true },
          assignmentTitle: { type: String },
          requiresRating: { type: Boolean, default: false },
          requiresTestimony: { type: Boolean, default: false }
        }
      }
    ],
    
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    testimonials: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        location: String,
        rating: { type: Number, min: 1, max: 5 },
        text: String,
        photo: String,
        videoUrl: String,
        submittedAt: { type: Date, default: Date.now }
      }
    ],
    
    benefits: [String],
    
    faq: [
      {
        question: String,
        answer: String
      }
    ],
    
    whatYouWillLearn: [String],
    requirements: [String],
    targetAudience: String,
    
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    totalEnrollments: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 },
    
    slug: { type: String, required: true, unique: true, index: true },
    metaDescription: String,
    metaKeywords: [String]
  },
  { timestamps: true }
);

// Create slug before saving
WorkshopSchema.pre<IWorkshop>('save', function(this: IWorkshop, next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }
  next();
});

export default mongoose.model<IWorkshop>('Workshop', WorkshopSchema);
