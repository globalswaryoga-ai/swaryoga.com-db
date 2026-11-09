import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS avatar_deleted_anchors_sql (
      id TEXT PRIMARY KEY,
      deleted_at TEXT NOT NULL
    );
  `).catch(() => {});
}

export async function GET() {
  try {
    await ensureTable();
    const res = await bunnyExecute('SELECT id FROM avatar_deleted_anchors_sql');
    const deletedIds = res.rows.map((r: any) => String(r.id));
    return NextResponse.json({ success: true, deletedIds });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing anchor ID' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'INSERT OR REPLACE INTO avatar_deleted_anchors_sql (id, deleted_at) VALUES (?, ?)',
      args: [id, new Date().toISOString()],
    });

    // Also delete from custom anchor table if exists
    await bunnyExecute({
      sql: 'DELETE FROM avatar_custom_anchors_sql WHERE id = ?',
      args: [id],
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Master anchor video permanently deleted from database.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to permanently delete anchor' }, { status: 500 });
  }
}

