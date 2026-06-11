import { connectDB, User } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

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

    const token = authHeader.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Only superadmins can see all signup data
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required for signup data' },
        { status: 403 }
      );
    }

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

    // Convert ObjectIds to strings for JSON serialization
    const signupsWithStringIds = signups.map((user: any) => ({
      ...user,
      _id: user._id?.toString() || String(user._id),
    }));

    // Standard response structure and cache control
    return new NextResponse(
      JSON.stringify({ success: true, data: signupsWithStringIds }),
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
