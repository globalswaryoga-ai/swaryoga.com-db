import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { verifyCommunityTenant } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PUT /api/admin/crm/community/members/quota
 * Admin-only: set a member's yearly video-watch quotas (in seconds).
 * Body: {
 *   communityId, userId,
 *   totalSecondsPerYear: number|null,       // overall yearly cap, null = unlimited
 *   perVideoSecondsPerYear: number|null,    // per-video yearly cap, null = unlimited
 *   reactivate?: boolean                    // clear any auto-suspension and set status back to 'active'
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    if (!communityId || !userId) {
      return NextResponse.json({ error: 'communityId and userId are required' }, { status: 400 });
    }
    if (!(await verifyCommunityTenant(decoded, communityId))) {
      return NextResponse.json({ error: 'Access denied to this community' }, { status: 403 });
    }

    const toNullableNumber = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
    const totalSecondsPerYear = toNullableNumber(body?.totalSecondsPerYear);
    const perVideoSecondsPerYear = toNullableNumber(body?.perVideoSecondsPerYear);

    await connectDB();
    const { CommunityMember } = await import('@/lib/db');

    const member = await CommunityMember.findOne({ communityId, userId });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    member.videoQuota = { totalSecondsPerYear, perVideoSecondsPerYear };

    if (body?.reactivate) {
      member.status = 'active';
      if (member.metadata) {
        delete member.metadata.videoSuspendReason;
        delete member.metadata.videoSuspendedAt;
        member.markModified('metadata');
      }
    }

    await member.save();

    return NextResponse.json({ success: true, videoQuota: member.videoQuota, status: member.status });
  } catch (error: any) {
    console.error('[Community Member Quota] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
