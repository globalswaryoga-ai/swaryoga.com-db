import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/profile
 * Get authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user ID from various possible fields in the token
    const userId = decoded.userId || decoded._id || decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token - no user ID' }, { status: 401 });
    }

    await connectDB();

    const user: any = await User.findById(userId)
      .select('_id name email phone profileId profileImage createdAt')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id?.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileId: user.profileId,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
