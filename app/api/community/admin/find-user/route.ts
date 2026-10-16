import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    let user: any = null;

    if (q.includes('@')) {
      const res = await bunnyExecute({
        sql: 'SELECT id, email, name, phone FROM users WHERE lower(email) = ? LIMIT 1',
        args: [q.toLowerCase()],
      });
      user = res.rows[0];
    } else {
      const res = await bunnyExecute({
        sql: 'SELECT id, email, name, phone FROM users WHERE id = ? OR phone = ? OR lower(name) = ? LIMIT 1',
        args: [q, q, q.toLowerCase()],
      });
      user = res.rows[0];
    }

    // Fallback 1: check crm_leads_sql
    if (!user) {
      const leadRes = await bunnyExecute({
        sql: 'SELECT id, email, name, mobile as phone FROM crm_leads_sql WHERE lower(email) = ? OR mobile = ? OR id = ? LIMIT 1',
        args: [q.toLowerCase(), q, q],
      });
      user = leadRes.rows[0];
    }

    // Fallback 2: check community_members_sql
    if (!user) {
      const memberRes = await bunnyExecute({
        sql: 'SELECT user_id as id, email, name, mobile as phone FROM community_members_sql WHERE lower(email) = ? OR mobile = ? OR user_id = ? OR id = ? LIMIT 1',
        args: [q.toLowerCase(), q, q, q],
      });
      user = memberRes.rows[0];
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: String(user.id || ''),
          email: user.email || '',
          name: user.name || '',
          profileId: String(user.id || ''),
          phone: user.phone || '',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin find user error:', error);
    return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
  }
}
