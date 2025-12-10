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
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  age: { type: Number, required: true },
  profession: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

export const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
