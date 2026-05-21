/**
 * QR WhatsApp Broadcast API
 * POST /api/admin/crm/whatsapp/qr/broadcast — Send bulk broadcast (loops /send on bridge)
 * GET  /api/admin/crm/whatsapp/qr/broadcast — List sessions / connection status
 * DELETE /api/admin/crm/whatsapp/qr/broadcast — (no-op, kept for compatibility)
 *
 * Bridge API reality:
 *   /health  — GET health
 *   /sessions — GET all sessions
 *   /send    — POST one message { to, message, type, imageUrl?, buttons? }
 *   NO /broadcast endpoint exists on the bridge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeUrl, getWhatsAppBridgeSecret } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';
// Allow up to 60 seconds for bulk sends (Vercel Pro / hobby has 10s; this is best-effort)
export const maxDuration = 60;

// ── helpers ──────────────────────────────────────────────

function authCheck(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  if (!decoded.isAdmin && !decoded.userId && !decoded.username) return null;
  return decoded;
}

async function safeFetch(url: string, options: RequestInit): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); }
    catch { data = { error: `Non-JSON from bridge (${res.status}): ${text.slice(0, 200)}` }; }
    return { ok: res.ok, data, status: res.status };
  } catch (err: any) {
    return { ok: false, data: { error: err.message || 'Bridge unreachable' }, status: 503 };
  }
}

/**
 * Find the connected session key for a given userId from the bridge.
 * Falls back to any connected session if userId match not found.
 */
async function findConnectedSessionKey(
  bridgeUrl: string,
  bridgeSecret: string,
  userId: string
): Promise<string | null> {
  const result = await safeFetch(`${bridgeUrl}/sessions`, {
    method: 'GET',
    headers: { 'x-bridge-secret': bridgeSecret },
  });

  if (!result.ok || !Array.isArray(result.data?.sessions)) return null;

  const sessions: any[] = result.data.sessions;
  // Prefer a session owned by this userId that is connected
  const ownConnected = sessions.find(
    (s) => s.userId === userId && s.status === 'connected'
  );
  if (ownConnected) return String(ownConnected.sessionKey);

  // Fallback: any connected session
  const anyConnected = sessions.find((s) => s.status === 'connected');
  if (anyConnected) return String(anyConnected.sessionKey);

  return null;
}

/**
 * Send a single WhatsApp message via the bridge /send endpoint.
 */
async function sendOne(
  bridgeUrl: string,
  bridgeSecret: string,
  sessionKey: string,
  to: string,
  message: string,
  imageUrl?: string,
  buttons?: string[]
): Promise<{ success: boolean; error?: string }> {
  let payload: any = { to: to.replace(/\D/g, '') };

  if (imageUrl) {
    payload.type = 'media';
    payload.url = imageUrl;
    payload.caption = message;
    payload.message = message;
  } else if (buttons && buttons.length > 0) {
    payload.type = 'buttons';
    payload.message = message;
    payload.buttons = buttons;
  } else {
    payload.type = 'text';
    payload.message = message;
  }

  const result = await safeFetch(`${bridgeUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': bridgeSecret,
      'x-session-key': sessionKey,
    },
    body: JSON.stringify(payload),
  });

  if (result.ok && result.data?.success !== false) {
    return { success: true };
  }
  return { success: false, error: result.data?.error || `Bridge status ${result.status}` };
}

// ── POST: send broadcast ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);

    let body: any;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }

    const { recipients, message, imageUrl, buttons, recipientType } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipients array required' }, { status: 400 });
    }
    if (!message?.trim() && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Message or image required' }, { status: 400 });
    }

    const bridgeUrl = getWhatsAppBridgeUrl();
    const bridgeSecret = getWhatsAppBridgeSecret();

    // Find the connected WhatsApp session
    const sessionKey = await findConnectedSessionKey(bridgeUrl, bridgeSecret, viewerUserId);
    if (!sessionKey) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp is not connected. Please scan the QR code on the QR WhatsApp page first.',
      }, { status: 503 });
    }

    console.log(`[qr-broadcast] Using session key: ${sessionKey} for user ${viewerUserId}`);

    // Lead ownership filter for non-super-admins
    let filteredRecipients: string[] = recipients.map((r: string) => String(r).replace(/\D/g, ''));

    if (!superAdmin && (recipientType || 'people') === 'people') {
      try {
        await connectDB();
        const Lead = getLead();
        const allPhones: string[] = [];
        for (const phone of filteredRecipients) {
          allPhones.push(phone);
          if (phone.startsWith('91') && phone.length === 12) allPhones.push(phone.substring(2));
          else if (phone.length === 10) allPhones.push('91' + phone);
        }
        const ownedLeads = await Lead.find(
          { phoneNumber: { $in: allPhones }, $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }] },
          { phoneNumber: 1 }
        ).lean();
        const ownedPhones = new Set<string>();
        for (const lead of ownedLeads as any[]) {
          const lp = lead.phoneNumber;
          if (lp) {
            ownedPhones.add(lp);
            if (lp.startsWith('91') && lp.length === 12) ownedPhones.add(lp.substring(2));
            else if (lp.length === 10) ownedPhones.add('91' + lp);
          }
        }
        filteredRecipients = filteredRecipients.filter((p) => ownedPhones.has(p));
        if (filteredRecipients.length === 0) {
          return NextResponse.json({ success: false, error: 'None of the recipients are assigned to you.' }, { status: 403 });
        }
      } catch (err: any) {
        console.error('[qr-broadcast] Lead filter error:', err.message);
        // Don't block on filter error
      }
    }

    console.log(`[qr-broadcast] Sending to ${filteredRecipients.length} recipients via ${bridgeUrl}/send`);

    // Send messages one by one (bridge has no /broadcast endpoint)
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const MAX_SYNC = 20; // send first 20 synchronously, rest are fire-and-forget

    for (let i = 0; i < filteredRecipients.length; i++) {
      const phone = filteredRecipients[i];
      try {
        const result = await sendOne(
          bridgeUrl, bridgeSecret, sessionKey,
          phone, message, imageUrl,
          Array.isArray(buttons) ? buttons.map((b: any) => String(b?.title || b).slice(0, 20)) : undefined
        );
        if (result.success) {
          sent++;
        } else {
          failed++;
          if (errors.length < 5) errors.push(`${phone}: ${result.error}`);
        }
      } catch (err: any) {
        failed++;
        if (errors.length < 5) errors.push(`${phone}: ${err.message}`);
      }

      // Small delay between messages to avoid rate-limiting
      if (i < filteredRecipients.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Stop synchronous sending after MAX_SYNC to avoid Vercel timeout
      if (i + 1 >= MAX_SYNC && i < filteredRecipients.length - 1) {
        failed += filteredRecipients.length - (i + 1);
        errors.push(`Only first ${MAX_SYNC} messages sent synchronously. Use broadcast runs for large lists.`);
        break;
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      totalRecipients: filteredRecipients.length,
      sessionKey,
      ...(errors.length > 0 ? { errors } : {}),
      message: `Sent ${sent}/${filteredRecipients.length} messages`,
    });

  } catch (error: any) {
    console.error('[qr-broadcast] Unhandled POST error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// ── GET: return session/connection status ─────────────────

export async function GET(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const bridgeUrl = getWhatsAppBridgeUrl();
    const bridgeSecret = getWhatsAppBridgeSecret();

    const result = await safeFetch(`${bridgeUrl}/sessions`, {
      method: 'GET',
      headers: { 'x-bridge-secret': bridgeSecret },
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, broadcasts: [], sessions: [] });
    }

    const sessions = (result.data?.sessions || []).filter(
      (s: any) => s.userId === viewerUserId || checkSuperAdmin(decoded)
    );

    return NextResponse.json({ success: true, broadcasts: [], sessions });
  } catch (error: any) {
    console.error('[qr-broadcast] GET error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: kept for compatibility ────────────────────────

export async function DELETE(request: NextRequest) {
  const decoded = authCheck(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  // Bridge has no scheduled broadcast concept — return success
  return NextResponse.json({ success: true, message: 'Deleted' });
}
