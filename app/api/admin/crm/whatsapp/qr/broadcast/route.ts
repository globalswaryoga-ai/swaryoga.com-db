/**
 * QR WhatsApp Broadcast API
 * POST /api/admin/crm/whatsapp/qr/broadcast — Send bulk broadcast
 * GET  /api/admin/crm/whatsapp/qr/broadcast — List scheduled broadcasts
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function getBridgeUrl() {
  return (
    process.env.WHATSAPP_BRIDGE_HTTP_URL ||
    process.env.WHATSAPP_BRIDGE_URL ||
    process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
    'http://localhost:3333'
  ).replace(/\/$/, '');
}

function getBridgeSecret() {
  return (
    process.env.WHATSAPP_BRIDGE_SECRET ||
    process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
    'swar-bridge-secret-2024'
  );
}

async function getUserBridgeConfig(userId: string) {
  try {
    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne(
      { $or: [{ userId }, { permanentTenantId: userId }] },
      { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 }
    ).lean() as any;

    if (settings?.permanentTenantId) {
      return {
        bridgeUrl: getBridgeUrl(),
        bridgeSecret: getBridgeSecret(),
        sessionId: settings.permanentTenantId,
        hasConfig: true,
      };
    }
    if (settings?.qrBridgeUrl) {
      return {
        bridgeUrl: settings.qrBridgeUrl,
        bridgeSecret: settings.qrBridgeSecret || getBridgeSecret(),
        sessionId: userId,
        hasConfig: true,
      };
    }
    return { bridgeUrl: getBridgeUrl(), bridgeSecret: getBridgeSecret(), sessionId: userId, hasConfig: false };
  } catch {
    return { bridgeUrl: getBridgeUrl(), bridgeSecret: getBridgeSecret(), sessionId: userId, hasConfig: false };
  }
}

function authCheck(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  if (!decoded.isAdmin && !decoded.userId && !decoded.username) return null;
  return decoded;
}

async function safeBridgeFetch(url: string, options: RequestInit): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Bridge returned non-JSON (HTML error page etc.)
      data = { error: `Bridge returned non-JSON response (status ${res.status}): ${text.slice(0, 200)}` };
    }
    return { ok: res.ok, data, status: res.status };
  } catch (err: any) {
    return { ok: false, data: { error: err.message || 'Bridge unreachable' }, status: 503 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await getUserBridgeConfig(viewerUserId);

    // Super admins always get access — use global bridge if no custom one
    if (!bridgeConfig.hasConfig && !superAdmin) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp session not configured. Please scan QR code first on the QR WhatsApp page.',
      }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { recipients, message, imageUrl, buttons, footerText, schedule, recipientType } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipients array required' }, { status: 400 });
    }
    if (!message?.trim() && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Message or image required' }, { status: 400 });
    }

    const type = recipientType || 'people';

    // Lead ownership filter for non-super-admins
    let filteredRecipients = recipients;
    if (!superAdmin && type === 'people') {
      try {
        const Lead = getLead();
        const allPhones: string[] = [];
        for (const r of recipients) {
          const phone = String(r).replace(/\D/g, '');
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
        filteredRecipients = recipients.filter((r: string) => ownedPhones.has(String(r).replace(/\D/g, '')));
        if (filteredRecipients.length === 0) {
          return NextResponse.json({ success: false, error: 'None of the recipients are assigned to you.' }, { status: 403 });
        }
      } catch (err: any) {
        console.error('[qr-broadcast] Lead filter error:', err.message);
        // Don't block on lead filter error — use all recipients
      }
    }

    console.log(`[qr-broadcast] Sending to ${filteredRecipients.length} recipients via ${bridgeConfig.bridgeUrl}/broadcast`);

    const result = await safeBridgeFetch(`${bridgeConfig.bridgeUrl}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeConfig.bridgeSecret,
        'x-user-id': viewerUserId,
        'x-session-key': bridgeConfig.sessionId,
      },
      body: JSON.stringify({
        recipients: filteredRecipients,
        message,
        imageUrl,
        buttons,
        footerText,
        schedule,
        recipientType: type,
      }),
    });

    if (!result.ok) {
      console.error('[qr-broadcast] Bridge error:', result.status, result.data);
      return NextResponse.json({
        success: false,
        error: result.data?.error || `Bridge returned status ${result.status}`,
        bridgeStatus: result.status,
      }, { status: result.status === 503 ? 503 : 500 });
    }

    return NextResponse.json({
      success: true,
      ...result.data,
      totalRecipients: filteredRecipients.length,
    });

  } catch (error: any) {
    console.error('[qr-broadcast] Unhandled POST error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await getUserBridgeConfig(viewerUserId);

    const result = await safeBridgeFetch(`${bridgeConfig.bridgeUrl}/broadcast/scheduled`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeConfig.bridgeSecret,
        'x-user-id': viewerUserId,
        'x-session-key': bridgeConfig.sessionId,
      },
    });

    return NextResponse.json(result.ok ? result.data : { success: false, broadcasts: [] });
  } catch (error: any) {
    console.error('[qr-broadcast] GET error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try { body = await request.json(); } catch {}
    const { id } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Broadcast ID required' }, { status: 400 });

    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await getUserBridgeConfig(viewerUserId);

    const result = await safeBridgeFetch(`${bridgeConfig.bridgeUrl}/broadcast/scheduled/${id}`, {
      method: 'DELETE',
      headers: {
        'x-bridge-secret': bridgeConfig.bridgeSecret,
        'x-user-id': viewerUserId,
        'x-session-key': bridgeConfig.sessionId,
      },
    });

    return NextResponse.json(result.ok ? result.data : { success: false, error: result.data?.error });
  } catch (error: any) {
    console.error('[qr-broadcast] DELETE error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
