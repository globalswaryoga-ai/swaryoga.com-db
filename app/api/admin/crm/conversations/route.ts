import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeRegexLiteral(input: string): string {
  // Escape any characters that have special meaning in regex so user queries
  // can't crash the API with an invalid pattern (e.g. "(" or "[a-").
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Conversations API
 * Returns one row per leadId with last message + unread count.
 */
export async function GET(request: NextRequest) {
  try {
    const WhatsAppMessage = getWhatsAppMessage();

    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm' || viewerUserId === 'admin';
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const label = url.searchParams.get('label')?.trim();

    await connectDB();

    const pipeline: any[] = [];

    // Include messages from known providers, or if they have no provider (to avoid missing data)
    pipeline.push({
      $match: {
        $or: [
          { provider: { $in: ['meta', 'whatsapp_web_bridge'] } },
          { provider: { $exists: false } },
          { provider: null },
          { provider: 'pending' },
        ],
      },
    });

    // Normalize the timestamp used for ordering.
    // Some older records may not have sentAt.
    pipeline.push({
      $addFields: {
        _messageTime: {
          $ifNull: [
            '$sentAt',
            {
              $ifNull: [
                '$createdAt',
                {
                  $ifNull: ['$updatedAt', new Date(0)],
                },
              ],
            },
          ],
        },
      },
    });

    // Pre-sort to allow $first in group
    pipeline.push({ $sort: { _messageTime: -1 } });

    // Group by phoneNumber first to avoid duplicate conversations when leadId is missing on older data.
    pipeline.push({
      $group: {
        _id: '$phoneNumber',
        leadId: { $first: '$leadId' },
        lastMessageAt: { $first: '$_messageTime' },
        lastMessageContent: { $first: '$messageContent' },
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
    });

    // Join lead for name/labels/status
    pipeline.push({
      $lookup: {
        from: 'leads',
        localField: 'phoneNumber',
        foreignField: 'phoneNumber',
        as: 'lead',
      },
    });
    pipeline.push({ $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } });

    // Access control:
    // - Super admin (admincrm) can see all conversations.
    // - Other admins can only see leads assigned to them.
    // - Unassigned leads are hidden from non-super-admin.
    if (!superAdmin) {
      // Show conversations that are either assigned to the viewer OR currently unassigned
      // (new inbound leads arrive unassigned by default).
      pipeline.push({
        $match: {
          $or: [
            { 'lead.assignedToUserId': viewerUserId },
            { 'lead.assignedToUserId': { $exists: false } },
            { 'lead.assignedToUserId': { $in: [null, ''] } },
          ],
        },
      });
    }

    const postMatch: any = {};
    if (status) postMatch['lead.status'] = status;
    if (label) postMatch['lead.labels'] = label;
    if (q) {
      const safe = escapeRegexLiteral(q);
      postMatch.$or = [
        { 'lead.name': { $regex: safe, $options: 'i' } },
        { phoneNumber: { $regex: safe, $options: 'i' } },
      ];
    }
    if (Object.keys(postMatch).length > 0) pipeline.push({ $match: postMatch });

    // Projection
    pipeline.push({
      $project: {
        _id: '$phoneNumber',
        leadId: '$lead._id',
        leadNumber: '$lead.leadNumber',
        name: {
          $ifNull: [
            {
              $cond: [
                { $and: [{ $ne: ['$lead.displayName', null] }, { $ne: ['$lead.displayName', ''] }] },
                '$lead.displayName',
                {
                  $cond: [
                    { $and: [{ $ne: ['$lead.title', null] }, { $ne: ['$lead.title', ''] }, { $ne: ['$lead.name', null] }, { $ne: ['$lead.name', ''] }] },
                    { $concat: ['$lead.title', '. ', '$lead.name'] },
                    {
                      $ifNull: ['$lead.name', '$phoneNumber']
                    }
                  ]
                }
              ]
            },
            '$phoneNumber'
          ]
        },
        status: '$lead.status',
        labels: '$lead.labels',
        assignedToUserId: '$lead.assignedToUserId',
        phoneNumber: 1,
        phoneNumberNormalized: {
          $replaceAll: {
            input: {
              $replaceAll: {
                input: {
                  $replaceAll: {
                    input: {
                      $replaceAll: {
                        input: {
                          $replaceAll: {
                            input: '$phoneNumber',
                            find: '+',
                            replacement: '',
                          },
                        },
                        find: ' ',
                        replacement: '',
                      },
                    },
                    find: '-',
                    replacement: '',
                  },
                },
                find: '(',
                replacement: '',
              },
            },
            find: ')',
            replacement: '',
          },
        },
        lastMessageAt: 1,
        lastMessageContent: 1,
        lastDirection: 1,
        lastStatus: 1,
        unreadCount: 1,
      },
    });

    // Sort by most recent activity
    pipeline.push({ $sort: { lastMessageAt: -1 } });

    // Count and pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

    const [rows, countRows] = await Promise.all([
      WhatsAppMessage.aggregate(dataPipeline),
      WhatsAppMessage.aggregate(countPipeline),
    ]);

    const total = Array.isArray(countRows) && countRows[0]?.total ? Number(countRows[0].total) : 0;
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ conversations: rows, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET conversations');
  }
}
