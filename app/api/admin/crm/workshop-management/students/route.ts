import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getCohort, getStudent, updateWorkshopStudent, upsertStudent } from '@/lib/workshopBunnyRepository';

function getAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAdmin(request);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    if (!body.cohortId || !body.name) return NextResponse.json({ error: 'cohortId and name are required' }, { status: 400 });
    const student = await upsertStudent({ ...body, active: body.active !== false });
    return NextResponse.json({ student });
  } catch (error) {
    console.error('[workshop-students] POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save student' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const decoded = getAdmin(request);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const body = await request.json();
    if (!body.id || !body.cohortId) return NextResponse.json({ error: 'id and cohortId are required' }, { status: 400 });

    const existing = await getStudent(body.id);
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (existing.cohortId !== body.cohortId) return NextResponse.json({ error: 'Student does not belong to this workshop' }, { status: 403 });
    const cohort = await getCohort(body.cohortId);
    if (!cohort) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    const viewerId = decoded.userId || decoded.username;
    if (!isSuperAdmin(decoded, request) && cohort.createdByUserId && cohort.createdByUserId !== viewerId)
      return NextResponse.json({ error: 'This workshop belongs to another admin' }, { status: 403 });

    const update: Record<string, any> = {};
    for (const key of ['name', 'email', 'phone', 'whatsappNumber']) {
      if (body[key] !== undefined) update[key] = String(body[key] || '').trim();
    }
    if (body.active !== undefined) update.active = body.active !== false;
    if (update.name !== undefined && !update.name) return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    if (!Object.keys(update).length) return NextResponse.json({ error: 'No student fields to update' }, { status: 400 });
    const result = await updateWorkshopStudent(body.id, body.cohortId, update, body.expectedUpdatedAt);
    if (result.conflict) return NextResponse.json({ error: 'Student changed elsewhere. Retry to save your latest edits.', student: result.student }, { status: 409 });
    return NextResponse.json({ student: result.student });
  } catch (error) {
    console.error('[workshop-students] PATCH error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAdmin(request);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    await bunnyExecute({ sql: 'DELETE FROM workshop_students_sql WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[workshop-students] DELETE error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete student' }, { status: 500 });
  }
}
