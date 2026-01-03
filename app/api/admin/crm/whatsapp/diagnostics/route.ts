import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

function mask(v: string | undefined | null): string {
  const s = String(v || '');
  if (!s) return '';
  if (s.length <= 8) return '***';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/crm/whatsapp/diagnostics
 * Lightweight health report for both sending paths:
 * - Meta Cloud API credentials + basic reachability
 * - WhatsApp Web bridge reachability + authentication
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v19.0';

    const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim() || 'https://wa-bridge.swaryoga.com';

    const out: any = {
      meta: {
        configured: Boolean(metaAccessToken && metaPhoneNumberId),
        phoneNumberId: metaPhoneNumberId ? mask(metaPhoneNumberId) : '',
        accessToken: metaAccessToken ? mask(metaAccessToken) : '',
        connected: false,
        message: '',
      },
      bridge: {
        url: bridgeUrl,
        reachable: false,
        authenticated: false,
        message: '',
      },
    };

    // Meta quick check (non-fatal)
    if (!metaAccessToken || !metaPhoneNumberId) {
      out.meta.message = 'Missing WHATSAPP_ACCESS_TOKEN and/or WHATSAPP_PHONE_NUMBER_ID';
    } else {
      try {
        const res = await fetch(
          `https://graph.facebook.com/${graphVersion}/${metaPhoneNumberId}?fields=id,display_phone_number,quality_rating&access_token=${metaAccessToken}`,
          { method: 'GET', cache: 'no-store' }
        );
        const json = await safeJson(res);
        if (res.ok) {
          out.meta.connected = true;
          out.meta.message = `OK: ${json?.display_phone_number || 'connected'}`;
        } else {
          out.meta.message = json?.error?.message || `Meta API error (HTTP ${res.status})`;
        }
      } catch (e) {
        out.meta.message = `Meta network error: ${String(e)}`;
      }
    }

    // Bridge quick check (non-fatal)
    try {
      const res = await fetch(`${bridgeUrl.replace(/\/$/, '')}/api/status`, { method: 'GET', cache: 'no-store' });
      const json = await safeJson(res);
      if (res.ok) {
        out.bridge.reachable = true;
        // Support multiple bridge implementations
        out.bridge.authenticated = Boolean(json?.authenticated || json?.isAuthenticated);
        out.bridge.message = out.bridge.authenticated
          ? `OK: authenticated${json?.account?.phone ? ` (${json.account.phone})` : ''}`
          : 'Bridge reachable but NOT authenticated (scan QR)';
      } else {
        out.bridge.message = `Bridge error (HTTP ${res.status})`;
      }
    } catch (e) {
      out.bridge.message = `Bridge unreachable: ${String(e)}`;
    }

    return NextResponse.json({ success: true, data: out }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
