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
