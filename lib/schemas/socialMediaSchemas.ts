import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// SOCIAL MEDIA AUTO-POSTER DATABASE SCHEMAS
// Production-ready MongoDB schemas for multi-platform posting system
// ============================================================================

/**
 * SocialAccount Document - Stores connected social platform credentials
 * - OAuth tokens for each platform
 * - Account metadata (handle, followers, etc)
 * - Connection status & expiry tracking
 */
export interface ISocialAccount extends Document {
  user_id: mongoose.Types.ObjectId;
  platform: 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'whatsapp' | 'community';
  account_name: string; // Display name
  account_handle: string; // @username
  access_token: string; // OAuth token (encrypted in production)
  refresh_token?: string; // For platforms that support it
  token_expiry?: Date;
  is_connected: boolean;
  connection_error?: string;
  followers_count?: number;
  verified?: boolean;
  connected_at: Date;
  last_verified: Date;
  updated_at: Date;
}

const socialAccountSchema = new Schema<ISocialAccount>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'whatsapp', 'community'],
      required: true,
    },
    account_name: { type: String, required: true, trim: true },
    account_handle: { type: String, required: true, trim: true },
    access_token: {
      type: String,
      required: true,
      // In production, this should be encrypted with mongoose-encryption
    },
    refresh_token: { type: String },
    token_expiry: Date,
    is_connected: { type: Boolean, default: true },
    connection_error: { type: String, trim: true },
    followers_count: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    connected_at: { type: Date, default: Date.now },
    last_verified: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Indexes
socialAccountSchema.index({ user_id: 1, platform: 1 }, { unique: true });
socialAccountSchema.index({ is_connected: 1 });
socialAccountSchema.index({ token_expiry: 1 }); // For token refresh monitoring

/**
 * Post Document - Stores content to be posted to one or more platforms
 * - Multi-platform scheduling
 * - Content variants per platform (auto-resized images, hashtags, etc)
 * - Publishing status tracking
 */
export interface IPost extends Document {
  user_id: mongoose.Types.ObjectId;
  content: string; // Main text content
  media: Array<{
    type: 'image' | 'video' | 'carousel' | 'story';
    url: string;
    alt_text?: string;
    platform_variants?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      youtube?: string;
    };
  }>;
  hashtags: string[];
  platforms: Array<'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'whatsapp' | 'community'>;
  
  // Platform-specific content
  platform_specific?: {
    facebook?: { caption: string; call_to_action?: string };
    instagram?: { caption: string; tags: string[] };
    twitter?: { text: string; character_count: number };
    linkedin?: { message: string; hashtags: string[] };
    youtube?: { title: string; description: string; tags: string[] };
    whatsapp?: { message: string; button_text?: string; button_url?: string };
    community?: { announcement: boolean; pinned: boolean };
  };

  // Scheduling
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_for?: Date;
  published_at?: Date;
  publish_error?: string;

  // Engagement
  is_pinned: boolean;
  engagement_tracking: boolean;

  created_at: Date;
  updated_at: Date;
}

const postSchema = new Schema<IPost>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'carousel', 'story'],
        },
        url: String,
        alt_text: String,
        platform_variants: {
          facebook: String,
          instagram: String,
          twitter: String,
          linkedin: String,
          youtube: String,
        },
      },
    ],
    hashtags: [{ type: String, trim: true }],
    platforms: {
      type: [
        {
          type: String,
          enum: ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'whatsapp', 'community'],
        },
      ],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one platform must be selected',
      },
    },

    platform_specific: {
      facebook: { caption: String, call_to_action: String },
      instagram: { caption: String, tags: [String] },
      twitter: { text: String, character_count: Number },
      linkedin: { message: String, hashtags: [String] },
      youtube: { title: String, description: String, tags: [String] },
      whatsapp: { message: String, button_text: String, button_url: String },
      community: { announcement: Boolean, pinned: Boolean },
    },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft',
    },
    scheduled_for: Date,
    published_at: Date,
    publish_error: { type: String, trim: true },

    is_pinned: { type: Boolean, default: false },
    engagement_tracking: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Indexes
postSchema.index({ user_id: 1, created_at: -1 });
postSchema.index({ status: 1, scheduled_for: 1 }); // For scheduling queries
postSchema.index({ platforms: 1 });
postSchema.index({ published_at: -1 });

/**
 * PostAnalytics Document - Stores engagement metrics per platform
 * - Views, likes, comments, shares, clicks
 * - Per-platform metrics
 * - Engagement rate calculations
 */
export interface IPostAnalytics extends Document {
  post_id: mongoose.Types.ObjectId;
  platform: 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'whatsapp' | 'community';
  platform_post_id: string; // ID from the platform (e.g., Facebook post ID)
  
  // Metrics
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  impressions: number;
  reach: number;
  save_count: number;
  
  // Calculated
  engagement_rate: number; // (likes + comments + shares) / impressions * 100
  click_through_rate: number; // clicks / impressions * 100
  sentiment?: 'positive' | 'neutral' | 'negative'; // Optional ML analysis
  
  collected_at: Date;
  updated_at: Date;
}

const postAnalyticsSchema = new Schema<IPostAnalytics>(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'whatsapp', 'community'],
      required: true,
    },
    platform_post_id: { type: String, required: true },

    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    reach: { type: Number, default: 0, min: 0 },
    save_count: { type: Number, default: 0, min: 0 },

    engagement_rate: { type: Number, default: 0, min: 0, max: 100 },
    click_through_rate: { type: Number, default: 0, min: 0, max: 100 },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
    },

    collected_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Indexes
postAnalyticsSchema.index({ post_id: 1, platform: 1 }, { unique: true });
postAnalyticsSchema.index({ collected_at: -1 });
postAnalyticsSchema.index({ engagement_rate: -1 }); // For trending analysis

// ============================================================================
// Export Models
// ============================================================================

export const SocialAccount =
  mongoose.models.SocialAccount ||
  mongoose.model<ISocialAccount>('SocialAccount', socialAccountSchema);

export const Post =
  mongoose.models.Post || mongoose.model<IPost>('Post', postSchema);

export const PostAnalytics =
  mongoose.models.PostAnalytics ||
  mongoose.model<IPostAnalytics>('PostAnalytics', postAnalyticsSchema);
