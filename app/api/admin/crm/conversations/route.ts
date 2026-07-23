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
  META_WHATSAPP_OWNER_IDS,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';

export const revalidate = 0;

function escapeRegexLiteral(input: string): string {
  // Escape any characters that have special meaning in regex so user queries
  // can't crash the API with an invalid pattern (e.g. "(" or "[a-").
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strips +, spaces, -, (, ) from a phone number field/expression. */
function stripPhoneSymbolsExpr(fieldExpr: unknown) {
  return {
    $replaceAll: {
      input: {
        $replaceAll: {
          input: {
            $replaceAll: {
              input: {
                $replaceAll: {
                  input: { $replaceAll: { input: fieldExpr, find: '+', replacement: '' } },
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
  };
}

/**
 * Canonicalizes a phone number for GROUPING/matching purposes: strips
 * formatting symbols, then prepends '91' if what's left is exactly 10 digits
 * (a bare Indian number with no country code) so it lines up with the same
 * number stored elsewhere WITH the country code. Two message documents for
 * the same real contact can end up with differently-formatted phoneNumber
 * strings over time (with/without '+', with/without '91') — grouping on the
 * raw field (as this pipeline used to) produces two separate conversation
 * rows for what is really one contact.
 */
function canonicalPhoneExpr(fieldExpr: unknown) {
  const stripped = stripPhoneSymbolsExpr(fieldExpr);
  return {
    $let: {
      vars: { s: stripped },
      in: {
        $cond: [
          { $eq: [{ $strLenCP: '$$s' }, 10] },
          { $concat: ['91', '$$s'] },
          '$$s',
        ],
      },
    },
  };
}

/**
 * Conversations API
 * Returns one row per leadId with last message + unread count.
 * 
 * Access Control:
 * - The Meta WhatsApp Cloud API channel is a single shared WABA owned by the
 *   platform (META_WHATSAPP_OWNER_IDS / super admin). Tenants who don't own
 *   it see no Meta conversations.
 * - Super admin (channel owner): sees ALL Meta conversations, but any joined
 *   `lead` belonging to another tenant is hidden (shown as unmatched contact).
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

    // The Meta WhatsApp Cloud API channel is a single shared WABA owned by the
    // platform (META_WHATSAPP_OWNER_IDS). Tenants who don't own this channel
    // have no Meta conversations of their own.
    if (providerParam !== 'all' && !superAdmin) {
      return formatCrmSuccess({ conversations: [], total: 0 }, buildMetadata(0, limit, skip));
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const pipeline: any[] = [];

    // Provider filtering — STRICT SEPARATION:
    // - provider=meta (or default): Meta Cloud API messages ONLY
    // - provider=qr: QR bridge messages ONLY (no overlap with Meta)
    // - provider=all: everything (admin analytics)
    if (providerParam === 'all') {
      if (!superAdmin) {
        // Non-owner tenants don't have a Meta channel — exclude it from "all".
        pipeline.push({ $match: { provider: { $ne: 'meta' } } });
      }
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
        // Computed BEFORE grouping (not after) — grouping on the raw
        // phoneNumber field let differently-formatted strings for the same
        // real number (with/without '+', with/without country code) produce
        // two separate conversation rows for one contact.
        _canonicalPhone: canonicalPhoneExpr('$phoneNumber'),
      },
    });

    // Sort by most recent activity first
    pipeline.push({ $sort: { _messageTime: -1 } });

    // Group by the CANONICAL phone number so formatting drift in how
    // phoneNumber was stored over time can't split one real conversation
    // into multiple rows.
    pipeline.push({
      $group: {
        _id: '$_canonicalPhone',
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

    // Join lead for name/labels/status using canonical phone number comparison.
    // `_id` from the $group above is already the canonical phone (see
    // canonicalPhoneExpr) — canonicalize the lead's phone the same way and
    // compare directly instead of the old asymmetric 10-digit/91-prefix
    // special-casing (equivalent, but simpler and consistent with grouping).
    pipeline.push({
      $lookup: {
        from: 'leads',
        let: { msgPhone: '$_id' },
        pipeline: [
          {
            $addFields: {
              _leadCanonicalPhone: canonicalPhoneExpr({ $ifNull: ['$phoneNumber', ''] }),
            },
          },
          {
            $match: {
              $expr: { $eq: ['$_leadCanonicalPhone', '$$msgPhone'] },
            },
          },
          // If multiple lead records share this phone number (duplicate
          // leads, or separate tenants' leads colliding on the same number),
          // pick exactly ONE so this conversation isn't duplicated by the
          // $unwind below. Prefer a lead owned by the Meta WABA owner (super
          // admin's own record), then fall back to the most recently created.
          {
            $addFields: {
              _ownerRank: {
                $cond: [{ $in: ['$createdByUserId', META_WHATSAPP_OWNER_IDS] }, 0, 1],
              },
            },
          },
          { $sort: { _ownerRank: 1, createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'lead',
      },
    });
    pipeline.push({ $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } });

    // Meta-channel tenant isolation: the joined `lead` may belong to a
    // different tenant than the Meta WABA owner (phone numbers can collide
    // across independent tenants' lead lists). For the owner's own Meta
    // inbox, hide any joined lead that doesn't belong to the owner — the
    // conversation itself still shows (it happened on the owner's WABA), but
    // as an unmatched/unknown contact rather than leaking another tenant's
    // lead record.
    if (superAdmin) {
      pipeline.push({
        $addFields: {
          lead: {
            $cond: [
              {
                $or: [
                  { $ne: ['$provider', 'meta'] },
                  { $eq: ['$lead', null] },
                  { $in: ['$lead.createdByUserId', [...META_WHATSAPP_OWNER_IDS, null]] },
                  { $in: ['$lead.assignedToUserId', [...META_WHATSAPP_OWNER_IDS, null]] },
                ],
              },
              '$lead',
              null,
            ],
          },
        },
      });
    }

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
