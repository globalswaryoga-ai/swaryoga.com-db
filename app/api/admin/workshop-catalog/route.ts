import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listWorkshopCatalog,
  getWorkshopCatalogItem,
  saveWorkshopCatalogItem,
  deleteWorkshopCatalogItem,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

/** GET /api/admin/workshop-catalog — list all workshops from BunnyDB */
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workshops = await listWorkshopCatalog();
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

  const existing = await getWorkshopCatalogItem(slug);
  if (existing) return NextResponse.json({ error: 'Workshop with this name already exists' }, { status: 400 });

  const workshop = await saveWorkshopCatalogItem({
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

  const workshop = await saveWorkshopCatalogItem({
    slug: slug.trim(),
    name: name.trim(),
    category: category.trim(),
    modes: Array.isArray(modes) ? modes : undefined,
    languages: Array.isArray(languages) ? languages : undefined,
    duration: typeof duration === 'string' ? duration.trim() : undefined,
    isPublished: true,
  });

  return NextResponse.json({ success: true, workshop });
}

/**
 * DELETE /api/admin/workshop-catalog?slug=... (or ?slugs=a,b,c) — delete workshop(s)
 */
export async function DELETE(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const slugsParam = searchParams.get('slugs');

  const slugsToDelete = slugsParam
    ? slugsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : (slug ? [slug.trim()] : []);

  if (slugsToDelete.length === 0) {
    return NextResponse.json({ error: 'slug or slugs parameter is required' }, { status: 400 });
  }

  for (const s of slugsToDelete) {
    await deleteWorkshopCatalogItem(s);
  }

  return NextResponse.json({
    success: true,
    message: `${slugsToDelete.length} workshop(s) deleted successfully`,
  });
}

