import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { saveCommunityMember, initCommunitySchema } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const communityId = typeof body?.communityId === 'string' ? body.communityId.trim() : '';
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const manualMember = body?.manualMember;

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    await initCommunitySchema();

    let savedMember: any = null;

    if (manualMember) {
      // Manual Entry Mode
      if (!manualMember.name || !manualMember.mobile) {
        return NextResponse.json({ error: 'Name and mobile are required for manual entry' }, { status: 400 });
      }

      const cleanMobile = String(manualMember.mobile).replace(/\D/g, '');

      // Check if already a member by mobile
      const existingRes = await bunnyExecute({
        sql: 'SELECT id FROM community_members_sql WHERE community_id = ? AND mobile = ? LIMIT 1',
        args: [communityId, cleanMobile],
      });

      if (existingRes.rows.length > 0) {
        return NextResponse.json({ error: 'A member with this mobile number already exists in this community' }, { status: 400 });
      }

      savedMember = await saveCommunityMember({
        communityId,
        name: manualMember.name,
        mobile: cleanMobile,
        email: manualMember.email || `manual_${Date.now()}@temp.com`,
        userId: manualMember.userId || `M${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'active',
        role: 'member',
      });
    } else if (userId) {
      // Search & Add Mode
      const userRes = await bunnyExecute({
        sql: 'SELECT id, name, email, phone FROM users WHERE id = ? OR email = ? LIMIT 1',
        args: [userId, userId],
      });
      let user = userRes.rows[0] as any;

      if (!user) {
        // Fallback to crm_leads_sql
        const leadRes = await bunnyExecute({
          sql: 'SELECT id, name, email, mobile as phone FROM crm_leads_sql WHERE id = ? OR email = ? LIMIT 1',
          args: [userId, userId],
        });
        user = leadRes.rows[0] as any;
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found in system' }, { status: 404 });
      }

      const uId = String(user.id || userId);
      const cleanMobile = String(user.phone || '').replace(/\D/g, '') || `999${Math.floor(1000000 + Math.random() * 9000000)}`;

      // Check if already a member
      const existingRes = await bunnyExecute({
        sql: 'SELECT id FROM community_members_sql WHERE community_id = ? AND (user_id = ? OR mobile = ?) LIMIT 1',
        args: [communityId, uId, cleanMobile],
      });

      if (existingRes.rows.length > 0) {
        return NextResponse.json({ error: 'User is already a member of this community' }, { status: 400 });
      }

      savedMember = await saveCommunityMember({
        communityId,
        userId: uId,
        name: user.name || 'Member',
        mobile: cleanMobile,
        email: user.email || undefined,
        status: 'active',
        role: 'member',
      });
    } else {
      return NextResponse.json({ error: 'userId or manualMember is required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
      data: {
        ...savedMember,
        _id: savedMember.id,
      },
    });

  } catch (error) {
    console.error('Admin add member error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
