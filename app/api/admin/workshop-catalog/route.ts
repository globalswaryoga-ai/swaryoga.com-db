import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { connectDB, Workshop } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/admin/workshop-catalog — list all workshops from DB */
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const workshops = await Workshop.find().sort({ category: 1, name: 1 }).lean();
  return NextResponse.json({ success: true, data: workshops });
}

/** POST /api/admin/workshop-catalog — create a new workshop */
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const body = await req.json();
  const { name, category, modes, languages, duration } = body;

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  await connectDB();
  const existing = await Workshop.findOne({ slug });
  if (existing) return NextResponse.json({ error: 'Workshop with this name already exists' }, { status: 400 });

  const workshop = await Workshop.create({
    slug,
    name: name.trim(),
    category: category.trim(),
    modes: Array.isArray(modes) ? modes : ['online'],
    languages: Array.isArray(languages) ? languages : ['Hindi'],
    duration: duration?.trim() || '',
    isPublished: true,
  });

  return NextResponse.json({ success: true, workshop }, { status: 201 });
}

/**
 * PATCH /api/admin/workshop-catalog — rename/update a workshop.
 * Slug is the stable key (schedules reference it) and is never changed here.
 * Upserts so this also works for workshops that only exist in the static
 * catalog (lib/workshopsData.ts) and have no DB row yet.
 */
export async function PATCH(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const body = await req.json();
  const { slug, name, category, modes, languages, duration } = body;

  if (!slug?.trim()) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: 'category is required' }, { status: 400 });

  await connectDB();

  const update: Record<string, any> = {
    name: name.trim(),
    category: category.trim(),
  };
  if (Array.isArray(modes)) update.modes = modes;
  if (Array.isArray(languages)) update.languages = languages;
  if (typeof duration === 'string') update.duration = duration.trim();

  const workshop = await Workshop.findOneAndUpdate(
    { slug: slug.trim() },
    { $set: update, $setOnInsert: { slug: slug.trim(), isPublished: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return NextResponse.json({ success: true, workshop });
}
