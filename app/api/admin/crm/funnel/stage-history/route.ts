import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

async function initStageHistorySchema() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS funnel_stage_history_sql (
      document_id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT,
      changed_by_name TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    )
  `).catch(() => null);
  await bunnyExecute(`CREATE INDEX IF NOT EXISTS idx_stage_hist_lead ON funnel_stage_history_sql(lead_id)`).catch(() => null);
}

/**
 * GET /api/admin/crm/funnel/stage-history?leadId=xxx
 * Returns stage change history for a single lead from Bunny Database.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const leadId = request.nextUrl.searchParams.get('leadId');
    if (!leadId) return apiError('VALIDATION_ERROR', 'leadId is required');

    await initStageHistorySchema();

    const res = await bunnyExecute({
      sql: `SELECT document_id as _id, from_stage as fromStage, to_stage as toStage, changed_by_name as changedByName, note, created_at as createdAt
        FROM funnel_stage_history_sql
        WHERE lead_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      args: [leadId],
    }).catch(() => ({ rows: [] }));

    return apiSuccess({ history: res.rows });
  } catch (err: any) {
    console.error('[stage-history GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/funnel/stage-history
 * Add an update note to a lead's history in Bunny Database.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const body = await request.json().catch(() => ({}));
    const { leadId, note, fromStage, toStage } = body;
    if (!leadId || !note?.trim()) return apiError('VALIDATION_ERROR', 'leadId and note are required');

    await initStageHistorySchema();
    const viewerId = getViewerUserId(decoded) || 'admincrm';
    const nowIso = new Date().toISOString();
    const docId = `fsh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await bunnyExecute({
      sql: `INSERT INTO funnel_stage_history_sql (document_id, lead_id, from_stage, to_stage, changed_by_name, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [docId, leadId, fromStage || null, toStage || null, viewerId, note.trim(), nowIso],
    });

    return apiSuccess({
      success: true,
      entry: {
        _id: docId,
        fromStage: fromStage || null,
        toStage: toStage || null,
        changedByName: viewerId,
        note: note.trim(),
        createdAt: nowIso,
      },
    });
  } catch (err: any) {
    console.error('[stage-history POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
