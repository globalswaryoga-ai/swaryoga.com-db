import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to see exactly what Meta is sending during webhook verification
 * Visit: https://crm.swaryoga.com/api/whatsapp/webhook-debug?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    endpoint: 'webhook-debug (GET)',
    params: Object.fromEntries(url.searchParams.entries()),
    headers: {
      'user-agent': request.headers.get('user-agent'),
      'host': request.headers.get('host'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    },
    env: {
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN': process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ SET' : '❌ NOT SET',
      'WHATSAPP_PHONE_NUMBER_ID': process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ SET' : '❌ NOT SET',
      'WHATSAPP_ACCESS_TOKEN': process.env.WHATSAPP_ACCESS_TOKEN ? '✅ SET' : '❌ NOT SET',
    },
    verification: {
      mode: url.searchParams.get('hub.mode'),
      token: url.searchParams.get('hub.verify_token'),
      challenge: url.searchParams.get('hub.challenge'),
      expectedToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      tokenMatches: url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    },
  };

  return NextResponse.json(debugInfo, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      endpoint: 'webhook-debug (POST)',
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        'x-hub-signature-256': request.headers.get('x-hub-signature-256'),
      },
      body: body ? { received: true, type: typeof body, keys: Object.keys(body).slice(0, 5) } : null,
      env: {
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN': process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ SET' : '❌ NOT SET',
      },
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
