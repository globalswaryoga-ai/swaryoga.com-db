/**
 * Bunny Stream Video Listing API
 * GET /api/admin/videos/bunny?page=1&search=term  — List videos from Bunny Stream library
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


const BUNNY_API_BASE = 'https://video.bunnycdn.com';

function getConfig() {
  const apiKey = process.env.BUNNY_API_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!apiKey || !libraryId) throw new Error('Bunny Stream not configured');
  return { apiKey, libraryId };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { apiKey, libraryId } = getConfig();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const search = searchParams.get('search') || '';

    const url = new URL(`${BUNNY_API_BASE}/library/${libraryId}/videos`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('itemsPerPage', String(perPage));
    url.searchParams.set('orderBy', 'date');
    if (search) url.searchParams.set('search', search);

    const res = await fetch(url.toString(), {
      headers: { 'AccessKey': apiKey, accept: 'application/json' },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Bunny API: ${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();

    // Map Bunny response to a cleaner format
    const videos = (data.items || []).map((v: any) => ({
      videoId: v.guid,
      title: v.title || 'Untitled',
      status: v.status === 4 ? 'ready' : v.status === 3 ? 'processing' : v.status === 5 ? 'failed' : 'unknown',
      duration: v.length || 0,
      size: v.storageSize || 0,
      views: v.views || 0,
      dateCreated: v.dateUploaded,
      thumbnailUrl: v.thumbnailFileName
        ? `https://${v.thumbnailFileName}`
        : `https://vz-3a890d13-43d.b-cdn.net/${v.guid}/thumbnail.jpg`,
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${v.guid}`,
      directPlayUrl: `https://iframe.mediadelivery.net/play/${libraryId}/${v.guid}`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        videos,
        totalItems: data.totalItems || 0,
        currentPage: data.currentPage || page,
        itemsPerPage: data.itemsPerPage || perPage,
        totalPages: Math.ceil((data.totalItems || 0) / perPage),
      },
    });
  } catch (error: any) {
    console.error('[Bunny Videos API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
