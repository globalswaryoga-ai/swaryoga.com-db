import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/crm/whatsapp/conversations/delete
 * Deletes chat history for one or more conversations from Bunny Database.
 * Body: { leadIds?: string[], phoneNumbers?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded, request);

    const body = await request.json().catch(() => ({} as any));
    const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.map((x: any) => String(x).trim()).filter(Boolean) : [];
    const phoneNumbers: string[] = Array.isArray(body?.phoneNumbers) ? body.phoneNumbers.map((x: any) => String(x).replace(/\D/g, '')).filter(Boolean) : [];

    if (leadIds.length === 0 && phoneNumbers.length === 0) {
      return NextResponse.json({ error: 'Missing leadIds or phoneNumbers' }, { status: 400 });
    }

    let deleted = 0;

    for (const leadId of leadIds) {
      const whereClause = superAdmin ? 'lead_id = ?' : 'lead_id = ? AND sent_by_user_id = ?';
      const args = superAdmin ? [leadId] : [leadId, viewerUserId];
      const res = await bunnyExecute({
        sql: `DELETE FROM meta_messages_sql WHERE ${whereClause}`,
        args,
      });
      if (res.rowsAffected) deleted += res.rowsAffected;
    }

    for (const phone of phoneNumbers) {
      const clean10 = phone.slice(-10);
      const resMeta = await bunnyExecute({
        sql: `DELETE FROM meta_messages_sql WHERE substr(phone_number, -10) = ?`,
        args: [clean10],
      });
      if (resMeta.rowsAffected) deleted += resMeta.rowsAffected;

      const resQr = await bunnyExecute({
        sql: `DELETE FROM qr_whatsapp_messages_sql WHERE chat_jid LIKE ?`,
        args: [`%${clean10}%`],
      });
      if (resQr.rowsAffected) deleted += resQr.rowsAffected;

      await bunnyExecute({
        sql: `DELETE FROM qr_whatsapp_chats_sql WHERE chat_jid LIKE ?`,
        args: [`%${clean10}%`],
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      data: { deletedCount: deleted },
      message: `Deleted ${deleted} messages`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
