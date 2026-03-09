import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
} from '@/lib/crm-handlers';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';

// Required: This route uses request.headers which cannot be statically rendered
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/messages/unread-count
 * Returns unread message count for admin dashboard notification badge
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead(); // Ensure Lead is registered for population

    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm';

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
      // First, find leads that belong to this user (assigned or created)
      const userLeadIds = await Lead.find(
        { $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }] },
        { _id: 1 }
      ).lean();

      if (userLeadIds.length > 0) {
        // Only count messages for this user's leads — no cross-user leakage
        unreadCount = await WhatsAppMessage.countDocuments({
          ...filter,
          leadId: { $in: userLeadIds.map((l: any) => l._id) },
        });
      }
      // If user has no leads, unreadCount stays 0
    }

    return formatCrmSuccess(
      { unreadCount },
      { totalItems: unreadCount }
    );
  } catch (error) {
    return handleCrmError(error, 'GET unread message count');
  }
}
