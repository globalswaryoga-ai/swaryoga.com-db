import { NextRequest, NextResponse } from 'next/server';
import { POST as originalPOST } from '../../send/route';
import crypto from 'crypto';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * Generate SHA256 HMAC for Meta App Secret Proof
 * Required for Apps in "Live" mode
 */
function getAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto
    .createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
}

/**
 * Compatibility route for old /meta/send
 * Forwards to the new /api/admin/crm/whatsapp/send
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Compatibility wrapper: accept legacy payload shapes.
    // We must read the body once and then forward to the canonical handler.
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Patch body to support old field names if necessary
    if (!('messageContent' in body) && (body as any).message) {
      (body as any).messageContent = (body as any).message;
    }
    // Some callers use `message` but also send `messageContent` as empty string.
    if (!(body as any).messageContent && (body as any).message) {
      (body as any).messageContent = (body as any).message;
    }

    // Phone mapping
    if (!('phoneNumber' in body) && (body as any).phone) {
      (body as any).phoneNumber = (body as any).phone;
    }
    if (!(body as any).phoneNumber && (body as any).phone) {
      (body as any).phoneNumber = (body as any).phone;
    }

    // Legacy key used by some older CRM clients
    if (!(body as any).phoneNumber && (body as any).to) {
      (body as any).phoneNumber = (body as any).to;
    }

    // Final validation to prevent 400 from the canonical send route.
    if (!(body as any).phoneNumber || !String((body as any).phoneNumber).trim()) {
      return NextResponse.json({ error: 'Missing fields: phoneNumber' }, { status: 400 });
    }
    const hasText = Boolean(String((body as any).messageContent || '').trim());
    const hasMedia = Boolean((body as any)?.media?.base64);
    if (!hasText && !hasMedia) {
      return NextResponse.json({ error: 'Missing fields: messageContent (or media)' }, { status: 400 });
    }

    // Forward directly to the canonical handler.
    // NOTE: Using `new NextRequest()` with a JSON body can be brittle in Node runtimes.
    // Instead, we call the canonical handler with the original request but with a safe clone.
    const url = request.url.replace('/meta/send', '/send');
    const newReq = new Request(url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });

    // originalPOST expects NextRequest; Next.js handlers also accept Request.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (originalPOST as any)(newReq);

    // If the response is a NextResponse, return as-is.
    if (response instanceof NextResponse) {
      return response;
    }

    // Otherwise, convert the response to NextResponse.
    const { status, statusText, headers } = response;
    const clonedHeaders = new Headers(headers);
    // Fix for Edge Runtime: https://github.com/vercel/next.js/issues/49132
    if (clonedHeaders.has('Content-Encoding')) {
      clonedHeaders.delete('Content-Encoding');
    }
    const newResponse = new NextResponse(response.body, {
      status,
      statusText,
      headers: clonedHeaders,
    });

    return newResponse;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
