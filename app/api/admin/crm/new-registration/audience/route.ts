import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { loadRegistrationAudience } from '@/lib/registrationAudienceRepository';
import { registrationWorkshops } from '@/lib/registrationState';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { state, rows } = await loadRegistrationAudience(viewer);
    return NextResponse.json({ success: true, data: rows, workshops: registrationWorkshops(state) },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to resolve registration audience:', error);
    return NextResponse.json({ error: 'Saved batch recipients could not be loaded. Retry; no records were removed.' }, { status: 503 });
  }
}
