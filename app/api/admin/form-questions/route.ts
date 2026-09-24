import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listQuestions,
  getQuestionByFieldKey,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';

function getDecoded(req: NextRequest): any | null {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

function isAuthorized(req: NextRequest): boolean {
  // Allow in dev without token; in prod require superadmin
  if (process.env.NODE_ENV !== 'production') return true;
  const decoded = getDecoded(req);
  return !!(decoded?.isAdmin);
}

/** GET — list questions (optionally filtered by ?formId=) */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId') ?? undefined;
    const questions = await listQuestions(formId);
    return NextResponse.json({ success: true, questions });
  } catch (err: any) {
    console.error('[GET /api/admin/form-questions]', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/** POST — create a question */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fieldKey, formId, questionType, label } = body;

    if (!fieldKey?.trim()) {
      return NextResponse.json({ success: false, error: 'Field key is required' }, { status: 400 });
    }
    const validTypes = ['dropdown', 'text', 'paragraph', 'radio', 'checkbox', 'info', 'payment'];
    if (!questionType || !validTypes.includes(questionType)) {
      return NextResponse.json({ success: false, error: 'Valid question type is required' }, { status: 400 });
    }
    if (!label?.en?.trim()) {
      return NextResponse.json({ success: false, error: 'English label is required' }, { status: 400 });
    }

    const sanitizedKey = fieldKey.trim().replace(/[^a-zA-Z0-9_]/g, '');

    // Check duplicate field key within same form
    const existing = await getQuestionByFieldKey(formId, sanitizedKey);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Field key "${sanitizedKey}" already exists for this form` },
        { status: 400 }
      );
    }

    const question = await createQuestion({ ...body, fieldKey: sanitizedKey });
    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/admin/form-questions]', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/** PATCH — update a question by ?id= */
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  try {
    const body = await req.json();
    const updated = await updateQuestion(id, body);
    if (!updated) return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    return NextResponse.json({ success: true, question: updated });
  } catch (err: any) {
    console.error('[PATCH /api/admin/form-questions]', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

/** DELETE — delete a question by ?id= */
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  try {
    await deleteQuestion(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/form-questions]', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
