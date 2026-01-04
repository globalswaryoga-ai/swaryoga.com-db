import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const WHATSAPP_BRIDGE_HTTP_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

function bridgeUrl(path: string) {
  const base = WHATSAPP_BRIDGE_HTTP_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${normalized}`);
}

/**
 * GET /api/admin/crm/whatsapp/qr
 * Fetch QR code from WhatsApp Web bridge for login
 * 
 * Response: {
 *   success: boolean,
 *   data: { qr: string (base64), hasQR: boolean, isAuthenticated: boolean },
 *   error?: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify admin auth
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // 2. Fetch status from bridge
    // The wa-bridge service exposes these routes at the root:
    //   GET  /api/status
    //   POST /api/init
    //   POST /api/disconnect
    // (The legacy express wrapper under /api/whatsapp/* isn't what the CRM bridge uses.)
    const statusUrl = bridgeUrl('/api/status');
    const bridgeRes = await fetch(statusUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!bridgeRes.ok) {
      console.error('[QR] Bridge status call failed:', bridgeRes.status, await bridgeRes.text());
      return NextResponse.json(
        { 
          error: 'WhatsApp bridge unreachable',
          details: `Bridge returned ${bridgeRes.status}`
        },
        { status: 503 }
      );
    }

  const bridgeData = await bridgeRes.json();

    // 3. Normalize status shape (bridge may evolve)
    // Bridge returns: { authenticated, connecting, hasQR, connectedClients, account, ... }
    // Normalize so the CRM UI stays stable even if the bridge evolves.
    const qr = bridgeData.qr ?? bridgeData.qrImage ?? null;
    const hasQR = Boolean(bridgeData.hasQR ?? bridgeData.hasQr ?? bridgeData.has_qr);
    const isAuthenticated = Boolean(
      bridgeData.isAuthenticated ?? bridgeData.authenticated ?? bridgeData.connected
    );
    const connectedClients = Number(bridgeData.connectedClients || 0);

    console.log('[QR] Bridge status:', {
      hasQR,
      isAuthenticated,
      connectedClients,
      timestamp: new Date().toISOString()
    });

    // 4. Return QR + status
    return NextResponse.json({
      success: true,
      data: {
        qr: qr, // Base64 PNG or null
        hasQR,
        isAuthenticated,
        connectedClients,
        phoneNumber:
          bridgeData.phoneNumber ||
          bridgeData?.account?.phone ||
          bridgeData?.account?.id ||
          null, // If authenticated, show identifier
        bridgeStatus: 'online'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[QR] Error fetching QR:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch QR code', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/whatsapp/qr/reconnect
 * Force bridge to generate new QR (disconnect and reinitialize)
 * 
 * Request body: {} (empty)
 * Response: { success: boolean, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin auth
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // 2. Call bridge disconnect to force new QR
    const disconnectUrl = bridgeUrl('/api/disconnect');
    const disconnectRes = await fetch(disconnectUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!disconnectRes.ok) {
      console.error('[QR] Bridge disconnect failed:', disconnectRes.status);
      return NextResponse.json(
        { error: 'Failed to disconnect WhatsApp bridge' },
        { status: 500 }
      );
    }

    console.log('[QR] Bridge disconnected, new QR will be generated');

    // 3. Wait a moment for QR to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Fetch new status
    const statusUrl = bridgeUrl('/api/status');
    const statusRes = await fetch(statusUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      return NextResponse.json({
        success: true,
        message: 'WhatsApp bridge reconnected - new QR generated',
        data: {
          hasQR: statusData.hasQR,
          qr: statusData.qr || null
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp bridge disconnected - waiting for new QR'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[QR] Error reconnecting:', error.message);
    return NextResponse.json(
      { error: 'Failed to reconnect WhatsApp', details: error.message },
      { status: 500 }
    );
  }
}
