import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Newsletter Subscriber Schema
const newsletterSchema = new mongoose.Schema({
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
});

const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return NextResponse.json(
          { message: 'Already subscribed' },
          { status: 200 }
        );
      } else {
        // Resubscribe
        existingSubscriber.status = 'active';
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
      }
    } else {
      // Create new subscriber
      const newSubscriber = new Newsletter({
        email: email.toLowerCase(),
        subscribedAt: new Date(),
        status: 'active',
      });
      await newSubscriber.save();
    }

    return NextResponse.json(
      { message: 'Successfully subscribed to newsletter' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const subscribers = await Newsletter.find({ status: 'active' })
      .select('email subscribedAt language')
      .sort({ subscribedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: subscribers.length,
      data: subscribers,
    });
  } catch (error) {
    console.error('Fetch subscribers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
