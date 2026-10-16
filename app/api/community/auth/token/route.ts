import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/auth/token
 * Generate a temporary token for community video access
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

    await initCommunitySchema();

    // Verify user is an active community member
    const conds: string[] = [];
    const args: any[] = [communityId];
    if (userId) {
      conds.push('user_id = ? OR mobile = ?');
      args.push(userId, userId);
    }
    if (userEmail) {
      conds.push('LOWER(email) = ?');
      args.push(userEmail.toLowerCase().trim());
    }

    const res = await bunnyExecute({
      sql: `SELECT * FROM community_members_sql 
            WHERE community_id = ? AND (${conds.join(' OR ')}) AND status = 'active' LIMIT 1`,
      args,
    });
    const membership = res.rows[0];

    // If global community, permit even if not found in table
    if (!membership && communityId !== 'global') {
      return NextResponse.json(
        { error: 'Not an approved community member' },
        { status: 403 }
      );
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: userId || membership?.user_id || userEmail,
        email: userEmail || membership?.email,
        name: userName || membership?.name || 'Community Member',
        communityId,
        isAdmin: false,
        tempToken: true,
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
