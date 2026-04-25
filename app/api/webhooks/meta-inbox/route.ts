import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaInboxVerifyToken,
  ingestMetaSocialEvent,
  parseMetaSocialWebhookPayload,
  verifyMetaInboxSignature,
} from '@/lib/socialInbox';

export const dynamic = 'force-dynamic';
import { logError } from '@/lib/api-error';


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expectedToken = getMetaInboxVerifyToken();

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature');
    if (!verifyMetaInboxSignature(rawBody, signatureHeader)) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const events = parseMetaSocialWebhookPayload(payload);
    for (const event of events) {
      await ingestMetaSocialEvent(event);
    }

    return NextResponse.json({ success: true, processed: events.length }, { status: 200 });
  } catch (error) {
    logError('meta-inbox webhook POST', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
