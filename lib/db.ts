// MongoDB Connection and Models
import mongoose from 'mongoose';
import { validateSecrets } from './config/secretsValidator';

// Run security validation on boot
if (process.env.NODE_ENV === 'production') {
  validateSecrets();
}

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

// In serverless/dev environments, hot-reloads can re-evaluate modules.
// Cache the in-flight connection promise globally to avoid spawning multiple
// pools in parallel (a common cause of 300-500+ Atlas connections).
declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export const connectDB = async () => {
  const connectOnce = async () => {
    // Safe because we always guard for missing MONGODB_URI before calling connectOnce().
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI?.split('@')[1] || 'URI hidden'}...`);
    const conn = await mongoose.connect(MONGODB_URI as string, {
      dbName: MAIN_DB_NAME,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      // tls: true is redundant for mongodb+srv and can cause 'alert internal error' in some environments.
      // We'll keep it disabled but ensure it's not being overridden by the URI.
      retryWrites: true,
      maxPoolSize: 10, 
      minPoolSize: 1, // Keep at least one connection open
      connectTimeoutMS: 10000,
      // Force IPv4 if needed (some environments have broken IPv6 local/remote resolution affecting TLS)
      family: 4,
    });
    return conn;
  };

  try {
    if (!MONGODB_URI) {
      const msg = 'MongoDB URI is not configured (set MONGODB_URI_MAIN or MONGODB_URI)';
      console.error('❌ ' + msg);
      lastConnectionStatus = 'Not Configured';
      throw new Error(msg);
    }

    if (mongoose.connection.readyState === 1) {
      // Periodic health check: if established, verify it's still usable
      try {
        await mongoose.connection.db?.admin().ping();
        console.log('✅ MongoDB connection is healthy (ping ok)');
        lastConnectionStatus = 'Connected';
        return mongoose.connection;
      } catch (pingErr) {
        console.warn('⚠️  MongoDB existing connection health check failed, reconnecting...');
        try {
          await mongoose.disconnect();
        } catch (_) {}
      }
    }

    // Prefer a global singleton promise so concurrent requests don't create
    // multiple pools/connections.
    if (globalThis.__mongooseConnectionPromise) {
      console.log('⏳ MongoDB connection already in progress (global)...');
      await globalThis.__mongooseConnectionPromise;
      // After awaiting, verify the connection is actually usable
      if (mongoose.connection.readyState === 1) {
        lastConnectionStatus = 'Connected';
        return mongoose.connection;
      }
      // Promise resolved but connection dropped — clear stale promise and reconnect
      console.warn('⚠️  Global promise resolved but connection not ready (state:', mongoose.connection.readyState, '), reconnecting...');
      globalThis.__mongooseConnectionPromise = undefined;
    }

    if (isConnecting) {
      console.log('⏳ MongoDB connection already in progress (local), waiting...');
      // Wait briefly for the connection to establish rather than returning immediately
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (mongoose.connection.readyState === 1) {
          lastConnectionStatus = 'Connected';
          return mongoose.connection;
        }
      }
      // If still not connected after waiting, fall through to reconnect
      console.warn('⚠️  Waited 10s but connection still not ready, forcing reconnect...');
      isConnecting = false;
    }

    isConnecting = true;
    lastConnectionStatus = 'Connecting...';
    console.log('🔄 Attempting to connect to MongoDB...');

    globalThis.__mongooseConnectionPromise = (async () => {
      let conn;
      try {
        conn = await connectOnce();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // We've observed intermittent TLS/pool-reset errors on some networks.
        // A single retry (after resetting the pool) often succeeds.
        const isTlsLike = /tlsv1 alert internal error|ERR_SSL|SSL routines/i.test(msg);
        console.warn('⚠️  MongoDB first connect attempt failed:', msg);
        if (!isTlsLike) throw err;

        try {
          await mongoose.disconnect();
        } catch (_e) {
          // ignore
        }
        console.log('🔁 Retrying MongoDB connection once...');
        conn = await connectOnce();
      }
      return conn;
    })();

    const conn = await globalThis.__mongooseConnectionPromise;
    // Clear the promise after successful connection so future calls re-check readyState
    globalThis.__mongooseConnectionPromise = undefined;
    const actualDbName = conn.connection?.db?.databaseName;
    console.log(`✅ Successfully connected to MongoDB (db: ${actualDbName || 'unknown'})`);
    lastConnectionStatus = 'Connected';
    return conn.connection;
  } catch (error) {
    isConnecting = false;
    globalThis.__mongooseConnectionPromise = undefined;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ MongoDB connection error:', errorMsg);
    lastConnectionStatus = `Error: ${errorMsg}`;
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Export connection status for API
export const getConnectionStatus = () => lastConnectionStatus;

// User Schema
const userSchema = new mongoose.Schema({
  // Admin user fields (optional, for admin authentication)
  userId: { type: String, sparse: true }, // Admin username, e.g., "admincrm"
  isAdmin: { type: Boolean, default: false },
  role: { 
    type: String, 
    enum: ['superadmin', 'dm', 'manager', 'admin', 'user'], 
    default: 'user' 
  }, // superadmin=full access, dm=district manager, manager=team lead, admin=basic admin, user=regular
  
  // DEPRECATED: Legacy permissions array (kept for backward compatibility)
  // Accepts both legacy module names ('crm','whatsapp') and granular format ('leads:read','users:write')
  permissions: { 
    type: [String], 
    default: [],
  },
  
  // NEW: Granular permissions object (preferred, see lib/permissions.ts)
  permissionsV2: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    /*
     * Structure:
     * {
     *   isSuperAdmin: boolean,
     *   leads: { read: true, write: true, delete: false, ... },
     *   whatsapp: { read: true, send: true, broadcast: false, ... },
     *   ... see lib/permissions.ts for full structure
     * }
     */
  },
  
  // User assignment for multi-admin CRM (which leads this admin can access)
  assignedLeadIds: { type: [String], default: [] }, // Array of Lead IDs assigned to this admin
  
  // Manager assignment: which admin users this manager supervises
  // Only relevant for role='manager'. These are userId strings of subordinate admins.
  managedUserIds: { type: [String], default: [] },
  
  // Regular user fields
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
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
  lifePlannerAccounting: mongoose.Schema.Types.Mixed, // Accounting data: accounts, transactions, investments, budget

  // CRM Planner Data (completely separate from Life Planner)
  crmVisions: [mongoose.Schema.Types.Mixed],
  crmActionPlans: [mongoose.Schema.Types.Mixed],
  crmGoals: [mongoose.Schema.Types.Mixed],
  crmTasks: [mongoose.Schema.Types.Mixed],
  crmTodos: [mongoose.Schema.Types.Mixed],
  crmWords: [mongoose.Schema.Types.Mixed],
  crmReminders: [mongoose.Schema.Types.Mixed],
  crmHealthRoutines: [mongoose.Schema.Types.Mixed],
  crmDailyHealthPlans: [mongoose.Schema.Types.Mixed],
  crmDailyTasks: mongoose.Schema.Types.Mixed, // Daily workshop tasks and sadhana per date (CRM version)
  crmDiamondPeople: [mongoose.Schema.Types.Mixed],
  crmProgress: [mongoose.Schema.Types.Mixed],
  crmEvents: [mongoose.Schema.Types.Mixed],

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

export function getUser() {
  return mongoose.models.User || mongoose.model('User', userSchema);
}

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  // Optional for guest/one-off purchases (e.g., workshop checkout)
  // Can be either a real ObjectId or a guest-{timestamp} string for anonymous customers
  userId: { type: String, required: false, index: true },
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
  // Unified User Linking
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
  linkedProfileId: { type: String, sparse: true, index: true }, // 6-digit profile ID
  linkedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', sparse: true, index: true },
  
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String, index: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'new' },
  source: { type: String, default: 'website-contact' }, // website-contact, enquiry-form, etc.
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
  id: { type: String, index: true },
  name: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  joinLink: { type: String, default: '' },
  whatsappGroupId: { type: String, default: '' }, // Associate with WhatsApp QR group
  // Store user ids as strings (JWT userId is typically a stringified ObjectId)
  members: { type: [String], default: [] },
  
  // === NEW: Community Type System ===
  // global: Public community for everyone
  // old_sadhak: For users who completed workshops (alumni)
  // workshop_active: Per-workshop community, merges into old_sadhak after completion
  type: { 
    type: String, 
    enum: ['global', 'old_sadhak', 'workshop_active'], 
    default: 'workshop_active',
    index: true 
  },
  
  // For workshop_active: link to the workshop
  workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', index: true },
  
  // When workshop completes, community merges into this parent (old_sadhak)
  parentCommunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  
  // After merge, original community is archived (not deleted for history)
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date },
  mergedIntoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' }, // Tracks where it merged
  
  // For old_sadhak: track which workshops have been merged into this community
  mergedWorkshopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' }],

  // Tenant isolation: admin who created/owns this community
  createdByUserId: { type: String, index: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

communitySchema.index({ id: 1 }, { unique: true, sparse: true });
communitySchema.index({ name: 1 }, { unique: true, sparse: true });
communitySchema.index({ type: 1, isArchived: 1 });
communitySchema.index({ workshopId: 1 });
communitySchema.index({ createdByUserId: 1 });

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
  videos: { type: [String], default: [] },
  documents: { type: [String], default: [] },
  links: { type: [String], default: [] },
  type: { type: String, enum: ['text', 'image', 'video', 'document', 'link'], default: 'text' },
  status: { type: String, enum: ['published', 'draft', 'scheduled'], default: 'published', index: true },
  isPublic: { type: Boolean, default: false, index: true }, // Admin can mark experiences as publicly visible
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  likes: { type: [String], default: [] },
  comments: { type: [communityCommentSchema], default: [] },
  scheduledFor: { type: Date }, // For scheduled posts
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ isPublic: 1, status: 1, createdAt: -1 });

export const CommunityPost =
  mongoose.models.CommunityPost || mongoose.model('CommunityPost', communityPostSchema);

// Community Video Schema - for non-shareable community videos
const communityVideoSchema = new mongoose.Schema({
  communityId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  
  // === Video Source ===
  // 'aws' - Uploaded to S3, requires signed URL
  // 'youtube' - YouTube unlisted video, proxy through embed
  // 'bunny-stream' - Bunny Stream HLS video, direct CDN playback
  videoSource: { 
    type: String, 
    enum: ['aws', 'youtube', 'bunny-stream', 'bunny', 'bunny_stream'], // Support multiple variations
    default: 'aws', 
    index: true,
    validate: {
      validator: function(v: any) {
        // Accept any of these values
        return ['aws', 'youtube', 'bunny-stream', 'bunny', 'bunny_stream'].includes(v);
      },
      message: 'Invalid videoSource: {VALUE}. Must be one of: aws, youtube, bunny-stream, bunny, bunny_stream'
    }
  },
  
  // For AWS videos
  s3Key: { type: String }, // Path in S3: community/{id}/videos/{filename}
  
  // For YouTube videos (unlisted)
  youtubeVideoId: { type: String }, // Just the video ID (not full URL)
  youtubeUnlisted: { type: Boolean, default: true }, // Must be unlisted for security
  
  duration: { type: Number }, // Duration in seconds
  thumbnailUrl: { type: String },
  uploadedBy: { type: String, required: true },
  isShareable: { type: Boolean, default: false }, // Always false for community videos
  views: { type: Number, default: 0 },
  likes: { type: [String], default: [] },
  comments: { type: [{
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }], default: [] },
  
  // === Recording categorization ===
  // For batch-wise recordings linked to specific workshop batch
  workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', index: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
  
  // Common recordings visible to everyone in community (no batch restriction)
  isCommon: { type: Boolean, default: false, index: true },
  
  // Recording source (manual upload or Zoom auto-sync)
  source: { type: String, enum: ['manual', 'zoom', 'youtube_import', 'youtube_recording'], default: 'manual' },
  zoomMeetingId: { type: String }, // If from Zoom
  zoomRecordingId: { type: String }, // Zoom recording file ID
  
  // Recording type for Zoom
  recordingType: { type: String, enum: ['gallery_view', 'speaker_view', 'shared_screen', 'other'], default: 'other' },
  
  // For search and filtering
  tags: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
});

communityVideoSchema.index({ communityId: 1, createdAt: -1 });
communityVideoSchema.index({ workshopId: 1, batchId: 1 });
communityVideoSchema.index({ communityId: 1, isCommon: 1 });
communityVideoSchema.index({ zoomMeetingId: 1 });
communityVideoSchema.index({ videoSource: 1 });

export const CommunityVideo =
  mongoose.models.CommunityVideo || mongoose.model('CommunityVideo', communityVideoSchema);

// Community Membership Schema - tracks who is in which community
const communityMembershipSchema = new mongoose.Schema({
  communityId: { type: String, required: true, index: true },
  userId: { type: String, index: true }, // From auth system
  odId: { type: String, index: true }, // Alternative ID
  name: { type: String, required: true },
  email: { type: String },
  mobile: { type: String },
  status: { type: String, enum: ['pending', 'active', 'suspended', 'left'], default: 'pending' },
  role: { type: String, enum: ['member', 'moderator', 'admin'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  approvedBy: { type: String },
  approvedAt: { type: Date },
});

communityMembershipSchema.index({ communityId: 1, status: 1 });
communityMembershipSchema.index({ userId: 1, communityId: 1 }, { unique: true, sparse: true });
communityMembershipSchema.index({ odId: 1, communityId: 1 }, { unique: true, sparse: true });

export const CommunityMembership =
  mongoose.models.CommunityMembership || mongoose.model('CommunityMembership', communityMembershipSchema);

// Getter functions for Community models (for dynamic imports after connectDB)
export function getCommunity() {
  return mongoose.models.Community || mongoose.model('Community', communitySchema);
}

export function getCommunityVideo() {
  return mongoose.models.CommunityVideo || mongoose.model('CommunityVideo', communityVideoSchema);
}

export function getCommunityPost() {
  return mongoose.models.CommunityPost || mongoose.model('CommunityPost', communityPostSchema);
}

export function getCommunityMembership() {
  return mongoose.models.CommunityMembership || mongoose.model('CommunityMembership', communityMembershipSchema);
}

// =====================================================
// DEVICE CONTROL SYSTEM - For preventing credential sharing
// =====================================================

// User Device Schema - Tracks registered devices per user (max 3)
const userDeviceSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true }, // Browser fingerprint hash
  deviceName: { type: String, required: true }, // "Chrome on Windows", "Safari on iPhone"
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
  browser: { type: String }, // Chrome, Safari, Firefox, etc.
  os: { type: String }, // Windows, macOS, iOS, Android, etc.
  ipAddress: { type: String },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    lat: { type: Number },
    lon: { type: Number },
  },
  lastActive: { type: Date, default: Date.now },
  isCurrentlyStreaming: { type: Boolean, default: false },
  streamStartedAt: { type: Date },
  registeredAt: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },
  blockedReason: { type: String },
});

userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
userDeviceSchema.index({ userId: 1, isBlocked: 1 });
userDeviceSchema.index({ lastActive: -1 });

export const UserDevice =
  mongoose.models.UserDevice || mongoose.model('UserDevice', userDeviceSchema);

// Device Violation Schema - Logs suspicious activity
const deviceViolationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  violationType: { 
    type: String, 
    enum: ['location_mismatch', 'device_limit_exceeded', 'concurrent_stream', 'rapid_device_switch'],
    required: true 
  },
  severity: { type: String, enum: ['warning', 'moderate', 'severe'], default: 'warning' },
  device1: {
    deviceId: { type: String },
    deviceName: { type: String },
    location: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date },
  },
  device2: {
    deviceId: { type: String },
    deviceName: { type: String },
    location: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date },
  },
  message: { type: String },
  isAcknowledged: { type: Boolean, default: false }, // User clicked "It's me"
  acknowledgedAt: { type: Date },
  isReviewed: { type: Boolean, default: false }, // Admin reviewed
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

deviceViolationSchema.index({ userId: 1, createdAt: -1 });
deviceViolationSchema.index({ isReviewed: 1, createdAt: -1 });

export const DeviceViolation =
  mongoose.models.DeviceViolation || mongoose.model('DeviceViolation', deviceViolationSchema);

// Device Settings Schema - Admin-controlled settings
const deviceSettingsSchema = new mongoose.Schema({
  settingKey: { type: String, unique: true, required: true, default: 'default' },
  maxDevicesPerUser: { type: Number, default: 3 },
  maxConcurrentStreams: { type: Number, default: 1 },
  locationMismatchWindowMinutes: { type: Number, default: 60 }, // Time window for location check
  enableLocationCheck: { type: Boolean, default: true },
  enableDeviceLimit: { type: Boolean, default: true },
  enableConcurrentStreamCheck: { type: Boolean, default: true },
  autoBlockOnViolations: { type: Number, default: 0 }, // 0 = never auto-block, N = block after N violations
  warningMessage: { 
    type: String, 
    default: 'We detected suspicious activity on your account. Someone may be using your credentials. If this wasn\'t you, please change your password.' 
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
});

export const DeviceSettings =
  mongoose.models.DeviceSettings || mongoose.model('DeviceSettings', deviceSettingsSchema);

// Active Stream Schema - Track who is currently streaming (for 1 stream at a time)
const activeStreamSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  videoId: { type: String }, // Which video they're watching
  communityId: { type: String },
  startedAt: { type: Date, default: Date.now },
  lastHeartbeat: { type: Date, default: Date.now }, // Client pings every 30s
  ipAddress: { type: String },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
  },
});

activeStreamSchema.index({ userId: 1 }, { unique: true }); // Only 1 stream per user
activeStreamSchema.index({ lastHeartbeat: 1 }, { expireAfterSeconds: 120 }); // Auto-delete stale streams

export const ActiveStream =
  mongoose.models.ActiveStream || mongoose.model('ActiveStream', activeStreamSchema);

// =====================================================
// END DEVICE CONTROL SYSTEM
// =====================================================

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
const accountingInvestmentSchema = new mongoose.Schema({
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

accountingInvestmentSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });

export const AccountingInvestment = mongoose.models.AccountingInvestment || mongoose.model('AccountingInvestment', accountingInvestmentSchema);

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
    price3Month: { type: Number, default: 0 },
    priceNPR: { type: Number, default: 0 }, // Nepal price in NPR
    nepalQrCode: { type: String, default: '' }, // Nepal payment QR code URL
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
  scopeType: {
    type: String,
    enum: ['super_admin', 'tenant'],
    default: 'super_admin',
    index: true,
  },
  scopeKey: { type: String, default: 'super_admin', index: true },
  ownerUserId: { type: String, index: true },
  tenantSlug: { type: String, index: true },
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
socialMediaAccountSchema.index({ scopeType: 1, scopeKey: 1, platform: 1, accountId: 1 }, { unique: true, sparse: true });

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
  email: { type: String, required: false, trim: true, lowercase: true, sparse: true },
  mobile: { type: String, required: true, trim: true },
  countryCode: { type: String, default: '+91' },
  country: { type: String, default: '', trim: true }, // Country name (e.g., 'India', 'Nepal')
  userId: { type: String, required: true, index: true }, // 6-digit user ID
  communityId: { type: String, required: true }, // 'general', 'swar-yoga', etc.
  communityName: { type: String, required: true }, // Denormalized for quick queries
  joinedAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active' },
  approved: { type: Boolean, default: false }, // For 'general' community: can send messages only if approved
  approvedAt: { type: Date }, // When admin approved this member
  approvedBy: { type: String }, // Admin who approved
  chatEnabled: { type: Boolean, default: true },
  chatPermissions: {
    // If false, member can read but cannot send.
    canSend: { type: Boolean, default: true },
    // Allowed content types.
    allowText: { type: Boolean, default: true },
    allowLinks: { type: Boolean, default: true },
    allowImages: { type: Boolean, default: true },
    allowVideos: { type: Boolean, default: true },
    allowDocuments: { type: Boolean, default: true },
  },
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
communityMemberSchema.index({ email: 1 }, { sparse: true });

export const CommunityMember = mongoose.models.CommunityMember || mongoose.model('CommunityMember', communityMemberSchema);

// ==================== RECORDED WORKSHOPS SCHEMA ====================
const recordedWorkshopSchema = new mongoose.Schema({
  // Basic Info
  workshopSlug: { type: String, required: true, trim: true }, // e.g., 'breathwork', 'meditation'
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  instructorName: { type: String, required: true, trim: true },
  instructorImage: { type: String }, // URL to instructor image
  
  // Language Variants (Hindi, English, Marathi)
  languages: {
    hindi: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      videoUrl: { type: String }, // Secure video URL with access token
      subtitle: { type: String, trim: true },
    },
    english: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      videoUrl: { type: String },
      subtitle: { type: String, trim: true },
    },
    marathi: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      videoUrl: { type: String },
      subtitle: { type: String, trim: true },
    },
  },
  
  // Video & Content
  thumbnailUrl: { type: String }, // Preview image
  duration: { type: Number }, // in minutes
  videoProvider: { type: String, enum: ['vimeo', 'youtube', 'custom'], default: 'custom' },
  
  // Pricing (per language can have different prices)
  pricing: {
    hindi: { type: Number, default: 0 }, // INR or other currency
    english: { type: Number, default: 0 },
    marathi: { type: Number, default: 0 },
  },
  currency: { type: String, default: 'INR' },
  
  // Access Control & Security
  accessControl: {
    deviceLimit: { type: Number, default: 3 }, // Max 3 devices
    gapHours: { type: Number, default: 24 }, // 24-hour gap between device switches
    requiresDeviceFingerprint: { type: Boolean, default: true },
    maxDownloadsPerUser: { type: Number, default: 0 }, // 0 = no download allowed
  },
  
  // Resources & Materials
  materials: [{
    type: { type: String, enum: ['pdf', 'ppt', 'notes', 'assignment'], required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
  // Certificates
  certificateEnabled: { type: Boolean, default: true },
  certificateTemplate: { type: String }, // URL to certificate template
  
  // Status & Publishing
  isPublished: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  publishedAt: { type: Date },
  
  // Analytics
  viewCount: { type: Number, default: 0 },
  purchaseCount: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviews: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Metadata
  category: { type: String, trim: true }, // e.g., 'beginner', 'advanced'
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

recordedWorkshopSchema.index({ workshopSlug: 1, isPublished: 1 });
recordedWorkshopSchema.index({ status: 1, publishedAt: -1 });
recordedWorkshopSchema.index({ instructorName: 1 });

export const RecordedWorkshop = mongoose.models.RecordedWorkshop || mongoose.model('RecordedWorkshop', recordedWorkshopSchema);

// ==================== USER RECORDED WORKSHOP PROGRESS SCHEMA ====================
const userWorkshopProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recordedWorkshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecordedWorkshop', required: true },
  language: { type: String, enum: ['hindi', 'english', 'marathi'], required: true },
  
  // Purchase Info
  purchasedAt: { type: Date, default: Date.now, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  
  // Access & Device Tracking
  registeredDevices: [{
    deviceId: { type: String, required: true }, // Device fingerprint
    deviceName: { type: String }, // e.g., 'iPhone 12', 'MacBook Pro'
    firstAccessAt: { type: Date, default: Date.now },
    lastAccessAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String },
    isActive: { type: Boolean, default: true },
  }],
  
  // Progress Tracking
  watchProgress: {
    totalDuration: { type: Number, default: 0 }, // Total minutes watched
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    lastWatchedAt: { type: Date },
    lastWatchedPosition: { type: Number }, // in seconds
  },
  
  // Materials & Assignments
  downloadedMaterials: [{
    materialId: { type: String, required: true },
    downloadedAt: { type: Date, default: Date.now },
  }],
  assignments: [{
    assignmentId: { type: String, required: true },
    title: { type: String },
    submittedAt: { type: Date },
    submissionUrl: { type: String },
    status: { type: String, enum: ['pending', 'submitted', 'reviewed', 'rejected'], default: 'pending' },
    feedback: { type: String },
    grade: { type: String }, // 'A', 'B', 'C', etc.
  }],
  
  // Certificate
  certificateStatus: { type: String, enum: ['not-eligible', 'eligible', 'issued', 'revoked'], default: 'not-eligible' },
  certificateIssuedAt: { type: Date },
  certificateUrl: { type: String },
  certificateNumber: { type: String, unique: true, sparse: true },
  
  // Notes & Feedback
  notes: { type: String, trim: true },
  instructorFeedback: { type: String, trim: true },
  
  // Status
  status: { type: String, enum: ['active', 'paused', 'completed', 'expired'], default: 'active' },
  expiresAt: { type: Date }, // Access expiration date (if set)
  
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userWorkshopProgressSchema.index({ userId: 1, recordedWorkshopId: 1, language: 1 }, { unique: true });
userWorkshopProgressSchema.index({ userId: 1, status: 1, purchasedAt: -1 });
userWorkshopProgressSchema.index({ certificateStatus: 1 });

export const UserWorkshopProgress = mongoose.models.UserWorkshopProgress || mongoose.model('UserWorkshopProgress', userWorkshopProgressSchema);

// ==================== MEDIA POST SCHEMA ====================
const mediaPostSchema = new mongoose.Schema({
  // Content Structure
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  
  // Blocks - alternating layout (left-text/right-image or left-image/right-text)
  blocks: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: { type: String, enum: ['left-text-right-image', 'left-image-right-text'], required: true },
    
    // Text/Heading Block
    text: { type: String, trim: true },
    heading: { type: String, trim: true },
    
    // Image/Video Block
    media: {
      url: { type: String }, // Image or video URL
      type: { type: String, enum: ['image', 'video'], required: true },
      altText: { type: String, trim: true },
      caption: { type: String, trim: true },
    },
    
    order: { type: Number }, // Display order
  }],
  
  // Sidebars Content
  leftSidebar: {
    title: { type: String, trim: true },
    items: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      label: { type: String, trim: true, required: true },
      content: { type: String, trim: true },
      icon: { type: String }, // Icon name/URL
      order: { type: Number },
    }],
  },
  rightSidebar: {
    title: { type: String, trim: true },
    items: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      label: { type: String, trim: true, required: true },
      content: { type: String, trim: true },
      icon: { type: String },
      order: { type: Number },
    }],
  },
  
  // Publishing & Distribution
  status: { type: String, enum: ['draft', 'scheduled', 'published', 'archived'], default: 'draft' },
  publishedAt: { type: Date },
  scheduledFor: { type: Date }, // For scheduled posts
  
  // Social Media Integration
  socialMedia: {
    postToWhatsApp: { type: Boolean, default: false },
    postToFacebook: { type: Boolean, default: false },
    postToInstagram: { type: Boolean, default: false },
    postToTwitter: { type: Boolean, default: false },
    postToCommunityGroups: { type: Boolean, default: false },
  },
  
  // Community & Group Broadcasting
  communityGroups: {
    selectedGroups: [{ type: String }], // Group IDs to broadcast to
    broadcastAt: { type: Date },
    broadcastStatus: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
  },
  
  // Social Media Links Generated
  socialMediaLinks: {
    whatsappLink: { type: String },
    facebookLink: { type: String },
    instagramLink: { type: String },
    twitterLink: { type: String },
  },
  
  // Analytics
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  reactions: { type: Number, default: 0 },
  
  // Metadata
  category: { type: String, enum: ['update', 'highlight', 'testimony', 'program', 'event'], default: 'update' },
  tags: [{ type: String }],
  author: { type: String }, // Admin name
  featured: { type: Boolean, default: false },
  pinnedOn: { type: Date }, // When it was pinned
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

mediaPostSchema.index({ status: 1, publishedAt: -1 });
mediaPostSchema.index({ category: 1, publishedAt: -1 });
mediaPostSchema.index({ featured: 1, publishedAt: -1 });

export const MediaPost = mongoose.models.MediaPost || mongoose.model('MediaPost', mediaPostSchema);

// ==================== VIDEO PLAYLIST SCHEMA ====================
// For organizing videos into playlists (batch-wise: batch-1, batch-2... and post videos: month-wise)

const videoPlaylistSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true }, // "Batch 1", "January 2026 Updates", etc.
  description: { type: String, default: '', trim: true },
  thumbnailUrl: { type: String, trim: true },
  
  // Type: 'batch' for workshop batch videos, 'post' for monthly post videos
  type: { type: String, enum: ['batch', 'post'], required: true, index: true },
  
  // Video type: 'gallery' or 'speaker' — allows separate playlists per view
  videoType: { type: String, enum: ['gallery', 'speaker', 'mixed'], default: 'mixed', index: true },
  
  // Language
  language: { type: String, enum: ['hindi', 'english', 'marathi', 'mandarin', 'spanish', 'french', 'arabic', 'german', 'portuguese', 'japanese', 'korean', 'russian', 'italian', 'turkish', 'dutch', 'swedish', 'thai', 'indonesian', 'both'], default: 'hindi' },
  
  // For batch playlists
  batchNumber: { type: Number }, // 1, 2, 3... for batch type
  workshopSlug: { type: String, trim: true }, // swar-yoga, aham-bramhasmi, etc.
  workshopName: { type: String, trim: true }, // Editable — user can type custom name
  
  // Zoom meeting details
  zoomMeetingId: { type: String, trim: true },
  zoomPassword: { type: String, trim: true },
  
  // Day-wise session plan (e.g. [{day:1,topic:"Introduction"},{day:2,topic:"Breathwork"}])
  sessionPlan: [{
    day: { type: Number, required: true },
    topic: { type: String, trim: true, default: '' },
  }],
  
  // For post/update videos (month-wise)
  year: { type: Number }, // 2026
  month: { type: Number }, // 1-12
  
  // Community association
  communityId: { type: String, index: true }, // Can be linked to specific community
  
  // Visibility & Access
  isPublic: { type: Boolean, default: false },
  membersOnly: { type: Boolean, default: true }, // Video for members only
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active', index: true },
  
  // Ordering
  sortOrder: { type: Number, default: 0 },
  
  // Stats
  videoCount: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // Total seconds
  totalViews: { type: Number, default: 0 },
  
  // Metadata
  createdBy: { type: String, trim: true },
  updatedBy: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

videoPlaylistSchema.index({ type: 1, status: 1, sortOrder: 1 });
videoPlaylistSchema.index({ type: 1, workshopSlug: 1, batchNumber: 1 });
videoPlaylistSchema.index({ type: 1, year: -1, month: -1 });

export const VideoPlaylist = mongoose.models.VideoPlaylist || mongoose.model('VideoPlaylist', videoPlaylistSchema);

// ==================== PLAYLIST VIDEO SCHEMA ====================
// Videos inside playlists

const playlistVideoSchema = new mongoose.Schema({
  // Playlist reference
  playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoPlaylist', required: true, index: true },
  
  // Video info
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  
  // Video source — supports S3, Bunny Stream, or external URLs
  videoUrl: { type: String, required: true }, // Primary playback URL (Bunny embed or S3)
  s3Key: { type: String, trim: true }, // If uploaded to S3
  bunnyVideoId: { type: String, trim: true }, // Bunny Stream video GUID
  bunnyEmbedUrl: { type: String, trim: true }, // Bunny iframe embed URL
  thumbnailUrl: { type: String, trim: true },
  
  // Video type: gallery or speaker view
  videoType: { type: String, enum: ['gallery', 'speaker', 'screen', 'other'], default: 'speaker', index: true },
  
  // Short URL code — e.g. swaryoga.com/Xsde123
  shortCode: { type: String, unique: true, sparse: true, trim: true },
  
  // Video details
  duration: { type: Number, default: 0 }, // Seconds
  quality: { type: String, enum: ['480p', '720p', '1080p', '4k'], default: '720p' },
  fileSize: { type: Number }, // Bytes
  mimeType: { type: String, default: 'video/mp4' },
  
  // For batch videos: day/session number
  sessionNumber: { type: Number }, // Day 1, Day 2, etc.
  sessionTitle: { type: String, trim: true }, // "Introduction", "Breathwork Basics", etc.
  
  // Ordering within playlist
  sortOrder: { type: Number, default: 0 },
  
  // Stats
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  watchTime: { type: Number, default: 0 }, // Total watch time in seconds
  
  // Status
  status: { type: String, enum: ['active', 'processing', 'failed', 'archived'], default: 'active', index: true },
  processingError: { type: String },
  
  // Tags for search
  tags: [{ type: String, trim: true }],
  
  // Metadata
  uploadedBy: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

playlistVideoSchema.index({ playlistId: 1, sortOrder: 1 });
playlistVideoSchema.index({ playlistId: 1, status: 1 });
playlistVideoSchema.index({ tags: 1 });

export const PlaylistVideo = mongoose.models.PlaylistVideo || mongoose.model('PlaylistVideo', playlistVideoSchema);

// ==================== COMMUNITY PLAYLIST ACCESS SCHEMA ====================
// Maps which playlists each community can access (for recording management)

const communityPlaylistAccessSchema = new mongoose.Schema({
  communityId: { type: String, required: true, unique: true, index: true }, // e.g. 'swar-yoga-l1', 'youth'
  communityName: { type: String, trim: true }, // Cached display name
  allAccess: { type: Boolean, default: false }, // If true, community gets all playlists
  playlistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VideoPlaylist' }], // Specific playlists granted
  updatedBy: { type: String, trim: true },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

communityPlaylistAccessSchema.index({ communityId: 1 });

export const CommunityPlaylistAccess = mongoose.models.CommunityPlaylistAccess || mongoose.model('CommunityPlaylistAccess', communityPlaylistAccessSchema);

export function getCommunityPlaylistAccess() {
  return mongoose.models.CommunityPlaylistAccess || mongoose.model('CommunityPlaylistAccess', communityPlaylistAccessSchema);
}

// ==================== USER PLAYLIST ACCESS SCHEMA ====================
// Per-user override: which playlists a specific user can access in a community

const userPlaylistAccessSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // CommunityMember userId (6-digit)
  mobile: { type: String, trim: true, index: true }, // Phone number for lookup
  communityId: { type: String, required: true, index: true }, // e.g. 'swar-yoga-l1'
  userName: { type: String, trim: true }, // Cached display name
  allAccess: { type: Boolean, default: false }, // If true, user gets all playlists in this community
  playlistIds: [{ type: String }], // Composite keys: "folder|||playlist" derived from communityvideos tags
  updatedBy: { type: String, trim: true },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

userPlaylistAccessSchema.index({ userId: 1, communityId: 1 }, { unique: true });
userPlaylistAccessSchema.index({ mobile: 1, communityId: 1 });

export const UserPlaylistAccess = mongoose.models.UserPlaylistAccess || mongoose.model('UserPlaylistAccess', userPlaylistAccessSchema);

export function getUserPlaylistAccess() {
  return mongoose.models.UserPlaylistAccess || mongoose.model('UserPlaylistAccess', userPlaylistAccessSchema);
}

// ==================== LANDING PAGE BUILDER SCHEMA ====================
// Comprehensive landing page builder for marketing campaigns

const landingPageSchema = new mongoose.Schema({
  // Basic Info
  slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true }, // Internal name
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },

  // Hero Section
  heroHeading: { type: String, trim: true },
  heroSubheading: { type: String, trim: true },
  heroImage: { type: String, trim: true }, // URL
  heroImageFit: { type: String, enum: ['cover', 'contain', 'fill', 'none'], default: 'cover' },
  heroImagePosition: { type: String, default: 'center', trim: true }, // e.g. "center", "top", "bottom left"
  heroVideo: { type: String, trim: true }, // YouTube/Vimeo URL
  heroCTA: { type: String, default: 'Register Now', trim: true },
  heroCtaLink: { type: String, trim: true },

  // Event/Workshop Details
  eventTitle: { type: String, trim: true },
  eventDescription: { type: String, trim: true }, // Rich text/markdown
  startDate: { type: Date },
  endDate: { type: Date },
  eventTime: { type: String, trim: true }, // e.g., "7:00 PM - 8:30 PM IST"
  eventTimezone: { type: String, default: 'Asia/Kolkata', trim: true },
  location: { type: String, default: 'Online (Zoom)', trim: true },
  language: { type: String, default: 'Hindi', trim: true },

  // Pricing Section
  pricing: [{
    name: { type: String, trim: true }, // e.g., "Early Bird", "Standard", "Premium"
    price: { type: Number },
    currency: { type: String, default: 'INR' },
    originalPrice: { type: Number }, // For showing discount
    features: [{ type: String }], // List of features
    isPopular: { type: Boolean, default: false },
    ctaText: { type: String, default: 'Enroll Now' },
    paymentLink: { type: String, trim: true }, // Direct payment URL
  }],

  // About/Instructor Section
  instructorName: { type: String, trim: true },
  instructorTitle: { type: String, trim: true },
  instructorImage: { type: String, trim: true },
  instructorBio: { type: String, trim: true },

  // Benefits/Features Section
  benefits: [{
    icon: { type: String, trim: true }, // Icon name or URL
    title: { type: String, trim: true },
    description: { type: String, trim: true },
  }],

  // What You'll Learn Section
  curriculum: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    duration: { type: String, trim: true },
  }],

  // Testimonials
  testimonials: [{
    name: { type: String, trim: true },
    image: { type: String, trim: true },
    location: { type: String, trim: true },
    text: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 },
  }],

  // Demo/Free Session
  demoSession: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    date: { type: Date },
    time: { type: String, trim: true },
    zoomLink: { type: String, trim: true },
    zoomId: { type: String, trim: true },
    zoomPassword: { type: String, trim: true },
  },

  // FAQ Section
  faqs: [{
    question: { type: String, trim: true },
    answer: { type: String, trim: true },
  }],

  // Gallery
  gallery: [{
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, trim: true },
    caption: { type: String, trim: true },
  }],

  // Design/Theme Settings
  theme: {
    mode: { type: String, enum: ['light', 'dark', 'custom'], default: 'light' },
    primaryColor: { type: String, default: '#FF6B35' },
    secondaryColor: { type: String, default: '#1E3A5F' },
    accentColor: { type: String, default: '#FFD700' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    textColor: { type: String, default: '#333333' },
    fontFamily: { type: String, default: 'Inter' },
  },

  // SEO Settings
  seo: {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: [{ type: String }],
    ogImage: { type: String, trim: true },
  },

  // Integrations
  integrations: {
    whatsappNumber: { type: String, trim: true },
    whatsappMessage: { type: String, trim: true },
    googleAnalyticsId: { type: String, trim: true },
    facebookPixelId: { type: String, trim: true },
    paymentLink: { type: String, trim: true }, // Primary payment link
  },

  // Countdown Timer
  countdown: {
    enabled: { type: Boolean, default: false },
    endDate: { type: Date },
    message: { type: String, default: 'Registration closes in:', trim: true },
  },

  // Social Proof
  socialProof: {
    studentsCount: { type: Number },
    reviewsCount: { type: Number },
    avgRating: { type: Number },
    yearsExperience: { type: Number },
  },

  // Trust Badges & Partner Logos
  trustBadges: [{
    image: { type: String, trim: true },
    title: { type: String, trim: true },
    link: { type: String, trim: true },
  }],

  // Money-Back Guarantee
  guarantee: {
    enabled: { type: Boolean, default: false },
    days: { type: Number, default: 7 },
    title: { type: String, default: '100% Money-Back Guarantee', trim: true },
    description: { type: String, trim: true },
  },

  // Bonus Stack (Limited Time Offers)
  bonuses: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    value: { type: Number }, // Worth value
    currency: { type: String, default: 'INR' },
    image: { type: String, trim: true },
  }],

  // Urgency/Scarcity Settings
  urgency: {
    enabled: { type: Boolean, default: false },
    limitedSeats: { type: Boolean, default: false },
    totalSeats: { type: Number },
    seatsRemaining: { type: Number },
    earlyBirdDeadline: { type: Date },
    earlyBirdMessage: { type: String, trim: true },
    showLiveCount: { type: Boolean, default: false }, // Show "X people viewing now"
  },

  // Registration Form Settings
  registrationForm: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Register Now', trim: true },
    subtitle: { type: String, trim: true },
    fields: [{
      name: { type: String, trim: true },
      type: { type: String, enum: ['text', 'email', 'phone', 'select', 'textarea'], default: 'text' },
      required: { type: Boolean, default: false },
      placeholder: { type: String, trim: true },
      options: [{ type: String }], // For select fields
    }],
    submitText: { type: String, default: 'Register Now', trim: true },
    successMessage: { type: String, default: 'Thank you! We will contact you soon.', trim: true },
  },

  // Popup Settings
  popup: {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['exit-intent', 'timer', 'scroll'], default: 'timer' },
    delay: { type: Number, default: 5000 }, // ms for timer, % for scroll
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    ctaText: { type: String, default: 'Get Special Offer', trim: true },
    ctaLink: { type: String, trim: true },
    image: { type: String, trim: true },
  },

  // Sticky Header Settings
  stickyHeader: {
    enabled: { type: Boolean, default: true },
    text: { type: String, trim: true },
    ctaText: { type: String, default: 'Enroll Now', trim: true },
    ctaLink: { type: String, trim: true },
    showCountdown: { type: Boolean, default: false },
  },

  // Announcement Bar
  announcementBar: {
    enabled: { type: Boolean, default: false },
    text: { type: String, trim: true },
    link: { type: String, trim: true },
    backgroundColor: { type: String, default: '#FF6B35' },
    textColor: { type: String, default: '#FFFFFF' },
  },

  // Before/After Transformation
  transformation: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Your Transformation Journey', trim: true },
    before: {
      title: { type: String, default: 'Before', trim: true },
      points: [{ type: String }],
    },
    after: {
      title: { type: String, default: 'After', trim: true },
      points: [{ type: String }],
    },
  },

  // Video Section
  videoSection: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
  },

  // Logo & Branding
  logo: {
    url: { type: String, trim: true },
    altText: { type: String, default: 'Logo', trim: true },
  },

  // Navigation Menu
  navigation: {
    enabled: { type: Boolean, default: true },
    showLogo: { type: Boolean, default: true },
    showLogin: { type: Boolean, default: false },
    loginLink: { type: String, trim: true },
    links: [{
      label: { type: String, trim: true },
      href: { type: String, trim: true },
    }],
  },

  // Problem Statement Section (Pain Points)
  problemStatement: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Are You Facing These Problems?', trim: true },
    subtitle: { type: String, trim: true },
    points: [{
      icon: { type: String, trim: true },
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    }],
  },

  // Solution Section
  solution: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Here\'s Your Solution', trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    points: [{ type: String }],
  },

  // How It Works (Step-by-Step Process)
  howItWorks: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'How It Works', trim: true },
    subtitle: { type: String, trim: true },
    steps: [{
      number: { type: Number },
      icon: { type: String, trim: true },
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    }],
  },

  // Lead Magnet / Free Resource
  leadMagnet: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Get Your Free Guide!', trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    downloadUrl: { type: String, trim: true },
    buttonText: { type: String, default: 'Download Free Guide', trim: true },
  },

  // Success Stories / Case Studies (Detailed)
  successStories: [{
    name: { type: String, trim: true },
    title: { type: String, trim: true },
    image: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    beforeStats: { type: String, trim: true },
    afterStats: { type: String, trim: true },
    testimonial: { type: String, trim: true },
    duration: { type: String, trim: true }, // e.g., "3 months"
  }],

  // Hero Quick Benefits (Bullet Points in Hero)
  heroQuickBenefits: [{
    icon: { type: String, trim: true },
    text: { type: String, trim: true },
  }],

  // Secondary CTA in Hero
  heroSecondaryCTA: {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: 'Watch Demo', trim: true },
    link: { type: String, trim: true },
    icon: { type: String, trim: true },
  },

  // Contact Information
  contactInfo: {
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    mapEmbed: { type: String, trim: true },
  },

  // Footer Settings
  footer: {
    showAbout: { type: Boolean, default: true },
    aboutText: { type: String, trim: true },
    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },
    quickLinks: [{
      label: { type: String, trim: true },
      href: { type: String, trim: true },
    }],
    showPrivacyPolicy: { type: Boolean, default: true },
    privacyPolicyLink: { type: String, trim: true },
    showTerms: { type: Boolean, default: true },
    termsLink: { type: String, trim: true },
    showRefundPolicy: { type: Boolean, default: true },
    refundPolicyLink: { type: String, trim: true },
    copyrightText: { type: String, trim: true },
  },

  // Product Demo / Preview
  productDemo: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    demoType: { type: String, enum: ['video', 'gif', 'interactive'], default: 'video' },
    mediaUrl: { type: String, trim: true },
    screenshots: [{ type: String }],
  },

  // Newsletter Signup
  newsletter: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Stay Updated', trim: true },
    subtitle: { type: String, trim: true },
    buttonText: { type: String, default: 'Subscribe', trim: true },
    placeholder: { type: String, default: 'Enter your email', trim: true },
  },

  // Comparison Table
  comparisonTable: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true },
    headers: [{ type: String }],
    rows: [{
      feature: { type: String, trim: true },
      values: [{ type: String }], // Array matching headers
    }],
  },

  // Live Notifications (Recent Sign-ups)
  liveNotifications: {
    enabled: { type: Boolean, default: false },
    messages: [{ type: String }], // Pre-defined messages like "John from Delhi just enrolled!"
  },

  // Content Sections (Flexible)
  sections: [{
    type: { type: String, enum: ['hero', 'about', 'benefits', 'curriculum', 'pricing', 'testimonials', 'faq', 'cta', 'gallery', 'instructor', 'demo', 'custom'], required: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    customTitle: { type: String, trim: true },
    customContent: { type: String, trim: true }, // For custom sections
  }],

  // Linked Workshop (optional)
  linkedWorkshopSlug: { type: String, trim: true, index: true },
  linkedScheduleId: { type: String, trim: true },

  // Analytics
  views: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },

  // Metadata
  createdBy: { type: String, trim: true },
  updatedBy: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

landingPageSchema.index({ slug: 1 }, { unique: true });
landingPageSchema.index({ status: 1, createdAt: -1 });

export const LandingPage = mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema);

// CRM Subscription Schema - Tracks user plans, trials, and billing
const crmSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, trim: true, index: true },
  currentPlan: { type: String, enum: ['basic', 'professional', 'enterprise'], default: 'basic' },

  // Trial tracking
  trialStartedAt: { type: Date },
  trialEndsAt: { type: Date },
  trialDaysRemaining: { type: Number, default: 15 },
  isTrialActive: { type: Boolean, default: true },

  // Subscription tracking
  subscriptionStartedAt: { type: Date },
  subscriptionEndsAt: { type: Date },
  status: { type: String, enum: ['trial', 'active', 'expired', 'cancelled'], default: 'trial' },

  // Payment & billing
  autoRenewal: { type: Boolean, default: true },
  paymentMethod: { type: String }, // e.g., 'razorpay', 'card'
  lastPaymentDate: { type: Date },
  nextBillingDate: { type: Date },

  // Usage tracking
  storageUsedGB: { type: Number, default: 0, min: 0 },
  emailsSentThisMonth: { type: Number, default: 0, min: 0 },
  lastEmailResetDate: { type: Date, default: Date.now },

  // Feature limits per plan
  leadsLimit: { type: Number, default: 500 },
  teamMembersLimit: { type: Number, default: 1 },
  workflowsLimit: { type: Number, default: 3 },
  emailLimitPerMonth: { type: Number, default: 1000 },
  storageIncludedGB: { type: Number, default: 1 }, // Basic: 1GB, Pro: 25GB, Enterprise: unlimited
  apiRequestsPerMonth: { type: Number, default: 0 }, // 0 = no API access for basic

  // Current usage tracking
  leadsCount: { type: Number, default: 0 },
  teamMembersCount: { type: Number, default: 1 },
  workflowsCount: { type: Number, default: 0 },

  // Invoice/Order tracking
  orderId: { type: String }, // Razorpay order ID
  invoiceIds: [{ type: String }],

  // Auto-delete tracking (30-day grace period after expiry)
  autoDeleteNotifiedDays: [{ type: Number }], // e.g. [20, 25] after warnings sent, prevents duplicate notifications

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

crmSubscriptionSchema.index({ userId: 1 });
crmSubscriptionSchema.index({ status: 1, trialEndsAt: 1 });
crmSubscriptionSchema.index({ nextBillingDate: 1 });

export const CRMSubscription = mongoose.models.CRMSubscription || mongoose.model('CRMSubscription', crmSubscriptionSchema);

export function getCRMSubscription() {
  return mongoose.models.CRMSubscription || mongoose.model('CRMSubscription', crmSubscriptionSchema);
}

// ============================================================================
// Enquiry Forms — admin-created shareable forms with unique links
// ============================================================================

const enquiryFormSchema = new mongoose.Schema(
  {
    formId: { type: String, required: true, unique: true, index: true }, // short unique ID for URL
    workshopName: { type: String, required: true },
    workshopDate: { type: String, default: '' },     // human-readable date string
    workshopTime: { type: String, default: '' },
    workshopMode: { type: String, enum: ['online', 'offline', 'residential', 'recorded'], default: 'online' },
    workshopId: { type: String, default: '' },        // optional slug reference
    description: { type: String, default: '' },
    workshopImage: { type: String, default: '' },     // banner image URL
    isActive: { type: Boolean, default: true, index: true },
    createdByUserId: { type: String, default: 'admin' },
    submissionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const EnquiryForm = mongoose.models.EnquiryForm || mongoose.model('EnquiryForm', enquiryFormSchema);

export function getEnquiryForm() {
  return mongoose.models.EnquiryForm || mongoose.model('EnquiryForm', enquiryFormSchema);
}

export function getLandingPage() {
  return mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema);
}

// Import and export CourseVideo and RecordedCourse schemas
export function getCourseVideo() {
  const { getCourseVideo: getter } = require('./schemas/recordedCourseSchemas');
  return getter();
}

export function getRecordedCourse() {
  const { getRecordedCourse: getter } = require('./schemas/recordedCourseSchemas');
  return getter();
}

export function getCourseSection() {
  const { getCourseSection: getter } = require('./schemas/recordedCourseSchemas');
  return getter();
}

export function getCourseEnrollment() {
  const { getCourseEnrollment: getter } = require('./schemas/recordedCourseSchemas');
  return getter();
}

// Default export for backward compatibility
export default connectDB;
