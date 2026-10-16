import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initCommunitySchema,
  createJoinRequest,
  saveCommunityMember,
} from '@/lib/bunnyCommunityRepository';
import { getOrCreateLeadIdForPhone } from '@/lib/crm/leadNumber';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { name, email, mobile, communityId, communityName, workshopsCompleted, message } = await request.json();

    if (!name || !email || !mobile || !communityId || !communityName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return NextResponse.json(
        { error: 'Mobile number must be at least 10 digits' },
        { status: 400 }
      );
    }

    let leadUserId: string;
    try {
      leadUserId = await getOrCreateLeadIdForPhone(cleanMobile, name);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lead allocation failed' }, { status: 500 });
    }

    const joinReq = await createJoinRequest({
      userId: leadUserId,
      name: name.trim(),
      mobile: cleanMobile,
      email: email.trim().toLowerCase(),
      communityId,
    });

    // Add to target community as pending
    try {
      await saveCommunityMember({
        userId: leadUserId,
        communityId,
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase(),
        status: 'pending',
        role: 'member',
      });
    } catch (err) {
      console.error(`Adding pending member to ${communityName} failed:`, err);
    }

    // Auto-join global community
    try {
      await saveCommunityMember({
        userId: leadUserId,
        communityId: 'global',
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase(),
        status: 'active',
        role: 'member',
      });
    } catch (err) {
      console.error('Auto-join Global failed:', err);
    }

    return NextResponse.json(
      {
        success: true,
        message: '✅ Your request has been submitted! You have also been added to the Global Community. Admin will review your access soon.',
        data: joinReq,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Join request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit join request' },
      { status: 500 }
    );
  }
}

// GET - For admin to view pending requests
export async function GET(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const communityId = searchParams.get('communityId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    let sql = 'SELECT * FROM community_join_requests_sql WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as cnt FROM community_join_requests_sql WHERE 1=1';
    const args: any[] = [];
    const countArgs: any[] = [];

    if (status !== 'all') {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      args.push(status);
      countArgs.push(status);
    }
    if (communityId) {
      sql += ' AND community_id = ?';
      countSql += ' AND community_id = ?';
      args.push(communityId);
      countArgs.push(communityId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, skip);

    const [rowsRes, countRes] = await Promise.all([
      bunnyExecute({ sql, args }),
      bunnyExecute({ sql: countSql, args: countArgs }),
    ]);

    const total = Number(countRes.rows[0]?.cnt || 0);

    return NextResponse.json(
      {
        success: true,
        data: rowsRes.rows.map((r: any) => ({
          _id: r.id,
          id: r.id,
          name: r.name,
          email: r.email,
          mobile: r.mobile,
          userId: r.user_id,
          communityId: r.community_id,
          status: r.status,
          createdAt: r.created_at,
        })),
        total,
        limit,
        skip,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get join requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}
