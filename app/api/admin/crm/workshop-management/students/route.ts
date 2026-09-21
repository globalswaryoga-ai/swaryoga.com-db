import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getStudent, upsertStudent, deactivateStudent } from '@/lib/workshopBunnyRepository';


function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.name) return NextResponse.json({ error: 'cohortId and name are required' }, { status: 400 });
  const student = await upsertStudent({ ...body, active: body.active !== false });
  return NextResponse.json({ student });
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.id || !body.name?.trim()) return NextResponse.json({ error: 'id and name are required' }, { status: 400 });

  const existing: any = await getStudent(body.id);
  if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const update = {
    name: String(body.name).trim(),
    email: String(body.email || '').trim() || undefined,
    phone: String(body.phone || '').trim() || undefined,
    whatsappNumber: String(body.whatsappNumber || '').trim() || undefined,
    active: body.active !== false,
  };
  const student = await upsertStudent({ ...existing, ...update, cohortId: existing.cohortId }, body.id);
  return NextResponse.json({ student });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deactivateStudent(id);
  return NextResponse.json({ success: true });
}
