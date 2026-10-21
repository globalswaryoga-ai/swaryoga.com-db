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
    let viewerUserId: string;
    let superAdmin = false;
    let limit = 500, skip = 0;
    try {
      viewerUserId = verifyAdminAccess(request);
      const token = request.headers.get('authorization')?.slice('Bearer '.length);
      const decoded = verifyToken(token);
      superAdmin = isSuperAdmin(decoded, request);
      const pag = parsePagination(request);
      limit = pag.limit;
      skip = pag.skip;
    } catch(e) {
      return handleCrmError(e, 'GET /conversations');
    }

    const url = new URL(request.url);

    const providerParam = url.searchParams.get('provider')?.trim();

    if (providerParam === 'qr') {
      return formatCrmSuccess({ conversations: [], total: 0, note: 'Use dedicated QR WhatsApp APIs for QR conversations.' }, buildMetadata(0, limit, skip));
    }

    const { getBunnyWhatsAppAccount } = await import('@/lib/bunnyWhatsAppAccounts');
    let tenantAccount: any = null;
    if (!superAdmin) {
      tenantAccount = await getBunnyWhatsAppAccount(viewerUserId);
      if (!tenantAccount || !tenantAccount.hasAccessToken) {
        return formatCrmSuccess({
          conversations: [],
          total: 0,
          needsSetup: true,
          webhookUrl: 'https://crm.swaryoga.com/api/whatsapp/webhook',
          metaPhoneNumber: '',
        }, buildMetadata(0, limit, skip));
      }
    }

    const q = url.searchParams.get('q')?.trim().toLowerCase();

    // Fast indexed Bunny SQL conversations query (under 1 second)
    const allRows = await listBunnyMetaConversations(Math.min(limit + skip, 300));
    let bunnyRows = allRows;

    // Tenant isolation: if not superAdmin, filter conversations visible to viewer
    if (!superAdmin) {
      bunnyRows = bunnyRows.filter((row: any) => {
        const assigned = String(row.assignedToUserId || '');
        return !assigned || assigned === viewerUserId;
      });
    }

    // Only when user actually types a search query 'q', search leads table for extra matches
    if (q) {
      // 1. Filter existing conversations
      bunnyRows = bunnyRows.filter((row: any) => {
        const name = String(row.leadName || row.name || '').toLowerCase();
        const phone = String(row.phoneNumber || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      });

      // 2. Search leads specifically matching query term
      try {
        const matchingLeadsRes = await bunnyExecute({
          sql: `SELECT document_id, data_json, created_at FROM leads_sql 
                WHERE json_extract(data_json, '$.name') LIKE ? 
                   OR json_extract(data_json, '$.phoneNumber') LIKE ?
                LIMIT 20`,
          args: [`%${q}%`, `%${q}%`]
        });

        const existingLeadIds = new Set(bunnyRows.map((r: any) => String(r.leadId)));
        const existingPhones = new Set(bunnyRows.map((r: any) => String(r.phoneNumber || '').replace(/\D/g, '').slice(-10)).filter(Boolean));

        for (const row of matchingLeadsRes.rows) {
          const lead = JSON.parse(String(row.data_json || '{}'));
          const leadId = String(row.document_id);
          const rawPhone = lead.phoneNumber || lead['WhatsApp Number'] || lead.phone || '';
          const phoneNormal = String(rawPhone).replace(/\D/g, '').slice(-10);

          if (!existingLeadIds.has(leadId) && (!phoneNormal || !existingPhones.has(phoneNormal))) {
            bunnyRows.push({
              _id: `mock_${leadId}`,
              leadId: leadId,
              leadName: lead.name || lead.displayName || rawPhone || 'Unknown Lead',
              phoneNumber: rawPhone,
              provider: 'meta',
              unreadCount: 0,
              lastMessageAt: row.created_at || new Date().toISOString(),
              lastMessagePreview: 'Found in CRM Leads',
              isMock: true,
            });
            existingLeadIds.add(leadId);
            if (phoneNormal) existingPhones.add(phoneNormal);
          }
        }
      } catch (searchErr) {
        console.warn('Leads search fallback error:', searchErr);
      }

      // Sort by lastMessageAt descending
      bunnyRows.sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
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
