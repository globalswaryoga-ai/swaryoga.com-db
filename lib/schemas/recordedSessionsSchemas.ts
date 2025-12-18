import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// RECORDED SESSIONS DATABASE SCHEMAS
// Production-ready MongoDB schemas for video library & payment system
// ============================================================================

/**
 * Session Document - Represents a single recorded yoga/health session
 * - Video metadata (title, duration, level, instructor)
 * - Pricing & availability
 * - Engagement metrics (views, ratings)
 * - Content categorization & searchability
 */
export interface ISession extends Document {
  title: string;
  description: string;
  category: 'yoga' | 'pranayama' | 'meditation' | 'workshop' | 'health' | 'lifestyle';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  instructor: string; // Reference to user/instructor name
  duration: number; // In minutes
  video_url: string; // AWS S3 URL or Vimeo link
  thumbnail: string; // Cover image URL
  price: number; // In USD/INR
  tags: string[]; // For search & discovery
  views: number;
  total_reviews: number;
  average_rating: number;
  created_at: Date;
  updated_at: Date;
  is_published: boolean;
  is_featured: boolean;
}

const sessionSchema = new Schema<ISession>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ['yoga', 'pranayama', 'meditation', 'workshop', 'health', 'lifestyle'],
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },
    instructor: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 }, // minutes
    video_url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    tags: [{ type: String, trim: true }],
    views: { type: Number, default: 0, min: 0 },
    total_reviews: { type: Number, default: 0, min: 0 },
    average_rating: { type: Number, default: 0, min: 0, max: 5 },
    is_published: { type: Boolean, default: false },
    is_featured: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Performance indexes
sessionSchema.index({ category: 1, level: 1 });
sessionSchema.index({ is_published: 1, created_at: -1 });
sessionSchema.index({ tags: 1 });
sessionSchema.index({ average_rating: -1, views: -1 });
sessionSchema.index({ instructor: 1 });

/**
 * Purchase Document - Records user's session purchase
 * - Links user to session
 * - Payment & transaction details
 * - Subscription info if applicable
 * - Refund/cancellation tracking
 */
export interface IPurchase extends Document {
  user_id: mongoose.Types.ObjectId;
  session_id: mongoose.Types.ObjectId;
  purchase_date: Date;
  amount: number;
  currency: 'USD' | 'INR';
  payment_method: 'stripe' | 'payu' | 'upi' | 'card';
  transaction_id: string; // Unique payment gateway ID
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  subscription_type?: 'one-time' | 'monthly' | 'yearly';
  subscription_end_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session_id: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    purchase_date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: ['USD', 'INR'],
      default: 'USD',
    },
    payment_method: {
      type: String,
      enum: ['stripe', 'payu', 'upi', 'card'],
      required: true,
    },
    transaction_id: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'refunded'],
      default: 'pending',
    },
    subscription_type: {
      type: String,
      enum: ['one-time', 'monthly', 'yearly'],
      default: 'one-time',
    },
    subscription_end_date: Date,
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Performance indexes
purchaseSchema.index({ user_id: 1, session_id: 1 });
purchaseSchema.index({ user_id: 1, status: 1 });
purchaseSchema.index({ transaction_id: 1 });
purchaseSchema.index({ purchase_date: -1 });
purchaseSchema.index({ status: 1 });

/**
 * ViewTracking Document - Tracks user's video viewing progress
 * - How far user watched
 * - Completion status
 * - Watch history timestamps
 * - Certificate eligibility
 */
export interface IViewTracking extends Document {
  user_id: mongoose.Types.ObjectId;
  session_id: mongoose.Types.ObjectId;
  watched_duration: number; // In seconds
  total_duration: number; // In seconds (copy of session duration for queries)
  is_completed: boolean;
  completion_date?: Date;
  watch_count: number; // How many times watched
  started_at: Date;
  last_watched: Date;
  last_position: number; // For resume feature
  created_at: Date;
  updated_at: Date;
}

const viewTrackingSchema = new Schema<IViewTracking>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session_id: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    watched_duration: { type: Number, default: 0, min: 0 }, // seconds
    total_duration: { type: Number, required: true, min: 0 }, // seconds
    is_completed: { type: Boolean, default: false },
    completion_date: Date,
    watch_count: { type: Number, default: 1, min: 1 },
    started_at: { type: Date, default: Date.now },
    last_watched: { type: Date, default: Date.now },
    last_position: { type: Number, default: 0, min: 0 }, // seconds
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Performance indexes
viewTrackingSchema.index({ user_id: 1, session_id: 1 }, { unique: true });
viewTrackingSchema.index({ user_id: 1, is_completed: 1 });
viewTrackingSchema.index({ is_completed: 1, completion_date: -1 });
viewTrackingSchema.index({ last_watched: -1 });

// ============================================================================
// Export Models
// ============================================================================

export const Session =
  mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);

export const Purchase =
  mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', purchaseSchema);

export const ViewTracking =
  mongoose.models.ViewTracking ||
  mongoose.model<IViewTracking>('ViewTracking', viewTrackingSchema);
