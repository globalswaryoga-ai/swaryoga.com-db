/**
 * QR Health & Status Check Endpoint
 * Monitors bridge status and provides fallback QR functionality
 */

import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';

export const dynamic = 'force-dynamic';

async function checkBridgeHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return {
      bridgeHealthy: true,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      bridgeHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    if (action === 'health') {
      const health = await checkBridgeHealth();
      return NextResponse.json(health);
    }

    if (action === 'status') {
      const health = await checkBridgeHealth();

      return NextResponse.json({
        bridgeStatus: health.bridgeHealthy ? 'online' : 'offline',
        bridgeUrl: BRIDGE_URL,
        qrEndpoint: `${BRIDGE_URL}/qr`,
        lastCheck: health.timestamp,
        instructions: health.bridgeHealthy
          ? 'Bridge is healthy. Use /qr endpoint for QR code.'
          : 'Bridge is offline. Please restart the bridge service.',
        details: health,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=status or ?action=health' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
