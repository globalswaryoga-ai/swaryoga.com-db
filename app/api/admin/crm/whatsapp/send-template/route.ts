import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppMessage, getWhatsAppTemplate, getAnalyticsEvent } from '@/lib/schemas/enterpriseSchemas';
import { buildCloudTemplateSendInput, normalizePhone, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { ensurePermanentUrl, isMetaCdnUrl } from '@/lib/migrateMetaImageToBunny';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url

// Cost per template message in INR (Meta charges ~₹0.70 for marketing templates in India)
const TEMPLATE_COST_INR = parseFloat(process.env.META_TEMPLATE_COST_INR || '0.70');

function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

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
 * Sends WhatsApp template DIRECTLY via Meta Cloud API.
 * No circuit breaker or retry wrapper — direct call for reliability.
 *
 * Body: { leadId?, phoneNumber, templateId }
 * If leadId is not provided, will find or create lead from phoneNumber
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { leadId, phoneNumber, templateId } = body;
    if (!phoneNumber || !templateId) {
      return NextResponse.json({ error: 'Missing: phoneNumber, templateId' }, { status: 400 });
    }

    // Check Meta API configuration FIRST
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ 
        error: 'Meta API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.' 
      }, { status: 500 });
    }

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const userId = decoded?.userId || decoded?.username || 'unknown';
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const normalizedPhone = normalizePhone(String(phoneNumber));
    
    // Find or create lead — fallback to phone search if leadId not found (handles DB migration)
    let lead: any;
    if (leadId) {
      lead = await Lead.findById(String(leadId)).catch(() => null);
    }
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    }
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: normalizedPhone,
        name: `WhatsApp ${normalizedPhone}`,
        source: 'whatsapp',
        status: 'lead',
        assignedToUserId: userId,
        createdByUserId: userId,
      });
      console.log(`[send-template:${requestId}] Created new lead for phone: ${normalizedPhone}`);
    }

    if (!superAdmin) {
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      const createdBy = String((lead as any).createdByUserId || '').trim();
      if (assignedTo && assignedTo !== userId && createdBy !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Find template by ID or by name
    let t: any = null;
    const templateIdStr = String(templateId || '').trim();
    
    if (templateIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      t = await WhatsAppTemplate.findById(templateIdStr).lean();
    }
    if (!t) {
      t = await WhatsAppTemplate.findOne({ templateName: templateIdStr }).lean();
    }
    if (!t) {
      console.error(`[send-template:${requestId}] Template not found: ${templateIdStr}`);
      return NextResponse.json({ error: `Template not found: ${templateIdStr}` }, { status: 404 });
    }
    
    console.log(`[send-template:${requestId}] Found template: ${t.templateName} (ID: ${t._id})`);

    const to = normalizedPhone;

    // Auto-migrate Meta CDN URLs to Bunny CDN before sending
    const headerUrl = t?.headerMedia?.url || t?.imageFile?.url || '';
    if (headerUrl && isMetaCdnUrl(headerUrl)) {
      const bunnyUrl = await ensurePermanentUrl(headerUrl);
      if (bunnyUrl !== headerUrl) {
        // Update the template in DB with permanent URL
        const WhatsAppTemplateModel = getWhatsAppTemplate();
        await WhatsAppTemplateModel.findByIdAndUpdate(t._id, {
          $set: { 'headerMedia.url': bunnyUrl, ...(t?.imageFile?.url ? { 'imageFile.url': bunnyUrl } : {}) },
        });
        t = { ...t, headerMedia: { ...t.headerMedia, url: bunnyUrl } };
        console.log(`[send-template:${requestId}] Migrated Meta CDN → Bunny: ${bunnyUrl.substring(0, 60)}`);
      }
    }

    // Build template input using shared helper
    const cloudInput = buildCloudTemplateSendInput(t, to);

    // --- Pre-validate rich header media before sending ---
    const headerFormat = String(t?.headerFormat || '').trim().toUpperCase();
    const needsHeaderMedia = headerFormat === 'IMAGE' || headerFormat === 'VIDEO';
    const rawHeaderUrl = String(t?.headerMedia?.url || t?.imageFile?.url || '').trim();

    // Validate header media if needed
    if (needsHeaderMedia && !rawHeaderUrl) {
      return NextResponse.json(
        { error: 'Template header media missing. Please add an image/video URL and re-save the template.' },
        { status: 400 }
      );
    }
    if (needsHeaderMedia && !isHttpUrl(rawHeaderUrl)) {
      return NextResponse.json(
        { error: 'Template header media must be a public http/https URL.' },
        { status: 400 }
      );
    }

    // Create message record BEFORE sending
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
      sentByUserId: userId,
      sentByLabel: decoded?.username || userId || 'admin',
      metadata: {
        template: {
          templateName: t.templateName,
          headerFormat: t.headerFormat,
          headerContent: t.headerContent,
          footerText: t.footerText,
          buttons: Array.isArray(t.buttons) ? t.buttons : [],
          headerMedia: t.headerMedia || null,
        },
        via: 'meta_direct',
      },
    });

    // Use the same shared Meta send helper as the working bulk/broadcast flow
    // so single-send and bulk-send cannot drift in payload structure.
    console.log(`[send-template:${requestId}] Sending to ${to} template: ${cloudInput.templateName}`);
    console.log(`[send-template:${requestId}] Cloud input:`, JSON.stringify(cloudInput, null, 2));

    try {
      const apiResult = await sendWhatsAppTemplate(cloudInput);
      console.log(`[send-template:${requestId}] Meta helper response:`, JSON.stringify(apiResult?.raw || {}, null, 2));
      const waMessageId = apiResult?.waMessageId;
      
      // Update message record to sent
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        waMessageId: waMessageId || 'meta-sent',
        'metadata.cost': TEMPLATE_COST_INR,
        'metadata.costCurrency': 'INR',
      });

      // Track analytics
      try {
        const AnalyticsEvent = getAnalyticsEvent();
        await AnalyticsEvent.create({
          eventType: 'whatsapp_template_sent',
          eventSource: 'inbox',
          userId,
          metadata: {
            templateId: t._id,
            templateName: t.templateName,
            phoneNumber: to,
            waMessageId,
            cost: TEMPLATE_COST_INR,
            costCurrency: 'INR',
          },
        });
      } catch (analyticsErr) {
        console.warn(`[send-template:${requestId}] Analytics error:`, analyticsErr);
      }

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecord._id,
          status: 'sent',
          waMessageId,
          via: 'meta_direct',
        },
      }, { status: 200 });

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[send-template:${requestId}] Send error:`, errMsg);
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'failed',
        failureReason: String(errMsg).substring(0, 500),
      });
      return NextResponse.json(
        { error: `Failed to send template: ${errMsg.substring(0, 200)}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error(`[send-template] Unexpected error:`, error);
    return NextResponse.json({ error: error?.message || 'Failed to send template' }, { status: 500 });
  }
}
