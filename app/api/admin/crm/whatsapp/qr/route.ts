import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const WHATSAPP_BRIDGE_HTTP_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

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

    // 2. Fetch QR status from bridge
    const bridgeUrl = new URL(`${WHATSAPP_BRIDGE_HTTP_URL}/api/status`);
    const bridgeRes = await fetch(bridgeUrl.toString(), {
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
    
    // 3. Extract QR and authentication status
    const qr = bridgeData.qr || null; // Base64 string or null if authenticated
    const hasQR = bridgeData.hasQR || false;
    const isAuthenticated = bridgeData.isAuthenticated || false;
    const connectedClients = bridgeData.connectedClients || 0;

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
        phoneNumber: bridgeData.phoneNumber || null, // If authenticated, show phone
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
    const bridgeUrl = new URL(`${WHATSAPP_BRIDGE_HTTP_URL}/api/disconnect`);
    const disconnectRes = await fetch(bridgeUrl.toString(), {
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

    // 4. Fetch new QR status
    const statusUrl = new URL(`${WHATSAPP_BRIDGE_HTTP_URL}/api/status`);
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
