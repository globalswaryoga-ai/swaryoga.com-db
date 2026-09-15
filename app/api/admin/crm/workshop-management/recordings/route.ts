import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertRecording } from '@/lib/workshopBunnyRepository';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.classDate) return NextResponse.json({ error: 'cohortId and classDate are required' }, { status: 400 });
  const deliveredStudentIds = Array.isArray(body.deliveredStudentIds)
    ? body.deliveredStudentIds.filter(Boolean)
    : typeof body.deliveredStudentIds === 'string'
      ? body.deliveredStudentIds.split(',').map((id: string) => id.trim()).filter(Boolean)
      : [];

  const recording = await upsertRecording({ ...body, deliveredStudentIds });

  return NextResponse.json({ recording });
}
