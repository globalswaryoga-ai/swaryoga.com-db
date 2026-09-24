import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listForms,
  createForm,
  updateForm,
  deactivateForm,
  deleteForm,
} from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';

function getDecoded(req: NextRequest): any | null {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/** GET — list all enquiry forms (any logged-in admin) */
export async function GET(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const forms = await listForms();
    return NextResponse.json({ success: true, data: forms });
  } catch (err: any) {
    console.error('[GET /api/admin/enquiry-forms]', err?.message || err);
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}

/** POST — create a new enquiry form */
export async function POST(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.workshopName?.trim()) {
      return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
    }
    const form = await createForm(body);
    return NextResponse.json({ success: true, form, formId: form?.formId }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/enquiry-forms]', err?.message || err);
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}

/** PATCH — update a form */
export async function PATCH(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('id');
  if (!formId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const body = await req.json();
    const updated = await updateForm(formId, body);
    if (!updated) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json({ success: true, form: updated });
  } catch (err: any) {
    console.error('[PATCH /api/admin/enquiry-forms]', err?.message || err);
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}

/** DELETE — deactivate a form */
export async function DELETE(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('id');
  if (!formId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await deleteForm(formId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/enquiry-forms]', err?.message || err);
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}
