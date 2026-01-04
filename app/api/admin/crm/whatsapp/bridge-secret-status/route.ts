import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/whatsapp/bridge-secret-status
 * Admin-only. Confirms whether WHATSAPP_WEB_BRIDGE_SECRET is loaded on the server.
 * Does NOT reveal the secret.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const secretCandidates: Array<[key: string, value: string | undefined]> = [
      ['WHATSAPP_WEB_BRIDGE_SECRET', process.env.WHATSAPP_WEB_BRIDGE_SECRET],
      ['WHATSAPP_BRIDGE_SECRET', process.env.WHATSAPP_BRIDGE_SECRET],
    ];
    const found = secretCandidates.find(([, value]) => (value || '').trim().length > 0);
    const secret = (found?.[1] || '').trim();

    return NextResponse.json(
      {
        success: true,
        data: {
          bridgeSecretSet: Boolean(secret),
          keyUsed: found?.[0] || null,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
