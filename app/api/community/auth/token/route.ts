import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/auth/token
 * Generate a temporary token for community video access
 * Body: { communityId, userId, userEmail, userName? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communityId, userId, userEmail, userName } = body;

    if (!communityId || (!userId && !userEmail)) {
      return NextResponse.json(
        { error: 'communityId and userId/userEmail required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify user is an approved community member
    const membership = await CommunityMember.findOne({
      communityId,
      $or: [
        { userId },
        { mobile: userId },
        { email: userEmail }
      ],
      status: 'active',
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Not an approved community member' },
        { status: 403 }
      );
    }

    // Generate temporary JWT (1 hour expiry for video access)
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: userId || membership.userId || userEmail,
        email: userEmail,
        name: userName || membership.name,
        communityId,
        isAdmin: false,
        tempToken: true, // Mark as temporary
      },
      secret,
      { expiresIn: '1h' }
    );

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    console.error('[Community Token]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
