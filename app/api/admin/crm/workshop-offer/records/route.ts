import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { listOfferRecords, patchOfferRecord } from '@/lib/workshopOfferRepository';
import { validateOfferTransition } from '@/lib/workshopOfferWorkflow';
import { offerContact } from '@/lib/workshopOfferContacts';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    return NextResponse.json({ data: await listOfferRecords(viewer.superAdmin ? 'shared' : viewer.userId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[offer records]', error);
    return NextResponse.json({ error: 'Payment records could not be loaded' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { leadId, patch } = await request.json();
    const allowed = ['amount', 'status', 'date', 'paymentMode', 'remark', 'pushedToReceipts', 'pushedToCreateReceipts', 'batchId', 'workshopName'];
    if (typeof leadId !== 'string' || !leadId || leadId.length > 200 || !patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !allowed.includes(key)) || JSON.stringify(patch).length > 8000) {
      return NextResponse.json({ error: 'Invalid offer update' }, { status: 400 });
    }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    if (!await offerContact(leadId, viewer)) return NextResponse.json({ error: 'Saved form response not found in your account' }, { status: 404 });
    const records = await listOfferRecords(scope);
    try { validateOfferTransition(records[leadId] || {}, patch); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid payment' }, { status: 400 }); }
    await patchOfferRecord(scope, leadId, { ...patch, needsVerification: patch.status === 'received' ? false : records[leadId]?.needsVerification || false, updatedByUserId: viewer.userId }, records[leadId] || {});
    return NextResponse.json({ success: true, data: { ...records[leadId], ...patch } });
  } catch (error) {
    console.error('[offer record save]', error);
    if (error instanceof Error && error.message.startsWith('Payment changed')) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: 'Payment changes were not saved. Please retry.' }, { status: 503 });
  }
}
