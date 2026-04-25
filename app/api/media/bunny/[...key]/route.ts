import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { extractUserIdFromKey } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';


/**
 * GET /api/media/bunny/[...key]
 * 
 * Proxy for Bunny Storage files.
 * - Public files (non-user paths): No auth required, aggressive caching.
 * - User compartment files (users/{userId}/...): Requires auth, validates ownership.
 *   Only the owning user or Super Admin can access user-scoped files.
 */

const REGION_HOSTS: Record<string, string> = {
  de: 'storage.bunnycdn.com',
  ny: 'ny.storage.bunnycdn.com',
  la: 'la.storage.bunnycdn.com',
  sg: 'sg.storage.bunnycdn.com',
  syd: 'syd.storage.bunnycdn.com',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const keyParts = params.key;
    if (!keyParts || keyParts.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const storageKey = keyParts.join('/');

    // ===== USER COMPARTMENT ACCESS CONTROL =====
    // Files under users/{userId}/ require authentication and ownership check
    const fileOwner = extractUserIdFromKey(storageKey);
    if (fileOwner) {
      const authHeader = request.headers.get('authorization') || '';
      const tokenParam = new URL(request.url).searchParams.get('token');
      const token = authHeader || (tokenParam ? `Bearer ${tokenParam}` : '');
      
      let decoded: any;
      try {
        decoded = verifyToken(token);
      } catch {
        return new NextResponse('Unauthorized: login required to access user files', { status: 401 });
      }

      if (!decoded?.userId || !decoded?.isAdmin) {
        return new NextResponse('Unauthorized', { status: 401 });
      }

      const viewerId = getViewerUserId(decoded);
      if (viewerId !== fileOwner && !isSuperAdmin(decoded)) {
        return new NextResponse('Forbidden: this file belongs to another user', { status: 403 });
      }
    }

    const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const apiKey = process.env.BUNNY_STORAGE_API_KEY;
    const region = process.env.BUNNY_STORAGE_REGION || 'de';
    const storageHost = REGION_HOSTS[region] || REGION_HOSTS.de;

    if (!zoneName || !apiKey) {
      return new NextResponse('Storage not configured', { status: 500 });
    }

    const url = `https://${storageHost}/${zoneName}/${storageKey}`;
    
    const response = await fetch(url, {
      headers: { AccessKey: apiKey },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new NextResponse('Not Found', { status: 404 });
      }
      return new NextResponse('Storage Error', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || guessContentType(storageKey);
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[Bunny Media Proxy] Error:', error?.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function guessContentType(key: string): string {
  const ext = key.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    pdf: 'application/pdf', mp3: 'audio/mpeg', ogg: 'audio/ogg',
  };
  return types[ext || ''] || 'application/octet-stream';
}
