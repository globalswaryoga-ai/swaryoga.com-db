import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/crm/media/bridge-download?messageId=<id>
 *
 * Downloads media from the WhatsApp Baileys bridge (server-side)
 * and streams it back to the browser. This avoids CORS issues
 * and works even when Bunny Storage is not configured.
 *
 * The bridge stores raw WhatsApp message protos in memory and
 * can download the media buffer on demand via /media/:messageId.
 */

const BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  'http://localhost:3333';

const BRIDGE_SECRET =
  process.env.WHATSAPP_BRIDGE_SECRET ||
  process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
  'swar-bridge-secret-2024';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Auth check — token from query param (for <img src>) or header
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const messageId = searchParams.get('messageId');
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId parameter' }, { status: 400 });
    }

    // Fetch media from bridge (server-side — no CORS issues)
    const bridgeMediaUrl = `${BRIDGE_URL}/media/${encodeURIComponent(messageId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let res;
    try {
      res = await fetch(bridgeMediaUrl, {
        method: 'GET',
        headers: { 'x-bridge-secret': BRIDGE_SECRET },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json({ error: 'Bridge timeout' }, { status: 504 });
      }
      throw err;
    }
    clearTimeout(timeout);

    if (!res.ok) {
      let errorDetail = '';
      try { errorDetail = await res.text(); } catch {}
      console.error(`[bridge-download] Bridge returned ${res.status}:`, errorDetail.substring(0, 200));
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, detail: errorDetail.substring(0, 100) },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = res.headers.get('content-disposition') || '';
    const buffer = await res.arrayBuffer();

    // Stream through to client — use 'inline' for browser display (img/video src)
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.byteLength.toString(),
    };
    // Force inline disposition for media display (overrides bridge's attachment setting)
    if (contentDisposition) {
      headers['Content-Disposition'] = contentDisposition.replace('attachment', 'inline');
    }

    return new NextResponse(buffer, { status: 200, headers });
  } catch (err: any) {
    console.error('[bridge-download] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to download media from bridge' },
      { status: 500 }
    );
  }
}
