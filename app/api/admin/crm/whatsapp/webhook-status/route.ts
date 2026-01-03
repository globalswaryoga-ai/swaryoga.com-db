import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/crm/whatsapp/webhook-status
 * Admin-only. Reports whether webhook env vars are set and what callback URL should be configured.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : null;

    const verifyTokenSet = !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const appSecretSet = !!(process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET);

    return NextResponse.json(
      {
        success: true,
        data: {
          verifyTokenSet,
          appSecretSet,
          callbackUrl: baseUrl ? `${baseUrl}/api/whatsapp/webhook` : null,
          notes: {
            requiredSubscriptions: ['messages'],
            requirePublicHttps: true,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
