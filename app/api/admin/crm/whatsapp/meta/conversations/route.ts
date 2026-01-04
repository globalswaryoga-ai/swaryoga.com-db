import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WhatsAppMessage, Lead } from '@/lib/schemas/enterpriseSchemas';

function isMetaDisabled(): boolean {
  return [
    process.env.WHATSAPP_DISABLE_META_UI,
    process.env.WHATSAPP_DISABLE_META_SEND,
    process.env.WHATSAPP_DISABLE_CLOUD_SEND,
    process.env.WHATSAPP_FORCE_WEB_BRIDGE,
    process.env.WHATSAPP_DISABLE_CLOUD,
  ].some((v) => String(v || '').toLowerCase() === 'true');
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/whatsapp/meta/conversations
 * Fetch all conversations from WhatsApp messages grouped by leadId
 * Returns lead details + last message for Meta inbox view
 */
export async function GET(request: NextRequest) {
  try {
    if (isMetaDisabled()) {
      return NextResponse.json(
        { error: 'Meta WhatsApp is disabled on this server' },
        { status: 403 }
      );
    }

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get conversations grouped by leadId with lead details
    const conversations = await WhatsAppMessage.aggregate([
      // Sort by most recent first
      {
        $sort: { sentAt: -1 },
      },
      // Group by leadId to get one conversation per lead
      {
        $group: {
          _id: '$leadId',
          lastMessage: { $first: '$messageContent' },
          lastMessageTime: { $first: '$sentAt' },
          lastDirection: { $first: '$direction' },
          lastStatus: { $first: '$status' },
          phoneNumber: { $first: '$phoneNumber' },
        },
      },
      // Join with Lead collection to get name, status, labels
      {
        $lookup: {
          from: 'leads',
          localField: '_id',
          foreignField: '_id',
          as: 'lead',
        },
      },
      {
        $unwind: {
          path: '$lead',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Sort by last message time (newest first)
      {
        $sort: { lastMessageTime: -1 },
      },
      // Limit to 100 conversations
      {
        $limit: 100,
      },
      // Project final shape
      {
        $project: {
          _id: 1,
          phoneNumber: 1,
          leadId: '$_id',
          name: { $ifNull: ['$lead.name', ''] },
          email: { $ifNull: ['$lead.email', ''] },
          status: { $ifNull: ['$lead.status', 'lead'] },
          labels: { $ifNull: ['$lead.labels', []] },
          lastMessage: 1,
          lastMessageTime: 1,
          lastDirection: 1,
          lastStatus: 1,
        },
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: conversations,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Meta Conversations] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch conversations' }, { status: 500 });
  }
}
