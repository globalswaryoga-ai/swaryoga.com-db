import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, handleCrmError, formatCrmSuccess } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getUid(req: NextRequest): string {
  const token = req.headers.get('authorization')?.slice('Bearer '.length);
  const decoded: any = verifyToken(token);
  return String(decoded?.userId || decoded?._id || 'system');
}

// Ensure table exists (idempotent)
async function ensureTable() {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS quick_replies_sql (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      shortcut TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    args: [],
  });
}

export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const uid = getUid(request);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim().toLowerCase() || '';

    await ensureTable();

    const result = await bunnyExecute({
      sql: 'SELECT * FROM quick_replies_sql WHERE owner_user_id = ? ORDER BY sort_order ASC, created_at DESC',
      args: [uid],
    });

    let replies = result.rows as any[];
    if (q) {
      replies = replies.filter(
        (r) =>
          String(r.title || '').toLowerCase().includes(q) ||
          String(r.content || '').toLowerCase().includes(q) ||
          String(r.shortcut || '').toLowerCase().includes(q)
      );
    }

    return formatCrmSuccess({ replies, total: replies.length });
  } catch (error) {
    return handleCrmError(error, 'GET quick-replies');
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const uid = getUid(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const title = String(body?.title || '').trim();
    const content = String(body?.content || body?.text || '').trim();
    const shortcut = String(body?.shortcut || '').trim();

    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    await ensureTable();

    const id = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: `INSERT INTO quick_replies_sql (id, owner_user_id, title, content, shortcut, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, uid, title || null, content, shortcut || null, 0, now, now],
    });

    return formatCrmSuccess({ id, title, content, shortcut, owner_user_id: uid, created_at: now });
  } catch (error) {
    return handleCrmError(error, 'POST quick-replies');
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const uid = getUid(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await ensureTable();

    const fields: string[] = [];
    const args: any[] = [];
    if (body.title !== undefined) { fields.push('title = ?'); args.push(String(body.title).trim() || null); }
    if (body.content !== undefined) { fields.push('content = ?'); args.push(String(body.content).trim()); }
    if (body.shortcut !== undefined) { fields.push('shortcut = ?'); args.push(String(body.shortcut).trim() || null); }
    if (body.sort_order !== undefined) { fields.push('sort_order = ?'); args.push(Number(body.sort_order)); }
    fields.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(id, uid);

    if (fields.length === 1) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    await bunnyExecute({
      sql: `UPDATE quick_replies_sql SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`,
      args,
    });

    return formatCrmSuccess({ updated: true });
  } catch (error) {
    return handleCrmError(error, 'PUT quick-replies');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const uid = getUid(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.trim();

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await ensureTable();

    await bunnyExecute({
      sql: 'DELETE FROM quick_replies_sql WHERE id = ? AND owner_user_id = ?',
      args: [id, uid],
    });

    return formatCrmSuccess({ deleted: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE quick-replies');
  }
}
