import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/crm/community/members/block
 * Admin-only: Block/ban a user from a community
 * Body: { memberId: string, communityId?: string, userId?: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : '';
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Blocked by admin for policy violation';

    if (!memberId && !userId) {
      return NextResponse.json({ error: 'Either memberId or userId is required' }, { status: 400 });
    }

    await connectDB();

    let filter: any = {};
    if (memberId) {
      filter._id = memberId;
    } else if (userId && communityId) {
      filter = { userId, communityId };
    } else if (userId) {
      // Block user from all communities
      filter = { userId };
    }

    const result = await CommunityMember.updateMany(
      filter,
      {
        $set: {
          status: 'banned',
          'chatPermissions.canSend': false,
          'metadata.bannedAt': new Date(),
          'metadata.bannedBy': decoded.userId || decoded.username || 'admin',
          'metadata.banReason': reason,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully blocked ${result.modifiedCount} member(s)`,
      data: {
        blockedCount: result.modifiedCount,
        reason
      }
    });
  } catch (error) {
    console.error('Admin block member error:', error);
    return NextResponse.json({ error: 'Failed to block member' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/crm/community/members/block
 * Admin-only: Unblock/unban a user from a community
 * Body: { memberId: string, communityId?: string, userId?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const memberId = typeof body?.memberId === 'string' ? body.memberId.trim() : '';
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

    if (!memberId && !userId) {
      return NextResponse.json({ error: 'Either memberId or userId is required' }, { status: 400 });
    }

    await connectDB();

    let filter: any = {};
    if (memberId) {
      filter._id = memberId;
    } else if (userId && communityId) {
      filter = { userId, communityId };
    } else if (userId) {
      filter = { userId };
    }

    const result = await CommunityMember.updateMany(
      filter,
      {
        $set: {
          status: 'active',
          'chatPermissions.canSend': true,
          'metadata.unbannedAt': new Date(),
          'metadata.unbannedBy': decoded.userId || decoded.username || 'admin',
          updatedAt: new Date()
        },
        $unset: {
          'metadata.bannedAt': '',
          'metadata.bannedBy': '',
          'metadata.banReason': ''
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${result.modifiedCount} member(s)`,
      data: {
        unblockedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Admin unblock member error:', error);
    return NextResponse.json({ error: 'Failed to unblock member' }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/community/members/block
 * Admin-only: Get list of blocked members
 * Query: ?communityId=xxx (optional, filter by community)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || '';

    await connectDB();

    let filter: any = { status: 'banned' };
    if (communityId) {
      filter.communityId = communityId;
    }

    const blockedMembers = await CommunityMember.find(filter)
      .sort({ 'metadata.bannedAt': -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        blockedMembers,
        total: blockedMembers.length
      }
    });
  } catch (error) {
    console.error('Admin get blocked members error:', error);
    return NextResponse.json({ error: 'Failed to get blocked members' }, { status: 500 });
  }
}
