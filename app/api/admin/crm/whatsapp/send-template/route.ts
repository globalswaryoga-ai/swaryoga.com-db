import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { buildCloudTemplateSendInput, normalizePhone, sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/whatsapp';

/**
 * POST /api/admin/crm/whatsapp/send-template
 * NOTE: In "WhatsApp Web first" mode (bridge), true template (image+buttons) cannot be sent.
 * We still:
 *  - store a message record with messageType=template
 *  - render nicely inside CRM
 *  - send the plain text body via the existing send helper
 *
 * Body: { leadId, phoneNumber, templateId }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { leadId, phoneNumber, templateId } = body;
    if (!leadId || !phoneNumber || !templateId) {
      return NextResponse.json({ error: 'Missing: leadId, phoneNumber, templateId' }, { status: 400 });
    }

    await connectDB();

    const superAdmin = decoded?.userId === 'admincrm';
    const lead = await Lead.findById(String(leadId));
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin) {
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      if (!assignedTo || assignedTo !== decoded?.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const t: any = await WhatsAppTemplate.findById(String(templateId)).lean();
    if (!t) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    // Per request: allow send without approval (community number path).
    // We still store status for future; we don’t block by approved/pending.

    const to = normalizePhone(String(phoneNumber));

    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      messageType: 'template',
      templateId: t._id,
      templateVariables: {},
      messageContent: String(t.templateContent || '').trim() || '(template)',
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'pending',
      metadata: {
        template: {
          templateName: t.templateName,
          headerFormat: t.headerFormat,
          headerContent: t.headerContent,
          footerText: t.footerText,
          buttons: Array.isArray(t.buttons) ? t.buttons : [],
          headerMedia: t.headerMedia || null,
        },
      },
    });

    // Unified template sending:
    // - If Cloud API is enabled/configured (WHATSAPP_ENABLE_CLOUD_SEND=true + credentials),
    //   send a real Meta template payload (so recipient sees header media + buttons).
    // - Else fallback to WhatsApp Web bridge: send template body as plain text.
    try {
      let apiResult: any;
      let warning: string | undefined;

      try {
        const cloudInput = buildCloudTemplateSendInput(t, to);
        apiResult = await sendWhatsAppTemplate(cloudInput);
      } catch (cloudErr) {
        // Cloud not enabled/configured or template payload rejected.
        // For community/bridge mode, just send template body as text.
        // We keep a warning for CRM transparency.
        const msg = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
        warning = `Template sent as plain text fallback. Reason: ${msg.substring(0, 140)}`;
        apiResult = await sendWhatsAppText(to, String(t.templateContent || '').trim());
      }

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        provider: apiResult?.raw?.provider || 'sent',
        waMessageId: apiResult.waMessageId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'sent',
            waMessageId: apiResult.waMessageId,
            ...(warning
              ? { warning }
              : apiResult?.raw?.provider === 'meta'
                ? { via: 'meta_template' }
                : {
                    warning:
                      'Template was sent as plain text (WhatsApp Web / community number mode does not support image/buttons sending).',
                  }),
          },
        },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'queued',
        provider: 'none',
        errorMessage: message,
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'queued',
            warning: message.substring(0, 160),
          },
        },
        { status: 202 }
      );
    }
  } catch (error: any) {
    console.error('[WhatsApp] send-template unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send template' }, { status: 500 });
  }
}
