import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/whatsapp/window-status?leadIds=id1,id2,...
 * Returns the Meta 24-hour messaging window status for each lead using Bunny Database.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadIdsParam = request.nextUrl.searchParams.get('leadIds') || '';
    const leadIds = leadIdsParam.split(',').map(s => s.trim()).filter(Boolean);

    if (leadIds.length === 0) {
      return NextResponse.json({ windows: {} });
    }

    const limitedIds = leadIds.slice(0, 200);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const placeholders = limitedIds.map(() => '?').join(', ');

    const res = await bunnyExecute({
      sql: `SELECT lead_id, MAX(COALESCE(sent_at, created_at)) as lastInboundAt
        FROM meta_messages_sql
        WHERE lead_id IN (${placeholders})
        AND direction = 'inbound'
        AND COALESCE(sent_at, created_at) >= ?
        GROUP BY lead_id`,
      args: [...limitedIds, cutoff],
    }).catch(() => ({ rows: [] }));

    const inboundMap = new Map<string, Date>();
    for (const r of res.rows) {
      if (r.lead_id && r.lastInboundAt) {
        inboundMap.set(String(r.lead_id), new Date(String(r.lastInboundAt)));
      }
    }

    const windows: Record<string, { lastInboundAt: string | null; expiresAt: string | null; isOpen: boolean }> = {};
    for (const id of limitedIds) {
      const lastInbound = inboundMap.get(id);
      if (lastInbound) {
        const expiresAt = new Date(lastInbound.getTime() + 24 * 60 * 60 * 1000);
        windows[id] = {
          lastInboundAt: lastInbound.toISOString(),
          expiresAt: expiresAt.toISOString(),
          isOpen: expiresAt > new Date(),
        };
      } else {
        windows[id] = {
          lastInboundAt: null,
          expiresAt: null,
          isOpen: false,
        };
      }
    }

    return NextResponse.json({ windows });
  } catch (error) {
    console.error('[window-status] Error:', error);
    return NextResponse.json({ windows: {} });
  }
}
