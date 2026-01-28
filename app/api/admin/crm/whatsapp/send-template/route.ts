import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { buildCloudTemplateSendInput, normalizePhone, sendWhatsAppTemplate } from '@/lib/whatsapp';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


function isHttpUrl(value: unknown): boolean {
  const s = String(value || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/admin/crm/whatsapp/send-template
 * Sends WhatsApp template via Meta Cloud API (image + text + buttons).
 *
 * Body: { leadId?, phoneNumber, templateId }
 * If leadId is not provided, will find or create lead from phoneNumber
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
    if (!phoneNumber || !templateId) {
      return NextResponse.json({ error: 'Missing: phoneNumber, templateId' }, { status: 400 });
    }

    await connectDB();

    const superAdmin = decoded?.userId === 'admincrm' || decoded?.userId === 'admin';
    const normalizedPhone = normalizePhone(String(phoneNumber));
    
    // Find or create lead
    let lead: any;
    if (leadId) {
      lead = await Lead.findById(String(leadId));
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    } else {
      // Find by phone number or create new lead
      lead = await Lead.findOne({ phoneNumber: normalizedPhone });
      if (!lead) {
        // Create a new lead for this phone number
        lead = await Lead.create({
          phoneNumber: normalizedPhone,
          name: `WhatsApp ${normalizedPhone}`,
          source: 'whatsapp-template',
          status: 'lead',
          assignedToUserId: decoded?.userId,
          createdBy: decoded?.userId,
        });
        console.log('[send-template] Created new lead for phone:', normalizedPhone, 'leadId:', lead._id);
      }
    }

    if (!superAdmin) {
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      if (!assignedTo || assignedTo !== decoded?.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Find template by ID or by name
    let t: any = null;
    const templateIdStr = String(templateId || '').trim();
    
    // Try finding by ObjectId first
    if (templateIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      t = await WhatsAppTemplate.findById(templateIdStr).lean();
    }
    
    // If not found by ID, try by name
    if (!t) {
      t = await WhatsAppTemplate.findOne({ templateName: templateIdStr }).lean();
    }
    
    if (!t) {
      console.error('[send-template] Template not found:', templateIdStr);
      return NextResponse.json({ error: `Template not found: ${templateIdStr}` }, { status: 404 });
    }
    
    console.log('[send-template] Found template:', t.templateName, 'ID:', t._id);

    const to = normalizedPhone;

    // Validation: if template needs header media, it MUST be sent via Cloud API.
    const headerFormat = String(t?.headerFormat || '').trim().toUpperCase();
    const needsHeaderMedia = headerFormat === 'IMAGE' || headerFormat === 'VIDEO';
    const headerMediaUrl = String(t?.headerMedia?.url || t?.headerContent || '').trim();
    if (needsHeaderMedia) {
      if (!headerMediaUrl) {
        return NextResponse.json(
          { error: 'Template header media missing. Please add an image/video URL and re-save the template.' },
          { status: 400 }
        );
      }
      if (!isHttpUrl(headerMediaUrl)) {
        return NextResponse.json(
          { error: 'Template header media must be a public http/https URL.' },
          { status: 400 }
        );
      }
    }

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
      provider: 'meta',
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

    // Send via Meta Cloud API
    try {
      let apiResult: any;

      if (needsHeaderMedia) {
        const cloudInput = buildCloudTemplateSendInput(t, to);
        apiResult = await sendWhatsAppTemplate({
          ...cloudInput,
          headerMedia: {
            kind: headerFormat === 'VIDEO' ? 'video' : 'image',
            url: headerMediaUrl,
          },
        });
      } else {
        const cloudInput = buildCloudTemplateSendInput(t, to);
        apiResult = await sendWhatsAppTemplate(cloudInput);
      }

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        provider: 'meta',
        waMessageId: apiResult.waMessageId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'sent',
            waMessageId: apiResult.waMessageId,
            via: 'meta_template',
          },
        },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'failed',
        provider: 'meta',
        errorMessage: message,
      });

      return NextResponse.json(
        { error: `Failed to send template. ${message.substring(0, 200)}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[WhatsApp] send-template unexpected error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send template' }, { status: 500 });
  }
}
