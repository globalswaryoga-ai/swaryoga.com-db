import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isSuperAdmin,
  getVisibleUserIds,
} from '@/lib/crm-handlers';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';

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
 * 
 * Access Control (3-tier):
 * - Super admin: can see ALL conversations
 * - Manager (MR Admin): can see conversations for leads assigned to them OR their team
 * - Regular admin: can only see conversations for leads assigned to them
 */
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = verifyAdminAccess(request);
    // Get token to check permissions properly
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    const superAdmin = isSuperAdmin(decoded);
    const visibleUserIds = getVisibleUserIds(decoded);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const label = url.searchParams.get('label')?.trim();
    const providerParam = url.searchParams.get('provider')?.trim();

    if (providerParam === 'qr') {
      return formatCrmSuccess({ conversations: [], total: 0, note: 'Use dedicated QR WhatsApp APIs for QR conversations.' }, buildMetadata(0, limit, skip));
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const pipeline: any[] = [];

    // Provider filtering — STRICT SEPARATION:
    // - provider=meta (or default): Meta Cloud API messages ONLY
    // - provider=qr: QR bridge messages ONLY (no overlap with Meta)
    // - provider=all: everything (admin analytics)
    if (providerParam === 'all') {
      // No filter – include everything (for diagnostics/analytics)
    } else {
      // Default & 'meta': strictly Meta Cloud API messages only
      pipeline.push({ $match: { provider: 'meta' } });
    }

    // Normalize the timestamp used for ordering.
    // We prefer updatedAt for the conversation list sorting because it reflects the 
    // "most recent activity" (status updates, new meta signals), even if the 
    // original message timestamp (sentAt) is stale or identical.
    pipeline.push({
      $addFields: {
        _messageTime: {
          $ifNull: [
            '$updatedAt',
            {
              $ifNull: [
                '$sentAt',
                {
                  $ifNull: ['$createdAt', new Date(0)],
                },
              ],
            },
          ],
        },
      },
    });

    // Sort by most recent activity first
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
        // Track the most recent INBOUND message time for 24h window status.
        // Use sentAt (actual WhatsApp timestamp) instead of _messageTime
        // (which prefers updatedAt and gets refreshed by read receipts / status changes).
        lastInboundAt: {
          $max: {
            $cond: [
              { $eq: ['$direction', 'inbound'] },
              { $ifNull: ['$sentAt', { $ifNull: ['$createdAt', null] }] },
              null,
            ],
          },
        },
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

    // Normalize message phone number for matching (remove + and non-digits)
    pipeline.push({
      $addFields: {
        _normalizedPhone: {
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
      },
    });

    // Join lead for name/labels/status using normalized phone number comparison
    pipeline.push({
      $lookup: {
        from: 'leads',
        let: { msgPhone: '$_normalizedPhone' },
        pipeline: [
          {
            $addFields: {
              _leadNormalizedPhone: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: {
                        $replaceAll: {
                          input: {
                            $replaceAll: {
                              input: {
                                $replaceAll: {
                                  input: { $ifNull: ['$phoneNumber', ''] },
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
            },
          },
          {
            $match: {
              $expr: {
                $or: [
                  // Exact match after normalization
                  { $eq: ['$_leadNormalizedPhone', '$$msgPhone'] },
                  // Match if lead phone is 10 digits (no country code) and message has 91 prefix
                  {
                    $and: [
                      { $eq: [{ $strLenCP: '$_leadNormalizedPhone' }, 10] },
                      { $eq: [{ $substrCP: ['$$msgPhone', 0, 2] }, '91'] },
                      { $eq: [{ $substrCP: ['$$msgPhone', 2, 10] }, '$_leadNormalizedPhone'] },
                    ],
                  },
                  // Match if message phone is 10 digits and lead has 91 prefix
                  {
                    $and: [
                      { $eq: [{ $strLenCP: '$$msgPhone' }, 10] },
                      { $eq: [{ $substrCP: ['$_leadNormalizedPhone', 0, 2] }, '91'] },
                      { $eq: [{ $substrCP: ['$_leadNormalizedPhone', 2, 10] }, '$$msgPhone'] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'lead',
      },
    });
    pipeline.push({ $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } });

    // Access control (3-tier):
    // - Super admin: can see all conversations (both Meta and QR)
    // - Manager (MR Admin): can see conversations for leads assigned to them OR their team
    // - Regular admin: can ONLY see conversations for leads assigned to them OR created by them
    // IMPORTANT: Unassigned leads are NOT visible to everyone - only to the creator
    if (visibleUserIds !== null) {
      // Not super admin - apply strict user filter
      if (visibleUserIds.length === 1) {
        // Regular admin: only their own leads (assigned to them OR created by them)
        pipeline.push({
          $match: {
            $or: [
              { 'lead.assignedToUserId': visibleUserIds[0] },
              { 'lead.createdByUserId': visibleUserIds[0] },
            ]
          },
        });
      } else {
        // Manager: can see their team's leads (assigned OR created by team members)
        pipeline.push({
          $match: {
            $or: [
              { 'lead.assignedToUserId': { $in: visibleUserIds } },
              { 'lead.createdByUserId': { $in: visibleUserIds } },
            ]
          },
        });
      }
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
        // Return actual lead name - simple: just use lead.name (or displayName if available)
        name: {
          $cond: {
            if: { $ifNull: ['$lead._id', false] },
            then: {
              $ifNull: [
                { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$lead.displayName', ''] } }, 0] }, '$lead.displayName', null] },
                { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$lead.name', ''] } }, 0] }, '$lead.name', null] }
              ]
            },
            else: null
          }
        },
        // Flag to indicate if lead exists in database
        hasLead: { 
          $cond: [
            { $ifNull: ['$lead._id', false] }, 
            true, 
            false
          ] 
        },
        status: '$lead.status',
        labels: '$lead.labels',
        assignedToUserId: '$lead.assignedToUserId',
        source: { $ifNull: ['$lead.source', 'whatsapp'] },
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
        lastInboundAt: 1,
        chatStatus: '$lead.chatStatus',
        isBlocked: { $ifNull: ['$lead.isBlocked', false] },
        blockedReason: '$lead.blockedReason',
        lastStatus: 1,
        unreadCount: 1,
      },
    });

    // Sort: unread chats first, then by most recent activity
    // This ensures users with unread messages always appear at the top
    pipeline.push({ $sort: { unreadCount: -1, lastMessageAt: -1 } });

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
