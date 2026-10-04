import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, tenantFilter, getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { broadcastRunFindOne, broadcastRunMessageFind, broadcastRunMessageUpdateMany, broadcastRunUpdateOne, getLeadsByIds, markRunStatsBunny } from '@/lib/bunnyBroadcastRepository';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
export const revalidate = 0;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

/**
 * GET /api/admin/crm/broadcast-runs/:id
 * Details: run + per-lead status.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const tf = tenantFilter(decoded);
    const { id } = await ctx.params;

    const bunnyRun = await broadcastRunFindOne(id);
    if (bunnyRun) {
      const stats = await markRunStatsBunny(id);
      const url = new URL(request.url);
      const limit = Math.min(Number(url.searchParams.get('limit') || 200) || 200, 500);
      const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);
      const status = url.searchParams.get('status') || undefined;
      const bunnyMessages = await broadcastRunMessageFind({ runId: id, status }, { limit: limit + skip });
      const leads = await getLeadsByIds(bunnyMessages.map((message: any) => String(message.leadId || '')).filter(Boolean));
      const leadMap = new Map(leads.map((lead: any) => [String(lead._id), lead]));
      return NextResponse.json({ success: true, data: { run: { ...bunnyRun, stats }, messages: bunnyMessages.slice(skip, skip + limit).map((message: any) => ({ ...message, lead: leadMap.get(String(message.leadId)) || null })), total: bunnyMessages.length, limit, skip } }, { status: 200 });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs/:id');
  }
}

/**
 * PATCH /api/admin/crm/broadcast-runs/:id
 * Actions: cancel, reset-pending, retry-failed
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const tf = tenantFilter(decoded);
    const { id } = await ctx.params;

    // Bunny SQL is the active runtime for new broadcasts. Handle cancellation
    // before the legacy Mongo detail path so scheduled Bunny runs can always
    // be stopped from Reports.
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    
    // Bunny SQL is the active runtime for new broadcasts. Handle actions
    // before the legacy Mongo detail path so scheduled Bunny runs can always
    // be managed from Reports.
    const bunnyRun = await broadcastRunFindOne(id);
    if (bunnyRun) {
      const viewerId = String(getViewerUserId(decoded) || decoded?.userId || '');
      if (!isSuperAdmin(decoded) && String(bunnyRun.createdByUserId || '') !== viewerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (action === 'cancel') {
        await broadcastRunUpdateOne(id, { status: 'cancelled' });
        await broadcastRunMessageUpdateMany(
          { runId: id, status: ['pending', 'sending', 'retrying'] },
          { status: 'cancelled', failureReason: 'Parent run cancelled by admin' },
        );
        return NextResponse.json({ success: true, message: 'Broadcast cancelled' }, { status: 200 });
      } 
      
      if (action === 'reset-pending') {
        await broadcastRunUpdateOne(id, { status: 'scheduled' });
        await broadcastRunMessageUpdateMany(
          { runId: id, status: ['failed', 'skipped', 'sending'] },
          { status: 'pending', failureReason: '' }
        );
        return NextResponse.json({ success: true, message: 'Reset pending messages' }, { status: 200 });
      }

      if (action === 'retry-failed') {
        await broadcastRunUpdateOne(id, { status: 'scheduled' });
        await broadcastRunMessageUpdateMany(
          { runId: id, status: ['failed'] },
          { status: 'pending', failureReason: '' }
        );
        return NextResponse.json({ success: true, message: 'Reset failed messages' }, { status: 200 });
      }

      if (action === 'reschedule') {
        const scheduledAt = new Date(body.scheduledAt || '');
        if (Number.isNaN(scheduledAt.getTime())) {
          return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        await broadcastRunUpdateOne(id, { status: 'scheduled', scheduledAt });
        return NextResponse.json({ success: true, message: 'Broadcast rescheduled' }, { status: 200 });
      }

      // If we don't recognize the action but it's a BunnyRun, it might be reset-all or reset-sent.
      if (action === 'reset-sent' || action === 'reset-all') {
         await broadcastRunUpdateOne(id, { status: 'scheduled' });
         await broadcastRunMessageUpdateMany(
           { runId: id, status: action === 'reset-all' ? undefined : ['sent', 'delivered', 'read'] },
           { status: 'pending', failureReason: '' }
         );
         return NextResponse.json({ success: true, message: 'Reset messages' }, { status: 200 });
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return handleCrmError(error, 'PATCH broadcast-runs/:id');
  }
}

/**
 * DELETE /api/admin/crm/broadcast-runs/:id
 * Delete the broadcast run and all its messages.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const decoded = verifyAdmin(request);
    const tf = tenantFilter(decoded);
    const { id } = await ctx.params;

    const bunnyRun = await broadcastRunFindOne(id);
    if (bunnyRun) {
      const viewerId = String(getViewerUserId(decoded) || decoded?.userId || '');
      if (!isSuperAdmin(decoded) && String(bunnyRun.createdByUserId || '') !== viewerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      await bunnyExecute({ sql: 'DELETE FROM broadcast_runs_messages_sql WHERE run_id = ?', args: [id] });
      await bunnyExecute({ sql: 'DELETE FROM broadcast_runs_sql WHERE document_id = ?', args: [id] });

      return NextResponse.json({
        success: true,
        data: { message: 'Broadcast run deleted' },
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    return handleCrmError(error, 'DELETE broadcast-runs/:id');
  }
}
