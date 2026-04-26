import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { getWhatsAppWebhookEvent } from '@/lib/schemas/enterpriseSchemas';
import { generateAppSecretProof } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url


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
 * Lightweight health report for WhatsApp connectivity
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    await connectDB();
    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();

    const metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v24.0';

    const out: any = {
      meta: {
        configured: Boolean(metaAccessToken && metaPhoneNumberId),
        phoneNumberId: metaPhoneNumberId ? mask(metaPhoneNumberId) : '',
        accessToken: metaAccessToken ? mask(metaAccessToken) : '',
        appSecret: metaAppSecret ? 'SET' : 'MISSING',
        connected: false,
        message: '',
      },
    };

    // Webhook stats
    try {
      const lastEvent = await WhatsAppWebhookEvent.findOne({ kind: 'unknown', ok: true })
        .sort({ receivedAt: -1 })
        .lean();
      const lastInbound = await WhatsAppWebhookEvent.findOne({ kind: 'inbound_message', ok: true })
        .sort({ receivedAt: -1 })
        .lean();
      const lastStatus = await WhatsAppWebhookEvent.findOne({ kind: 'status_update', ok: true })
        .sort({ receivedAt: -1 })
        .lean();

      out.webhooks = {
        lastHit: lastEvent?.receivedAt || null,
        lastInbound: lastInbound?.receivedAt || null,
        lastStatus: lastStatus?.receivedAt || null,
      };
    } catch (e) {
      out.webhooks = { error: String(e) };
    }

    // Meta quick check (non-fatal)
    if (!metaAccessToken || !metaPhoneNumberId) {
      out.meta.message = 'Missing WHATSAPP_ACCESS_TOKEN and/or WHATSAPP_PHONE_NUMBER_ID';
    } else {
      try {
        const proof = generateAppSecretProof(metaAccessToken, metaAppSecret);
        let url = `https://graph.facebook.com/${graphVersion}/${metaPhoneNumberId}?fields=id,display_phone_number,quality_rating`;
        
        if (proof) {
          url += `&appsecret_proof=${proof}`;
        }
        
        url += `&access_token=${metaAccessToken}`;

        const res = await fetch(
          url,
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

    return NextResponse.json({ success: true, data: out }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
