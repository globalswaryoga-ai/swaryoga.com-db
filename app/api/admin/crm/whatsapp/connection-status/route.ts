import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { checkSessionHealth, reconnectSession, getConnectionStatus } from '@/lib/whatsappConnectionManager';

export const dynamic = 'force-dynamic';

/**
 * GET: Check connection status
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    // Get query params
    const sessionKey = req.nextUrl.searchParams.get('sessionKey');
    if (!sessionKey) {
      return NextResponse.json({ error: 'Missing sessionKey parameter' }, { status: 400 });
    }

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    const status = await getConnectionStatus(userId, sessionKey, bridgeUrl, bridgeSecret);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[Connection Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Attempt manual reconnection
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const body = await req.json();
    const { sessionKey } = body;

    if (!sessionKey) {
      return NextResponse.json({ error: 'Missing sessionKey' }, { status: 400 });
    }

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

    console.log(`[Connection Status] Attempting reconnect for user ${userId}`);

    const result = await reconnectSession(userId, sessionKey, bridgeUrl, bridgeSecret);

    return NextResponse.json({
      success: result.success,
      reconnected: result.reconnected,
      message: result.message,
      newSessionKey: result.newSessionKey,
    });
  } catch (error) {
    console.error('[Connection Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
