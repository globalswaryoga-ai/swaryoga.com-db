import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ResortBooking } from '@/lib/models/resort';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.userEmail || !body.userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const booking = new ResortBooking({
      ...body,
      createdAt: new Date(),
    });

    await booking.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully',
        bookingId: booking._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query: any = {};
    if (userId) {
      query.userId = userId;
    }

    const bookings = await ResortBooking.find(query).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        data: bookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
