import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm, Order } from '@/lib/db';
import {
  cashfreeCreateOrder,
  getCashfreeEnv,
  getCashfreeSdkUrl,
  getCashfreeWebhookUrl,
} from '@/lib/payments/cashfree';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';
import { normalizePhone } from '@/lib/whatsapp';
import { resolveWorkshopFee } from '@/lib/workshopFees';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workshop-join/[formId]/pay
 *
 * PUBLIC (no login) Cashfree initiation for a workshop-join form.
 * SECURITY: the amount is read from the form in the DB — NEVER from the client —
 * so a visitor cannot tamper with the price. Returns a Cashfree
 * payment_session_id; the client launches the Cashfree JS SDK checkout.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    await connectDB();
    const form = await EnquiryForm.findOne({ formId: params.formId, isActive: true }).lean() as any;
    if (!form) return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });

    const body = await req.json().catch(() => ({} as any));
    // Client sends only the INDEX of the fee tier picked — the amount itself
    // is always resolved server-side from the form doc (see resolveWorkshopFee).
    const { price, label: feeLabel } = resolveWorkshopFee(form, body?.feeOptionIndex);
    if (price <= 0) {
      return NextResponse.json({ error: 'This workshop is free — no payment needed' }, { status: 400 });
    }

    // Client sends only the INDEX of the time slot picked — resolved
    // server-side from the form's own timeSlots so the group link/index
    // pair can't be tampered with (same protection as the fee tier above).
    const timeSlotIndex = Number.isInteger(Number(body?.timeSlotIndex)) ? Number(body.timeSlotIndex) : -1;
    const timeSlots = Array.isArray(form.timeSlots) ? form.timeSlots : [];
    const timeSlot = timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length ? timeSlots[timeSlotIndex] : null;

    const name = String(body?.name || '').trim();
    const mobileRaw = String(body?.mobile || '').trim();
    const email = String(body?.email || '').trim();
    const city = String(body?.city || '').trim();
    const phone = normalizePhone(mobileRaw) || mobileRaw.replace(/\D/g, '');

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    const firstName = name.split(' ')[0] || name;
    const lastName = name.split(' ').slice(1).join(' ');
    const payerEmail = email || `guest_${phone}@swaryoga.com`;
    const currency = (form.currency || 'INR').toUpperCase();
    const productInfo = String(feeLabel ? `${form.workshopName} (${feeLabel})` : form.workshopName || 'Swar Yoga Workshop').slice(0, 100);
    const cashfreeOrderId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    const userId = `guest:${phone}`;

    // Return to our own workshop handler so we can gate the group link behind a
    // verified payment (and WhatsApp the link). Cashfree appends ?order_id=.
    const returnUrl = `${getRequestBaseUrl(req)}/api/workshop-join/${params.formId}/pay-return`;
    const notifyUrl = getCashfreeWebhookUrl(req);

    // Create the Cashfree order (amount from the DB form — authoritative).
    const cf: any = await cashfreeCreateOrder({
      order_id: cashfreeOrderId,
      order_amount: Number(price.toFixed(2)),
      order_currency: currency,
      customer_details: {
        // Cashfree requires customer_id to be alphanumeric + underscore/hyphen
        // only — "guest:<phone>" (colon) was rejected outright with a 400,
        // which surfaced to the user as a generic "Failed to initiate payment".
        customer_id: String(userId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(-48),
        customer_name: firstName + (lastName ? ` ${lastName}` : ''),
        customer_email: payerEmail,
        customer_phone: phone,
      },
      order_note: productInfo,
      order_meta: { return_url: returnUrl, notify_url: notifyUrl },
    });

    const paymentSessionId = cf?.payment_session_id as string | undefined;
    if (!paymentSessionId) {
      console.error('[workshop-join/pay] Cashfree missing payment_session_id:', cf);
      return NextResponse.json({ error: 'Could not start payment' }, { status: 502 });
    }

    // Record a pending order so the existing Cashfree return/webhook can mark it paid.
    // Form linkage lives on the item (workshopSlug=formId).
    await Order.create({
      userId,
      items: [{
        kind: 'workshop',
        name: productInfo,
        price,
        quantity: 1,
        workshopSlug: params.formId,
        currency,
      }],
      total: price,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'cashfree',
      cashfreeOrderId,
      cashfreePaymentSessionId: paymentSessionId,
      ...(timeSlot ? { workshopTimeSlot: { index: timeSlotIndex, label: timeSlot.label || '', groupLink: timeSlot.groupLink || '' } } : {}),
      cashfreeOrderStatus: cf?.order_status || undefined,
      shippingAddress: { firstName, lastName, email: payerEmail, phone, city, address: '', state: '', zip: '' },
    });

    return NextResponse.json({
      success: true,
      paymentSessionId,
      env: getCashfreeEnv(),
      sdkUrl: getCashfreeSdkUrl(),
    });
  } catch (err) {
    console.error('[workshop-join/pay] error:', err);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}
