/**
 * Funnel Lead Detail API
 * GET - Full lead detail with all messages, stage history, updates
 */
import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { listBunnyLeadNotes } from '@/lib/bunnyLeadFollowupRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const { id } = params;
    const lead = await getBunnyLeadById(id);
    if (!lead) return apiError('NOT_FOUND', 'Lead not found');

    const leadId = (lead as any)._id || id;
    const phoneNumber = (lead as any).phoneNumber || '';

    // Fetch all related data from Bunny Database in parallel
    const [messagesRes, stageHistRes, notes, salesRes] = await Promise.all([
      // Meta and QR messages
      bunnyExecute({
        sql: `SELECT document_id as _id, direction, message_content as messageContent,
                     message_type as messageType, status, sent_at as sentAt,
                     sender_display_name as senderDisplayName, failure_reason as failureReason
              FROM meta_messages_sql
              WHERE lead_id = ?
              ORDER BY sent_at DESC
              LIMIT 100`,
        args: [leadId],
      }).catch(() => ({ rows: [] })),

      // Stage history
      bunnyExecute({
        sql: `SELECT document_id as _id, from_stage as fromStage, to_stage as toStage,
                     changed_by_name as changedByName, note, created_at as createdAt
              FROM funnel_stage_history_sql
              WHERE lead_id = ?
              ORDER BY created_at DESC
              LIMIT 50`,
        args: [leadId],
      }).catch(() => ({ rows: [] })),

      // Notes
      listBunnyLeadNotes(leadId).catch(() => []),

      // Sales / Orders
      bunnyExecute({
        sql: `SELECT document_id as _id, amount, status, payment_id as paymentId, created_at as saleDate,
                     json_extract(data_json, '$.workshopName') as workshopName
              FROM orders_sql
              WHERE lead_id = ? OR phone = ?
              ORDER BY created_at DESC
              LIMIT 50`,
        args: [leadId, phoneNumber],
      }).catch(() => ({ rows: [] })),
    ]);

    const messages = messagesRes.rows || [];
    const stageHistory = stageHistRes.rows || [];
    const sales = salesRes.rows || [];

    // Build timeline (all events merged and sorted)
    const timeline: any[] = [];

    // Stage changes
    for (const h of stageHistory) {
      timeline.push({
        type: 'stage_change',
        date: (h as any).createdAt,
        fromStage: (h as any).fromStage,
        toStage: (h as any).toStage,
        by: (h as any).changedByName,
        note: (h as any).note,
      });
    }

    // Messages
    for (const m of messages) {
      timeline.push({
        type: 'message',
        date: (m as any).sentAt,
        direction: (m as any).direction,
        content: (m as any).messageContent,
        messageType: (m as any).messageType,
        status: (m as any).status,
        sender: (m as any).senderDisplayName,
      });
    }

    // Notes
    for (const n of notes) {
      timeline.push({
        type: 'note',
        date: (n as any).createdAt,
        content: (n as any).note,
        by: (n as any).createdByUserId,
      });
    }

    // Sales
    for (const s of sales) {
      timeline.push({
        type: 'sale',
        date: (s as any).saleDate,
        amount: (s as any).amount,
        status: (s as any).status,
        paymentMode: (s as any).paymentId,
        workshopName: (s as any).workshopName,
      });
    }

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return apiSuccess({
      lead,
      messages,
      stageHistory,
      notes,
      sales,
      timeline,
      stats: {
        totalMessages: messages.length,
        totalStageChanges: stageHistory.length,
        totalNotes: notes.length,
        totalSales: sales.length,
        joiningDate: (lead as any).createdAt,
        lastActivity: (lead as any).updatedAt,
        daysSinceJoined: Math.floor(
          (Date.now() - new Date((lead as any).createdAt || Date.now()).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      },
    });
  } catch (err: any) {
    console.error('[Funnel Lead Detail GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
