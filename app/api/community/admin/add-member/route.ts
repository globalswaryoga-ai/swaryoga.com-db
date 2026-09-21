import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import crypto from 'node:crypto';
import { verifyToken } from '@/lib/auth';

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

    let memberData: any = null;

    if (manualMember) {
      // Manual Entry Mode
      if (!manualMember.name || !manualMember.mobile) {
        return NextResponse.json({ error: 'Name and mobile are required for manual entry' }, { status: 400 });
      }

      // Check if already a member by mobile
      const existingRes = await bunnyExecute({
        sql: "SELECT document_id FROM community_members_sql WHERE community_id = ? AND json_extract(data_json, '$.mobile') = ? LIMIT 1",
        args: [communityId, manualMember.mobile]
      });
      
      if (existingRes.rows.length > 0) {
        return NextResponse.json({ error: 'A member with this mobile number already exists in this community' }, { status: 400 });
      }

      memberData = {
        name: manualMember.name,
        mobile: manualMember.mobile,
        email: manualMember.email || `manual_${Date.now()}@temp.com`,
        userId: manualMember.userId || `M${Math.floor(100000 + Math.random() * 900000)}`,
        communityId,
        communityName: communityId, // Will be updated if we find a better name
        status: 'active',
        joinedAt: new Date().toISOString(),
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: decoded.username || 'admin',
      };
    } else if (userId) {
      // Search & Add Mode (from existing User table or profile ID)
      const userRes = await bunnyExecute({
        sql: 'SELECT * FROM users WHERE userId = ? OR email = ? LIMIT 1',
        args: [userId, userId]
      });
      const user = userRes.rows[0] as any;
      
      if (!user) {
        return NextResponse.json({ error: 'User not found in system' }, { status: 404 });
      }

      // Check if already a member
      const existingRes = await bunnyExecute({
        sql: "SELECT document_id FROM community_members_sql WHERE community_id = ? AND user_id = ? LIMIT 1",
        args: [communityId, user.userId || user.id]
      });

      if (existingRes.rows.length > 0) {
        return NextResponse.json({ error: 'User is already a member of this community' }, { status: 400 });
      }

      memberData = {
        name: user.name || 'Anonymous',
        mobile: user.phone || '',
        email: user.email,
        userId: user.userId || user.id,
        communityId,
        communityName: communityId,
        status: 'active',
        joinedAt: new Date().toISOString(),
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: (decoded as any).username || 'admin',
      };
    } else {
      return NextResponse.json({ error: 'userId or manualMember is required' }, { status: 400 });
    }

    // Create the member
    const docId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    await bunnyExecute({
      sql: 'INSERT INTO community_members_sql (document_id, community_id, user_id, status, approved, joined_at, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        docId, 
        memberData.communityId, 
        memberData.userId, 
        memberData.status, 
        memberData.approved ? 1 : 0, 
        nowIso, 
        JSON.stringify(memberData), 
        nowIso, 
        nowIso
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
      data: { ...memberData, _id: docId }
    });

  } catch (error) {
    console.error('Admin add member error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
