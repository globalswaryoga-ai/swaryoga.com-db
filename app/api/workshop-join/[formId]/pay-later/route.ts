import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';
import { sendTextViaQrBridge } from '@/lib/qrBridgeSend';
import { resolveWorkshopFee } from '@/lib/workshopFees';

export const dynamic = 'force-dynamic';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', NPR: 'रू' };

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

    const body = await req.json();
    const { price, label: feeLabel, index: feeOptionIndex } = resolveWorkshopFee(form, body?.feeOptionIndex);
    if (price <= 0) {
      return NextResponse.json({ error: 'This workshop is free — no payment needed' }, { status: 400 });
    }

    // Resolve the chosen time slot server-side (same protection as the fee
    // tier) so the pay-later link brings them back to the SAME slot instead
    // of defaulting to the first one.
    const timeSlotIndexRaw = Number(body?.timeSlotIndex);
    const timeSlots = Array.isArray(form.timeSlots) ? form.timeSlots : [];
    const timeSlotIndex = Number.isInteger(timeSlotIndexRaw) && timeSlotIndexRaw >= 0 && timeSlotIndexRaw < timeSlots.length
      ? timeSlotIndexRaw
      : -1;

    const name = String(body?.name || '').trim();
    const phone = normalizePhone(String(body?.mobile || '')) || String(body?.mobile || '').replace(/\D/g, '');
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    const currency = (form.currency || 'INR').toUpperCase();
    const symbol = CURRENCY_SYMBOL[currency] || '';
    const firstName = name.split(' ')[0] || name;

    // Pay link → the join page in pay mode, pre-filled so they can pay in 1 tap.
    // Carries the already-resolved fee index so they land back on the SAME
    // tier they were quoted, instead of defaulting to the first option.
    const origin = getRequestBaseUrl(req);
    const feeParam = feeOptionIndex >= 0 ? `&fee=${feeOptionIndex}` : '';
    const slotParam = timeSlotIndex >= 0 ? `&slot=${timeSlotIndex}` : '';
    const payLink = `${origin}/workshop-join/${params.formId}?pay=1&n=${encodeURIComponent(firstName)}&m=${phone.replace(/^91/, '')}${feeParam}${slotParam}`;

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
    const feeSuffix = feeLabel ? ` (${feeLabel})` : '';
    const message =
      `Namaste ${firstName}! 🙏\n\nTo confirm your seat for *${form.workshopName}*, please complete your payment of *${symbol}${price}${feeSuffix}*:\n${payLink}\n\nWe look forward to seeing you. — Swar Yoga`;
    const sent = await sendTextViaQrBridge(phone, message);

    return NextResponse.json({ success: true, whatsappSent: sent, payLink });
  } catch (err) {
    console.error('[workshop-join/pay-later] error:', err);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
