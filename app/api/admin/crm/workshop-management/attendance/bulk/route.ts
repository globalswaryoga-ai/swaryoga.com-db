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
  const { cohortId, studentId, classDurationMinutes, rows } = body;
  if (!cohortId || !studentId || !Array.isArray(rows)) return NextResponse.json({ error: 'cohortId, studentId and rows are required' }, { status: 400 });
  const classDurationSeconds = Math.max(1, Number(classDurationMinutes || 60) * 60);
  let saved = 0;
  for (const row of rows.slice(0, 14)) {
    if (!row.classDate || row.holiday) continue;
    const durationSeconds = Math.max(0, Number(row.durationMinutes || 0) * 60);
    await upsertAttendance({ cohortId, studentId, classDate: row.classDate, joined: row.status === 'joined' || durationSeconds > 0, durationSeconds, attendancePercent: Math.min(100, Math.round(durationSeconds / classDurationSeconds * 100)), source: 'manual' });
    saved++;
  }
  return NextResponse.json({ success: true, saved });
}
