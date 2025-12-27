// MongoDB Connection and Models
import mongoose from 'mongoose';

// Primary DB (Website + Life Planner) connection.
// Backward compatible: if MONGODB_URI_MAIN is not set, fall back to MONGODB_URI.
const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
// Main database name enforcement. This prevents accidental writes to legacy DBs
// when the connection string points at an old database name.
// Override when needed (e.g. staging) via MONGODB_MAIN_DB_NAME.
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

// Log for debugging - but don't expose the full URI
if (!MONGODB_URI) {
  console.error('❌ ERROR: MongoDB URI is not set (expected MONGODB_URI_MAIN or MONGODB_URI)');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
}

let isConnecting = false;
let lastConnectionStatus = 'Not Connected';

export const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      const msg = 'MongoDB URI is not configured (set MONGODB_URI_MAIN or MONGODB_URI)';
      console.error('❌ ' + msg);
      lastConnectionStatus = 'Not Configured';
      throw new Error(msg);
    }

    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      lastConnectionStatus = 'Connected';
      return mongoose.connection;
    }

    if (isConnecting) {
      console.log('⏳ MongoDB connection already in progress...');
      return mongoose.connection;
    }

    isConnecting = true;
    lastConnectionStatus = 'Connecting...';
    console.log('🔄 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnecting = false;
    const actualDbName = conn.connection?.db?.databaseName;
    console.log(`✅ Successfully connected to MongoDB (db: ${actualDbName || 'unknown'})`);
    lastConnectionStatus = 'Connected';
    return conn.connection;
  } catch (error) {
    isConnecting = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ MongoDB connection error:', errorMsg);
    lastConnectionStatus = `Error: ${errorMsg}`;
    throw error;
  }
};

// Export connection status for API
export const getConnectionStatus = () => lastConnectionStatus;

// User Schema
const userSchema = new mongoose.Schema({
  // Admin user fields (optional, for admin authentication)
  userId: { type: String, sparse: true }, // Admin username, e.g., "admincrm"
  isAdmin: { type: Boolean, default: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  permissions: { 
    type: [String], 
    enum: ['all', 'crm', 'whatsapp', 'email'], 
    default: ['all'],
    sparse: true 
  }, // Admin permissions: 'all' or combination of 'crm', 'whatsapp', 'email'
  
  // Regular user fields
  name: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  countryCode: { type: String, default: '+91' },
  country: { type: String },
  state: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'male', 'female', 'Other', 'other'] },
  age: { type: Number },
  profession: { type: String },
  password: { type: String, required: true },
  profileId: { type: String, unique: true, sparse: true }, // 6-digit unique profile ID
  profileImage: { type: String }, // Base64 or URL for profile image
  
  // Life Planner Data
  lifePlannerVisions: [mongoose.Schema.Types.Mixed],
  lifePlannerActionPlans: [mongoose.Schema.Types.Mixed],
  lifePlannerGoals: [mongoose.Schema.Types.Mixed],
  lifePlannerTasks: [mongoose.Schema.Types.Mixed],
  lifePlannerTodos: [mongoose.Schema.Types.Mixed],
  lifePlannerWords: [mongoose.Schema.Types.Mixed],
  lifePlannerReminders: [mongoose.Schema.Types.Mixed],
  lifePlannerHealthRoutines: [mongoose.Schema.Types.Mixed],
  lifePlannerDailyHealthPlans: [mongoose.Schema.Types.Mixed],
  lifePlannerDailyTasks: mongoose.Schema.Types.Mixed, // Daily workshop tasks and sadhana per date
  lifePlannerDiamondPeople: [mongoose.Schema.Types.Mixed],
  lifePlannerProgress: [mongoose.Schema.Types.Mixed],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to generate profileId if not exists
userSchema.pre('save', async function(next) {
  if (!this.profileId) {
    let profileId: string = '';
    let isUnique = false;
    
    // Generate unique 6-digit profile ID
    while (!isUnique) {
      profileId = String(Math.floor(100000 + Math.random() * 900000));
      const existing = await mongoose.models.User?.findOne({ profileId });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.profileId = profileId;
  }
  next();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  // Optional for guest/one-off purchases (e.g., workshop checkout)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  items: [
    {
      kind: { type: String, enum: ['workshop', 'product'], required: false },
      productId: String,
      name: String,
      price: Number,
      quantity: Number,

      // Workshop-specific metadata (optional)
      workshopSlug: { type: String, required: false },
      scheduleId: { type: String, required: false },
      mode: { type: String, required: false },
      language: { type: String, required: false },
      currency: { type: String, required: false },
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  // Keep this in sync with payment flows (PayU + Nepal manual).
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'pending_manual'], default: 'pending' },
  seatInventoryAdjusted: { type: Boolean, default: false },
  paymentMethod: { type: String },
  // Request context (used for anti-throttle and debugging). Optional.
  clientIp: { type: String, index: true },
  clientUserAgent: { type: String },
  // PayU requires txnid to be unique and <= 25 chars.
  // We store a dedicated PayU txn id here (separate from Mongo _id).
  payuTxnId: { type: String, index: true },

  // Cashfree identifiers (optional)
  cashfreeOrderId: { type: String, index: true },
  cashfreePaymentSessionId: { type: String },
  cashfreePaymentId: { type: String },
  cashfreeOrderStatus: { type: String },

  transactionId: { type: String },
  failureReason: { type: String },
  shippingAddress: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Workshop Seat Inventory Schema (for workshop schedule slots)
const workshopSeatInventorySchema = new mongoose.Schema({
  workshopSlug: { type: String, required: true, index: true },
  scheduleId: { type: String, required: true, index: true },
  seatsTotal: { type: Number, required: true },
  seatsRemaining: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

workshopSeatInventorySchema.index({ workshopSlug: 1, scheduleId: 1 }, { unique: true });

export const WorkshopSeatInventory =
  mongoose.models.WorkshopSeatInventory ||
  mongoose.model('WorkshopSeatInventory', workshopSeatInventorySchema);

// Contact Schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

export const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

// Signin Schema (to track login attempts)
const signinSchema = new mongoose.Schema({
  email: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Signin = mongoose.models.Signin || mongoose.model('Signin', signinSchema);

// Message Schema (for admin-user messaging)
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderEmail: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['user', 'admin'], default: 'user' }, // Who sent it
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }, // Link to original contact message
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// Offer Schema (for admin to send promotional offers to users)
const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  offerCode: { type: String, unique: true, required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  targetUsers: { type: String, enum: ['all', 'selected'], default: 'all' }, // 'all' for all users or 'selected' for specific users
  selectedUserEmails: [{ type: String }], // List of user emails if targetUsers is 'selected'
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true }, // Admin email
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

// Community Schema (for community module)
// NOTE: Per repo convention, all models live in this file.
const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  // Store user ids as strings (JWT userId is typically a stringified ObjectId)
  members: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

communitySchema.index({ name: 1 }, { unique: true });

export const Community = mongoose.models.Community || mongoose.model('Community', communitySchema);

// Community Post Schema
const communityCommentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const communityPostSchema = new mongoose.Schema({
  communityId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  images: { type: [String], default: [] },
  likes: { type: [String], default: [] },
  comments: { type: [communityCommentSchema], default: [] },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

communityPostSchema.index({ communityId: 1, createdAt: -1 });

export const CommunityPost =
  mongoose.models.CommunityPost || mongoose.model('CommunityPost', communityPostSchema);

// Account Schema (for accounting)
const accountSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'admin'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['bank', 'cash', 'investment', 'loan'], required: true },
  accountNumber: { type: String },
  bankName: { type: String },
  balance: { type: Number, required: true, default: 0 },
  budgetAllocationId: { type: String, default: null }, // Link to budget allocation from MyBudgetPanel
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

accountSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

// Transaction Schema (for accounting)
const transactionSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'admin'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  type: { type: String, enum: ['income', 'expense', 'investment_in', 'investment_out', 'loan', 'emi'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accountName: { type: String, required: true },
  date: { type: Date, required: true },
  mode: { type: String, enum: ['cash', 'bank', 'card', 'online'], required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

transactionSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Investment Schema (for accounting)
const investmentSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'admin'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['investment_in', 'investment_out'], required: true },
  amount: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  dividendRate: { type: Number, default: 0 },
  repaymentMode: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'lumpsum'], required: true },
  reminderEnabled: { type: Boolean, default: true },
  nextDueDate: { type: Date },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accountName: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

investmentSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

export const Investment = mongoose.models.Investment || mongoose.model('Investment', investmentSchema);

// Budget Plan Schema (for accounting / life planner)
// Stores targets and 100% allocation buckets to compare with actual transactions.
const budgetAllocationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    // Percentage of base income (0..100). Sum of all allocations should be 100.
    percent: { type: Number, required: true, min: 0, max: 100 },
    // "profit" means we compare against (income - outflow). All other buckets compare against outflow by category.
    kind: { type: String, enum: ['expense', 'profit'], default: 'expense' },
  },
  { _id: false }
);

const budgetPlanSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'admin'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  year: { type: Number, required: true, index: true },
  currency: { type: String, default: 'INR' },
  incomeTargetYearly: { type: Number, default: 0 },
  incomeTargetMonthly: { type: Number, default: 0 },
  incomeTargetWeekly: { type: Number, default: 0 },
  allocations: { type: [budgetAllocationSchema], default: [] },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

budgetPlanSchema.index({ ownerType: 1, ownerId: 1, year: 1 }, { unique: true });

export const BudgetPlan = mongoose.models.BudgetPlan || mongoose.model('BudgetPlan', budgetPlanSchema);
// Resort Booking Schema
const resortBookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  userPhone: { type: String },
  checkinDate: { type: Date, required: true },
  checkoutDate: { type: Date, required: true },
  roomType: { type: String, required: true, enum: ['Deluxe Garden View', 'Traditional Bamboo House', 'Premium Mountain View'] },
  adults: { type: Number, required: true, min: 1 },
  children: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  specialRequests: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

resortBookingSchema.index({ userEmail: 1, createdAt: -1 });
resortBookingSchema.index({ status: 1 });

export const ResortBooking = mongoose.models.ResortBooking || mongoose.model('ResortBooking', resortBookingSchema);

// Blog Newsletter Subscriber Schema
const blogNewsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active',
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'mr'],
    default: 'en',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

blogNewsletterSchema.index({ email: 1 });
blogNewsletterSchema.index({ subscribedAt: -1 });

export const BlogNewsletter = mongoose.models.BlogNewsletter || mongoose.model('BlogNewsletter', blogNewsletterSchema);

// ============================================================================
// Workshops (Metadata + Schedules)
// ============================================================================

const workshopSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    duration: { type: String, default: '' },
    level: { type: String, default: '' },
    routePath: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    youtubeId: { type: String, default: '' },
    modes: [{ type: String }],
    languages: [{ type: String }],
    currencies: [{ type: String }],
    isPublished: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

workshopSchema.index({ slug: 1 }, { unique: true });
workshopSchema.index({ category: 1, isPublished: 1 });

export const Workshop = mongoose.models.Workshop || mongoose.model('Workshop', workshopSchema);

export type WorkshopScheduleMode = 'online' | 'offline' | 'residential' | 'recorded';
export type WorkshopScheduleBatch = 'morning' | 'evening' | 'full-day' | 'anytime';
export type WorkshopScheduleCurrency = 'INR' | 'USD' | 'NPR';

const workshopScheduleSchema = new mongoose.Schema(
  {
    // Use a stable string id so schedules are easy to reference from cart/orders.
    _id: { type: String, required: true },
    workshopSlug: { type: String, required: true, index: true },
    workshopName: { type: String, default: '' },
    mode: {
      type: String,
      enum: ['online', 'offline', 'residential', 'recorded'],
      required: true,
      index: true,
    },
    batch: {
      type: String,
      enum: ['morning', 'evening', 'full-day', 'anytime'],
      default: 'morning',
      index: true,
    },
    language: {
      type: String,
      enum: ['Hindi', 'English', 'Marathi'],
      default: 'Hindi',
      index: true,
    },
    startDate: { type: Date, required: false, index: true },
    endDate: { type: Date, required: false },
    days: { type: String, default: '' },
    time: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    seatsTotal: { type: Number, default: 60 },
    registrationCloseDate: { type: Date, required: false },
    location: { type: String, default: '' },
    price: { type: Number, default: 0 },
    currency: { type: String, enum: ['INR', 'USD', 'NPR'], default: 'INR', index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
    id: false,
  }
);

workshopScheduleSchema.index({ workshopSlug: 1, mode: 1, status: 1, startDate: 1 });
workshopScheduleSchema.index({ workshopSlug: 1, mode: 1, batch: 1, currency: 1, startDate: 1 });

export const WorkshopSchedule =
  mongoose.models.WorkshopSchedule || mongoose.model('WorkshopSchedule', workshopScheduleSchema);

// Social Media Account Schema
const socialMediaAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['facebook', 'youtube', 'x', 'linkedin', 'instagram', 'tiktok'],
    required: true,
    index: true,
  },
  accountName: { type: String, required: true },
  accountHandle: { type: String, required: true },
  accountId: { type: String, required: true },
  accountEmail: { type: String },
  profileImage: { type: String }, // URL to profile picture
  
  // Encrypted tokens - store securely
  accessToken: { type: String, required: true }, // Will be encrypted
  refreshToken: { type: String }, // Will be encrypted
  tokenExpiresAt: { type: Date },
  
  // Connection status
  isConnected: { type: Boolean, default: true, index: true },
  connectedAt: { type: Date, default: Date.now },
  disconnectedAt: { type: Date },
  lastTokenRefresh: { type: Date },
  
  // Platform-specific metadata
  metadata: {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    lastSyncedAt: { type: Date },
    businessCategory: { type: String },
    website: { type: String },
  },
  
  // Permissions
  grantedScopes: [String], // OAuth scopes granted
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

socialMediaAccountSchema.index({ platform: 1, isConnected: 1 });
socialMediaAccountSchema.index({ accountId: 1, platform: 1 });

export const SocialMediaAccount =
  mongoose.models.SocialMediaAccount || mongoose.model('SocialMediaAccount', socialMediaAccountSchema);

// Social Media Post Schema
const socialMediaPostSchema = new mongoose.Schema({
  // References to accounts
  accountIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialMediaAccount',
    },
  ],
  platforms: [
    {
      type: String,
      enum: ['facebook', 'youtube', 'x', 'linkedin', 'instagram', 'tiktok'],
    },
  ],
  
  // Post content
  content: {
    text: { type: String, required: true },
    images: [
      {
        url: { type: String },
        caption: { type: String },
        altText: { type: String },
      },
    ],
    videos: [
      {
        url: { type: String },
        thumbnail: { type: String },
        duration: { type: Number }, // in seconds
        title: { type: String },
      },
    ],
    link: { type: String },
    hashtags: [String],
  },
  
  // Scheduling
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed', 'archived'],
    default: 'draft',
    index: true,
  },
  scheduledFor: { type: Date, index: true },
  publishedAt: { type: Date, index: true },
  
  // Platform-specific post IDs
  platformPostIds: {
    facebook: String,
    youtube: String,
    x: String,
    linkedin: String,
    instagram: String,
    tiktok: String,
  },
  
  // Error tracking
  failureReason: { type: String },
  retryCount: { type: Number, default: 0 },
  lastRetryAt: { type: Date },
  
  // Analytics
  analytics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date },
  },
  
  // Metadata
  isPromoted: { type: Boolean, default: false },
  campaign: { type: String }, // Campaign name if part of campaign
  tags: [String], // Internal tags for organization
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

socialMediaPostSchema.index({ status: 1, scheduledFor: 1 });
socialMediaPostSchema.index({ platforms: 1, publishedAt: -1 });
socialMediaPostSchema.index({ createdAt: -1 });

export const SocialMediaPost =
  mongoose.models.SocialMediaPost || mongoose.model('SocialMediaPost', socialMediaPostSchema);

// Social Media Analytics Schema
const socialMediaAnalyticsSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SocialMediaAccount',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['facebook', 'youtube', 'x', 'linkedin', 'instagram', 'tiktok'],
    required: true,
  },
  date: { type: Date, required: true, index: true },
  
  // Daily metrics
  followers: { type: Number, default: 0 },
  newFollowers: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  
  // Post metrics
  postsPublished: { type: Number, default: 0 },
  topPost: {
    postId: String,
    engagement: Number,
  },
  
  createdAt: { type: Date, default: Date.now },
});

socialMediaAnalyticsSchema.index({ accountId: 1, date: -1 });
socialMediaAnalyticsSchema.index({ platform: 1, date: -1 });

export const SocialMediaAnalytics =
  mongoose.models.SocialMediaAnalytics || mongoose.model('SocialMediaAnalytics', socialMediaAnalyticsSchema);

// Note Schema - Stylish journaling with graphology & color psychology
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Rich text or markdown
  
  // Graphology & Styling
  fontFamily: { 
    type: String, 
    enum: ['poppins', 'playfair', 'caveat', 'abril', 'crimson', 'lora'],
    default: 'poppins'
  }, // Handwriting-inspired fonts
  fontSize: { type: Number, default: 16, min: 12, max: 24 },
  lineHeight: { type: Number, default: 1.6, min: 1.2, max: 2.0 },
  letterSpacing: { type: Number, default: 0, min: -2, max: 2 },
  
  // Color Psychology
  colorTheme: { 
    type: String,
    enum: ['serenity-blue', 'passion-red', 'growth-green', 'wisdom-purple', 'energy-orange', 'harmony-pink', 'clarity-yellow', 'nature-teal', 'calm-lavender', 'joy-coral'],
    default: 'serenity-blue'
  },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#1a1a1a' },
  
  // Linking to life planner hierarchy
  linkedTo: {
    visionId: { type: String },
    goalId: { type: String },
    taskId: { type: String },
    actionPlanId: { type: String },
  },
  
  // Metadata
  tags: [{ type: String }],
  isPinned: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  mood: { type: String, enum: ['happy', 'neutral', 'sad', 'excited', 'calm', 'focused', 'creative', 'confused'], default: 'neutral' },
  
  // Attachments
  attachments: [{
    url: { type: String },
    type: { type: String, enum: ['link', 'image', 'pdf', 'file'], default: 'link' },
    title: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Canvas items (draggable/resizable embeds) for Journal
  canvasItems: [
    {
      id: { type: String, required: true },
      kind: { type: String, enum: ['image', 'youtube'], required: true },
      url: { type: String, required: true },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 260 },
      height: { type: Number, default: 180 },
      zIndex: { type: Number, default: 1 },
    },
  ],
  
  // Word count and reading time (for analytics)
  wordCount: { type: Number, default: 0 },
  readingTimeMinutes: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  lastEditedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ userId: 1, 'linkedTo.visionId': 1 });
noteSchema.index({ userId: 1, mood: 1 });

export const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);

// Community Member Schema - for Community page joiners
const communityMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, sparse: true },
  mobile: { type: String, required: true, trim: true, unique: true },
  countryCode: { type: String, default: '+91' },
  communityId: { type: String, required: true }, // 'general', 'swar-yoga', etc.
  communityName: { type: String, required: true }, // Denormalized for quick queries
  joinedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active' },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date },
  reactions: { type: Number, default: 0 }, // Count of reactions given
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Unique index: one user per community (by mobile)
communityMemberSchema.index({ mobile: 1, communityId: 1 }, { unique: true });
communityMemberSchema.index({ communityId: 1, joinedAt: -1 });
communityMemberSchema.index({ email: 1, sparse: true });

export const CommunityMember = mongoose.models.CommunityMember || mongoose.model('CommunityMember', communityMemberSchema);