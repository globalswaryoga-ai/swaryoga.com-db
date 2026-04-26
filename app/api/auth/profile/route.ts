import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId || decoded._id || decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { getUser } = await import('@/lib/db');
    const User = getUser();

    // Try by ObjectId first, fall back to email/phone for non-ObjectId tokens
    let user: any = null;
    if (mongoose.isValidObjectId(userId)) {
      user = await User.findById(userId)
        .select('_id name email phone profileId profileImage createdAt')
        .lean();
    }

    // Fallback: search by email or profileId if userId is not an ObjectId
    if (!user) {
      user = await User.findOne({
        $or: [
          { email: userId },
          { profileId: userId },
          { phone: userId },
        ],
      })
        .select('_id name email phone profileId profileImage createdAt')
        .lean();
    }

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
    console.error('[Profile] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
