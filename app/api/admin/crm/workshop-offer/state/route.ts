import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { readOfferState, writeOfferState } from '@/lib/workshopOfferRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    return NextResponse.json(await readOfferState(viewer.superAdmin ? 'shared' : viewer.userId), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[offer state]', error);
    return NextResponse.json({ error: 'Saved offer settings are unavailable; no data was removed.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const patch = await request.json();
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !key.startsWith('crm_') || /token|secret|password/i.test(key))) {
      return NextResponse.json({ error: 'Invalid offer settings' }, { status: 400 });
    }
    await writeOfferState(viewer.superAdmin ? 'shared' : viewer.userId, patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[offer state save]', error);
    return NextResponse.json({ error: 'Offer settings were not saved. Please retry.' }, { status: 503 });
  }
}
