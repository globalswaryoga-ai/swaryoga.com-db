import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { AVATAR_DNA_50_CATALOG } from '@/lib/mohanAiClone/avatarDna50Catalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/avatar/dna-looks
 * Returns all 50+ Avatar DNA looks from Bunny Database (LibSQL).
 */
export async function GET() {
  try {
    const res = await bunnyExecute(`
      SELECT id, title, heading, description, video_url, thumbnail_url,
             look_category, outfit_style, emotion_profile, speaking_tone,
             duration_seconds, is_active, source_type, created_at, updated_at
      FROM mohan_avatar_dna_looks_sql
      ORDER BY is_active DESC, created_at ASC
    `);

    if (res.rows && res.rows.length >= 50) {
      return NextResponse.json({
        success: true,
        looks: res.rows,
        total: res.rows.length,
        source: 'bunny_sql',
      });
    }

    // Fallback or merge with catalog if rows are fewer than 50
    return NextResponse.json({
      success: true,
      looks: AVATAR_DNA_50_CATALOG,
      total: AVATAR_DNA_50_CATALOG.length,
      source: 'catalog_fallback',
    });
  } catch (error: any) {
    console.error('Error fetching avatar dna looks:', error);
    // Graceful fallback to static catalog
    return NextResponse.json({
      success: true,
      looks: AVATAR_DNA_50_CATALOG,
      total: AVATAR_DNA_50_CATALOG.length,
      source: 'static_catalog',
    });
  }
}

/**
 * POST /api/avatar/dna-looks
 * Upsert or activate a specific DNA look
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing avatar ID' }, { status: 400 });
    }

    if (is_active !== undefined) {
      // Deactivate others if this is set to active
      if (is_active === 1 || is_active === true) {
        await bunnyExecute(`UPDATE mohan_avatar_dna_looks_sql SET is_active = 0`);
      }
      await bunnyExecute({
        sql: `UPDATE mohan_avatar_dna_looks_sql SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [is_active ? 1 : 0, id],
      });
    }

    return NextResponse.json({ success: true, message: `Avatar look ${id} updated` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
