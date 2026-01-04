import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const WHATSAPP_BRIDGE_HTTP_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

function bridgeUrl(path: string) {
  const base = WHATSAPP_BRIDGE_HTTP_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${normalized}`);
}

// Avoid caching this status in serverless environments.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/whatsapp/bridge/status
 * Server-side proxy to the WhatsApp Web bridge status endpoint.
 *
 * Why:
 * - Prevents browser CORS errors (crm.swaryoga.com -> wa-bridge.swaryoga.com)
 * - Keeps auth/admin gate consistent
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const statusUrl = bridgeUrl('/api/status');
    const bridgeRes = await fetch(statusUrl.toString(), {
      method: 'GET',
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
          error: 'WhatsApp bridge status failed',
          details: payload?.error || `Bridge returned ${bridgeRes.status}`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Failed to fetch WhatsApp bridge status',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
