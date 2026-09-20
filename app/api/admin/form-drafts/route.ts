import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import FormDraft from '@/lib/models/FormDraft';

/** Helper to safely decode JWT */
function getDecoded(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch (e) {
    console.error('Token verification failed:', e);
    return null;
  }
}

/** POST – create or update a form draft */
export async function POST(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  await connectDB();
  const body = await req.json();
  const { draftId, title, description, sections, questions, theme } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const payload: any = { title: title.trim() };
  if (description !== undefined) payload.description = description?.trim() ?? '';
  if (sections !== undefined) payload.sections = sections;
  if (questions !== undefined) payload.questions = questions;
  if (theme !== undefined) payload.theme = theme;

  let draft;
  if (draftId) {
    // Update existing draft, ensure ownership
    draft = await FormDraft.findOneAndUpdate(
      { _id: draftId, ownerUserId: decoded.userId || decoded.username },
      { $set: payload },
      { new: true }
    );
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or permission denied' }, { status: 404 });
    }
  } else {
    // Create new draft
    draft = await FormDraft.create({
      ...payload,
      ownerUserId: decoded.userId || decoded.username,
    });
  }

  return NextResponse.json({ success: true, draft }, { status: 200 });
}

/** GET – fetch a draft by id */
export async function GET(req: NextRequest) {
  const decoded = getDecoded(req);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const draftId = searchParams.get('id');
  if (!draftId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  await connectDB();
  const draft = await FormDraft.findOne({ _id: draftId, ownerUserId: decoded.userId || decoded.username }).lean();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  return NextResponse.json({ success: true, draft }, { status: 200 });
}
