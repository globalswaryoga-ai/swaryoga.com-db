import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertAttendance } from '@/lib/workshopBunnyRepository';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.studentId || !body.classDate) return NextResponse.json({ error: 'cohortId, studentId and classDate are required' }, { status: 400 });
  const durationSeconds = Math.max(0, Number(body.durationSeconds || 0));
  const classDurationSeconds = Math.max(1, Number(body.classDurationSeconds || 1));
  const attendance = await upsertAttendance({ ...body, joined: durationSeconds > 0, durationSeconds, attendancePercent: Math.min(100, Math.round(durationSeconds / classDurationSeconds * 100)) });
  return NextResponse.json({ attendance });
}
