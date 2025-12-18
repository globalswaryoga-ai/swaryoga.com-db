import mongoose from 'mongoose';

// Resort Booking Schema
const resortBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userPhone: {
      type: String,
    },
    checkinDate: {
      type: Date,
      required: true,
    },
    checkoutDate: {
      type: Date,
      required: true,
    },
    roomType: {
      type: String,
      required: true,
      enum: ['Deluxe Garden View', 'Traditional Bamboo House', 'Premium Mountain View'],
    },
    adults: {
      type: Number,
      required: true,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },
    specialRequests: {
      type: String,
    },
    treatments: [
      {
        treatmentId: String,
        treatmentName: String,
        sessions: Number,
        price: Number,
      },
    ],
    totalTreatmentCost: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Treatment Schema
const treatmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [
        'Massage Therapy',
        'Stambath (Steam Bath)',
        'Mud Bath',
        'Shirodhara',
        'Shank Prakshalana (Colon Cleanse)',
        'Vaman (Therapeutic Vomiting)',
        'Neti (Nasal Cleanse)',
        'Kati Basti (Back Treatment)',
        'Janu Basti (Knee Treatment)',
        'Udar Basti (Abdominal Treatment)',
        'Netra Anjan (Eye Treatment)',
        'Ear Cleaning & Oil',
        'Foot Massage',
        'Mehndi (Ladies Only)',
        'Yogasana',
        'Pranayama',
      ],
    },
    description: String,
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    benefits: [String],
    availability: {
      type: String,
      enum: ['available', 'unavailable'],
      default: 'available',
    },
  },
  { timestamps: true }
);

// Membership Schema
const membershipSchema = new mongoose.Schema(
  {
    userId: String,
    userEmail: String,
    userName: String,
    membershipId: String,
    startDate: Date,
    endDate: Date,
    price: Number,
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    freeDaysUsed: {
      type: Number,
      default: 0,
    },
    benefits: [String],
  },
  { timestamps: true }
);

export const ResortBooking =
  mongoose.models.ResortBooking || mongoose.model('ResortBooking', resortBookingSchema);

export const Treatment = mongoose.models.Treatment || mongoose.model('Treatment', treatmentSchema);

export const Membership = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
