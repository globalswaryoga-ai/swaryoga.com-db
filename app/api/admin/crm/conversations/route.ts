import { NextRequest } from 'next/server';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isSuperAdmin,
  getVisibleUserIds,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { listBunnyMetaConversations } from '@/lib/bunnyMetaWhatsAppRepository';

export const revalidate = 0;

/**
 * Conversations API
 * Returns one row per leadId with last message + unread count.
 */
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = verifyAdminAccess(request);
    // Get token to check permissions properly
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    const superAdmin = isSuperAdmin(decoded);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    const providerParam = url.searchParams.get('provider')?.trim();

    if (providerParam === 'qr') {
      return formatCrmSuccess({ conversations: [], total: 0, note: 'Use dedicated QR WhatsApp APIs for QR conversations.' }, buildMetadata(0, limit, skip));
    }

    // The Meta WhatsApp Cloud API channel is a single shared WABA owned by the
    // platform. Tenants who don't own this channel
    // have no Meta conversations of their own.
    if (providerParam !== 'all' && !superAdmin) {
      return formatCrmSuccess({ conversations: [], total: 0 }, buildMetadata(0, limit, skip));
    }

    // Bunny SQL is the new runtime source.
    const bunnyRows = await listBunnyMetaConversations(limit + skip);
    return formatCrmSuccess(
        { conversations: bunnyRows.slice(skip, skip + limit), total: bunnyRows.length },
        buildMetadata(bunnyRows.length, limit, skip),
    );
  } catch (error) {
    return handleCrmError(error, 'GET conversations');
  }
}
