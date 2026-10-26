import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { loadBunnyLeads, invalidateBunnyLeadsCache } from '@/lib/bunnyLeadsRepository';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * Label management for CRM leads using Bunny Database
 * GET: Get all unique labels with counts
 * POST: Add a label to leads
 * DELETE: Remove a label
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const leads = await loadBunnyLeads();
    const labelMap: Record<string, number> = {};

    for (const lead of leads) {
      if (!superAdmin && lead.assignedToUserId !== viewerUserId && lead.createdByUserId !== viewerUserId) {
        continue;
      }
      if (Array.isArray(lead.labels)) {
        for (const lb of lead.labels) {
          const s = String(lb || '').trim();
          if (s) {
            labelMap[s] = (labelMap[s] || 0) + 1;
          }
        }
      }
    }

    const labels = Object.entries(labelMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, data: { labels, total: labels.length } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch labels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadIds = [], label } = body;
    const cleanLabel = String(label || '').trim();

    if (!cleanLabel) {
      return NextResponse.json({ error: 'Invalid label' }, { status: 400 });
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: true, data: { modified: 0, matched: 0, label: cleanLabel } },
        { status: 200 }
      );
    }

    let modified = 0;
    const nowIso = new Date().toISOString();

    for (const rawId of leadIds) {
      const id = String(rawId || '').trim();
      if (!id) continue;

      const whereClause = superAdmin
        ? 'document_id = ?'
        : 'document_id = ? AND (json_extract(data_json, "$.assignedToUserId") = ? OR json_extract(data_json, "$.createdByUserId") = ?)';
      const args = superAdmin ? [cleanLabel, nowIso, id] : [cleanLabel, nowIso, id, viewerUserId, viewerUserId];

      const res = await bunnyExecute({
        sql: `UPDATE leads_sql SET
          data_json = json_set(data_json, '$.labels', (
            SELECT json_group_array(DISTINCT value) FROM (
              SELECT value FROM json_each(COALESCE(json_extract(data_json, '$.labels'), '[]'))
              UNION ALL SELECT ?
            )
          )),
          updated_at = ?
          WHERE ${whereClause}`,
        args,
      });

      if (res.rowsAffected && res.rowsAffected > 0) {
        modified += res.rowsAffected;
      }
    }

    invalidateBunnyLeadsCache();

    return NextResponse.json(
      { success: true, data: { modified, matched: leadIds.length, label: cleanLabel } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    let label: string | null = null;
    try {
      const body = await request.json();
      label = body?.label;
    } catch {
      const url = new URL(request.url);
      label = url.searchParams.get('label');
    }

    const cleanLabel = String(label || '').trim();
    if (!cleanLabel) {
      return NextResponse.json({ error: 'Label parameter required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const whereClause = superAdmin
      ? 'data_json LIKE ?'
      : 'data_json LIKE ? AND (json_extract(data_json, "$.assignedToUserId") = ? OR json_extract(data_json, "$.createdByUserId") = ?)';
    const args = superAdmin ? [cleanLabel, nowIso, `%"${cleanLabel}"%`] : [cleanLabel, nowIso, `%"${cleanLabel}"%`, viewerUserId, viewerUserId];

    const res = await bunnyExecute({
      sql: `UPDATE leads_sql SET
        data_json = json_set(data_json, '$.labels', (
          SELECT json_group_array(value) FROM json_each(COALESCE(json_extract(data_json, '$.labels'), '[]'))
          WHERE value != ?
        )),
        updated_at = ?
        WHERE ${whereClause}`,
      args,
    });

    invalidateBunnyLeadsCache();

    return NextResponse.json(
      { success: true, data: { modified: res.rowsAffected || 0, label: cleanLabel } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete label';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
