import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppMessage, getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, buildCloudTemplateSendInput, getPublicMediaUrl } from '@/lib/whatsapp';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

/**
 * POST /api/admin/crm/whatsapp/send-template-meta
 * 
 * Sends WhatsApp template ONLY via Meta Cloud API - completely separate from QR Bridge.
 * This ensures Meta and QR pipelines don't interfere with each other.
 *
 * Body: { phoneNumber, templateId }
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { phoneNumber, templateId } = body;
    
    if (!phoneNumber || !templateId) {
      return NextResponse.json({ success: false, error: 'Missing phoneNumber or templateId' }, { status: 400 });
    }

    // Check Meta API configuration
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Meta API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.' 
      }, { status: 500 });
    }

    await connectDB();
    
    const normalizedPhone = normalizePhone(String(phoneNumber));
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const WhatsAppTemplate = getWhatsAppTemplate();

    // Get template
    const templateIdStr = String(templateId).trim();
    let templateData: any = null;
    
    if (templateIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      templateData = await WhatsAppTemplate.findById(templateIdStr).lean();
    }
    if (!templateData) {
      templateData = await WhatsAppTemplate.findOne({ templateName: templateIdStr }).lean();
    }
    
    if (!templateData) {
      return NextResponse.json({ success: false, error: `Template not found: ${templateIdStr}` }, { status: 404 });
    }

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: normalizedPhone,
        name: `WhatsApp ${normalizedPhone}`,
        source: 'whatsapp-template-meta',
        status: 'lead',
        assignedToUserId: decoded?.userId,
        createdBy: decoded?.userId,
      });
    }

    // Build template payload
    const cloudInput = buildCloudTemplateSendInput(templateData, normalizedPhone);
    
    // Process header media if needed
    const headerFormat = String(templateData.headerFormat || '').toUpperCase();
    const needsHeaderMedia = headerFormat === 'IMAGE' || headerFormat === 'VIDEO';
    const headerMediaUrl = templateData.headerMedia?.url || templateData.imageFile?.url || '';

    let components: any[] = [];
    
    if (needsHeaderMedia && headerMediaUrl) {
      const signedUrl = await getPublicMediaUrl(headerMediaUrl);
      components.push({
        type: 'header',
        parameters: [{
          type: headerFormat.toLowerCase(),
          [headerFormat.toLowerCase()]: { link: signedUrl }
        }]
      });
    }

    // Add body parameters if any
    if (cloudInput.bodyParams && cloudInput.bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: cloudInput.bodyParams.map(p => ({ type: 'text', text: p }))
      });
    }

    // Add CATALOG button component if template has catalog buttons
    if (Array.isArray(cloudInput.buttons)) {
      cloudInput.buttons.forEach((btn, idx) => {
        if (btn.kind === 'catalog') {
          components.push({
            type: 'button',
            sub_type: 'CATALOG',
            index: idx,
            parameters: [],
          });
        }
      });
    }

    // Build the payload
    const payload: any = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: cloudInput.templateName,
        language: { code: cloudInput.language || 'en' },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    // Create message record
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: normalizedPhone,
      messageType: 'template',
      templateId: templateData._id,
      messageContent: templateData.templateContent || '(Meta template)',
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'meta',
      metadata: {
        via: 'meta_only',
        templateName: cloudInput.templateName,
      },
    });

    console.log(`[META-TEMPLATE:${requestId}] Sending to ${normalizedPhone} via Meta API`);
    console.log(`[META-TEMPLATE:${requestId}] Template: ${cloudInput.templateName}`);
    console.log(`[META-TEMPLATE:${requestId}] Payload:`, JSON.stringify(payload, null, 2));

    // Send via Meta ONLY
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
      console.log(`[META-TEMPLATE:${requestId}] Meta response:`, res.status, JSON.stringify(data));

      if (!res.ok) {
        const errorMsg = data?.error?.message || data?.error?.error_user_msg || 'Meta API error';
        await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
          status: 'failed',
          errorMessage: errorMsg,
        });
        return NextResponse.json({ 
          success: false, 
          error: errorMsg,
          metaError: data?.error,
        }, { status: 400 });
      }

      const waMessageId = data?.messages?.[0]?.id;
      
      // Success
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        waMessageId: waMessageId || 'meta-sent',
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecord._id,
          status: 'sent',
          waMessageId,
          via: 'meta_cloud_api',
          provider: 'meta',
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'failed',
        errorMessage: errorMsg,
      });
      return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }
  } catch (error: any) {
    console.error(`[META-TEMPLATE] Unexpected error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}
