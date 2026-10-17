import { NextRequest, NextResponse } from 'next/server';
import { workshopCatalog, WorkshopOverview } from '@/lib/workshopsData';
import {
  listWorkshopCatalog,
  getWorkshopCatalogItem,
  BunnyWorkshopCatalogItem,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

export function dbCatalogItemToOverview(
  item: BunnyWorkshopCatalogItem,
  fallbackIndex = 9000
): WorkshopOverview {
  return {
    id: fallbackIndex,
    name: item.name,
    slug: item.slug,
    image:
      item.metadata?.image ||
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    description:
      item.metadata?.description ||
      `${item.name} - Comprehensive Swar Yoga program designed for vitality, balance, and inner transformation.`,
    detailedDescription:
      item.metadata?.detailedDescription ||
      `${item.name} offers profound knowledge and practical techniques in Swar Yoga. Learn to harmonize your breath, mind, and energy for holistic well-being and daily success.`,
    videoUrl: item.metadata?.videoUrl || 'https://www.youtube.com/embed/_sVjfPam0SM',
    duration: item.duration || '15 days',
    level: item.metadata?.level || 'All Levels',
    category: item.category || 'Health',
    mode: item.modes?.length
      ? item.modes.map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
      : ['Online'],
    language: item.languages?.length ? item.languages : ['Hindi'],
    currency: ['INR', 'NPR', 'USD'],
  };
}

/**
 * GET /api/workshops/catalog
 * Public endpoint to list or fetch workshops from static catalog and BunnyDB.
 * Query param: ?slug=<slug> returns a single workshop.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get('slug') || '').trim();

    if (slug) {
      // 1. Check static catalog
      const staticWorkshop = workshopCatalog.find((w) => w.slug === slug);
      if (staticWorkshop) {
        return NextResponse.json({ success: true, workshop: staticWorkshop });
      }

      // 2. Check BunnyDB
      const dbItem = await getWorkshopCatalogItem(slug).catch(() => null);
      if (dbItem) {
        const workshop = dbCatalogItemToOverview(dbItem);
        return NextResponse.json({ success: true, workshop });
      }

      return NextResponse.json(
        { success: false, error: `Workshop '${slug}' not found` },
        { status: 404 }
      );
    }

    // Return all merged workshops
    const dbItems = await listWorkshopCatalog().catch(() => []);
    const staticSlugs = new Set(workshopCatalog.map((w) => w.slug));

    const merged: WorkshopOverview[] = [...workshopCatalog];

    dbItems.forEach((item, index) => {
      if (!staticSlugs.has(item.slug)) {
        merged.push(dbCatalogItemToOverview(item, 10000 + index));
      }
    });

    return NextResponse.json({ success: true, workshops: merged });
  } catch (err) {
    console.error('[GET /api/workshops/catalog] Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
