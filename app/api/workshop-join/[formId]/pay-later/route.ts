import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

export const dynamic = 'force-dynamic';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', NPR: 'रू' };

/**
 * Send a text message to a phone via the QR WhatsApp bridge (the connected
 * Swar Yoga account). Used to auto-deliver a payment link to a new lead — the
 * QR bridge can message any number, unlike Meta (which needs a 24h window).
 */
async function sendWhatsAppViaBridge(phone: string, text: string): Promise<boolean> {
  const { url, secret } = getWhatsAppBridgeConfig();
  if (!url || !secret) return false;

  // Resolve a connected session (the central Swar Yoga account).
  let sessionKey: string | null = null;
  let userId = 'admincrm';
  try {
    const r = await fetch(`${url}/sessions`, { headers: { 'x-bridge-secret': secret } });
    if (r.ok) {
      const d = await r.json();
      const s = (d?.sessions || []).find((x: any) => x.status === 'connected');
      if (s) { sessionKey = s.sessionKey; userId = s.userId || userId; }
    }
  } catch { /* bridge unreachable */ }
  if (!sessionKey) return false;

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  try {
    const res = await fetch(`${url}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': secret,
        'x-user-id': userId,
        'x-session-key': sessionKey,
      },
      body: JSON.stringify({ jid, type: 'text', text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST /api/workshop-join/[formId]/pay-later
 * Marks the lead as payment-pending and auto-sends the pay link on WhatsApp.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    await connectDB();
    const form = await EnquiryForm.findOne({ formId: params.formId, isActive: true }).lean() as any;
    if (!form) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });

    const price = Math.max(0, Number(form.price) || 0);
    if (price <= 0) {
      return NextResponse.json({ error: 'This workshop is free — no payment needed' }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body?.name || '').trim();
    const phone = normalizePhone(String(body?.mobile || '')) || String(body?.mobile || '').replace(/\D/g, '');
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    const currency = (form.currency || 'INR').toUpperCase();
    const symbol = CURRENCY_SYMBOL[currency] || '';
    const firstName = name.split(' ')[0] || name;

    // Pay link → the join page in pay mode, pre-filled so they can pay in 1 tap.
    const origin = getRequestBaseUrl(req);
    const payLink = `${origin}/workshop-join/${params.formId}?pay=1&n=${encodeURIComponent(firstName)}&m=${phone.replace(/^91/, '')}`;

    // Mark the lead payment-pending (lead was created on Join submit).
    try {
      const Lead = getLead();
      const lead = await Lead.findOne({ phoneNumber: phone });
      if (lead) {
        lead.metadata = {
          ...(lead.metadata || {}),
          payment: {
            status: 'pending',
            amount: price,
            currency,
            workshopName: form.workshopName,
            formId: params.formId,
            payLink,
            linkSentAt: new Date(),
          },
        };
        lead.labels = Array.from(new Set([...(lead.labels || []), 'payment-pending']));
        await lead.save();
      }
    } catch (e) {
      console.error('[pay-later] lead update failed (non-fatal):', e);
    }

    // Auto-send the pay link on WhatsApp.
    const message =
      `Namaste ${firstName}! 🙏\n\nTo confirm your seat for *${form.workshopName}*, please complete your payment of *${symbol}${price}*:\n${payLink}\n\nWe look forward to seeing you. — Swar Yoga`;
    const sent = await sendWhatsAppViaBridge(phone, message);

    return NextResponse.json({ success: true, whatsappSent: sent, payLink });
  } catch (err) {
    console.error('[workshop-join/pay-later] error:', err);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
