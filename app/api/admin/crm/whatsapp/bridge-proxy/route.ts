import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

/**
 * Generic bridge proxy - forwards requests to the WhatsApp bridge
 * Avoids CORS errors when calling bridge directly from browser
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/status';
    const bridgeUrl = `${BRIDGE_URL}${path}`;

    const res = await fetch(bridgeUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SwarYoga-Bridge-Proxy',
        'x-bridge-secret': BRIDGE_SECRET
      },
      signal: AbortSignal.timeout(15_000)
    });

    // Handle 503 (WhatsApp not connected) gracefully
    if (res.status === 503) {
      // For /chats endpoint, return empty array instead of error
      if (path === '/chats') {
        return NextResponse.json([]);
      }
      // For other endpoints, return proper error with status info
      return NextResponse.json(
        { error: 'WhatsApp not connected', status: 'disconnected', needsQr: true },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bridge error: ${res.status}` },
        { status: res.status }
      );
    }

    // Try to parse as JSON first
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // For HTML responses (like QR), return as-is
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType || 'text/html' }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bridge proxy error';
    console.error('[bridge-proxy] Error:', message);
    
    // Return empty array for /chats on error to prevent UI breaking
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/status';
    if (path === '/chats') {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: message, status: 'error' },
      { status: 200 } // Return 200 so frontend can handle gracefully
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body - handle both string and object formats
    let parsedBody: any = {};
    let rawBody = '';
    try {
      rawBody = await request.text();
      if (rawBody) {
        parsedBody = JSON.parse(rawBody);
      }
    } catch (e) {
      console.warn('[bridge-proxy] Failed to parse body:', e);
    }
    // --- Diagnostics: Log every POST's path and rawBody ---
    try {
      const diag = {
        path: parsedBody.path,
        rawBody,
        parsedBody,
        ts: new Date().toISOString()
      };
      try {
        const fs = await import('fs');
        await fs.promises.appendFile(
          './bridge-proxy-diag.log',
          JSON.stringify(diag) + '\n',
          { encoding: 'utf8' }
        );
        console.log('===BRIDGE_PROXY_DIAG=== written to file');
      } catch (fileErr) {
        // If file write fails (e.g., serverless), print to console
        console.log('===BRIDGE_PROXY_DIAG===', JSON.stringify(diag));
      }
    } catch (e) {
      console.log('===BRIDGE_PROXY_DIAG=== (unserializable body)', typeof parsedBody, typeof rawBody);
    }

    // Extract path - default to /status if not provided
    const path = parsedBody.path || '/status';

    // Extract the body to forward to bridge
    let forwardBody = parsedBody.body;

    // If body is a string, try to parse it as JSON
    if (typeof forwardBody === 'string') {
      try {
        forwardBody = JSON.parse(forwardBody);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    const bridgeUrl = `${BRIDGE_URL}${path}`;
    console.log('[bridge-proxy] POST to:', bridgeUrl, 'Headers:', JSON.stringify(Object.fromEntries(request.headers)), 'Body:', rawBody);

    // For /connect specifically, send empty body (no JSON)
    const bodyToSend = path === '/connect' 
      ? undefined 
      : (forwardBody ? JSON.stringify(forwardBody) : '{}');

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'User-Agent': 'SwarYoga-Bridge-Proxy',
        'x-bridge-secret': BRIDGE_SECRET
      },
      signal: AbortSignal.timeout(15_000)
    };

    // Only set Content-Type and body if sending data
    if (bodyToSend) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/json'
      };
      fetchOptions.body = bodyToSend;
    }

    const res = await fetch(bridgeUrl, fetchOptions);

    // For non-OK responses, still return the data but with the error status
    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    if (!res.ok) {
      // Log but don't fail for missing endpoints like /connect
      console.log('[bridge-proxy] Bridge returned:', res.status, data);
      
      // CRITICAL: /connect MUST always return 200, even if bridge returns 400
      // This check MUST come first and be unconditional
      if (path === '/connect') {
        return NextResponse.json(
          {
            error: data.error || `Bridge error: ${res.status}`,
            ...data,
            diagnostics: {
              receivedStatus: res.status,
              bridgeUrl,
              requestHeaders: Object.fromEntries(request.headers),
              requestBody: rawBody,
              parsedBody,
              forwardBody
            },
            forcedStatus: 200,
            note: 'Bridge-proxy forced 200 for /connect to unblock QR connect flow.'
          },
          { status: 200 }
        );
      }
      
      // Add detailed diagnostics for 400 errors (but NOT for /connect)
      if (res.status === 400) {
        return NextResponse.json(
          {
            error: data.error || `Bridge error: ${res.status}`,
            ...data,
            diagnostics: {
              receivedStatus: res.status,
              bridgeUrl,
              requestHeaders: Object.fromEntries(request.headers),
              requestBody: rawBody,
              parsedBody,
              forwardBody
            }
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: data.error || `Bridge error: ${res.status}`, ...data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bridge proxy error';
    console.error('[bridge-proxy] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 503 }
    );
  }
}
