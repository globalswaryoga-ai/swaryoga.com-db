import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * =====================================================
 * RECORDED COURSES SCHEMA
 * =====================================================
 * Complete schema for recorded yoga courses with:
 * - Multi-language content support
 * - Gift hours system
 * - Course materials & assignments
 * - Reviews & feedback
 * - Certificates
 * - Device restrictions
 * =====================================================
 */

// =====================================================
// RECORDED COURSE (Main Course)
// =====================================================
export interface IRecordedCourse extends Document {
  // Basic Info
  slug: string;
  isActive: boolean;
  isPublished: boolean;
  order: number; // Display order
  
  // Multi-language Content
  content: {
    en: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    hi?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    mr?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    ne?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    zh?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    es?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    fr?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    ar?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    de?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    pt?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    ja?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    ko?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    ru?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    it?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    tr?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    nl?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    sv?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    th?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
    id?: {
      title: string;
      subtitle?: string;
      description?: string;
      whatYouWillLearn?: string[];
      requirements?: string[];
      targetAudience?: string[];
    };
  };
  
  // Media
  thumbnail?: string;
  previewVideoUrl?: string; // Free preview video (Bunny)
  previewVideoThumbnail?: string;
  
  // Course Details
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  videoLanguage?: string; // Language of the workshop videos (en, hi, mr, ne, zh, es, fr, ar, de, pt, ja, ko, ru, it, tr, nl, sv, th, id)
  category: 'swar-yoga' | 'meditation' | 'pranayama' | 'general';
  tags?: string[];
  totalDuration?: number; // Total duration in minutes
  totalVideos?: number;
  totalMaterials?: number;
  
  // Pricing (Multi-currency)
  pricing: {
    INR: { price: number; originalPrice?: number; };
    NPR?: { price: number; originalPrice?: number; };
    USD?: { price: number; originalPrice?: number; };
  };
  isFree: boolean;
  discount?: number; // Discount percentage (0-100)
  promoCode?: string; // Promo code for discount

  // Gift Hours Settings
  giftHours: {
    enabled: boolean;
    hours: number; // e.g., 2 hours free trial
    description?: string;
  };
  
  // Access Settings
  accessSettings: {
    maxDevices: number; // Default 3
    allowDownload: boolean;
    allowScreenRecording: boolean;
    allowScreenSharing: boolean;
    videoTimeGap: number; // Gap between videos in seconds (e.g., 60 = 1 min)
    requireAssignmentCompletion: boolean;
    certificateOnCompletion: boolean;
  };
  
  // Instructor
  instructorId?: mongoose.Types.ObjectId;
  instructorName?: string;
  instructorImage?: string;
  instructorBio?: string;
  
  // Stats
  enrolledCount: number;
  completionRate: number;
  averageRating: number;
  reviewCount: number;

  // Social/Engagement Metrics
  defaultStudents?: number; // Base student count (default 15)
  likes?: number; // Course likes (default 10)
  rating?: number; // Course rating out of 5 (default 5.0)

  // Soft Delete
  deletedAt?: Date;
  deletedBy?: string;
  createdBy?: string;
  updatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const RecordedCourseSchema = new Schema<IRecordedCourse>({
  slug: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  
  content: {
    en: {
      title: { type: String, required: true },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    hi: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    mr: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    ne: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    zh: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    es: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    fr: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    ar: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    de: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    pt: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    ja: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    ko: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    ru: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    it: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    tr: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    nl: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    sv: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    th: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
    id: {
      title: { type: String },
      subtitle: { type: String },
      description: { type: String },
      whatYouWillLearn: [{ type: String }],
      requirements: [{ type: String }],
      targetAudience: [{ type: String }],
    },
  },
  
  thumbnail: { type: String },
  previewVideoUrl: { type: String },
  previewVideoThumbnail: { type: String },
  
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'], default: 'beginner' },
  videoLanguage: { type: String, enum: ['en', 'hi', 'mr', 'ne', 'zh', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko', 'ru', 'it', 'tr', 'nl', 'sv', 'th', 'id'], default: 'en' },
  category: { type: String, enum: ['swar-yoga', 'meditation', 'pranayama', 'general'], default: 'swar-yoga' },
  tags: [{ type: String }],
  totalDuration: { type: Number, default: 0 },
  totalVideos: { type: Number, default: 0 },
  totalMaterials: { type: Number, default: 0 },
  
  pricing: {
    INR: { price: { type: Number, default: 0 }, originalPrice: { type: Number } },
    NPR: { price: { type: Number }, originalPrice: { type: Number } },
    USD: { price: { type: Number }, originalPrice: { type: Number } },
  },
  isFree: { type: Boolean, default: false },
  discount: { type: Number, min: 0, max: 100 },
  promoCode: { type: String, trim: true, uppercase: true },

  giftHours: {
    enabled: { type: Boolean, default: true },
    hours: { type: Number, default: 2 },
    description: { type: String },
  },
  
  accessSettings: {
    maxDevices: { type: Number, default: 3 },
    allowDownload: { type: Boolean, default: false },
    allowScreenRecording: { type: Boolean, default: false },
    allowScreenSharing: { type: Boolean, default: false },
    videoTimeGap: { type: Number, default: 60 },
    requireAssignmentCompletion: { type: Boolean, default: false },
    certificateOnCompletion: { type: Boolean, default: true },
  },
  
  instructorId: { type: Schema.Types.ObjectId, ref: 'User' },
  instructorName: { type: String },
  instructorImage: { type: String },
  instructorBio: { type: String },
  
  enrolledCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },

  // Social/Engagement Metrics
  defaultStudents: { type: Number, default: 15 },
  likes: { type: Number, default: 10 },
  rating: { type: Number, default: 5.0 },

  // Soft Delete & Audit
  deletedAt: { type: Date, sparse: true },
  deletedBy: { type: String, sparse: true },
  createdBy: { type: String, sparse: true },
  updatedBy: { type: String, sparse: true },
}, { timestamps: true });

RecordedCourseSchema.index({ slug: 1 });
RecordedCourseSchema.index({ isActive: 1, isPublished: 1, order: 1 });

// =====================================================
// COURSE VIDEO (Individual Video)
// =====================================================
export interface ICourseVideo extends Document {
  courseId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  
  // Multi-language Content
  content: {
    en: { title: string; description?: string; };
    hi?: { title: string; description?: string; };
    ne?: { title: string; description?: string; };
  };
  
  // Video Details
  bunnyVideoId?: string; // Bunny Stream video ID
  videoUrl?: string; // Direct URL (for non-Bunny)
  thumbnail?: string;
  duration: number; // In seconds
  
  // Access
  accessType: 'free' | 'preview' | 'paid' | 'gift';
  order: number;
  isActive: boolean;
  
  // Tracking
  viewCount: number;
  avgWatchTime: number;

  createdAt: Date;
  updatedAt: Date;
}

const CourseVideoSchema = new Schema<ICourseVideo>({
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'CourseSection' },
  
  content: {
    en: { title: { type: String, required: true }, description: { type: String } },
    hi: { title: { type: String }, description: { type: String } },
    ne: { title: { type: String }, description: { type: String } },
  },
  
  bunnyVideoId: { type: String },
  videoUrl: { type: String },
  thumbnail: { type: String },
  duration: { type: Number, default: 0 },
  
  accessType: { type: String, enum: ['free', 'preview', 'paid', 'gift'], default: 'paid' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  viewCount: { type: Number, default: 0 },
  avgWatchTime: { type: Number, default: 0 },
}, { timestamps: true });

CourseVideoSchema.index({ courseId: 1, order: 1 });

// =====================================================
// COURSE SECTION (Video Grouping)
// =====================================================
export interface ICourseSection extends Document {
  courseId: mongoose.Types.ObjectId;
  content: {
    en: { title: string; description?: string; };
    hi?: { title: string; description?: string; };
    ne?: { title: string; description?: string; };
  };
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSectionSchema = new Schema<ICourseSection>({
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  content: {
    en: { title: { type: String, required: true }, description: { type: String } },
    hi: { title: { type: String }, description: { type: String } },
    ne: { title: { type: String }, description: { type: String } },
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

CourseSectionSchema.index({ courseId: 1, order: 1 });

// =====================================================
// COURSE MATERIAL (PDFs, Notes, Downloads)
// =====================================================
export interface ICourseMaterial extends Document {
  courseId: mongoose.Types.ObjectId;
  videoId?: mongoose.Types.ObjectId; // If attached to specific video
  
  content: {
    en: { title: string; description?: string; };
    hi?: { title: string; description?: string; };
    ne?: { title: string; description?: string; };
  };
  
  type: 'pdf' | 'notes' | 'receipt' | 'certificate' | 'other';
  fileUrl: string;
  fileSize?: number; // In bytes
  downloadable: boolean;
  order: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CourseMaterialSchema = new Schema<ICourseMaterial>({
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'CourseVideo' },
  
  content: {
    en: { title: { type: String, required: true }, description: { type: String } },
    hi: { title: { type: String }, description: { type: String } },
    ne: { title: { type: String }, description: { type: String } },
  },
  
  type: { type: String, enum: ['pdf', 'notes', 'receipt', 'certificate', 'other'], default: 'pdf' },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number },
  downloadable: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

CourseMaterialSchema.index({ courseId: 1, order: 1 });

// =====================================================
// COURSE ASSIGNMENT
// =====================================================
export interface ICourseAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  videoId?: mongoose.Types.ObjectId; // After which video
  
  content: {
    en: {
      title: string;
      description?: string;
      instructions?: string;
      questions?: Array<{
        type: 'text' | 'multiple-choice' | 'file';
        question: string;
        options?: string[];
        correctAnswer?: string;
        points?: number;
      }>;
    };
    hi?: {
      title: string;
      description?: string;
      instructions?: string;
      questions?: Array<{
        type: 'text' | 'multiple-choice' | 'file';
        question: string;
        options?: string[];
        correctAnswer?: string;
        points?: number;
      }>;
    };
  };
  
  dueAfterDays?: number; // Days from enrollment
  totalPoints: number;
  passingPoints: number;
  isRequired: boolean;
  order: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CourseAssignmentSchema = new Schema<ICourseAssignment>({
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'CourseVideo' },
  
  content: {
    en: {
      title: { type: String, required: true },
      description: { type: String },
      instructions: { type: String },
      questions: [{
        type: { type: String, enum: ['text', 'multiple-choice', 'file'] },
        question: { type: String },
        options: [{ type: String }],
        correctAnswer: { type: String },
        points: { type: Number, default: 1 },
      }],
    },
    hi: {
      title: { type: String },
      description: { type: String },
      instructions: { type: String },
      questions: [{
        type: { type: String, enum: ['text', 'multiple-choice', 'file'] },
        question: { type: String },
        options: [{ type: String }],
        correctAnswer: { type: String },
        points: { type: Number, default: 1 },
      }],
    },
  },
  
  dueAfterDays: { type: Number },
  totalPoints: { type: Number, default: 100 },
  passingPoints: { type: Number, default: 60 },
  isRequired: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

CourseAssignmentSchema.index({ courseId: 1, order: 1 });

// =====================================================
// COURSE ENROLLMENT (User Purchase/Access)
// =====================================================
export interface ICourseEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  
  // Purchase Info
  purchaseType: 'paid' | 'free' | 'gift';
  paymentId?: string;
  currency?: 'INR' | 'NPR' | 'USD';
  amountPaid?: number;
  
  // Gift Hours
  giftHoursUsed: number; // How many gift hours used
  giftHoursRemaining: number;
  
  // Progress
  progress: number; // 0-100 percentage
  videosWatched: mongoose.Types.ObjectId[];
  lastWatchedVideoId?: mongoose.Types.ObjectId;
  lastWatchedAt?: Date;
  totalWatchTime: number; // In seconds
  
  // Assignment Progress
  assignmentsCompleted: Array<{
    assignmentId: mongoose.Types.ObjectId;
    score: number;
    completedAt: Date;
    answers?: any;
  }>;
  
  // Certificate
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateIssuedAt?: Date;
  
  // Community Links
  communityLinks?: {
    whatsapp?: string;
    community?: string;
    discord?: string;
    telegram?: string;
    lastSharedAt?: Date;
  };

  // Per-user overrides
  maxDevicesOverride?: number;
  videoTimeGapOverride?: number;

  // Status
  status: 'active' | 'expired' | 'suspended' | 'completed';
  enrolledAt: Date;
  expiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  
  purchaseType: { type: String, enum: ['paid', 'free', 'gift'], default: 'paid' },
  paymentId: { type: String },
  currency: { type: String, enum: ['INR', 'NPR', 'USD'] },
  amountPaid: { type: Number },
  
  giftHoursUsed: { type: Number, default: 0 },
  giftHoursRemaining: { type: Number, default: 0 },
  
  progress: { type: Number, default: 0 },
  videosWatched: [{ type: Schema.Types.ObjectId, ref: 'CourseVideo' }],
  lastWatchedVideoId: { type: Schema.Types.ObjectId, ref: 'CourseVideo' },
  lastWatchedAt: { type: Date },
  totalWatchTime: { type: Number, default: 0 },
  
  assignmentsCompleted: [{
    assignmentId: { type: Schema.Types.ObjectId, ref: 'CourseAssignment' },
    score: { type: Number },
    completedAt: { type: Date },
    answers: { type: Schema.Types.Mixed },
  }],
  
  certificateIssued: { type: Boolean, default: false },
  certificateUrl: { type: String },
  certificateIssuedAt: { type: Date },

  communityLinks: {
    whatsapp: { type: String },
    community: { type: String },
    discord: { type: String },
    telegram: { type: String },
    lastSharedAt: { type: Date },
  },

  maxDevicesOverride: { type: Number },
  videoTimeGapOverride: { type: Number },

  status: { type: String, enum: ['active', 'expired', 'suspended', 'completed'], default: 'active' },
  enrolledAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { timestamps: true });

CourseEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
CourseEnrollmentSchema.index({ userId: 1, status: 1 });

// =====================================================
// COURSE REVIEW
// =====================================================
export interface ICourseReview extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  
  rating: number; // 1-5
  review?: string;
  isVerified: boolean; // Has actually enrolled
  isApproved: boolean; // Admin approved
  isPublic: boolean;
  
  // User snapshot
  userName?: string;
  userImage?: string;
  userLocation?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CourseReviewSchema = new Schema<ICourseReview>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String },
  isVerified: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: true },
  
  userName: { type: String },
  userImage: { type: String },
  userLocation: { type: String },
}, { timestamps: true });

CourseReviewSchema.index({ courseId: 1, isApproved: 1 });
CourseReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// =====================================================
// VIDEO WATCH LOG (Detailed tracking)
// =====================================================
export interface IVideoWatchLog extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  
  deviceFingerprint: string;
  deviceInfo?: string;
  ipAddress?: string;
  
  watchStarted: Date;
  watchEnded?: Date;
  watchDuration: number; // Actual seconds watched
  videoPosition: number; // Current position in video
  completed: boolean; // Watched >= 90%

  createdAt: Date;
}

const VideoWatchLogSchema = new Schema<IVideoWatchLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: Schema.Types.ObjectId, ref: 'CourseVideo', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'CourseEnrollment', required: true },
  
  deviceFingerprint: { type: String, required: true },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  
  watchStarted: { type: Date, default: Date.now },
  watchEnded: { type: Date },
  watchDuration: { type: Number, default: 0 },
  videoPosition: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

VideoWatchLogSchema.index({ userId: 1, videoId: 1 });
VideoWatchLogSchema.index({ enrollmentId: 1 });

// =====================================================
// COURSE DEVICE (Device Registry per Course)
// =====================================================
export interface ICourseDevice extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  
  fingerprint: string;
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastUsedAt: Date;
  isActive: boolean;
  registeredAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const CourseDeviceSchema = new Schema<ICourseDevice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'RecordedCourse', required: true },
  
  fingerprint: { type: String, required: true },
  deviceName: { type: String },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  lastUsedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

CourseDeviceSchema.index({ userId: 1, courseId: 1, fingerprint: 1 }, { unique: true });

// =====================================================
// MODEL GETTERS (Lazy initialization for Next.js)
// =====================================================

export function getRecordedCourse(): Model<IRecordedCourse> {
  return mongoose.models.RecordedCourse || mongoose.model<IRecordedCourse>('RecordedCourse', RecordedCourseSchema);
}

export function getCourseVideo(): Model<ICourseVideo> {
  return mongoose.models.CourseVideo || mongoose.model<ICourseVideo>('CourseVideo', CourseVideoSchema);
}

export function getCourseSection(): Model<ICourseSection> {
  return mongoose.models.CourseSection || mongoose.model<ICourseSection>('CourseSection', CourseSectionSchema);
}

export function getCourseMaterial(): Model<ICourseMaterial> {
  return mongoose.models.CourseMaterial || mongoose.model<ICourseMaterial>('CourseMaterial', CourseMaterialSchema);
}

export function getCourseAssignment(): Model<ICourseAssignment> {
  return mongoose.models.CourseAssignment || mongoose.model<ICourseAssignment>('CourseAssignment', CourseAssignmentSchema);
}

export function getCourseEnrollment(): Model<ICourseEnrollment> {
  return mongoose.models.CourseEnrollment || mongoose.model<ICourseEnrollment>('CourseEnrollment', CourseEnrollmentSchema);
}

export function getCourseReview(): Model<ICourseReview> {
  return mongoose.models.CourseReview || mongoose.model<ICourseReview>('CourseReview', CourseReviewSchema);
}

export function getVideoWatchLog(): Model<IVideoWatchLog> {
  return mongoose.models.VideoWatchLog || mongoose.model<IVideoWatchLog>('VideoWatchLog', VideoWatchLogSchema);
}

export function getCourseDevice(): Model<ICourseDevice> {
  return mongoose.models.CourseDevice || mongoose.model<ICourseDevice>('CourseDevice', CourseDeviceSchema);
}
