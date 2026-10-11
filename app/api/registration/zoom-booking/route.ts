import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { registrationZoomSlots, ensureRegistrationZoomBookings } from '@/lib/registrationZoom';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { bunnyBatch } from '@/lib/bunnyDatabase';
import { normalizePhone } from '@/lib/whatsapp';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const batchId = new URL(request.url).searchParams.get('batchId');
    if (!batchId || !/^[\w-]+$/.test(batchId)) return NextResponse.json({ error: 'Valid batch ID required' }, { status: 400 });
    const slots = await registrationZoomSlots(batchId);
    return NextResponse.json({ success: true, data: Object.fromEntries(Object.entries(slots).map(([date, entries]) => [date, entries.map(slot => ({ time: slot.time }))])) });
  } catch (error) {
    console.error('Failed to load Zoom booking slots:', error);
    return NextResponse.json({ error: 'Meeting slots are unavailable. Please retry.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(getClientId(request.headers), { windowMs: 15 * 60 * 1000, maxRequests: 10 });
  if (!limit.allowed) return NextResponse.json({ error: 'Too many booking attempts. Please try again later.' }, { status: 429 });
  try {
    const body = await request.json();
    const phone = normalizePhone(body.whatsapp);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[\w-]+$/.test(body.batchId || '') || !body.name?.trim() || !/^\d{10,15}$/.test(phone) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) {
      return NextResponse.json({ error: 'A valid name, WhatsApp number, email, batch, date and time are required' }, { status: 400 });
    }
    const slots = await registrationZoomSlots(body.batchId);
    const slot = slots[body.date]?.find(candidate => candidate.time === body.time);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!slot || body.date < today || !/^https:\/\/([\w-]+\.)?zoom\.us\//.test(slot.link)) {
      return NextResponse.json({ error: 'This meeting slot is no longer available' }, { status: 409 });
    }
    const lead = (await loadBunnyLeads()).find(candidate =>
      normalizePhone(candidate.phoneNumber) === phone && String(candidate.email || '').trim().toLowerCase() === email);
    if (!lead) return NextResponse.json({ error: 'Use the WhatsApp number and email from your workshop registration.' }, { status: 404 });
    await ensureRegistrationZoomBookings();
    const id = createHash('sha256').update(JSON.stringify([body.batchId, lead._id])).digest('hex');
    const now = new Date().toISOString();
    const booking = { batchId: body.batchId, leadId: lead._id, date: body.date, time: slot.time, link: slot.link };
    await bunnyBatch([
      {
        sql: `INSERT INTO registration_zoom_bookings_sql (document_id, batch_id, lead_id, booking_date, booking_time, data_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(document_id) DO UPDATE SET booking_date = excluded.booking_date,
          booking_time = excluded.booking_time, data_json = excluded.data_json, updated_at = excluded.updated_at`,
        args: [id, body.batchId, String(lead._id), body.date, slot.time, JSON.stringify(booking), now],
      },
      {
        sql: "UPDATE leads_sql SET data_json = json_set(data_json, '$.metadata.zoomBooking', json(?)) WHERE document_id = ?",
        args: [JSON.stringify(booking), String(lead._id)],
      },
    ]);
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('Failed to persist Zoom booking:', error);
    return NextResponse.json({ error: 'Your booking was not saved. Please retry.' }, { status: 500 });
  }
}
