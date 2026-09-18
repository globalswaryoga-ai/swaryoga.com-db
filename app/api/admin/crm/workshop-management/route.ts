import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getCohort, listCohorts, listStudents, listAttendance, listRecordings, saveCohort, updateCohort } from '@/lib/workshopBunnyRepository';

export const dynamic = 'force-dynamic';

function admin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const cohortId = request.nextUrl.searchParams.get('cohortId');
  if (cohortId) {
    try {
      const cohort = await getCohort(cohortId);
      if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      const [students, attendance, recordings] = await Promise.all([listStudents(cohortId), listAttendance(cohortId), listRecordings(cohortId)]);
      return NextResponse.json({ cohort, students, attendance, recordings });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load Bunny workshop' }, { status: 500 });
    }
  }
  try { return NextResponse.json({ cohorts: await listCohorts() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load Bunny workshops' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  try { return NextResponse.json({ cohort: await saveCohort(body, decoded.userId) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save Bunny workshop' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  const decoded = admin(request);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
  const googleFormLink = String(body.googleFormLink || '').trim();
  if (googleFormLink && !/^https?:\/\//i.test(googleFormLink)) {
    return NextResponse.json({ error: 'Google Forms link must start with http:// or https://' }, { status: 400 });
  }
  const cohort = await updateCohort(body.cohortId, { googleFormLink: googleFormLink || null });
  if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  return NextResponse.json({ cohort });
}
