import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('q')?.toLowerCase();

    // Ensure community_call_requests table exists
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS community_call_requests (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        category TEXT,
        preferred_time TEXT,
        note TEXT,
        community_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        data_json TEXT
      )
    `);

    let sql = 'SELECT * FROM community_call_requests ORDER BY created_at DESC LIMIT 200';
    const result = await bunnyExecute(sql);

    let requests = (result.rows || []).map((row: any) => {
      let data = {};
      try {
        data = JSON.parse(row.data_json || '{}');
      } catch {}
      return {
        id: row.id,
        name: row.name || (data as any).name || 'Anonymous',
        phone: row.phone || (data as any).phone || '',
        category: row.category || (data as any).category || 'General',
        preferredTime: row.preferred_time || (data as any).preferredTime || 'Anytime',
        note: row.note || (data as any).note || '',
        communityId: row.community_id || (data as any).communityId || 'global',
        status: row.status || (data as any).status || 'pending',
        createdAt: row.created_at || (data as any).createdAt || new Date().toISOString(),
      };
    });

    if (status && status !== 'all') {
      requests = requests.filter((r: any) => r.status === status);
    }

    if (search) {
      requests = requests.filter((r: any) =>
        r.name.toLowerCase().includes(search) ||
        r.phone.toLowerCase().includes(search) ||
        r.category.toLowerCase().includes(search) ||
        r.note.toLowerCase().includes(search)
      );
    }

    const stats = {
      total: requests.length,
      pending: requests.filter((r: any) => r.status === 'pending').length,
      completed: requests.filter((r: any) => r.status === 'completed').length,
      zoom: requests.filter((r: any) => r.category.toLowerCase().includes('zoom')).length,
      calls: requests.filter((r: any) => !r.category.toLowerCase().includes('zoom')).length,
    };

    return NextResponse.json({ success: true, requests, stats });
  } catch (error: any) {
    console.error('Admin call requests fetch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch call requests' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, adminNote } = body;

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const newStatus = status || 'completed';

    await bunnyExecute({
      sql: `UPDATE community_call_requests SET status = ? WHERE id = ?`,
      args: [newStatus, id],
    });

    return NextResponse.json({ success: true, message: `Status updated to ${newStatus}` });
  } catch (error: any) {
    console.error('Admin call request update error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update call request' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: `DELETE FROM community_call_requests WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Call request deleted' });
  } catch (error: any) {
    console.error('Admin call request delete error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete call request' },
      { status: 500 }
    );
  }
}
