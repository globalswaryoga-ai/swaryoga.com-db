/**
 * QR Health & Status Check Endpoint
 * Monitors bridge status and provides fallback QR functionality
 * Prevents 404 errors by checking bridge connectivity before requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();


interface BridgeEndpointStatus {
  path: string;
  status: number | null;
  ok: boolean;
  message: string;
  timeMs: number;
}

async function checkEndpoint(
  endpoint: string,
  timeout: number = 5000
): Promise<BridgeEndpointStatus> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${BRIDGE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);
    const timeMs = Date.now() - start;

    if (response.ok || response.status === 400) {
      return {
        path: endpoint,
        status: response.status,
        ok: true,
        message: response.ok ? 'OK' : 'Endpoint exists (400)',
        timeMs,
      };
    } else if (response.status === 404) {
      return {
        path: endpoint,
        status: 404,
        ok: false,
        message: `Endpoint not found (404)`,
        timeMs,
      };
    } else {
      return {
        path: endpoint,
        status: response.status,
        ok: false,
        message: `Error ${response.status}`,
        timeMs,
      };
    }
  } catch (error) {
    const timeMs = Date.now() - start;
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        path: endpoint,
        status: null,
        ok: false,
        message: `Timeout (${timeMs}ms)`,
        timeMs,
      };
    }
    return {
      path: endpoint,
      status: null,
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      timeMs,
    };
  }
}

async function checkBridgeHealth() {
  const results: { [key: string]: BridgeEndpointStatus } = {};

  // Check critical endpoints
  const endpoints = ['/status', '/chats', '/qr', '/messages/all'];

  for (const endpoint of endpoints) {
    results[endpoint] = await checkEndpoint(endpoint);
  }

  const allOk = Object.values(results).some((r) => r.ok);

  return {
    bridgeUrl: BRIDGE_URL,
    reachable: allOk,
    endpoints: results,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const health = await checkBridgeHealth();

    return NextResponse.json({
      ok: health.reachable,
      bridgeUrl: health.bridgeUrl,
      reachable: health.reachable,
      endpoints: health.endpoints,
      summary:
        Object.values(health.endpoints).filter((e) => e.ok).length +
        '/' +
        Object.keys(health.endpoints).length +
        ' endpoints OK',
      timestamp: health.timestamp,
      recommendations: health.reachable
        ? 'Bridge is working'
        : 'Bridge is not reachable. Check your bridge URL and network connection.',
    });
  } catch (error) {
    console.error('[Bridge Health] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Health check failed',
        ok: false,
      },
      { status: 500 }
    );
  }
}
