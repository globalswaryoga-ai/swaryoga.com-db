export const dynamic = 'force-dynamic';
/**
 * Public Language Folders API (BunnyDB)
 * GET /api/language-folders - List active folders (public, no auth required)
 */

import { NextResponse } from 'next/server';
import { listLanguageFolders } from '@/lib/bunnyCourseRepository';

export async function GET() {
  try {
    const folders = await listLanguageFolders(true);

    return NextResponse.json({
      success: true,
      folders: folders.map((f) => ({
        _id: f.id,
        id: f.id,
        code: f.code,
        name: f.name,
        flag: f.flag,
        thumbnail: f.thumbnail,
        order: f.order,
      })),
    });
  } catch (error) {
    console.error('[Language Folders Public API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
