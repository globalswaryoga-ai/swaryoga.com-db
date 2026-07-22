import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Order, EnquiryForm } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { cashfreeGetOrder } from '@/lib/payments/cashfree';
import { sendTextViaQrBridge } from '@/lib/qrBridgeSend';

export const dynamic = 'force-dynamic';

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', NPR: 'रू' };

/**
 * GET /api/workshop-join/[formId]/pay-return
 *
 * Cashfree redirects the payer here after checkout. We verify the order status
 * server-side, mark the Order paid/failed, and (on success) WhatsApp the group
 * link to the payer. Then we bounce back to the join page with ?paid=<orderId>,
 * which the page server-verifies before REVEALING the group link on screen.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { formId: string } }
) {
  const url = new URL(req.url);
  const back = (qs: string) =>
    NextResponse.redirect(new URL(`/workshop-join/${params.formId}?${qs}`, url.origin));

  try {
    const cashfreeOrderId =
      url.searchParams.get('order_id') ||
      url.searchParams.get('orderId') ||
      url.searchParams.get('cf_order_id') || '';
    if (!cashfreeOrderId) return back('payfailed=1');

    await connectDB();
    const order = await Order.findOne({ cashfreeOrderId });
    if (!order) return back('payfailed=1');

    const cf: any = await cashfreeGetOrder(cashfreeOrderId);
    const cfStatus = String(cf?.order_status || cf?.orderStatus || '').toUpperCase();
    const paid = cfStatus === 'PAID';

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentStatus: paid ? 'completed' : (['FAILED', 'CANCELLED', 'EXPIRED'].includes(cfStatus) ? 'failed' : 'pending'),
          status: paid ? 'completed' : (['FAILED', 'CANCELLED', 'EXPIRED'].includes(cfStatus) ? 'failed' : 'pending'),
          cashfreeOrderStatus: cfStatus || undefined,
          updatedAt: new Date(),
        },
      }
    );

    if (!paid) return back('payfailed=1');

    // ── Paid: deliver the group link on WhatsApp + mark the lead paid ──
    try {
      const form = await EnquiryForm.findOne({ formId: params.formId }).lean() as any;
      const phone = String((order as any)?.shippingAddress?.phone || '').replace(/\D/g, '');
      const firstName = String((order as any)?.shippingAddress?.firstName || 'there');

      if (form && phone) {
        const currency = (form.currency || 'INR').toUpperCase();
        const symbol = CURRENCY_SYMBOL[currency] || '';
        // Use the slot resolved+stored at checkout (pay/route.ts) — each time
        // slot has its own group — falling back to the legacy single group
        // link for forms with no time slots.
        const slot = (order as any).workshopTimeSlot;
        const effectiveGroupLink = slot?.groupLink || form.groupLink;
        if (effectiveGroupLink) {
          const slotSuffix = slot?.label ? ` (${slot.label})` : '';
          const msg =
            `Payment received, ${firstName}! ✅\n\nThank you for joining *${form.workshopName}*${slotSuffix} (${symbol}${form.price}).\n\nJoin the workshop WhatsApp group here:\n${effectiveGroupLink}\n\n— Swar Yoga 🙏`;
          await sendTextViaQrBridge(phone, msg);
        }

        // Mark the lead as paid (best-effort).
        try {
          const Lead = getLead();
          const lead = await Lead.findOne({ phoneNumber: phone });
          if (lead) {
            lead.metadata = {
              ...(lead.metadata || {}),
              payment: {
                ...((lead.metadata as any)?.payment || {}),
                status: 'paid',
                amount: form.price,
                currency,
                workshopName: form.workshopName,
                formId: params.formId,
                paidAt: new Date(),
              },
            };
            lead.labels = Array.from(new Set([...(lead.labels || []).filter((l: string) => l !== 'payment-pending'), 'paid']));
            await lead.save();
          }
        } catch (e) { console.error('[pay-return] lead update failed:', e); }
      }
    } catch (e) {
      console.error('[pay-return] post-payment delivery failed:', e);
    }

    // Carry the chosen time slot back in the redirect URL so the client can
    // restore it on mount (the page fully reloads after the Cashfree round trip).
    const returnedSlotIndex = (order as any).workshopTimeSlot?.index;
    const slotParam = Number.isInteger(returnedSlotIndex) ? `&slot=${returnedSlotIndex}` : '';
    return back(`paid=${encodeURIComponent(cashfreeOrderId)}${slotParam}`);
  } catch (err) {
    console.error('[workshop-join/pay-return] error:', err);
    return back('payfailed=1');
  }
}
