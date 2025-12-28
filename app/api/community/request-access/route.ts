import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// Join Request Schema (if not exists in db.ts)
const joinRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  mobile: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  communityId: { type: String, required: true },
  communityName: { type: String, required: true },
  workshopsCompleted: { type: Boolean, default: false },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: String, default: null },
});

let JoinRequest: any;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Initialize model
    if (!JoinRequest) {
      JoinRequest = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema);
    }

    const { name, email, mobile, userId, communityId, communityName, workshopsCompleted, message } = await request.json();

    // Validate inputs
    if (!name || !email || !mobile || !userId || !communityId || !communityName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate mobile
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return NextResponse.json(
        { error: 'Mobile number must be at least 10 digits' },
        { status: 400 }
      );
    }

    // Check if request already exists
    const existingRequest = await JoinRequest.findOne({ userId });
    if (existingRequest) {
      return NextResponse.json(
        {
          success: true,
          message: 'Your previous request is being reviewed. Please wait for admin approval.',
          data: existingRequest,
        },
        { status: 409 }
      );
    }

    // Create new join request
    const newRequest = new JoinRequest({
      name,
      email,
      mobile: cleanMobile,
      userId,
      communityId,
      communityName,
      workshopsCompleted: workshopsCompleted || false,
      message: message || '',
      status: 'pending',
    });

    await newRequest.save();

    return NextResponse.json(
      {
        success: true,
        message: '✅ Request submitted successfully! Admin will review and get back to you soon.',
        data: newRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Join request error:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: 'Validation error: ' + Object.values(error.errors).map((e: any) => e.message).join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit join request' },
      { status: 500 }
    );
  }
}

// GET - For admin to view pending requests
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    if (!JoinRequest) {
      JoinRequest = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const communityId = searchParams.get('communityId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const query: any = {};
    if (status !== 'all') query.status = status;
    if (communityId) query.communityId = communityId;

    const requests = await JoinRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await JoinRequest.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: requests,
        total,
        limit,
        skip,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get join requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}
