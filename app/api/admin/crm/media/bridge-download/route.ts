import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

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

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

async function resolveBridgeConfig(userId: string) {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings = await CRMUserSettings.findOne(
    { userId },
    { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1 }
  ).lean() as any;

  if (settings?.permanentTenantId) {
    return {
      bridgeUrl: BRIDGE_URL,
      bridgeSecret: BRIDGE_SECRET,
      bridgeSessionId: settings.permanentTenantId,
      tenantId: settings.permanentTenantId,
      hasOwnBridge: true,
    };
  }

  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      bridgeSessionId: userId,
      tenantId: null,
      hasOwnBridge: true,
    };
  }

  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    bridgeSessionId: userId,
    tenantId: null,
    hasOwnBridge: false,
  };
}


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

    const viewerUserId = getViewerUserId(decoded as any);
    const bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!bridgeConfig.hasOwnBridge) {
      return NextResponse.json(
        { error: 'Media download requires an isolated QR WhatsApp session.' },
        { status: 403 }
      );
    }

    const messageId = searchParams.get('messageId');
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId parameter' }, { status: 400 });
    }

    // Fetch media from bridge (server-side — no CORS issues)
    // Must pass x-user-id so the bridge routes to the correct per-user session
    const bridgeMediaUrl = `${bridgeConfig.bridgeUrl}/media/${encodeURIComponent(messageId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let res;
    try {
      res = await fetch(bridgeMediaUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': bridgeConfig.bridgeSecret,
          'x-user-id': viewerUserId,
          'x-session-key': bridgeConfig.bridgeSessionId,
          ...(bridgeConfig.tenantId ? { 'x-tenant-id': bridgeConfig.tenantId } : {}),
        },
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
      const errorMessage = res.status === 404
        ? 'Media is no longer available in the live QR session.'
        : `Bridge error: ${res.status}`;
      return NextResponse.json(
        { error: errorMessage, detail: errorDetail.substring(0, 100) },
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
