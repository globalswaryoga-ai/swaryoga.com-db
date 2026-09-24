/**
 * QR WhatsApp opt-out list management (per tenant).
 *
 * GET    → list this tenant's opted-out contacts
 * POST   → manually add a phone to the opt-out list
 * DELETE → remove a phone (re-subscribe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listOptOuts, recordOptOut, recordOptIn } from '@/lib/qrOptOut';

export const dynamic = 'force-dynamic';

function authUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const decoded = verifyToken(authHeader);
  if (!decoded) return null;
  return String(decoded.userId || decoded.username || '') || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const optOuts = await listOptOuts(userId);
    return NextResponse.json({ success: true, count: optOuts.length, optOuts });
  } catch (error: any) {
    console.error('[qr/opt-outs] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ success: false, error: 'phone required' }, { status: 400 });

    await recordOptOut({ userId, phoneOrJid: String(phone), source: 'manual' });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[qr/opt-outs] POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ success: false, error: 'phone required' }, { status: 400 });

    await recordOptIn(userId, String(phone));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[qr/opt-outs] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
