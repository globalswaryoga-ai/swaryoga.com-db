import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { 
  verifyAdminAccess, 
  handleCrmError, 
  formatCrmSuccess, 
  isSuperAdmin,
  getViewerUserId
} from '@/lib/crm-handlers';

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
      return NextResponse.json({ error: 'Meta functionality is disabled' }, { status: 404 });
    }

    const userId = verifyAdminAccess(request);
    await connectDB();

    // Get conversations grouped by phoneNumber with lead details
    const pipeline: any[] = [
      // Filter for Meta messages (optional but recommended for this API)
      { 
        $match: { 
          provider: { $ne: 'whatsapp_web_bridge' } 
        } 
      },
      // Sort by most recent first
      { $sort: { sentAt: -1 } },
      // Group by phoneNumber to get one conversation per phone
      {
        $group: {
          _id: '$phoneNumber',
          leadId: { $first: '$leadId' },
          lastMessage: { $first: '$messageContent' },
          lastMessageTime: { $first: '$sentAt' },
          lastDirection: { $first: '$direction' },
          lastStatus: { $first: '$status' },
          phoneNumber: { $first: '$phoneNumber' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$direction', 'inbound'] }, 
                    { $ne: ['$status', 'read'] },
                    { $ne: ['$isRead', true] }
                  ] 
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // Join with Lead collection to get name, status, labels
      {
        $lookup: {
          from: 'leads',
          let: { leadId: '$leadId', phone: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$leadId'] },
                    { $eq: ['$phoneNumber', '$$phone'] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'lead',
        },
      },
      {
        $unwind: {
          path: '$lead',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Access control:
    const decoded = { userId }; // Rough mock for isSuperAdmin check if needed, or just use the logic
    const superAdmin = userId === 'admincrm';
    if (!superAdmin) {
      pipeline.push({ $match: { 'lead.assignedToUserId': userId } });
    }

    pipeline.push(
      // Sort by last message time (newest first)
      { $sort: { lastMessageTime: -1 } },
      // Limit to 100 conversations
      { $limit: 100 },
      // Project final shape
      {
        $project: {
          _id: 1, // This is the phoneNumber
          phoneNumber: '$_id',
          leadId: '$leadId',
          name: { $ifNull: ['$lead.name', ''] },
          lastMessage: 1,
          lastMessageTime: 1,
          lastDirection: 1,
          lastStatus: 1,
          unreadCount: 1,
          status: { $ifNull: ['$lead.status', ''] },
          labels: { $ifNull: ['$lead.labels', []] },
        },
      }
    );

    const conversations = await WhatsAppMessage.aggregate(pipeline);
    return formatCrmSuccess(conversations);
  } catch (error) {
    return handleCrmError(error, 'GET meta conversations');
  }
}
