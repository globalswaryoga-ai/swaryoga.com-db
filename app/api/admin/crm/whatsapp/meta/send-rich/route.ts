/**
 * POST /api/admin/crm/whatsapp/meta/send-rich
 *
 * Rich Meta Cloud API message types beyond text/template:
 *   { to, kind: 'list',     bodyText, buttonText, sections, headerText?, footerText? }
 *   { to, kind: 'location', latitude, longitude, name?, address? }
 *   { to, kind: 'contact',  contactName, contactPhone, organization? }
 *
 * Uses the tenant's own WABA credentials when configured, falling back to the
 * platform's env-configured number. Logs the send to WhatsAppMessage so it
 * shows in the inbox with delivery ticks (status webhooks match by waMessageId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import {
  normalizePhone,
  sendWhatsAppInteractiveList,
  sendWhatsAppLocation,
  sendWhatsAppContactCard,
} from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, kind } = body;
    if (!to || !kind) {
      return NextResponse.json({ success: false, error: 'to and kind required' }, { status: 400 });
    }

    await connectDB();
    const viewerUserId = getViewerUserId(decoded);
    // Tenant's own WABA when configured; undefined → platform env credentials.
    const creds = (await getMetaCredentialsForTenant(viewerUserId)) || undefined;

    let result: { waMessageId?: string };
    let preview = '';

    if (kind === 'list') {
      const { bodyText, buttonText, sections, headerText, footerText } = body;
      if (!bodyText || !buttonText || !Array.isArray(sections) || !sections.length) {
        return NextResponse.json({ success: false, error: 'bodyText, buttonText and sections required' }, { status: 400 });
      }
      result = await sendWhatsAppInteractiveList(String(to), { bodyText, buttonText, sections, headerText, footerText }, creds);
      preview = `📋 ${bodyText}`;
    } else if (kind === 'location') {
      const lat = Number(body.latitude);
      const lng = Number(body.longitude);
      result = await sendWhatsAppLocation(String(to), { latitude: lat, longitude: lng, name: body.name, address: body.address }, creds);
      preview = `📍 ${body.name || 'Location'} (${lat}, ${lng})`;
    } else if (kind === 'contact') {
      const { contactName, contactPhone, organization } = body;
      result = await sendWhatsAppContactCard(String(to), { name: String(contactName || ''), phone: String(contactPhone || ''), organization }, creds);
      preview = `👤 Contact: ${contactName}`;
    } else {
      return NextResponse.json({ success: false, error: `Unknown kind: ${kind}` }, { status: 400 });
    }

    // Log to the inbox history (status webhooks update ticks by waMessageId).
    try {
      const phone = normalizePhone(String(to));
      const Lead = getLead();
      const lead = phone ? await Lead.findOne({ phoneNumber: phone }).select({ _id: 1 }).lean() as any : null;
      const WhatsAppMessage = getWhatsAppMessage();
      await WhatsAppMessage.create({
        phoneNumber: phone || String(to),
        leadId: lead?._id,
        direction: 'outbound',
        messageType: 'interactive',
        messageContent: preview,
        status: 'sent',
        waMessageId: result.waMessageId,
        sentByUserId: viewerUserId,
        sentByLabel: decoded.name || decoded.username || viewerUserId,
        provider: 'meta',
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.warn('[META SEND-RICH] History log failed (message was sent):', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({ success: true, waMessageId: result.waMessageId });
  } catch (err: any) {
    console.error('[META SEND-RICH] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
