import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyAdminAccess, handleCrmError, normalizePhone } from '@/lib/crm-handlers';
import { getLead, getWhatsAppMessage, getWhatsAppWebhookEvent } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin-only diagnostics endpoint for Meta inbox.
 *
 * GET /api/admin/crm/diagnostics/meta-inbox?phone=9075358557
 *
 * Returns:
 * - normalized phone
 * - lead (if exists)
 * - recent messages (stored in CRM DB)
 * - recent webhook events (stored in CRM DB)
 */
export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);

    const url = new URL(request.url);
    const rawPhone = url.searchParams.get('phone') || '';
    const lastEventsLimit = parseInt(url.searchParams.get('lastEvents') || '0', 10);

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();

    // 1. If only lastEvents requested (global events)
    if (lastEventsLimit > 0 && !rawPhone) {
      const events = await WhatsAppWebhookEvent.find({})
        .sort({ receivedAt: -1 })
        .limit(lastEventsLimit)
        .lean();
      return NextResponse.json({
        success: true,
        data: {
          events: events.map((e: any) => ({
            kind: e.kind,
            message: e.message,
            phoneNumber: e.phoneNumber,
            receivedAt: e.receivedAt,
            ok: e.ok
          }))
        }
      });
    }

    if (!rawPhone.trim()) {
      return NextResponse.json({ success: false, error: 'Missing phone query param' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    const lead = await Lead.findOne({ phoneNumber: phone }).lean();

    const messages = await WhatsAppMessage.find({ phoneNumber: phone })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const webhookEvents = await WhatsAppWebhookEvent.find({ phoneNumber: phone })
      .sort({ receivedAt: -1 })
      .limit(25)
      .lean();

    const payload = {
      ok: true,
      phone,
      lead: lead
        ? {
            _id: String((lead as any)._id),
            name: (lead as any).name,
            status: (lead as any).status,
            assignedToUserId: (lead as any).assignedToUserId,
            lastMessageAt: (lead as any).lastMessageAt,
          }
        : null,
      counts: {
        messages: messages.length,
        webhookEvents: webhookEvents.length,
      },
      messages: messages.map((m: any) => ({
        _id: String(m._id),
        direction: m.direction,
        messageContent: m.messageContent,
        provider: m.provider,
        status: m.status,
        isRead: m.isRead,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
      })),
      webhookEvents: webhookEvents.map((e: any) => ({
        _id: String(e._id),
        kind: e.kind,
        ok: e.ok,
        message: e.message,
        waMessageId: e.waMessageId,
        status: e.status,
        receivedAt: e.receivedAt,
      })),
    };

    // IMPORTANT: `useCRM` expects either `{ success: true }` or `{ data: ... }`.
    // Wrap in `{ success: true, data: ... }` so the Meta inbox diagnostics UI works reliably.
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    return handleCrmError(error, 'GET diagnostics/meta-inbox');
  }
}
