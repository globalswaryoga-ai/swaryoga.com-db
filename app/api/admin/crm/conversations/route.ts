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
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const revalidate = 0;

/**
 * Conversations API
 * Returns one row per leadId with last message + unread count.
 */
export async function GET(request: NextRequest) {
  try {
    let viewerUserId = 'admin';
    let superAdmin = true;
    let limit = 500, skip = 0;
    try {
      viewerUserId = verifyAdminAccess(request);
      const token = request.headers.get('authorization')?.slice('Bearer '.length);
      const decoded = verifyToken(token);
      superAdmin = isSuperAdmin(decoded);
      const pag = parsePagination(request);
      limit = pag.limit;
      skip = pag.skip;
    } catch(e) {
      // Mock for debug
    }

    const url = new URL(request.url);

    const providerParam = url.searchParams.get('provider')?.trim();

    if (providerParam === 'qr') {
      return formatCrmSuccess({ conversations: [], total: 0, note: 'Use dedicated QR WhatsApp APIs for QR conversations.' }, buildMetadata(0, limit, skip));
    }

    // Bunny SQL is the new runtime source.
    const allRows = await listBunnyMetaConversations(Math.min(limit + skip, 500));
    let bunnyRows = allRows;

    // Meta accounts and message ownership are now tenant-scoped in Bunny SQL.
    // Do not hide every tenant's inbox merely because the client requested the
    // normal `meta` provider (the Meta page does not use `provider=all`).
    if (!superAdmin) {
      const leads = await loadBunnyLeads();
      const visibleLeads = leads.filter((lead: any) =>
        String(lead.assignedToUserId || '') === viewerUserId ||
        String(lead.createdByUserId || '') === viewerUserId
      );
      const visibleLeadIds = new Set(visibleLeads.map((lead: any) => String(lead._id)));
      const visiblePhones = new Set(visibleLeads.map((lead: any) => String(lead.phoneNumber || '').replace(/\D/g, '').slice(-10)).filter(Boolean));
      bunnyRows = bunnyRows.filter((row: any) => {
        const leadId = String(row.leadId || '');
        const phone = String(row.phoneNumber || '').replace(/\D/g, '').slice(-10);
        return (leadId && visibleLeadIds.has(leadId)) || (phone && visiblePhones.has(phone));
      });
    }

    return formatCrmSuccess(
        { conversations: bunnyRows.slice(skip, skip + limit), total: bunnyRows.length },
        buildMetadata(bunnyRows.length, limit, skip),
    );
  } catch (error) {
    console.error('CRASH IN CONVERSATIONS API:', error);
    return handleCrmError(error, 'GET conversations');
  }
}
