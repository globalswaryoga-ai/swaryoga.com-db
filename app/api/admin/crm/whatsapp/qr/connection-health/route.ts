import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/whatsapp/qr/connection-health
 * Check connection is alive during long operations (like merges)
 * Prevents auto-disconnect due to inactivity
 * 
 * This is a lightweight ping to keep connection alive
 */
export async function GET(request: NextRequest) {
  try {
    const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 
                     process.env.WHATSAPP_BRIDGE_HTTP_URL || 
                     'http://localhost:3333';
    
    const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
    const userId = request.nextUrl.searchParams.get('userId');
    const sessionKey = request.nextUrl.searchParams.get('sessionKey');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    
    // Send a health check ping to the bridge to keep connection alive
    const response = await fetch(`${bridgeUrl}/status`, {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'x-session-key': sessionKey || userId,
        'x-bridge-secret': bridgeSecret,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }).catch(e => ({ status: 0, error: e.message }));
    
    if ('error' in response) {
      return NextResponse.json({
        connected: false,
        error: response.error,
        message: `⚠️ Connection check failed. Bridge may be unreachable.`,
      }, { status: 503 });
    }
    
    const status = response.status === 200 ? 'ok' : `error_${response.status}`;
    const connectionData = response.status === 200 ? await response.json().catch(() => ({})) : {};
    
    return NextResponse.json({
      connected: response.status === 200,
      status,
      bridgeStatus: connectionData.status || 'unknown',
      message: `✅ Connection alive. Safe to continue merge operations.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
