import { NextRequest, NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { notifySignupConfirmation } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const viewer = registrationViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || '';
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    let sql = `
      SELECT id, name, email, phone, role, status, country, state, gender, age, profession, approvalReason, createdAt
      FROM users
    `;
    const conditions: string[] = [];
    const args: any[] = [];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push('status = ?');
      args.push(statusFilter);
    }

    if (query) {
      conditions.push('(lower(name) LIKE ? OR lower(email) LIKE ? OR phone LIKE ? OR lower(country) LIKE ? OR lower(state) LIKE ?)');
      const wild = `%${query}%`;
      args.push(wild, wild, wild, wild, wild);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY createdAt DESC LIMIT 500';

    const result = await bunnyExecute({ sql, args });

    const signups = result.rows.map((row: any) => ({
      _id: String(row.id),
      id: String(row.id),
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || 'user',
      status: row.status || 'active',
      country: row.country || '',
      state: row.state || '',
      gender: row.gender || '',
      age: row.age != null && !isNaN(Number(row.age)) ? Number(row.age) : '',
      profession: row.profession || '',
      approvalReason: row.approvalReason || '',
      createdAt: row.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json(
      { success: true, data: signups, count: signups.length },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Admin Signups] Error fetching signups:', error);
    return NextResponse.json({ error: 'Failed to fetch signup data' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const viewer = registrationViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, id, ids, reason } = body;
    const now = new Date().toISOString();

    if (action === 'approve') {
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

      // Fetch user details to optionally send welcome email
      const userRes = await bunnyExecute({
        sql: 'SELECT id, name, email, phone, status FROM users WHERE id = ? LIMIT 1',
        args: [id],
      });

      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userRes.rows[0];

      await bunnyExecute({
        sql: 'UPDATE users SET status = ?, approvalReason = ?, updatedAt = ? WHERE id = ?',
        args: ['active', 'Approved by admin', now, id],
      });

      // Send welcome email on manual approval if user was previously pending
      if (user.status !== 'active' && user.email) {
        notifySignupConfirmation(
          { name: String(user.name || ''), email: String(user.email), phone: String(user.phone || '') },
          {}
        ).catch(err => console.warn('[Admin Signups] Welcome email failed on approval:', err));
      }

      return NextResponse.json({ success: true, message: 'User approved successfully' });
    }

    if (action === 'reject') {
      if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      await bunnyExecute({
        sql: 'UPDATE users SET status = ?, approvalReason = ?, updatedAt = ? WHERE id = ?',
        args: ['rejected', reason || 'Rejected by admin', now, id],
      });
      return NextResponse.json({ success: true, message: 'User rejected' });
    }

    if (action === 'bulk_approve') {
      const targetIds = Array.isArray(ids) ? ids : [];
      if (targetIds.length === 0) return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });

      for (const targetId of targetIds) {
        await bunnyExecute({
          sql: 'UPDATE users SET status = ?, approvalReason = ?, updatedAt = ? WHERE id = ?',
          args: ['active', 'Approved by admin (bulk)', now, targetId],
        });
      }
      return NextResponse.json({ success: true, message: `${targetIds.length} users approved` });
    }

    if (action === 'bulk_reject') {
      const targetIds = Array.isArray(ids) ? ids : [];
      if (targetIds.length === 0) return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });

      for (const targetId of targetIds) {
        await bunnyExecute({
          sql: 'UPDATE users SET status = ?, approvalReason = ?, updatedAt = ? WHERE id = ?',
          args: ['rejected', reason || 'Rejected by admin (bulk)', now, targetId],
        });
      }
      return NextResponse.json({ success: true, message: `${targetIds.length} users rejected` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Signups] Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const viewer = registrationViewer(req);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const targetIds = Array.isArray(body.ids) ? body.ids : (queryId || body.id ? [queryId || body.id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'User ID(s) required' }, { status: 400 });
    }

    for (const targetId of targetIds) {
      await bunnyExecute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [targetId],
      });
    }

    return NextResponse.json({ success: true, message: `${targetIds.length} user(s) deleted` });
  } catch (error) {
    console.error('[Admin Signups] Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
