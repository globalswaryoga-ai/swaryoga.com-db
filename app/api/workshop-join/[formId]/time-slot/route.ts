import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import { normalizePhone } from '@/lib/whatsapp';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workshop-join/[formId]/time-slot
 *
 * PUBLIC (no login) — saves which batch time slot a registrant picked on the
 * "You're Registered!" confirmation screen. Fired independently of Pay
 * Now/Pay Later so it works for free workshops too (those never touch the
 * pay routes at all). Looked up by phone number, same key the initial
 * Join Now submit (app/api/workshop-join/[formId]/route.ts) uses to
 * find/create the Lead.
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
    const phone = normalizePhone(String(body?.mobile || '')) || String(body?.mobile || '').replace(/\D/g, '');
    if (!phone) return NextResponse.json({ error: 'Mobile is required' }, { status: 400 });

    // Resolve the slot server-side from the form's own array — never trust a
    // client-sent label/link, same protection the fee options already apply.
    const timeSlots = Array.isArray(form.timeSlots) ? form.timeSlots : [];
    const timeSlotIndex = Number(body?.timeSlotIndex);
    if (!Number.isInteger(timeSlotIndex) || timeSlotIndex < 0 || timeSlotIndex >= timeSlots.length) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
    }
    const slot = timeSlots[timeSlotIndex];

    const Lead = getLead();
    const lead = await Lead.findOne({ phoneNumber: phone });
    if (!lead) {
      // Not fatal — the Join Now submit may not have finished creating the
      // lead yet in a rare race, or the phone didn't match. Nothing to save to.
      return NextResponse.json({ success: true, saved: false });
    }

    lead.metadata = {
      ...(lead.metadata || {}),
      lastEnquiry: {
        ...((lead.metadata as any)?.lastEnquiry || {}),
        timeSlot: { index: timeSlotIndex, label: slot.label || '', groupLink: slot.groupLink || '' },
      },
    };
    await lead.save();

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error('[workshop-join/time-slot] error:', err);
    return NextResponse.json({ error: 'Failed to save time slot' }, { status: 500 });
  }
}
