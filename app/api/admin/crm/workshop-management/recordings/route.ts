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

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  
  const { bunnyExecute } = await import('@/lib/bunnyDatabase');
  
  const sets = [];
  const args = [];
  if (body.dayNumber !== undefined) {
    sets.push('day_number = ?');
    args.push(body.dayNumber ? Number(body.dayNumber) : null);
  }
  
  if (body.subject !== undefined) {
    const existing = await bunnyExecute({ sql: 'SELECT metadata_json FROM workshop_recordings_sql WHERE id = ?', args: [body.id] });
    const metadata = JSON.parse(existing.rows[0]?.metadata_json || '{}');
    metadata.subject = body.subject;
    sets.push('metadata_json = ?');
    args.push(JSON.stringify(metadata));
  }
  
  if (sets.length === 0) return NextResponse.json({ success: true });
  
  args.push(new Date().toISOString());
  args.push(body.id);
  
  await bunnyExecute({
    sql: `UPDATE workshop_recordings_sql SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`,
    args
  });
  
  return NextResponse.json({ success: true });
}
