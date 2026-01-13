import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
} from '@/lib/crm-handlers';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

// Required: This route uses request.headers which cannot be statically rendered
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/messages/unread-count
 * Returns unread message count for admin dashboard notification badge
 */
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm';

    await connectDB();

    // Query unread inbound messages
    // For super admin: all unread inbound messages
    // For other admins: only messages for leads assigned to them
    const filter: any = {
      direction: 'inbound',
      isRead: { $ne: true }, // Not explicitly marked as read
    };

    let unreadCount = 0;

    if (superAdmin) {
      unreadCount = await WhatsAppMessage.countDocuments(filter);
    } else {
      // Only count messages whose lead is assigned to this admin
      const unreadMessages = await WhatsAppMessage.find(filter)
        .populate('leadId', 'assignedToUserId')
        .lean();

      unreadCount = unreadMessages.filter(
        (m: any) => String(m?.leadId?.assignedToUserId || '') === viewerUserId
      ).length;
    }

    return formatCrmSuccess(
      { unreadCount },
      { totalItems: unreadCount }
    );
  } catch (error) {
    return handleCrmError(error, 'GET unread message count');
  }
}
