import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage, getLead, getBroadcastRunMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin, getVisibleUserIds } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching for real-time data

/**
 * Broadcast Messages Dashboard API
 * 
 * GET: Fetch broadcast/sent messages with filtering
 * Query params:
 * - period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
 * - startDate, endDate: for custom period
 * - status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
 * - userId: filter by admin user
 * - page, limit: pagination
 * - search: phone number search
 * 
 * Returns message list with stats
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const status = url.searchParams.get('status');
    const userIdFilter = url.searchParams.get('userId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    let startDate = url.searchParams.get('startDate');
    let endDate = url.searchParams.get('endDate');

    // Calculate date range based on period
    const now = new Date();
    if (period !== 'custom') {
      endDate = now.toISOString();
      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();

    // Build filter - only outbound messages (sent by us)
    const filter: any = {
      direction: 'outbound',
    };

    // Date filter using createdAt (more reliable) or sentAt
    if (startDate || endDate) {
      filter.$or = [
        {
          sentAt: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          }
        },
        {
          createdAt: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          }
        }
      ];
    }

    // Status filter - handle combined statuses
    if (status) {
      if (status === 'wrong_number') {
        filter.status = 'failed';
        filter.failureReason = { $regex: /invalid|wrong|number|not.*registered|whatsapp/i };
      } else if (status === 'pending') {
        // Include both 'pending' and 'queued' as pending
        filter.status = { $in: ['pending', 'queued', 'sending'] };
      } else {
        filter.status = status;
      }
    }

    // Search by phone number
    if (search) {
      filter.phoneNumber = { $regex: search.replace(/[^0-9]/g, ''), $options: 'i' };
    }

    // User filter (if not super admin, can only see their own)
    if (!superAdmin) {
      filter.sentByUserId = viewerUserId;
    } else if (userIdFilter) {
      filter.sentByUserId = userIdFilter;
    }

    // Get total count
    const total = await WhatsAppMessage.countDocuments(filter);

    // Get messages with pagination
    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get lead info for each message
    const leadIds = [...new Set(messages.map((m: any) => m.leadId).filter(Boolean))];
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('name phoneNumber assignedToUserId leadNumber')
      .lean();
    const leadMap = new Map(leads.map((l: any) => [String(l._id), l]));

    // Format response - normalize status for display
    const normalizeStatus = (s: string) => {
      if (['pending', 'queued', 'sending'].includes(s)) return 'pending';
      return s;
    };

    const formattedMessages = messages.map((msg: any) => {
      const lead = msg.leadId ? leadMap.get(String(msg.leadId)) as any : null;
      return {
        _id: msg._id,
        phoneNumber: msg.phoneNumber,
        messageContent: msg.messageContent,
        status: normalizeStatus(msg.status || 'pending'),
        sentAt: msg.sentAt || msg.createdAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt,
        failureReason: msg.failureReason,
        waMessageId: msg.waMessageId,
        templateId: msg.templateId,
        messageType: msg.messageType,
        provider: msg.provider,
        sentByUserId: msg.sentByUserId || msg.sentByLabel,
        lead: lead ? {
          _id: lead._id,
          name: lead.name,
          leadNumber: lead.leadNumber,
          assignedToUserId: lead.assignedToUserId,
        } : null,
      };
    });

    // Stats filter - base filter for stats calculation (without status filter)
    const statsBaseFilter: any = {
      direction: 'outbound',
    };
    if (startDate || endDate) {
      statsBaseFilter.$or = [
        {
          sentAt: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          }
        },
        {
          createdAt: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) }),
          }
        }
      ];
    }
    if (!superAdmin) {
      statsBaseFilter.sentByUserId = viewerUserId;
    } else if (userIdFilter) {
      statsBaseFilter.sentByUserId = userIdFilter;
    }
    if (search) {
      statsBaseFilter.phoneNumber = { $regex: search.replace(/[^0-9]/g, ''), $options: 'i' };
    }

    // Get stats for the period (all statuses)
    const [statusStats, dailyStats] = await Promise.all([
      WhatsAppMessage.aggregate([
        { $match: statsBaseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      WhatsAppMessage.aggregate([
        { $match: statsBaseFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$sentAt', '$createdAt'] } } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

    // Combine pending, queued, sending into 'pending'
    const pendingCount = statusStats
      .filter((s: any) => ['pending', 'queued', 'sending'].includes(s._id))
      .reduce((sum: number, s: any) => sum + (s.count || 0), 0);

    const stats = {
      total: statusStats.reduce((sum: number, s: any) => sum + (s.count || 0), 0),
      pending: pendingCount,
      sent: statusStats.find((s: any) => s._id === 'sent')?.count || 0,
      delivered: statusStats.find((s: any) => s._id === 'delivered')?.count || 0,
      read: statusStats.find((s: any) => s._id === 'read')?.count || 0,
      failed: statusStats.find((s: any) => s._id === 'failed')?.count || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages,
        stats,
        dailyTrend: dailyStats.map((d: any) => ({ date: d._id, count: d.count })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[broadcast-messages] GET Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Resend messages
 * Body: { action: 'resend', messageIds: string[] }
 * 
 * This will attempt to resend failed/pending messages via WhatsApp API
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, messageIds } = body;

    if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'action and messageIds required' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    if (action === 'resend') {
      // Get messages to resend
      const messagesToResend = await WhatsAppMessage.find({
        _id: { $in: messageIds },
        status: { $in: ['failed', 'pending', 'queued'] },
      }).lean();

      if (messagesToResend.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No eligible messages to resend (must be failed or pending)',
          resent: 0,
          failed: 0,
        });
      }

      // Import send functions
      const { sendWhatsAppText, sendWhatsAppMedia, sendWhatsAppTemplate } = await import('@/lib/whatsapp');

      let resent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each message
      for (const msg of messagesToResend as any[]) {
        try {
          let result: any;

          // Determine message type and resend accordingly
          if (msg.messageType === 'template' && msg.templateId) {
            // Template message - need to reconstruct
            result = await sendWhatsAppTemplate({
              to: msg.phoneNumber,
              templateName: msg.metadata?.templateName || '',
              bodyParams: msg.templateVariables || [],
              language: msg.metadata?.language || 'en',
            });
          } else if (msg.messageType === 'media' && msg.media?.url) {
            // Media message
            result = await sendWhatsAppMedia(
              msg.phoneNumber,
              msg.media.url,
              msg.media.kind || 'image',
              msg.messageContent || ''
            );
          } else if (msg.messageContent) {
            // Text message
            result = await sendWhatsAppText(msg.phoneNumber, msg.messageContent);
          } else {
            throw new Error('Unable to determine message type for resend');
          }

          // Update message with new status and waMessageId
          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: result?.success ? 'sent' : 'failed',
                waMessageId: result?.messageId || msg.waMessageId,
                sentAt: new Date(),
                failureReason: result?.success ? null : (result?.error || 'Resend failed'),
              },
              $inc: { retryCount: 1 },
            }
          );

          if (result?.success) {
            resent++;
          } else {
            failed++;
            errors.push(`${msg.phoneNumber}: ${result?.error || 'Unknown error'}`);
          }
        } catch (err) {
          failed++;
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${msg.phoneNumber}: ${errMsg}`);

          // Mark as failed
          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'failed',
                failureReason: errMsg,
              },
              $inc: { retryCount: 1 },
            }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: `Resend complete: ${resent} sent, ${failed} failed`,
        resent,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors in response
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[broadcast-messages] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Delete messages
 * Body: { messageIds: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.messageIds) || body.messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds required' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const result = await WhatsAppMessage.deleteMany({
      _id: { $in: body.messageIds },
    });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} messages deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[broadcast-messages] DELETE Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
