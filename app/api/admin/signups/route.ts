import { connectDB, User } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Token validation would go here
    // For now, we'll accept any token that's present

    await connectDB();

    // Fetch signup data from database - select relevant fields, use .lean() for performance
    const signups = await User.find({}, {
      _id: 1,
      name: 1,
      email: 1,
      phone: 1,
      country: 1,
      state: 1,
      gender: 1,
      age: 1,
      profession: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .lean();

    // Standard response structure and cache control
    return new NextResponse(
      JSON.stringify({ success: true, data: signups }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching signup data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signup data' },
      { status: 500 }
    );
  }
}
