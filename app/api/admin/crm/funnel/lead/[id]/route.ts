/**
 * Funnel Lead Detail API
 * GET - Full lead detail with all messages, stage history, updates
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  getLead,
  getWhatsAppMessage,
  getFunnelStageHistory,
  getLeadNote,
  getSalesReport,
} from '@/lib/schemas/enterpriseSchemas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const FunnelStageHistory = getFunnelStageHistory();
    const LeadNote = getLeadNote();
    const SalesReport = getSalesReport();

    const { id } = params;
    const lead = await Lead.findById(id).lean();
    if (!lead) return apiError('NOT_FOUND', 'Lead not found');

    const leadId = (lead as any)._id;

    // Fetch all related data in parallel
    const [messages, stageHistory, notes, sales] = await Promise.all([
      WhatsAppMessage.find({ leadId })
        .sort({ sentAt: -1 })
        .limit(100)
        .select('direction messageContent messageType status sentAt deliveredAt readAt media senderDisplayName templateId failureReason')
        .lean(),
      FunnelStageHistory.find({ leadId })
        .sort({ createdAt: -1 })
        .lean(),
      LeadNote.find({ leadId })
        .sort({ createdAt: -1 })
        .lean(),
      SalesReport.find({
        $or: [
          { leadId },
          { customerPhone: (lead as any).phoneNumber },
        ],
      })
        .sort({ saleDate: -1 })
        .lean(),
    ]);

    // Build timeline (all events merged and sorted)
    const timeline: any[] = [];

    // Stage changes
    for (const h of stageHistory) {
      timeline.push({
        type: 'stage_change',
        date: (h as any).createdAt,
        fromStage: (h as any).fromStage,
        toStage: (h as any).toStage,
        by: (h as any).changedByName || (h as any).changedByUserId,
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
        media: (m as any).media,
      });
    }

    // Notes
    for (const n of notes) {
      timeline.push({
        type: 'note',
        date: (n as any).createdAt,
        content: (n as any).content || (n as any).note,
        by: (n as any).createdByUserId || (n as any).createdBy,
      });
    }

    // Sales
    for (const s of sales) {
      timeline.push({
        type: 'sale',
        date: (s as any).saleDate,
        amount: (s as any).saleAmount,
        status: (s as any).status,
        paymentMode: (s as any).paymentMode,
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
        daysSinceJoined: Math.floor((Date.now() - new Date((lead as any).createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      },
    });
  } catch (err: any) {
    console.error('[Funnel Lead Detail GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
