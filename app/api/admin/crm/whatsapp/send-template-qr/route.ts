import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead, getWhatsAppMessage, getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/whatsapp/send-template-qr
 * 
 * Sends WhatsApp template ONLY via QR Bridge (EC2) - completely separate from Meta API.
 * This ensures QR and Meta pipelines don't interfere with each other.
 *
 * Body: { phoneNumber, templateId?, imageUrl?, bodyText?, buttons?, footerText? }
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

    const { phoneNumber, templateId, imageUrl, bodyText, buttons, footerText } = body;
    
    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Missing phoneNumber' }, { status: 400 });
    }

    const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
    const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

    if (!bridgeUrl || !bridgeSecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'QR Bridge not configured. Set WHATSAPP_BRIDGE_HTTP_URL and WHATSAPP_BRIDGE_SECRET.' 
      }, { status: 500 });
    }

    await connectDB();
    
    const normalizedPhone = normalizePhone(String(phoneNumber));
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const WhatsAppTemplate = getWhatsAppTemplate();

    // Get template data if templateId provided
    let templateData: any = null;
    let finalImageUrl = imageUrl || '';
    let finalBodyText = bodyText || '';
    let finalButtons = buttons || [];
    let finalFooterText = footerText || 'Swar Yoga';

    if (templateId) {
      const templateIdStr = String(templateId).trim();
      if (templateIdStr.match(/^[0-9a-fA-F]{24}$/)) {
        templateData = await WhatsAppTemplate.findById(templateIdStr).lean();
      }
      if (!templateData) {
        templateData = await WhatsAppTemplate.findOne({ templateName: templateIdStr }).lean();
      }
      
      if (templateData) {
        finalImageUrl = finalImageUrl || templateData.headerMedia?.url || templateData.imageFile?.url || '';
        finalBodyText = finalBodyText || templateData.templateContent || templateData.templateName || '';
        finalButtons = finalButtons.length > 0 ? finalButtons : 
          (templateData.buttons?.map((b: any) => b.text || b.title) || []);
        finalFooterText = finalFooterText || templateData.footerText || 'Swar Yoga';
      }
    }

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: normalizedPhone,
        name: `WhatsApp ${normalizedPhone}`,
        source: 'whatsapp-template-qr',
        status: 'lead',
        assignedToUserId: decoded?.userId,
        createdBy: decoded?.userId,
      });
    }

    // Create message record
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: normalizedPhone,
      messageType: 'template',
      templateId: templateData?._id || null,
      messageContent: finalBodyText || '(QR template)',
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'whatsapp_qr',
      metadata: {
        via: 'qr_bridge_only',
        imageUrl: finalImageUrl,
        buttons: finalButtons,
        footerText: finalFooterText,
      },
    });

    console.log(`[QR-TEMPLATE:${requestId}] Sending to ${normalizedPhone} via QR Bridge`);
    console.log(`[QR-TEMPLATE:${requestId}] Image: ${finalImageUrl.substring(0, 50)}...`);
    console.log(`[QR-TEMPLATE:${requestId}] Buttons: ${JSON.stringify(finalButtons)}`);

    // Send via QR Bridge ONLY
    try {
      const res = await fetch(`${bridgeUrl}/send-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': bridgeSecret,
        },
        body: JSON.stringify({
          to: normalizedPhone,
          imageUrl: finalImageUrl,
          bodyText: finalBodyText,
          buttons: finalButtons,
          footerText: finalFooterText,
        }),
        cache: 'no-store',
      });

      const data = await res.json().catch(() => ({}));
      console.log(`[QR-TEMPLATE:${requestId}] Bridge response:`, res.status, data);

      if (!res.ok || !data.success) {
        const errorMsg = data?.error || 'QR Bridge send failed';
        await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
          status: 'failed',
          errorMessage: errorMsg,
        });
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }

      // Success
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        waMessageId: data.messageIds?.[0] || 'qr-sent',
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecord._id,
          status: 'sent',
          waMessageId: data.messageIds?.[0],
          via: 'qr_bridge',
          provider: 'whatsapp_qr',
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
    console.error(`[QR-TEMPLATE] Unexpected error:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}
