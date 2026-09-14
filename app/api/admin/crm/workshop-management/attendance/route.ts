import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopAttendance } from '@/lib/schemas/workshopStudentManagementSchemas';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.studentId || !body.classDate) return NextResponse.json({ error: 'cohortId, studentId and classDate are required' }, { status: 400 });
  await connectDB();
  const durationSeconds = Math.max(0, Number(body.durationSeconds || 0));
  const classDurationSeconds = Math.max(1, Number(body.classDurationSeconds || 1));
  const attendance = await getWorkshopAttendance().findOneAndUpdate(
    { cohortId: body.cohortId, studentId: body.studentId, classDate: new Date(body.classDate) },
    { $set: { joined: durationSeconds > 0, joinedAt: body.joinedAt, leftAt: body.leftAt, durationSeconds, attendancePercent: Math.min(100, Math.round(durationSeconds / classDurationSeconds * 100)), source: body.source || 'manual' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json({ attendance });
}
