// MongoDB Connection and Models
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Log for debugging - but don't expose the full URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
}

export const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      const msg = 'MONGODB_URI environment variable is not configured';
      console.error(msg);
      throw new Error(msg);
    }

    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return mongoose.connection;
    }

    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('MongoDB connection error:', errorMsg);
    throw error;
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  countryCode: { type: String, default: '+91' },
  country: { type: String, required: true },
  state: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'male', 'female', 'Other', 'other'], required: true },
  age: { type: Number, required: true },
  profession: { type: String, required: true },
  password: { type: String, required: true },
  profileId: { type: String, unique: true }, // 6-digit unique profile ID
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
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentMethod: { type: String },
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

// Account Schema (for accounting)
const accountSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'admin'], required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['bank', 'cash', 'investment', 'loan'], required: true },
  accountNumber: { type: String },
  bankName: { type: String },
  balance: { type: Number, required: true, default: 0 },
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