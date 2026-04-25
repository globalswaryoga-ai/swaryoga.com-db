import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter } from '@/lib/crm-handlers';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export const revalidate = 0;

/**
 * Export broadcast messages as CSV
 * 
 * Query params same as main route:
 * - period, startDate, endDate, status, search
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length) 
                || request.nextUrl.searchParams.get('token'); // Support token in query for direct download
    const decoded = verifyToken(token || undefined);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded);

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    let startDate = url.searchParams.get('startDate');
    let endDate = url.searchParams.get('endDate');

    // Calculate date range
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

    // Build filter - outbound messages only
    const filter: any = {
      direction: 'outbound',
      ...tf,
    };

    // Date filter
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

    // Status filter
    if (status) {
      if (status === 'wrong_number') {
        filter.status = 'failed';
        filter.failureReason = { $regex: /invalid|wrong|number|not.*registered|whatsapp/i };
      } else if (status === 'pending') {
        filter.status = { $in: ['pending', 'queued', 'sending'] };
      } else {
        filter.status = status;
      }
    }

    // Search
    if (search) {
      filter.phoneNumber = { $regex: search.replace(/[^0-9]/g, ''), $options: 'i' };
    }

    // Limit export to 5000 records
    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(5000)
      .lean();

    // Get lead info
    const leadIds = [...new Set(messages.map((m: any) => m.leadId).filter(Boolean))];
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('name phoneNumber assignedToUserId leadNumber')
      .lean();
    const leadMap = new Map(leads.map((l: any) => [String(l._id), l]));

    // Normalize status
    const normalizeStatus = (s: string) => {
      if (['pending', 'queued', 'sending'].includes(s)) return 'pending';
      return s;
    };

    // Generate CSV
    const headers = [
      'Phone Number',
      'Lead Name',
      'Lead ID',
      'Message',
      'Status',
      'Sent At',
      'Delivered At',
      'Read At',
      'Failure Reason',
      'Message ID',
      'Assigned To',
    ];

    const rows = messages.map((msg: any) => {
      const lead = msg.leadId ? leadMap.get(String(msg.leadId)) as any : null;
      return [
        msg.phoneNumber || '',
        lead?.name || '',
        lead?.leadNumber || '',
        (msg.messageContent || '').replace(/"/g, '""').replace(/\n/g, ' '),
        normalizeStatus(msg.status || 'pending'),
        msg.sentAt ? new Date(msg.sentAt).toISOString() : (msg.createdAt ? new Date(msg.createdAt).toISOString() : ''),
        msg.deliveredAt ? new Date(msg.deliveredAt).toISOString() : '',
        msg.readAt ? new Date(msg.readAt).toISOString() : '',
        (msg.failureReason || '').replace(/"/g, '""'),
        msg.waMessageId || '',
        lead?.assignedToUserId || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const filename = `broadcast_messages_${period}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[broadcast-messages/export] Error:', error);
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
