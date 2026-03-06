import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppMessage, getWhatsAppTemplate, getAnalyticsEvent } from '@/lib/schemas/enterpriseSchemas';
import { buildCloudTemplateSendInput, normalizePhone, getPublicMediaUrl } from '@/lib/whatsapp';
import crypto from 'crypto';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';

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
    if (!decoded?.isAdmin) {
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
    
    // Find or create lead
    let lead: any;
    if (leadId) {
      lead = await Lead.findById(String(leadId));
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    } else {
      lead = await Lead.findOne({ phoneNumber: normalizedPhone });
      if (!lead) {
        lead = await Lead.create({
          phoneNumber: normalizedPhone,
          name: `WhatsApp ${normalizedPhone}`,
          source: 'whatsapp',
          status: 'lead',
          assignedToUserId: userId,
          createdBy: userId,
        });
        console.log(`[send-template:${requestId}] Created new lead for phone: ${normalizedPhone}`);
      }
    }

    if (!superAdmin) {
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      if (assignedTo && assignedTo !== userId) {
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

    // Build template input using shared helper
    const cloudInput = buildCloudTemplateSendInput(t, to);

    // --- Build Meta API components DIRECTLY (no circuit breaker wrapper) ---
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

    const components: any[] = [];

    // 1. Header component (image/video)
    if (needsHeaderMedia && rawHeaderUrl) {
      const signedUrl = await getPublicMediaUrl(rawHeaderUrl);
      components.push({
        type: 'header',
        parameters: [{
          type: headerFormat.toLowerCase(),
          [headerFormat.toLowerCase()]: { link: signedUrl },
        }],
      });
    }

    // 2. Body parameters
    if (Array.isArray(cloudInput.bodyParams) && cloudInput.bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: cloudInput.bodyParams.map((p: string) => ({ type: 'text', text: String(p || '') })),
      });
    }

    // 3. Button components
    if (Array.isArray(cloudInput.buttons)) {
      cloudInput.buttons.forEach((btn: any, idx: number) => {
        if (btn.kind === 'catalog') {
          components.push({
            type: 'button',
            sub_type: 'CATALOG',
            index: idx,
            parameters: [],
          });
        } else if (btn.kind === 'url') {
          const url = String(btn.url || '');
          const needsParam = url.includes('{{') && url.includes('}}');
          const param = needsParam ? url.replace(/.*\{\{\s*([^}]+)\s*\}\}.*/, '$1') : '';
          const parameters = param ? [{ type: 'text', text: param }] : [];
          components.push({
            type: 'button',
            sub_type: 'url',
            index: String(idx),
            ...(parameters.length ? { parameters } : {}),
          });
        }
        // quick_reply buttons: Meta shows them automatically from template registration
        // No runtime component needed
      });
    }

    // Build the Meta API payload
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: cloudInput.templateName,
        language: { code: cloudInput.language || 'en' },
        ...(components.length > 0 ? { components } : {}),
      },
    };

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

    // --- DIRECT Meta API call (no circuit breaker, no retry wrapper) ---
    console.log(`[send-template:${requestId}] Sending to ${to} template: ${cloudInput.templateName}`);
    console.log(`[send-template:${requestId}] Payload:`, JSON.stringify(payload, null, 2));

    try {
      const appSecretProof = appSecret ? generateAppSecretProof(accessToken, appSecret) : '';
      const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages${appSecretProof ? `?appsecret_proof=${appSecretProof}` : ''}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));
      console.log(`[send-template:${requestId}] Meta response: ${res.status}`, JSON.stringify(data));

      if (!res.ok) {
        const errorMsg = data?.error?.message || data?.error?.error_user_msg || 'Meta API error';
        console.error(`[send-template:${requestId}] Meta API error:`, errorMsg, JSON.stringify(data?.error));
        await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
          status: 'failed',
          failureReason: String(errorMsg).substring(0, 500),
        });
        return NextResponse.json({ 
          success: false,
          error: `Meta API: ${errorMsg}`,
          metaError: data?.error,
        }, { status: 400 });
      }

      const waMessageId = data?.messages?.[0]?.id;
      
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
