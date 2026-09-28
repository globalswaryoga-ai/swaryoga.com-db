import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded: any = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const leadIds = Array.isArray(body?.leadIds) ? body.leadIds.map((id: unknown) => String(id)).filter(Boolean).slice(0, 6000) : [];
    if (!leadIds.length) return NextResponse.json({ success: true, data: {} });
    const placeholders = leadIds.map(() => '?').join(',');
    const result = await bunnyExecute({
      sql: `SELECT lead_id, status, COALESCE(sent_at, updated_at, created_at) AS status_at FROM (
        SELECT m.lead_id, m.status, m.sent_at, m.updated_at, m.created_at,
          ROW_NUMBER() OVER (PARTITION BY m.lead_id ORDER BY COALESCE(m.sent_at, m.updated_at, m.created_at) DESC) AS rn
        FROM broadcast_run_messages_sql m
        JOIN broadcast_runs_sql r ON r.document_id = m.run_id
        WHERE r.provider = 'meta' AND m.lead_id IN (${placeholders})
      ) WHERE rn = 1`,
      args: leadIds,
    });
    const data: Record<string, { status: string; updatedAt: string }> = {};
    for (const row of result.rows as any[]) {
      data[String(row.lead_id)] = { status: String(row.status || ''), updatedAt: String(row.status_at || '') };
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Broadcast latest-status] Bunny error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
