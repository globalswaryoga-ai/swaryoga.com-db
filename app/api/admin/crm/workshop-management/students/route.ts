import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopStudent } from '@/lib/schemas/workshopStudentManagementSchemas';
import { syncWorkshopStudentLead } from '@/lib/workshopStudentLeadSync';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.cohortId || !body.name) return NextResponse.json({ error: 'cohortId and name are required' }, { status: 400 });
  await connectDB();
  const decoded: any = verifyToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const lead = await syncWorkshopStudentLead({ ...body, ownerUserId: decoded?.userId });
  const Student = getWorkshopStudent();
  const student = await Student.findOneAndUpdate(
    { cohortId: body.cohortId, ...(body.whatsappJid ? { whatsappJid: body.whatsappJid } : { phone: body.phone }) },
    { $set: { ...body, ...lead, active: body.active !== false } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json({ student });
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const body = await request.json();
  if (!body.id || !body.name?.trim()) return NextResponse.json({ error: 'id and name are required' }, { status: 400 });

  await connectDB();
  const Student = getWorkshopStudent();
  const existing: any = await Student.findById(body.id).lean();
  if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const decoded: any = verifyToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const update = {
    name: String(body.name).trim(),
    email: String(body.email || '').trim() || undefined,
    phone: String(body.phone || '').trim() || undefined,
    whatsappNumber: String(body.whatsappNumber || '').trim() || undefined,
    active: body.active !== false,
  };
  const lead = await syncWorkshopStudentLead({ ...existing, ...update, ownerUserId: decoded?.userId });
  const student = await Student.findByIdAndUpdate(body.id, { $set: { ...update, ...lead } }, { new: true });
  return NextResponse.json({ student });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await connectDB();
  await getWorkshopStudent().findByIdAndUpdate(id, { $set: { active: false } });
  return NextResponse.json({ success: true });
}
