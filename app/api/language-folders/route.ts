export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
/**
 * Public Language Folders API (BunnyDB)
 * GET /api/language-folders - List active folders (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listLanguageFolders } from '@/lib/bunnyCourseRepository';

export async function GET(request: NextRequest) {
  try {
    const folders = await listLanguageFolders(true);
    console.log('[Language Folders Public API] Found active folders count:', folders.length);

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[Language Folders Public API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
