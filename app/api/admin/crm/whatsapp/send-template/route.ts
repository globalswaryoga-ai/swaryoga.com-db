import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { buildCloudTemplateSendInput, normalizePhone, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { getBunnyLeadByPhone, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import { getTemplateById } from '@/lib/bunnyTemplatesRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username && !decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { leadId, phoneNumber, templateId } = body;
    if (!phoneNumber || !templateId) {
      return NextResponse.json({ error: 'Missing: phoneNumber, templateId' }, { status: 400 });
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ 
        error: 'Meta API not configured.' 
      }, { status: 500 });
    }

    const userId = decoded?.userId || decoded?.username || 'admincrm';
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const normalizedPhone = normalizePhone(String(phoneNumber));
    const to = normalizedPhone;

    // Fetch template directly using getTemplateById
    const t: any = await getTemplateById(String(templateId || '').trim());
    if (!t) {
      return NextResponse.json({ error: 'Template not found in database' }, { status: 404 });
    }

    const templateCategory = String(t.category || 'MARKETING').toUpperCase();
    const cost = templateCategory === 'UTILITY'
      ? parseFloat(process.env.META_UTILITY_COST_INR || '0.15')
      : templateCategory === 'AUTHENTICATION'
        ? parseFloat(process.env.META_AUTH_COST_INR || '0.15')
        : parseFloat(process.env.META_MARKETING_COST_INR || process.env.META_TEMPLATE_COST_INR || '0.78');

    // Only skip duplicate if not a manual action or forced
    if (!body?.force && body?.provider !== 'meta') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const existingCheck = await bunnyExecute({
        sql: `SELECT document_id FROM meta_messages_sql WHERE phone_number = ? AND data_json LIKE ? AND status != 'failed' AND COALESCE(sent_at, created_at) >= ? LIMIT 1`,
        args: [to, `%"templateId":"${t._id}"%`, twentyFourHoursAgo]
      });
      
      if (existingCheck.rows && existingCheck.rows.length > 0) {
        return NextResponse.json({ 
          success: true, 
          skipped: true, 
          note: 'Skipped: Same template already sent to this user in the last 24 hours.',
          data: { status: 'skipped', messageId: existingCheck.rows[0].document_id }
        }, { status: 200 });
      }
    }

    // Resolve or create lead in BunnyDB
    let lead = await getBunnyLeadByPhone(normalizedPhone, null);
    if (!lead) {
      lead = await saveBunnyLead({
        phoneNumber: normalizedPhone,
        name: `WhatsApp ${normalizedPhone}`,
        source: 'whatsapp',
        status: 'lead',
        assignedToUserId: userId,
        createdByUserId: userId,
      }).catch(() => null);
    }

    const cloudInput = buildCloudTemplateSendInput(t, to);
    const messageRecordId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    try {
      const tenantCreds = superAdmin ? undefined : ((await getMetaCredentialsForTenant(userId)) || undefined);
      const apiResult = await sendWhatsAppTemplate(cloudInput, tenantCreds);
      const waMessageId = apiResult?.waMessageId;

      await upsertBunnyMetaMessage({
        _id: messageRecordId,
        documentId: messageRecordId,
        leadId: lead?._id ? String(lead._id) : undefined,
        phoneNumber: to,
        messageType: 'template',
        templateId: t._id,
        templateName: t.templateName || t.name,
        templateCategory: templateCategory,
        cost: cost,
        metadata: {
          cost: cost,
          category: templateCategory,
          channel: 'meta',
          template: {
            templateName: t.templateName || t.name,
            headerFormat: t.headerFormat || undefined,
            headerContent: t.headerContent || undefined,
            headerMedia: cloudInput.headerMedia || undefined,
          },
        },
        messageContent: String(t.templateContent || '').trim() || '(template)',
        direction: 'outbound',
        status: 'sent',
        waMessageId: waMessageId || 'meta-sent',
        whatsappMessageId: waMessageId || 'meta-sent',
        sentAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        provider: 'meta',
        sentByUserId: userId,
        sentByLabel: decoded?.username || userId || 'admin',
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecordId,
          status: 'sent',
          waMessageId,
          cost,
          templateCategory,
        },
      }, { status: 200 });

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      upsertBunnyMetaMessage({
        _id: messageRecordId,
        documentId: messageRecordId,
        leadId: lead?._id ? String(lead._id) : undefined,
        phoneNumber: to,
        messageType: 'template',
        templateId: t._id,
        templateName: t.templateName || t.name,
        messageContent: String(t.templateContent || '').trim() || '(template)',
        direction: 'outbound',
        status: 'failed',
        failureReason: String(errMsg).substring(0, 500),
        sentAt: new Date().toISOString(),
        provider: 'meta',
        sentByUserId: userId,
      }).catch(err => console.error('[SEND_TEMPLATE] Failed to save failed template record:', err));

      return NextResponse.json(
        { error: `Failed to send template: ${errMsg.substring(0, 200)}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send template' }, { status: 500 });
  }
}
