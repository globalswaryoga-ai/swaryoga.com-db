import { NextRequest, NextResponse } from 'next/server';
import { connectDB, EnquiryForm } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

/** Sanitize a client-submitted feeOptions array into a safe, valid shape. */
function sanitizeFeeOptions(raw: unknown): { label: string; price: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: any) => ({ label: String(f?.label || '').trim(), price: Math.max(0, Number(f?.price) || 0) }))
    .filter((f) => f.label || f.price > 0);
}

/** Sanitize a client-submitted timeSlots array into a safe, valid shape. */
function sanitizeTimeSlots(raw: unknown): { label: string; groupLink: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({ label: String(t?.label || '').trim(), groupLink: String(t?.groupLink || '').trim() }))
    .filter((t) => t.label || t.groupLink);
}

/** GET — list all enquiry forms (superadmin only) */
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  await connectDB();
  const forms = await EnquiryForm.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: forms });
}

/** POST — create a new enquiry form */
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const body = await req.json();
  const { workshopName, workshopDate, workshopTime, workshopMode, workshopId, description, workshopImage, price, currency, groupLink, feeOptions, timeSlots } = body;

  if (!workshopName?.trim()) {
    return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
  }

  const formId = nanoid(8); // e.g. "aB3xY7qW"
  const sanitizedFeeOptions = sanitizeFeeOptions(feeOptions);
  const sanitizedTimeSlots = sanitizeTimeSlots(timeSlots);
  // Legacy `price` mirrors the lowest fee option so any code still reading it
  // directly (list views, etc.) shows a sane value.
  const legacyPrice = sanitizedFeeOptions.length
    ? Math.min(...sanitizedFeeOptions.map((f) => f.price))
    : Math.max(0, Number(price) || 0);

  await connectDB();
  const form = await EnquiryForm.create({
    formId,
    workshopName: workshopName.trim(),
    workshopDate: workshopDate?.trim() || '',
    workshopTime: workshopTime?.trim() || '',
    workshopMode: workshopMode || 'online',
    workshopId: workshopId?.trim() || '',
    description: description?.trim() || '',
    workshopImage: workshopImage?.trim() || '',
    price: legacyPrice,
    currency: (currency?.trim() || 'INR').toUpperCase(),
    feeOptions: sanitizedFeeOptions,
    groupLink: groupLink?.trim() || '',
    timeSlots: sanitizedTimeSlots,
    isActive: true,
  });

  return NextResponse.json({ success: true, form, formId }, { status: 201 });
}

/** PATCH — toggle active / update */
export async function PATCH(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('id');
  if (!formId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  if (body.feeOptions !== undefined) {
    body.feeOptions = sanitizeFeeOptions(body.feeOptions);
    if (body.feeOptions.length) {
      body.price = Math.min(...body.feeOptions.map((f: { price: number }) => f.price));
    }
  }
  if (body.timeSlots !== undefined) {
    body.timeSlots = sanitizeTimeSlots(body.timeSlots);
  }
  await connectDB();
  const updated = await EnquiryForm.findOneAndUpdate({ formId }, { $set: body }, { new: true });
  if (!updated) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  return NextResponse.json({ success: true, form: updated });
}

/** DELETE — deactivate a form */
export async function DELETE(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('id');
  if (!formId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await connectDB();
  await EnquiryForm.findOneAndUpdate({ formId }, { $set: { isActive: false } });
  return NextResponse.json({ success: true });
}
