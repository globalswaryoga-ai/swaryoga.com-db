import { NextRequest, NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { getCohort } from '@/lib/workshopBunnyRepository';
import { syncWorkshopWhatsappStudents } from '@/lib/workshopWhatsappStudents';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  const cohortId = String(body.cohortId || '').trim();
  if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
  const cohort = await getCohort(cohortId);
  if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  if (!viewer.superAdmin && cohort.createdByUserId !== viewer.userId)
    return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });
  try {
    return NextResponse.json({ success: true, ...await syncWorkshopWhatsappStudents(cohortId, viewer) });
  } catch (error) {
    console.error('[workshop-whatsapp-students]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'WhatsApp student sync failed' }, { status: 502 });
  }
}
