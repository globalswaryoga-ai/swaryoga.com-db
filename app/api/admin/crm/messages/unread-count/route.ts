import { NextRequest } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// Required: This route uses request.headers which cannot be statically rendered

/**
 * GET /api/admin/crm/messages/unread-count
 * Returns unread message count for admin dashboard notification badge
 */
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = verifyAdminAccess(request);
    const superAdmin = viewerUserId === 'admincrm';

    let unreadCount = 0;

    if (superAdmin) {
      // Super admin: count all unread inbound messages
      const sql = `
        SELECT count(*) as count
        FROM mongo_documents
        WHERE collection_name = 'crm_whatsapp_messages'
          AND json_extract(document_json, '$.direction') = 'inbound'
          AND (json_extract(document_json, '$.isRead') IS NULL OR json_extract(document_json, '$.isRead') = 0 OR json_extract(document_json, '$.isRead') = 'false' OR json_extract(document_json, '$.isRead') = false)
      `;
      const result = await bunnyExecute(sql);
      unreadCount = Number(result.rows[0]?.count || 0);
    } else {
      // Other admins: count messages for leads assigned to or created by them
      const sql = `
        SELECT count(*) as count
        FROM mongo_documents
        WHERE collection_name = 'crm_whatsapp_messages'
          AND json_extract(document_json, '$.direction') = 'inbound'
          AND (json_extract(document_json, '$.isRead') IS NULL OR json_extract(document_json, '$.isRead') = 0 OR json_extract(document_json, '$.isRead') = 'false' OR json_extract(document_json, '$.isRead') = false)
          AND json_extract(document_json, '$.leadId') IN (
            SELECT id FROM mongo_documents 
            WHERE collection_name = 'crm_leads'
              AND (json_extract(document_json, '$.assignedToUserId') = ? OR json_extract(document_json, '$.createdByUserId') = ?)
          )
      `;
      const result = await bunnyExecute({
        sql,
        args: [viewerUserId, viewerUserId],
      });
      unreadCount = Number(result.rows[0]?.count || 0);
    }

    return formatCrmSuccess(
      { unreadCount },
      { totalItems: unreadCount }
    );
  } catch (error) {
    return handleCrmError(error, 'GET unread message count');
  }
}
