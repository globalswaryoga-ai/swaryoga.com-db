import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

// Workshop Registration Schema
const workshopRegistrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    workshopId: { type: String, required: true },
    workshopName: { type: String, required: true },
    scheduleId: { type: String, required: true },
    mode: { type: String, enum: ['online', 'offline', 'residential', 'recorded'], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    orderId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    registrationDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create model if it doesn't exist
let WorkshopRegistration: mongoose.Model<any>;

try {
  WorkshopRegistration = mongoose.model('WorkshopRegistration');
} catch {
  WorkshopRegistration = mongoose.model('WorkshopRegistration', workshopRegistrationSchema);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const {
      firstName,
      lastName,
      email,
      phone,
      workshopId,
      workshopName,
      scheduleId,
      mode,
      startDate,
      endDate,
      price,
      currency = 'INR',
      orderId,
    } = await request.json();

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !workshopId ||
      !workshopName ||
      !scheduleId ||
      !mode ||
      !startDate ||
      !endDate ||
      price === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create registration
    const registration = await WorkshopRegistration.create({
      firstName,
      lastName,
      email,
      phone,
      workshopId,
      workshopName,
      scheduleId,
      mode,
      startDate,
      endDate,
      price,
      currency,
      orderId,
      status: 'confirmed',
      paymentStatus: orderId ? 'completed' : 'pending',
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        registrationId: registration._id,
        registration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Workshop registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Fetch registrations by email
    const registrations = await WorkshopRegistration.find({ email }).sort({
      registrationDate: -1,
    });

    return NextResponse.json(
      {
        message: 'Registrations retrieved successfully',
        data: registrations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
