import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
} from '@/lib/crm-handlers';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

/**
 * Conversations API
 * Returns one row per leadId with last message + unread count.
 */
export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const label = url.searchParams.get('label')?.trim();

    await connectDB();

    const pipeline: any[] = [];

    // Pre-sort to allow $first in group
    pipeline.push({ $sort: { sentAt: -1 } });

    pipeline.push({
      $group: {
        _id: '$leadId',
        lastMessageAt: { $first: '$sentAt' },
        lastMessageContent: { $first: '$messageContent' },
        lastDirection: { $first: '$direction' },
        lastStatus: { $first: '$status' },
        phoneNumber: { $first: '$phoneNumber' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$direction', 'inbound'] }, { $ne: ['$status', 'read'] }] },
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
        localField: '_id',
        foreignField: '_id',
        as: 'lead',
      },
    });
    pipeline.push({ $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } });

    const postMatch: any = {};
    if (status) postMatch['lead.status'] = status;
    if (label) postMatch['lead.labels'] = label;
    if (q) {
      postMatch.$or = [
        { 'lead.name': { $regex: q, $options: 'i' } },
        { phoneNumber: { $regex: q, $options: 'i' } },
      ];
    }
    if (Object.keys(postMatch).length > 0) pipeline.push({ $match: postMatch });

    // Projection
    pipeline.push({
      $project: {
        _id: 0,
        leadId: '$_id',
        leadNumber: '$lead.leadNumber',
        name: '$lead.name',
        status: '$lead.status',
        labels: '$lead.labels',
        assignedToUserId: '$lead.assignedToUserId',
        phoneNumber: 1,
        lastMessageAt: 1,
        lastMessageContent: 1,
        lastDirection: 1,
        lastStatus: 1,
        unreadCount: 1,
      },
    });

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
