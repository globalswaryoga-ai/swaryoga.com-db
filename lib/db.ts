// MongoDB Connection and Models
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return mongoose.connection;
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  name: { type: String, required: true },
  type: { type: String, enum: ['bank', 'cash', 'investment', 'loan'], required: true },
  accountNumber: { type: String },
  bankName: { type: String },
  balance: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

// Transaction Schema (for accounting)
const transactionSchema = new mongoose.Schema({
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

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Investment Schema (for accounting)
const investmentSchema = new mongoose.Schema({
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

export const Investment = mongoose.models.Investment || mongoose.model('Investment', investmentSchema);
