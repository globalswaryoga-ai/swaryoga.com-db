import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppMedia } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

/**
 * POST /api/admin/crm/whatsapp/send-media
 * Send image or video media directly (non-template) via Meta Cloud API
 *
 * Body: { leadId?, phoneNumber, mediaUrl, mediaType, caption? }
 * mediaType: 'image' | 'video'
 * mediaUrl: Must be a public HTTP/HTTPS URL
 * caption: Optional text caption (for new things announcement)
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

    const { leadId, phoneNumber, mediaUrl, mediaType, caption } = body;

    // Validation
    if (!phoneNumber || !mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, mediaUrl, mediaType' },
        { status: 400 }
      );
    }

    if (mediaType !== 'image' && mediaType !== 'video') {
      return NextResponse.json(
        { error: 'mediaType must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'mediaUrl must start with http:// or https://' },
        { status: 400 }
      );
    }

    await connectDB();

    const superAdmin = decoded?.userId === 'admincrm';
    const to = normalizePhone(String(phoneNumber));

    // Find or create lead
    let lead = leadId ? await Lead.findById(leadId) : null;
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: to });
    }

    if (!lead) {
      if (!superAdmin) {
        return NextResponse.json(
          { error: 'Lead not found (only superadmin can create)' },
          { status: 404 }
        );
      }
      lead = await Lead.create({
        phoneNumber,
        status: 'lead',
        source: 'whatsapp',
        createdByUserId: decoded.userId,
        assignedToUserId: decoded.userId,
      });
      // Auto-add to main broadcast list
      await addLeadToMainBroadcastList(lead);
    }

    // Permission check for non-superadmin
    if (!superAdmin) {
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      if (!assignedTo || assignedTo !== decoded?.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create message record in database
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      messageContent: caption || `(${mediaType})`,
      messageType: 'media',
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'pending',
      metadata: {
        media: {
          kind: mediaType,
          url: mediaUrl,
          caption: caption || null,
        },
      },
    });

    try {
      // Send via Cloud API
      const apiResult = await sendWhatsAppMedia(to, mediaUrl, mediaType, caption);

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        provider: apiResult?.raw?.provider || 'meta',
        waMessageId: apiResult.waMessageId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'sent',
            waMessageId: apiResult.waMessageId,
            mediaType,
            url: mediaUrl,
          },
        },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'failed',
        provider: 'none',
        errorMessage: message,
      });

      return NextResponse.json(
        {
          success: false,
          error: message,
          data: {
            messageId: messageRecord._id,
            status: 'failed',
          },
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[WhatsApp Media] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
