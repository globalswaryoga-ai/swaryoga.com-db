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
    const body = await request.json();
    if (body?.action !== 'autosave') {
      return NextResponse.json({ error: 'Reload Workshop Offer before saving: an unversioned overwrite is not allowed.' }, { status: 409 });
    }
    const { patch, previous } = body;
    const validState = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).every(key => key.startsWith('crm_') && !/token|secret|password/i.test(key));
    if (!validState(patch) || !validState(previous) || Object.keys(previous).some(key => !(key in patch))) {
      return NextResponse.json({ error: 'Invalid offer settings' }, { status: 400 });
    }
    const saved = await writeOfferState(viewer.superAdmin ? 'shared' : viewer.userId, patch, previous);
    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error('[offer state save]', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: message.includes('another tab') ? message : 'Offer settings were not saved. Please retry.' }, { status: message.includes('another tab') ? 409 : 503 });
  }
}
