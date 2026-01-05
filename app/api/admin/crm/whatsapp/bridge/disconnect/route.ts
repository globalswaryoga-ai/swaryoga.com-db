import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const WHATSAPP_BRIDGE_HTTP_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

function bridgeUrl(path: string) {
  const base = WHATSAPP_BRIDGE_HTTP_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${normalized}`);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/crm/whatsapp/bridge/disconnect
 * Admin-only proxy route to disconnect the WhatsApp Web bridge.
 *
 * Body: { reinit?: boolean }
 * - reinit=true will immediately call /api/init after disconnect, so a new QR can be generated.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reinit = Boolean(body?.reinit);

    const disconnectUrl = bridgeUrl('/api/disconnect');
    const bridgeRes = await fetch(disconnectUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const text = await bridgeRes.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!bridgeRes.ok) {
      return NextResponse.json(
        {
          error: 'WhatsApp bridge disconnect failed',
          details: payload?.error || payload?.message || `Bridge returned ${bridgeRes.status}`,
        },
        { status: 503 }
      );
    }

    if (reinit) {
      const initUrl = bridgeUrl('/api/init');
      // Fire and wait: helps the UI get into "QR generated" state immediately.
      await fetch(initUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, data: { disconnected: true, reinit }, bridge: payload }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Failed to disconnect WhatsApp bridge',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
