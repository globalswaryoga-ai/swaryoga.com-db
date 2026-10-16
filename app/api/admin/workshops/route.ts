import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listWorkshopCatalog,
  getWorkshopCatalogItem,
  saveWorkshopCatalogItem,
} from '@/lib/bunnyWorkshopScheduleRepository';
import { listCohorts } from '@/lib/workshopBunnyRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workshops (SUPERADMIN ONLY)
 * List all workshops with their batches from BunnyDB
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const [catalogItems, cohorts]: [any[], any[]] = await Promise.all([
      listWorkshopCatalog(),
      listCohorts().catch(() => [] as any[]),
    ]);

    const enrichedWorkshops = catalogItems.map((item) => {
      const relatedCohorts = cohorts.filter((c: any) =>
        Boolean(
          c?.name?.toLowerCase().includes(item.name.toLowerCase()) ||
          c?._id?.toLowerCase().includes(item.slug.toLowerCase())
        )
      );

      return {
        _id: item.slug,
        id: item.slug,
        name: item.name,
        slug: item.slug,
        category: item.category,
        modes: item.modes,
        languages: item.languages,
        duration: item.duration,
        level: 'all',
        price: 0,
        isFree: false,
        isActive: item.isPublished,
        batchCount: relatedCohorts.length,
        videoCount: 0,
        recentBatches: relatedCohorts.slice(0, 5),
        createdAt: item.createdAt,
      };
    });

    return NextResponse.json({ success: true, workshops: enrichedWorkshops });
  } catch (error: any) {
    console.error('[Workshops API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops (SUPERADMIN ONLY)
 * Create a new workshop in BunnyDB
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, category = 'General', duration, modes, languages } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Workshop name is required' }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await getWorkshopCatalogItem(slug);
    if (existing) {
      return NextResponse.json({ error: 'Workshop with this name already exists' }, { status: 400 });
    }

    const workshop = await saveWorkshopCatalogItem({
      slug,
      name: name.trim(),
      category: category.trim(),
      duration: duration?.trim() || '',
      modes: Array.isArray(modes) ? modes : ['online'],
      languages: Array.isArray(languages) ? languages : ['Hindi'],
      isPublished: true,
    });

    return NextResponse.json({
      success: true,
      workshop: {
        _id: workshop.slug,
        id: workshop.slug,
        ...workshop,
      },
    });
  } catch (error: any) {
    console.error('[Create Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { workshopId, name, category, duration, isPublished } = body;

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const existing = await getWorkshopCatalogItem(workshopId);
    if (!existing) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const workshop = await saveWorkshopCatalogItem({
      slug: workshopId,
      name: name ? name.trim() : existing.name,
      category: category ? category.trim() : existing.category,
      duration: duration !== undefined ? duration.trim() : existing.duration,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
    });

    return NextResponse.json({ success: true, workshop });
  } catch (error: any) {
    console.error('[Update Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const existing = await getWorkshopCatalogItem(workshopId);
    if (existing) {
      await saveWorkshopCatalogItem({
        ...existing,
        isPublished: false,
      });
    }

    return NextResponse.json({ success: true, message: 'Workshop deactivated' });
  } catch (error: any) {
    console.error('[Delete Workshop Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
